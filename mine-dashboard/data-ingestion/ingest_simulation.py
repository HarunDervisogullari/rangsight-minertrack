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

print("[INGEST_SIMULATION.PY] Script started. (MQTT to InfluxDB via Line Protocol & Redis Cache)")

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

# PostgreSQL Configuration
PG_DBNAME = os.getenv('PG_DBNAME', 'ransight')
PG_USER = os.getenv('PG_USER', 'postgres') # Updated default
PG_PASSWORD = os.getenv('PG_PASSWORD', 'admin') # Updated default
PG_HOST = os.getenv('PG_HOST', 'localhost')
PG_PORT = os.getenv('PG_PORT', '5432')

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
        print("[INGEST_SIMULATION.PY] Redis connection established")
    except redis.exceptions.ConnectionError as e:
        print(f"[INGEST_SIMULATION.PY] Redis connection failed: {e}")
        redis_client = None

    # InfluxDB
    try:
        influx_client = InfluxDBClient(url=INFLUXDB_URL, token=TOKEN, org=ORG)
        print("[INGEST_SIMULATION.PY] InfluxDB client initialized")
    except Exception as e:
        print(f"[INGEST_SIMULATION.PY] InfluxDB initialization failed: {e}")
        influx_client = None

    # PostgreSQL
    try:
        pg_conn = psycopg2.connect(
            dbname=PG_DBNAME,
            user=PG_USER,
            password=PG_PASSWORD,
            host=PG_HOST,
            port=PG_PORT
        )
        pg_conn.autocommit = True
        print("[INGEST_SIMULATION.PY] PostgreSQL connection established")
    except psycopg2.Error as e:
        print(f"[INGEST_SIMULATION.PY] PostgreSQL connection failed: {e}")
        pg_conn = None
    return redis_client, influx_client, pg_conn

# --- Bucket Management ---
def ensure_bucket_exists():
    if not influx_client:
        print("[INGEST_SIMULATION.PY] InfluxDB client not initialized. Cannot ensure bucket exists.")
        return False
    try:
        buckets_api = influx_client.buckets_api()
        existing_bucket = buckets_api.find_bucket_by_name(BUCKET)
        if existing_bucket:
            print(f"[INGEST_SIMULATION.PY] Bucket '{BUCKET}' exists")
            return True
        print(f"[INGEST_SIMULATION.PY] Creating bucket '{BUCKET}'...")
        retention_rule = PatchRetentionRule(type="expire", every_seconds=0)
        new_bucket = buckets_api.create_bucket(
            bucket_name=BUCKET,
            org=ORG,
            retention_rules=[retention_rule]
        )
        print(f"✅ [INGEST_SIMULATION.PY] Created bucket '{new_bucket.name}'")
        return True
    except Exception as e:
        print(f"❌ [INGEST_SIMULATION.PY] Bucket creation failed: {e}")
        return False

# --- Data Processing Functions ---
def get_hotspot_int_id(hotspot_barcode: str) -> int | None:
    if not pg_conn:
        print("[INGEST_SIMULATION.PY] No PostgreSQL connection for hotspot ID lookup.")
        return None
    try:
        with pg_conn.cursor() as cur:
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
                return result[0]
            else:
                print(f"[INGEST_SIMULATION.PY] Hotspot barcode '{hotspot_barcode}' not found or not linked.")
                return None
    except psycopg2.Error as e:
        print(f"[INGEST_SIMULATION.PY] Error querying PostgreSQL for hotspot ID: {e}")
        return None
    except Exception as e:
        print(f"[INGEST_SIMULATION.PY] Unexpected error during hotspot ID lookup: {e}")
        return None

def parse_mqtt_payload(payload_str: str) -> dict:
    try:
        parsed = {}
        for part in payload_str.split(';'):
            part = part.strip()
            if not part or ':' not in part:
                continue
            key, val = part.split(':', 1)
            key = key.strip().lower()
            val = val.strip()
            
            if key == 'macaddr':
                parsed[key] = val
            elif key == 'hotspotid':
                # Always keep as string first (barcode), will be resolved in handler
                parsed[key] = val
            elif key == 'rxpower':
                parsed[key] = int(val)
            elif key in ['battery', 'co2', 'o2', 'othergas']:
                parsed[key] = float(val)
        return parsed
    except Exception as e:
        print(f"[INGEST_SIMULATION.PY] MQTT Parse error: {e}")
        return None

def augment_data(data: dict) -> dict:
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
        if k not in augmented or augmented[k] is None:
            augmented[k] = v
    return augmented

def build_influx_line(data: dict) -> str:
    if not data or 'macaddr' not in data or 'hotspotid' not in data:
        print("[INGEST_SIMULATION.PY] Missing macaddr or hotspotid for Influx line.")
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

