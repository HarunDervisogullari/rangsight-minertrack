import redis
import json
import requests
from datetime import datetime
import pytz
import random
import paho.mqtt.client as mqtt
import time
from influxdb_client import InfluxDBClient, PatchRetentionRule
import psycopg2 # Added for PostgreSQL connection
import os # Added to get DB credentials from environment variables
import serial # Added for serial communication
import re # For parsing serial data

print("[INGEST.PY] Script started. (MQTT to InfluxDB via Line Protocol & Redis Cache)")

# --- Configuration ---
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))

INFLUXDB_URL = os.getenv('INFLUXDB_URL', "http://localhost:8086")
INFLUX_WRITE_URL = f"{INFLUXDB_URL}/api/v2/write"
BUCKET = os.getenv('INFLUXDB_BUCKET', "helmet_data")
ORG = os.getenv('INFLUXDB_ORG', "RansightOrg")
TOKEN = os.getenv('INFLUXDB_TOKEN', "dEJu65igZZulaC5s_AU1QDP5TaAJjcvFDUezECxpyq96wKb1TlBSb3GOlQEFx--r59yPDLpZ4J82ZwZJytlzDw==") # Updated token

MQTT_BROKER_HOST = os.getenv('MQTT_BROKER_HOST', "localhost")
MQTT_BROKER_PORT = int(os.getenv('MQTT_BROKER_PORT', 1883))
MQTT_TOPIC = os.getenv('MQTT_TOPIC', "mine/gallery/raw")

# PostgreSQL Configuration - REPLACE WITH YOUR ACTUAL DETAILS or use environment variables
PG_DBNAME = os.getenv('PG_DBNAME', 'ransight')
PG_USER = os.getenv('PG_USER', 'postgres') # Updated default
PG_PASSWORD = os.getenv('PG_PASSWORD', 'admin') # Updated default
PG_HOST = os.getenv('PG_HOST', 'localhost')
PG_PORT = os.getenv('PG_PORT', '5432')

# Serial Port Configuration
SERIAL_PORT = os.getenv('SERIAL_PORT', 'COM5')
SERIAL_BAUDRATE = int(os.getenv('SERIAL_BAUDRATE', 115200))
SERIAL_TIMEOUT = 1 # seconds

# --- Global Variables ---
redis_client = None
influx_client = None
pg_conn = None

# --- Initialize Connections ---
def init_connections():
    global redis_client, influx_client, pg_conn
    # Redis
    try:
        redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
        redis_client.ping()
        print("[INGEST.PY] Redis connection established")
    except redis.exceptions.ConnectionError as e:
        print(f"[INGEST.PY] Redis connection failed: {e}")
        redis_client = None # Ensure it's None if connection fails

    # InfluxDB
    try:
        influx_client = InfluxDBClient(url=INFLUXDB_URL, token=TOKEN, org=ORG)
        # Test connection by trying to get a non-existent bucket (lightweight check)
        # buckets_api = influx_client.buckets_api()
        # buckets_api.find_bucket_by_name("test_connection_bucket") 
        # A better check might be to ping or check health if the client supports it directly.
        # For now, we assume client initialization implies readiness.
        print("[INGEST.PY] InfluxDB client initialized")
    except Exception as e:
        print(f"[INGEST.PY] InfluxDB initialization failed: {e}")
        influx_client = None # Ensure it's None

    # PostgreSQL
    try:
        pg_conn = psycopg2.connect(
            dbname=PG_DBNAME,
            user=PG_USER,
            password=PG_PASSWORD,
            host=PG_HOST,
            port=PG_PORT
        )
        pg_conn.autocommit = True # Optional: depends on your transaction needs
        print("[INGEST.PY] PostgreSQL connection established")
    except psycopg2.Error as e:
        print(f"[INGEST.PY] PostgreSQL connection failed: {e}")
        pg_conn = None # Ensure it's None

    return redis_client, influx_client, pg_conn

redis_client, influx_client, pg_conn = init_connections()

if not redis_client or not pg_conn: # InfluxDB client might not be strictly needed for all operations if MQTT processing is primary
    print("[INGEST.PY] Critical database connection(s) failed. Exiting.")
    exit(1)

