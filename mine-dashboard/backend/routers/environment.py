from fastapi import APIRouter, Path, HTTPException
from influxdb_client import InfluxDBClient
import psycopg2
from datetime import datetime, timezone
import logging
import os
from typing import Dict, List, Optional
import statistics

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Database configurations (Using environment variables with fallbacks)
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

def get_hotspots_for_gallery(gallery_id: int) -> List[int]:
    """Get all hotspot IDs belonging to a specific gallery from the hotspot_gallery table"""
    try:
        with psycopg2.connect(**DB_CONFIG) as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT hotspot_id 
                    FROM hotspot_gallery 
                    WHERE gallery_id = %s
                """, (gallery_id,))
                hotspot_ids = [row[0] for row in cursor.fetchall()]
                logger.info(f"Found {len(hotspot_ids)} hotspots for gallery {gallery_id}: {hotspot_ids}")
                return hotspot_ids
    except Exception as e:
        logger.error(f"Database error getting hotspots for gallery {gallery_id}: {e}")
        raise HTTPException(status_code=500, detail="Database connection error")

def query_influxdb_for_hotspots(hotspot_ids: List[int]) -> Dict:
    """Query InfluxDB for the latest environmental data from specified hotspots"""
    if not hotspot_ids:
        return {"data": []}
    
    try:
        client = InfluxDBClient(**INFLUXDB_CONFIG)
        
        # Create a filter for all hotspot IDs
        hotspot_filter = " or ".join([f'r["hotspotid"] == "{hotspot_id}"' for hotspot_id in hotspot_ids])
        
        query = f'''
        from(bucket: "{INFLUXDB_CONFIG["bucket"]}")
          |> range(start: -1h)
          |> filter(fn: (r) => r["_measurement"] == "miner_metrics")
          |> filter(fn: (r) => {hotspot_filter})
          |> filter(fn: (r) => r["_field"] == "co2" or r["_field"] == "o2" or r["_field"] == "othergas" or r["_field"] == "battery")
          |> group(columns: ["macaddr", "_field"])
          |> last()
        '''
        
        logger.info(f"InfluxDB Query: {query}")
        
        result = client.query_api().query(query)
        
        # Parse the result into a structured format
        sensor_data = {}
        for table in result:
            for record in table.records:
                macaddr = record.values.get("macaddr")
                field = record.values.get("_field")
                value = record.values.get("_value")
                hotspotid = record.values.get("hotspotid")
                timestamp = record.values.get("_time")
                
                if macaddr not in sensor_data:
                    sensor_data[macaddr] = {
                        "hotspotid": hotspotid,
                        "timestamp": timestamp.isoformat() if timestamp else None,
                        "sensors": {}
                    }
                
                sensor_data[macaddr]["sensors"][field] = value
        
        logger.info(f"Processed sensor data for {len(sensor_data)} unique MAC addresses")
        return {"data": sensor_data}
        
    except Exception as e:
        logger.error(f"InfluxDB query error: {e}")
        raise HTTPException(status_code=500, detail="InfluxDB connection error")

def calculate_environmental_averages(sensor_data: Dict) -> Dict:
    """Calculate averages of environmental data from distinct MAC addresses"""
    if not sensor_data.get("data"):
        return {
            "oxygen": "",
            "co2": "",
            "other_gas": "",
            "crowd_count": 0,  # 0 when no sensor data (vs "" when no hotspots)
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    # Count total distinct MAC addresses (this is our crowd count)
    total_mac_addresses = len(sensor_data["data"])
    
    # Collect all sensor readings by type
    co2_values = []
    o2_values = []
    othergas_values = []
    
    for macaddr, device_data in sensor_data["data"].items():
        sensors = device_data.get("sensors", {})
        
        # Collect sensor values for averaging
        if "co2" in sensors and sensors["co2"] is not None:
            co2_values.append(float(sensors["co2"]))
        
        if "o2" in sensors and sensors["o2"] is not None:
            o2_values.append(float(sensors["o2"]))
            
        if "othergas" in sensors and sensors["othergas"] is not None:
            othergas_values.append(float(sensors["othergas"]))
    
    # Calculate averages, falling back to empty strings if no data
    avg_co2 = statistics.mean(co2_values) if co2_values else ""
    avg_o2 = statistics.mean(o2_values) if o2_values else ""
    avg_othergas = statistics.mean(othergas_values) if othergas_values else ""
    
    logger.info(f"Calculated averages from {total_mac_addresses} distinct MAC addresses: CO2={avg_co2}, O2={avg_o2}, Other Gas={avg_othergas}")
    
    return {
        "oxygen": round(avg_o2, 2) if avg_o2 != "" else "",
        "co2": round(avg_co2, 2) if avg_co2 != "" else "",
        "other_gas": round(avg_othergas, 2) if avg_othergas != "" else "",
        "crowd_count": total_mac_addresses,  # Count of distinct MAC addresses
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@router.get("/api/environment/gallery/{gallery_id}")
async def get_environment(gallery_id: int = Path(..., description="The ID of the gallery")):
    """
    Get environmental data for a specific gallery.
    
    This endpoint:
    1. Looks up all hotspots assigned to the gallery using the hotspot_gallery table
    2. Queries InfluxDB for the latest sensor data from those hotspots  
    3. Calculates averages from distinct MAC addresses
    4. Returns environmental metrics including oxygen, CO2, other gas levels, and crowd count
    """
    try:
        logger.info(f"Processing environmental data request for gallery {gallery_id}")
        
        # Step 1: Get hotspots for this gallery
        hotspot_ids = get_hotspots_for_gallery(gallery_id)
        
        if not hotspot_ids:
            logger.warning(f"No hotspots found for gallery {gallery_id}")
            # Return default values if no hotspots are assigned
            return {
                "gallery_id": gallery_id,
                "oxygen": "",
                "co2": "",
                "other_gas": "",
                "crowd_count": "",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
        # Step 2: Query InfluxDB for sensor data from these hotspots
        sensor_data = query_influxdb_for_hotspots(hotspot_ids)
        
        # Step 3: Calculate averages from distinct MAC addresses
        environmental_metrics = calculate_environmental_averages(sensor_data)
        
        # Step 4: Return formatted response
        response = {
            "gallery_id": gallery_id,
            **environmental_metrics
        }
        
        logger.info(f"Successfully processed environmental data for gallery {gallery_id}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error processing gallery {gallery_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/api/environment/gallery/{gallery_id}/debug")
async def get_environment_debug(gallery_id: int = Path(..., description="The ID of the gallery")):
    """
    Debug endpoint to see raw data flow for troubleshooting.
    """
    try:
        logger.info(f"Debug request for gallery {gallery_id}")
        
        # Get hotspots
        hotspot_ids = get_hotspots_for_gallery(gallery_id)
        
        # Get raw sensor data
        sensor_data = query_influxdb_for_hotspots(hotspot_ids) if hotspot_ids else {"data": {}}
        
        # Calculate averages
        environmental_metrics = calculate_environmental_averages(sensor_data)
        
        return {
            "gallery_id": gallery_id,
            "hotspot_ids": hotspot_ids,
            "raw_sensor_data": sensor_data,
            "calculated_averages": environmental_metrics
        }
        
    except Exception as e:
        logger.error(f"Debug endpoint error for gallery {gallery_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 