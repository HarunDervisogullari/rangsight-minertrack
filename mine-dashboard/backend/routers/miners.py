from fastapi import APIRouter, HTTPException
from influxdb_client import InfluxDBClient
import psycopg2
from psycopg2.extras import RealDictCursor # To get results as dictionaries
from datetime import datetime, timedelta, timezone
import logging
import os
from typing import Dict, List, Any, Optional, Set

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/miners",
    tags=["miners"]
)

# --- Configurations (Using environment variables with fallbacks) ---
DB_CONFIG = {
    "host": os.getenv("PG_HOST", "localhost"),
    "port": int(os.getenv("PG_PORT", "5432")),
    "database": os.getenv("PG_DBNAME", "ransight"),
    "user": os.getenv("PG_USER", "postgres"),
    "password": os.getenv("PG_PASSWORD", "admin")
}

INFLUXDB_CONFIG = {
    "url": os.getenv("INFLUXDB_URL", "http://localhost:8086"),
    "token": os.getenv("INFLUXDB_TOKEN", "dEJu65igZZulaC5s_AU1QDP5TaAJjcvFDUezECxpyq96wKb1TlBSb3GOlQEFx--r59yPDLpZ4J82ZwZJytlzDw=="),
    "org": os.getenv("INFLUXDB_ORG", "RansightOrg"),
    "bucket": os.getenv("INFLUXDB_BUCKET", "helmet_data")
}

# --- Helper Functions ---

def get_helmet_mac_addresses(db_conn) -> Set[str]:
    """Fetches a set of MAC addresses (barcodes) for all 'Helmet' type devices."""
    mac_addresses: Set[str] = set()
    try:
        with db_conn.cursor() as cursor:
            cursor.execute("SELECT barcode FROM devices WHERE type = 'Helmet'")
            rows = cursor.fetchall()
            for row in rows:
                if row['barcode']: # Ensure barcode is not null
                    mac_addresses.add(row['barcode'])
        logger.info(f"Fetched {len(mac_addresses)} helmet MAC addresses from PostgreSQL.")
    except Exception as e:
        logger.error(f"PostgreSQL error fetching helmet MAC addresses: {e}")
        raise HTTPException(status_code=500, detail=f"DB error fetching helmet MACs: {str(e)}")
    return mac_addresses

def get_hotspot_device_id_map(db_conn) -> Dict[int, int]:
    """
    Fetches a mapping from hotspots.id (hotspot_table_id, used in InfluxDB's 'hotspotid' tag)
    to devices.id (hotspot_device_id, the ID of the Hotspot *device*).
    """
    hotspot_map: Dict[int, int] = {}
    try:
        with db_conn.cursor() as cursor:
            # Assuming device_hotspot links a 'Hotspot' type device to an entry in the 'hotspots' table
            cursor.execute("""
                SELECT h.id AS hotspot_table_id, dh.device_id AS hotspot_device_id
                FROM hotspots h
                JOIN device_hotspot dh ON h.id = dh.hotspot_id
                JOIN devices d ON dh.device_id = d.id
                WHERE d.type = 'Hotspot';
            """)
            rows = cursor.fetchall()
            for row in rows:
                hotspot_map[row['hotspot_table_id']] = row['hotspot_device_id']
        logger.info(f"Fetched {len(hotspot_map)} hotspot ID to device ID mappings from PostgreSQL.")
    except Exception as e:
        logger.error(f"PostgreSQL error fetching hotspot device ID map: {e}")
        raise HTTPException(status_code=500, detail=f"DB error fetching hotspot map: {str(e)}")
    return hotspot_map

# --- API Endpoint ---