# --- Bucket Management ---
def ensure_bucket_exists():
    """Ensure the InfluxDB bucket exists, create if needed"""
    if not influx_client: # Check if InfluxDB client is initialized
        print("[INGEST.PY] InfluxDB client not initialized. Cannot ensure bucket exists.")
        return False
    try:
        buckets_api = influx_client.buckets_api()
        existing_bucket = buckets_api.find_bucket_by_name(BUCKET)
        
        if existing_bucket:
            print(f"[INGEST.PY] Bucket '{BUCKET}' exists")
            return True
            
        print(f"[INGEST.PY] Creating bucket '{BUCKET}'...")
        retention_rule = PatchRetentionRule(type="expire", every_seconds=0)  # Changed to PatchRetentionRule
        new_bucket = buckets_api.create_bucket(
            bucket_name=BUCKET,
            org=ORG,
            retention_rules=[retention_rule]
        )
        print(f"✅ [INGEST.PY] Created bucket '{new_bucket.name}'")
        return True
        
    except Exception as e:
        print(f"❌ [INGEST.PY] Bucket creation failed: {e}")
        return False

if not ensure_bucket_exists():
    exit(1)

# --- Data Processing Functions ---
def get_hotspot_int_id(hotspot_barcode: str) -> int | None:
    """Fetch hotspot integer ID (from hotspots table) from its device barcode using PostgreSQL."""
    if not pg_conn:
        print("[INGEST.PY] No PostgreSQL connection available for hotspot ID lookup.")
        return None
    
    try:
        with pg_conn.cursor() as cur:
            # Fetch the hotspots.id by joining through devices and device_hotspot
            sql_query = """
                SELECT h.id 
                FROM hotspots h
                JOIN device_hotspot dh ON h.id = dh.hotspot_id
                JOIN devices d ON dh.device_id = d.id
                WHERE d.barcode = %s AND d.type = 'Hotspot'
            """
            cur.execute(sql_query, (hotspot_barcode,))
            result = cur.fetchone()
            if result:
                return result[0] # This is hotspots.id
            else:
                print(f"[INGEST.PY] Hotspot barcode '{hotspot_barcode}' not found or not linked to a hotspot entry.")
                return None
    except psycopg2.Error as e:
        print(f"[INGEST.PY] Error querying PostgreSQL for hotspot ID: {e}")
        # Attempt to reconnect or handle error
        # For simplicity, returning None here. Consider more robust error handling.
        return None
    except Exception as e:
        print(f"[INGEST.PY] Unexpected error during hotspot ID lookup: {e}")
        return None

def parse_mqtt_payload(payload_str: str) -> dict:
    """Parse MQTT payload with strict type handling"""
    try:
        parsed = {}
        for part in payload_str.split(';'):
            part = part.strip()
            if not part or ':' not in part:
                continue
                
            key, val = part.split(':', 1)
            key = key.strip().lower()
            
            if key in ['macaddr', 'hotspotid']:
                parsed[key] = val.strip()
            elif key == 'rxpower':
                parsed[key] = int(val)
            elif key in ['battery', 'co2', 'o2', 'othergas']:
                parsed[key] = float(val)
                
        return parsed
    except Exception as e:
        print(f"[INGEST.PY] Parse error: {e}")
        return None

def augment_data(data: dict) -> dict:
    """Add missing fields with realistic values"""
    if not data:
        return None
        
    augmented = data.copy()
    defaults = {
        'battery': random.randint(20, 100),
        'co2': random.uniform(400, 1500),
        'o2': random.uniform(19.5, 21.5),
        'othergas': random.uniform(0, 100),
        'rxpower': data.get('rxpower', -70)
    }
    
    for k, v in defaults.items():
        if k not in augmented or augmented[k] is None: # Also augment if explicitly None
            augmented[k] = v
            
    return augmented

