# Mine Dashboard Docker Setup

This Docker setup containerizes three main services:
1. **Backend** - FastAPI application on port 8001
2. **Data Ingestion** - MQTT listener that processes and stores data
3. **MQTT Simulator** - Generates test mining data

## Prerequisites

- Docker and Docker Compose installed
- Redis, InfluxDB, and Mosquitto MQTT broker already running (as mentioned)

## Files Created

- `backend/Dockerfile` - Backend service container
- `data-ingestion/Dockerfile` - Data ingestion service container  
- `mqtt-simulator/Dockerfile` - MQTT simulator container
- `docker-compose.yml` - Full setup including all infrastructure
- `docker-compose.services-only.yml` - Only the 3 services (uses host infrastructure)

## Option 1: Using Existing Infrastructure (Recommended)

Since you mentioned Redis, InfluxDB, and Mosquitto are already running, use the services-only compose file:

```bash
# Build and start only the 3 services
docker-compose -f docker-compose.services-only.yml up --build

# Run in background
docker-compose -f docker-compose.services-only.yml up --build -d

# View logs
docker-compose -f docker-compose.services-only.yml logs -f

# Stop services
docker-compose -f docker-compose.services-only.yml down
```

## Option 2: Full Infrastructure Setup

If you want everything in Docker:

```bash
# Build and start all services including Redis, InfluxDB, Mosquitto, PostgreSQL
docker-compose up --build

# Run in background
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Service Details

### Backend Service
- **Port**: 8001
- **URL**: http://localhost:8001
- **Container**: mine-dashboard-backend

### Data Ingestion Service
- **Container**: mine-dashboard-ingestion
- Listens to MQTT topic: `mine/gallery/raw`
- Processes and stores data in InfluxDB and Redis

### MQTT Simulator Service  
- **Container**: mine-dashboard-mqtt-simulator
- Generates test data and publishes to MQTT broker
- Simulates various mining scenarios

## Environment Variables

The services are configured with the following environment variables (automatically set in docker-compose):

### Common Database/Infrastructure
- `REDIS_HOST` - Redis server hostname
- `REDIS_PORT` - Redis port (default: 6379)
- `INFLUXDB_URL` - InfluxDB server URL
- `INFLUXDB_BUCKET` - InfluxDB bucket name
- `INFLUXDB_ORG` - InfluxDB organization
- `INFLUXDB_TOKEN` - InfluxDB authentication token
- `MQTT_BROKER_HOST` - MQTT broker hostname
- `MQTT_BROKER_PORT` - MQTT broker port (default: 1883)

### PostgreSQL (if used)
- `PG_DBNAME` - Database name
- `PG_USER` - Database user
- `PG_PASSWORD` - Database password
- `PG_HOST` - Database hostname
- `PG_PORT` - Database port

## Running Individual Services

You can also run services individually:

```bash
# Backend only
docker-compose -f docker-compose.services-only.yml up backend

# Data ingestion only
docker-compose -f docker-compose.services-only.yml up data-ingestion

# MQTT simulator only
docker-compose -f docker-compose.services-only.yml up mqtt-simulator
```

## Troubleshooting

### Connection Issues
- Ensure your existing Redis, InfluxDB, and Mosquitto services are accessible
- Check if `host.docker.internal` works on your system (Windows/Mac). On Linux, you might need to use `172.17.0.1` or configure host networking

### For Linux Users
If `host.docker.internal` doesn't work, update the environment variables in the compose file:
```yaml
environment:
  - REDIS_HOST=172.17.0.1  # or your actual host IP
  - INFLUXDB_URL=http://172.17.0.1:8086
  - MQTT_BROKER_HOST=172.17.0.1
```

### Logs and Debugging
```bash
# View logs for specific service
docker-compose -f docker-compose.services-only.yml logs -f backend
docker-compose -f docker-compose.services-only.yml logs -f data-ingestion
docker-compose -f docker-compose.services-only.yml logs -f mqtt-simulator

# Execute into running container
docker exec -it mine-dashboard-backend bash
docker exec -it mine-dashboard-ingestion bash
docker exec -it mine-dashboard-mqtt-simulator bash
```

## Quick Start

1. Ensure your existing services (Redis, InfluxDB, Mosquitto) are running
2. Clone/navigate to your project directory
3. Run: `docker-compose -f docker-compose.services-only.yml up --build -d`
4. Check logs: `docker-compose -f docker-compose.services-only.yml logs -f`
5. Access backend at: http://localhost:8001

The MQTT simulator will start generating data, the data ingestion service will process it, and the backend will be ready to serve API requests! 