@router.get("/active-links", response_model=List[Dict[str, Any]])
async def get_active_miner_links():
    """
    Provides a list of actively tracked miners (Helmets) with their
    strongest connected Hotspot (device ID) and battery level.
    """
    processed_miners: Dict[str, Dict[str, Any]] = {}
    response_data: List[Dict[str, Any]] = []

    try:
        # Connect to PostgreSQL
        with psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor) as db_conn:
            helmet_macs = get_helmet_mac_addresses(db_conn)
            if not helmet_macs:
                logger.warning("No helmet MAC addresses found in the database. Returning empty list.")
                return []
            
            hotspot_id_to_device_id_map = get_hotspot_device_id_map(db_conn)
            if not hotspot_id_to_device_id_map:
                logger.warning("No hotspot ID to device ID mappings found. Strongest hotspot ID might be incorrect.")

            # Connect to InfluxDB
            influx_client = InfluxDBClient(
                url=INFLUXDB_CONFIG["url"],
                token=INFLUXDB_CONFIG["token"],
                org=INFLUXDB_CONFIG["org"]
            )
            query_api = influx_client.query_api()

            # Flux query to get rxpower and battery, pivoted
            # We want the latest signal and latest battery for each macaddr
            # Taking last 10 seconds of data to match 3-second simulation frequency with buffer
            flux_query = f'''
                from(bucket: "{INFLUXDB_CONFIG["bucket"]}")
                  |> range(start: -10s) 
                  |> filter(fn: (r) => r["_measurement"] == "miner_metrics")
                  |> filter(fn: (r) => r["_field"] == "rxpower" or r["_field"] == "battery")
                  |> filter(fn: (r) => contains(value: r["macaddr"], set: [{", ".join([f'"{m}"' for m in helmet_macs])}])) // Filter by known helmet MACs
                  |> pivot(rowKey:["_time", "macaddr", "hotspotid"], columnKey: ["_field"], valueColumn: "_value")
                  |> keep(columns: ["macaddr", "hotspotid", "rxpower", "battery", "_time"])
                  |> group(columns: ["macaddr"]) // Group by macaddr to process each miner independently
                  // For signals, we'll pick the strongest one later. For battery, we need the latest.
            '''
            logger.info(f"Executing InfluxDB query: {flux_query}")
            tables = query_api.query(flux_query)

            # Process InfluxDB results
            # Structure: { "mac_addr": {"signals": [{"hotspot_id": X, "rxpower": Y, "time": Z}], "battery": B, "battery_time": T} }
            miner_data_accumulator: Dict[str, Dict[str, Any]] = {}

            for table in tables:
                for record in table.records:
                    mac = record.values.get("macaddr")
                    hotspot_table_id_str = record.values.get("hotspotid") # This is from hotspots.id
                    rxpower = record.values.get("rxpower")
                    battery = record.values.get("battery")
                    timestamp = record.values.get("_time")

                    if not mac or mac not in helmet_macs: # Ensure it's a known helmet
                        continue

                    if mac not in miner_data_accumulator:
                        miner_data_accumulator[mac] = {"signals": [], "latest_battery": None, "latest_battery_time": None}

                    # Store signal if rxpower and hotspotid are present
                    if rxpower is not None and hotspot_table_id_str is not None:
                        try:
                            hotspot_table_id = int(hotspot_table_id_str)
                            miner_data_accumulator[mac]["signals"].append({
                                "hotspot_table_id": hotspot_table_id, # This is hotspots.id
                                "rxpower": int(rxpower),
                                "time": timestamp
                            })
                        except ValueError:
                            logger.warning(f"Could not parse hotspotid '{hotspot_table_id_str}' or rxpower '{rxpower}' for MAC {mac}")


                    # Update battery if this record has a battery value and it's more recent
                    if battery is not None:
                        current_battery_time = miner_data_accumulator[mac]["latest_battery_time"]
                        if current_battery_time is None or timestamp > current_battery_time:
                            miner_data_accumulator[mac]["latest_battery"] = float(battery)
                            miner_data_accumulator[mac]["latest_battery_time"] = timestamp
            
            # Consolidate data and determine strongest signal
            for mac, data in miner_data_accumulator.items():
                if not data["signals"]:
                    logger.info(f"No recent location signals for MAC: {mac}. Skipping.")
                    continue

                # For handover scenarios, we need to find the strongest signal among the most recent signals from each hotspot
                # Group signals by hotspot and get the most recent signal from each hotspot
                hotspot_latest_signals: Dict[int, Dict[str, Any]] = {}
                
                for signal in data["signals"]:
                    hotspot_id = signal["hotspot_table_id"]
                    if hotspot_id not in hotspot_latest_signals or signal["time"] > hotspot_latest_signals[hotspot_id]["time"]:
                        hotspot_latest_signals[hotspot_id] = signal
                
                # Log all latest signals for debugging handover scenarios
                if len(hotspot_latest_signals) > 1:
                    logger.info(f"MAC {mac} handover detection - Latest signals from {len(hotspot_latest_signals)} hotspots:")
                    for hotspot_id, signal in hotspot_latest_signals.items():
                        logger.info(f"  Hotspot {hotspot_id}: rxpower={signal['rxpower']}, time={signal['time']}")
                
                # Now find the strongest signal among the latest signals from each hotspot
                # Remember rxpower is negative, so stronger signal means higher value (e.g., -50 is stronger than -90)
                latest_signals = list(hotspot_latest_signals.values())
                strongest_signal = max(latest_signals, key=lambda x: x["rxpower"])
                
                logger.info(f"MAC {mac}: Strongest signal from hotspot {strongest_signal['hotspot_table_id']} with rxpower {strongest_signal['rxpower']}")
                
                hotspot_table_id_of_strongest_signal = strongest_signal["hotspot_table_id"]
                
                # Map hotspots.id to devices.id (the Hotspot's device ID)
                strongest_hotspot_device_id = hotspot_id_to_device_id_map.get(hotspot_table_id_of_strongest_signal)

                if strongest_hotspot_device_id is None:
                    logger.warning(f"MAC {mac}: Could not map hotspot_table_id {hotspot_table_id_of_strongest_signal} to a hotspot device ID. Strongest hotspot will be null.")

                response_data.append({
                    "macAddress": mac,
                    "strongestHotspotId": strongest_hotspot_device_id, # This is the devices.id of the Hotspot
                    "batteryLevel": data["latest_battery"] if data["latest_battery"] is not None else 0, # Default to 0 if no battery info
                    "timestamp": strongest_signal["time"].isoformat() if strongest_signal["time"] else datetime.now(timezone.utc).isoformat(),
                    "rxPowers": [
                        {
                            "hotspotId": hotspot_id_to_device_id_map.get(signal["hotspot_table_id"]),
                            "rxPower": signal["rxpower"]
                        }
                        for signal in latest_signals
                        if hotspot_id_to_device_id_map.get(signal["hotspot_table_id"]) is not None
                    ]
                })
            
            logger.info(f"Successfully processed active links for {len(response_data)} miners.")

    except HTTPException as http_exc:
        logger.error(f"HTTP exception in get_active_miner_links: {http_exc.detail}")
        raise http_exc
    except psycopg2.Error as db_err:
        logger.error(f"PostgreSQL connection or query error: {db_err}")
        raise HTTPException(status_code=503, detail=f"Database error: {str(db_err)}")
    except Exception as e:
        logger.error(f"Unexpected error in get_active_miner_links: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

    return response_data

# Placeholder for other miner-related endpoints if needed
# @router.get("/{miner_id}/details")
# async def get_miner_details(miner_id: str):
#     # ...
#     pass 