def build_influx_line(data: dict) -> str:
    """Create InfluxDB line protocol with type safety"""
    if not data or 'macaddr' not in data or 'hotspotid' not in data:
        print("[INGEST.PY] Missing macaddr or hotspotid for Influx line.")
        return None
        
    ts_ns = int(datetime.now(pytz.timezone('Etc/GMT-3')).timestamp() * 1e9)
    tags = f"macaddr={data['macaddr']},hotspotid={data['hotspotid']}"
    
    fields = [
        f"rxpower={int(data['rxpower'])}i",
        f"battery={float(data.get('battery', 0))}",
        f"co2={float(data.get('co2', 0))}",
        f"o2={float(data.get('o2', 0))}",
        f"othergas={float(data.get('othergas', 0))}"
    ]
    
    return f"miner_metrics,{tags} {','.join(fields)} {ts_ns}"

def parse_serial_data(serial_line: str) -> dict | None:
    """Parse data from serial format: ';; MAC_hotspot:C8:2E:18:8E:C9:74,MAC_beacon:A0:DD:6C:72:60:56, RSSI:-16;' """
    print(f"[SERIAL PARSE] Attempting to parse: '{serial_line}'")
    # Regex to capture the three components, allowing for whitespace variations
    # It looks for MAC_hotspot, MAC_beacon, and RSSI specifically.
    match = re.search(r"MAC_hotspot:([0-9A-Fa-f:]+).*?MAC_beacon:([0-9A-Fa-f:]+).*?RSSI:(-?\d+)", serial_line, re.IGNORECASE)
    
    if match:
        hotspot_barcode = match.group(1).strip()
        beacon_mac = match.group(2).strip()
        rssi = match.group(3).strip()
        
        try:
            parsed = {
                'hotspotid': hotspot_barcode,  # This is the barcode, will be resolved to int ID later
                'macaddr': beacon_mac,
                'rxpower': int(rssi)
            }
            print(f"[SERIAL PARSE] Successfully parsed: {parsed}")
            return parsed
        except ValueError as e:
            print(f"[SERIAL PARSE] Error converting RSSI to int: '{rssi}'. Error: {e}")
            return None
    else:
        print(f"[SERIAL PARSE] No match found in line: '{serial_line}'")
        return None

# --- Data Writers ---
def write_to_influx(line: str):
    """Write data to InfluxDB with retry logic"""
    if not line or not influx_client:
        return False
        
    for attempt in range(3):
        try:
            resp = requests.post(
                f"{INFLUX_WRITE_URL}?org={ORG}&bucket={BUCKET}&precision=ns",
                headers={
                    "Authorization": f"Token {TOKEN}",
                    "Content-Type": "text/plain"
                },
                data=line.encode('utf-8')
            )
            
            if resp.status_code == 204:
                return True
                
            print(f"Attempt {attempt+1}: InfluxDB write failed - {resp.status_code} {resp.text}")
            time.sleep(1)
        except Exception as e:
            print(f"Attempt {attempt+1}: InfluxDB error - {str(e)}")
            time.sleep(1)
            
    return False

def cache_to_redis(data: dict):
    """Cache data in Redis with TTL"""
    if not data or not redis_client or 'macaddr' not in data:
        return
    try:
        redis_client.setex(
            f"miner:{data['macaddr']}",
            time=3600,  # 1 hour TTL
            value=json.dumps(data)
        )
    except Exception as e:
        print(f"[INGEST.PY] Redis cache error: {e}")