# --- Data Writers ---
def write_to_influx(line: str):
    if not line or not influx_client:
        return False
    for attempt in range(3):
        try:
            resp = requests.post(
                f"{INFLUX_WRITE_URL}?org={ORG}&bucket={BUCKET}&precision=ns",
                headers={ "Authorization": f"Token {TOKEN}", "Content-Type": "text/plain" },
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
    if not data or not redis_client or 'macaddr' not in data:
        return
    try:
        redis_client.setex(f"miner:{data['macaddr']}", time=3600, value=json.dumps(data))
    except Exception as e:
        print(f"[INGEST_SIMULATION.PY] Redis cache error: {e}")

# --- MQTT Handler ---
def on_mqtt_message(client, userdata, msg):
    try:
        payload = msg.payload.decode('utf-8')
        print(f"[MQTT] Received raw: {payload}")
        
        parsed_data = parse_mqtt_payload(payload)
        if not parsed_data:
            print("[INGEST_SIMULATION.PY] Failed to parse MQTT payload.")
            return

        hotspot_id = parsed_data.get('hotspotid')
        
        # Always try barcode resolution first
        if isinstance(hotspot_id, str):
            print(f"[INGEST_SIMULATION.PY] Resolving hotspot barcode from MQTT: {hotspot_id}")
            hotspot_int_id = get_hotspot_int_id(hotspot_id)
            if hotspot_int_id is not None:
                parsed_data['hotspotid'] = hotspot_int_id
                print(f"[INGEST_SIMULATION.PY] Hotspot barcode '{hotspot_id}' resolved to ID: {hotspot_int_id}")
            else:
                # Try parsing as integer if barcode resolution failed
                try:
                    hotspot_int_id = int(hotspot_id)
                    parsed_data['hotspotid'] = hotspot_int_id
                    print(f"[INGEST_SIMULATION.PY] Using hotspot ID directly: {hotspot_int_id}")
                except ValueError:
                    print(f"[INGEST_SIMULATION.PY] Could not resolve hotspot barcode '{hotspot_id}' or parse as integer. Skipping message.")
                    return
        else:
            print(f"[INGEST_SIMULATION.PY] Invalid hotspotid type: {type(hotspot_id)}. Skipping.")
            return

        augmented_data = augment_data(parsed_data)
        if not augmented_data:
             print("[INGEST_SIMULATION.PY] Failed to augment MQTT data. Skipping.")
             return

        influx_line = build_influx_line(augmented_data)
        
        if influx_line and write_to_influx(influx_line):
            cache_to_redis(augmented_data)
            print("✅ MQTT Data processed and stored successfully.")
        else:
            print("❌ Failed to write MQTT data to InfluxDB or build line.")
            
    except Exception as e:
        print(f"[ERROR] MQTT Message processing failed: {e}")

def start_mqtt_client():
    global pg_conn # So it can be closed in finally
    
    # Initialize MQTT client with version compatibility
    try:
        # Try new callback API version (paho-mqtt >= 2.0)
        mqtt_client_instance = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    except AttributeError:
        # Fallback for older versions (paho-mqtt < 2.0)
        mqtt_client_instance = mqtt.Client()
    
    mqtt_client_instance.on_message = on_mqtt_message
    try:
        mqtt_client_instance.connect(MQTT_BROKER_HOST, MQTT_BROKER_PORT, 60)
        mqtt_client_instance.subscribe(MQTT_TOPIC)
        print(f"[MQTT] Connected to {MQTT_BROKER_HOST}:{MQTT_BROKER_PORT}, subscribed to {MQTT_TOPIC}")
        mqtt_client_instance.loop_forever()
    except KeyboardInterrupt:
        print("[INGEST_SIMULATION.PY] MQTT client interrupted by user.")
    except Exception as e:
        print(f"[MQTT] Connection or loop failed: {e}")
    finally:
        print("[INGEST_SIMULATION.PY] Disconnecting MQTT client...")
        if mqtt_client_instance:
             try: mqtt_client_instance.disconnect()
             except Exception as e_mqtt_disc: print(f"[INGEST_SIMULATION.PY] Error disconnecting MQTT: {e_mqtt_disc}")
        
        if pg_conn: # Close pg_conn here if MQTT is the sole mode of operation
            try: 
                pg_conn.close()
                print("[INGEST_SIMULATION.PY] PostgreSQL connection closed.")
            except Exception as e_pg_close: print(f"[INGEST_SIMULATION.PY] Error closing PostgreSQL: {e_pg_close}")
        print("[INGEST_SIMULATION.PY] Shutdown complete.")

if __name__ == "__main__":
    redis_client, influx_client, pg_conn = init_connections()

    if not all([redis_client, influx_client, pg_conn]):
        print("[INGEST_SIMULATION.PY] One or more critical connections failed. Cannot start MQTT client.")
    else:
        if not ensure_bucket_exists():
             print("[INGEST_SIMULATION.PY] Failed to ensure InfluxDB bucket exists. Cannot start MQTT client.")
        else:
            start_mqtt_client() 