# --- MQTT Handler ---
def on_mqtt_message(client, userdata, msg):
    """Handle incoming MQTT messages"""
    try:
        payload = msg.payload.decode('utf-8')
        print(f"[MQTT] Received raw: {payload}")
        
        parsed_data = parse_mqtt_payload(payload)
        if not parsed_data:
            print("[INGEST.PY] Failed to parse MQTT payload.")
            return

        # Resolve hotspot barcode to integer ID
        hotspot_barcode = parsed_data.get('hotspotid')
        if isinstance(hotspot_barcode, str): # Expecting barcode as string
            print(f"[INGEST.PY] Resolving hotspot barcode from MQTT: {hotspot_barcode}")
            hotspot_int_id = get_hotspot_int_id(hotspot_barcode)
            if hotspot_int_id is not None:
                parsed_data['hotspotid'] = hotspot_int_id # Replace barcode with int ID
                print(f"[INGEST.PY] Hotspot barcode '{hotspot_barcode}' resolved to ID: {hotspot_int_id}")
            else:
                print(f"[INGEST.PY] Could not resolve MQTT hotspot barcode '{hotspot_barcode}'. Skipping message.")
                return # Skip message if hotspot ID cannot be resolved
        elif hotspot_barcode is not None: # If it's not a string but exists, it's unexpected
             print(f"[INGEST.PY] Unexpected type for MQTT hotspotid: {type(hotspot_barcode)}. Skipping message.")
             return
        # If hotspotid was not in payload, it might be handled by augment_data or build_influx_line defaults.
        # However, our new logic requires it to be a barcode initially if present.

        augmented_data = augment_data(parsed_data)
        if not augmented_data:
             print("[INGEST.PY] Failed to augment MQTT data. Skipping message.")
             return

        influx_line = build_influx_line(augmented_data)
        
        if influx_line and write_to_influx(influx_line):
            cache_to_redis(augmented_data) # Cache data with integer hotspot ID
            print("✅ MQTT Data processed and stored successfully.")
        else:
            print("❌ Failed to write MQTT data to InfluxDB or build line.")
            
    except Exception as e:
        print(f"[ERROR] MQTT Message processing failed: {e}")

def start_mqtt_client():
    """Initialize and start MQTT client"""
    global pg_conn # Ensure we can access pg_conn in the finally block
    
    mqtt_client_instance = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    mqtt_client_instance.on_message = on_mqtt_message
    
    try:
        mqtt_client_instance.connect(MQTT_BROKER_HOST, MQTT_BROKER_PORT, 60)
        mqtt_client_instance.subscribe(MQTT_TOPIC)
        print(f"[MQTT] Connected to {MQTT_BROKER_HOST}:{MQTT_BROKER_PORT}, subscribed to {MQTT_TOPIC}")
        mqtt_client_instance.loop_forever()
    except KeyboardInterrupt:
        print("[INGEST.PY] MQTT client interrupted by user.")
    except Exception as e:
        print(f"[MQTT] Connection or loop failed: {e}")
    finally:
        print("[INGEST.PY] Disconnecting MQTT client...")
        if mqtt_client_instance:
             try:
                 mqtt_client_instance.disconnect()
                 print("[INGEST.PY] MQTT client disconnected.")
             except Exception as e_mqtt_disc:
                 print(f"[INGEST.PY] Error disconnecting MQTT client: {e_mqtt_disc}")

        if pg_conn:
            try:
                pg_conn.close()
                print("[INGEST.PY] PostgreSQL connection closed.")
            except Exception as e_pg_close:
                print(f"[INGEST.PY] Error closing PostgreSQL connection: {e_pg_close}")
        print("[INGEST.PY] Shutdown complete.")

# --- Main Serial Ingestion Loop ---
def main_serial_ingestion():
    global pg_conn, redis_client, influx_client

    redis_client, influx_client, pg_conn = init_connections()

    if not all([redis_client, influx_client, pg_conn]):
        print("[INGEST.PY] One or more critical connections failed. Cannot start serial ingestion.")
        return

    if not ensure_bucket_exists():
        print("[INGEST.PY] Failed to ensure InfluxDB bucket exists. Cannot start serial ingestion.")
        return
    
    ser = None  # Initialize ser to None
    try:
        print(f"[SERIAL] Attempting to open serial port {SERIAL_PORT} at {SERIAL_BAUDRATE} baud...")
        ser = serial.Serial(SERIAL_PORT, SERIAL_BAUDRATE, timeout=SERIAL_TIMEOUT)
        print(f"[SERIAL] Successfully opened {SERIAL_PORT}. Waiting for data...")

        while True:
            if ser.in_waiting > 0:
                try:
                    serial_line_bytes = ser.readline()
                    serial_line = serial_line_bytes.decode('utf-8', errors='replace').strip()
                    print(f"[SERIAL DETAIL] Raw line received from COM port: '{serial_line}'")

                    if not serial_line: # Skip empty lines
                        print("[SERIAL DETAIL] Empty line received, skipping.")
                        continue

                    parsed_data = parse_serial_data(serial_line)
                    if not parsed_data:
                        continue
                    
                    # Resolve hotspot barcode (from MAC_hotspot) to integer ID
                    hotspot_barcode = parsed_data.get('hotspotid') # This is the hotspot barcode
                    if isinstance(hotspot_barcode, str):
                        print(f"[INGEST.PY] Resolving hotspot barcode from serial: {hotspot_barcode}")
                        hotspot_int_id = get_hotspot_int_id(hotspot_barcode)
                        if hotspot_int_id is not None:
                            parsed_data['hotspotid'] = hotspot_int_id # Replace barcode with int ID
                            print(f"[INGEST.PY] Hotspot barcode '{hotspot_barcode}' resolved to ID: {hotspot_int_id}")
                        else:
                            print(f"[INGEST.PY] Could not resolve serial hotspot barcode '{hotspot_barcode}'. Skipping data.")
                            continue
                    else:
                        print(f"[INGEST.PY] Hotspot barcode not a string or missing in parsed serial data. Skipping.")
                        continue # Essential for InfluxDB and backend

                    augmented_data = augment_data(parsed_data)
                    if not augmented_data:
                        print("[INGEST.PY] Failed to augment serial data. Skipping.")
                        continue
                    
                    influx_line = build_influx_line(augmented_data)
                    
                    if influx_line and write_to_influx(influx_line):
                        cache_to_redis(augmented_data)
                        print("✅ Serial data processed and stored successfully.")
                    else:
                        print("❌ Failed to write serial data to InfluxDB or build line.")

                except serial.SerialException as se:
                    print(f"[SERIAL] Serial error: {se}. Attempting to reopen port...")
                    if ser and ser.is_open:
                        ser.close()
                    time.sleep(5) # Wait before retrying
                    try:
                        ser = serial.Serial(SERIAL_PORT, SERIAL_BAUDRATE, timeout=SERIAL_TIMEOUT)
                        print(f"[SERIAL] Reopened port {SERIAL_PORT}.")
                    except serial.SerialException as se_retry:
                        print(f"[SERIAL] Failed to reopen port {SERIAL_PORT}: {se_retry}. Waiting before next attempt...")
                        time.sleep(10)
                except UnicodeDecodeError as ude:
                    print(f"[SERIAL] Unicode decode error: {ude}. Raw bytes: {serial_line_bytes}. Skipping line.")
                except Exception as e:
                    print(f"[ERROR] Main serial loop processing error: {e}")
                    time.sleep(1) # Brief pause before continuing loop
            else:
                # No data in buffer, print a waiting message periodically to show activity
                # To avoid spamming, we can use a simple counter or time-based check here if needed
                # For now, a simple print on each check when no data is present.
                print(f"[SERIAL DETAIL] No data currently in serial buffer ({SERIAL_PORT}, in_waiting={ser.in_waiting}). Waiting...")
                time.sleep(0.5) # Increased sleep slightly to reduce log spam when idle

    except KeyboardInterrupt:
        print("[INGEST.PY] Serial ingestion interrupted by user.")
    except serial.SerialException as e:
        print(f"[SERIAL] Could not open serial port {SERIAL_PORT}: {e}. Please check port and permissions.")
    except Exception as e:
        print(f"[ERROR] An unexpected error occurred in serial ingestion setup: {e}")
    finally:
        print("[INGEST.PY] Shutting down serial ingestion...")
        if ser and ser.is_open:
            ser.close()
            print(f"[SERIAL] Closed port {SERIAL_PORT}.")
        if pg_conn:
            try:
                pg_conn.close()
                print("[INGEST.PY] PostgreSQL connection closed.")
            except Exception as e_pg_close:
                print(f"[INGEST.PY] Error closing PostgreSQL connection: {e_pg_close}")
        print("[INGEST.PY] Serial ingestion shutdown complete.")

if __name__ == "__main__":
    # By default, run serial ingestion. 
    # To run MQTT, you would call start_mqtt_client() instead or in addition (e.g. in a thread)
    main_serial_ingestion()