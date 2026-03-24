# Ransight Microservices Platform

A comprehensive IoT and data management platform with dockerized microservices architecture.

## Architecture

### Services
- **Auth Service** (Django/Python): User authentication and authorization (Port 8000)
- **Device Service** (Spring Boot/Java): IoT device management (Port 8080)
- **Gallery Service** (Spring Boot/Java): Media and file management (Port 8081)
- **Person Service** (Spring Boot/Java): Person/user profile management (Port 8082)

### Infrastructure
- **PostgreSQL**: Primary database for all services (Port 5432)
- **Redis**: Caching and session storage (Port 6379)
- **InfluxDB**: Time-series data storage (Port 8086)
- **MQTT (Mosquitto)**: IoT message broker (Ports 1883, 9001)

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- At least 4GB RAM available for containers

### Running the Platform

1. **Clone and navigate to the project**:
   ```bash
   cd /path/to/ransight
   ```

2. **Start all services**:
   ```bash
   docker-compose up -d
   ```

3. **View logs** (optional):
   ```bash
   docker-compose logs -f
   ```

4. **Stop all services**:
   ```bash
   docker-compose down
   ```

### Service URLs
- Auth Service: http://localhost:8000
- Device Service: http://localhost:8080
- Gallery Service: http://localhost:8081
- Person Service: http://localhost:8082
- InfluxDB UI: http://localhost:8086
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- MQTT: localhost:1883 (TCP), localhost:9001 (WebSocket)

## Development

### Database Setup
The PostgreSQL database is automatically initialized with:
- Database: `ransight`
- Username: `postgres`
- Password: `admin`

Django migrations run automatically on container startup.

### Environment Variables
Key environment variables can be modified in `docker-compose.yml`:

#### Auth Service (Django)
- `DEBUG`: Enable debug mode (1/0)
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: Database connection
- `REDIS_HOST`, `REDIS_PORT`: Redis connection

#### Spring Boot Services
- `SPRING_DATASOURCE_URL`: PostgreSQL connection URL
- `SPRING_JPA_HIBERNATE_DDL_AUTO`: Database schema management
- `SERVER_PORT`: Service port

### Building Individual Services

#### Auth Service
```bash
cd backend
docker build -t ransight/auth-service .
```

#### Device Service
```bash
cd device-service
docker build -t ransight/device-service .
```

#### Gallery Service
```bash
cd gallery-service
docker build -t ransight/gallery-service .
```

#### Person Service
```bash
cd person-service
docker build -t ransight/person-service .
```

## Monitoring and Logs

### View service logs:
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs auth-service
docker-compose logs device-service
docker-compose logs gallery-service
docker-compose logs person-service
```

### Check service status:
```bash
docker-compose ps
```

### Access service containers:
```bash
# Auth service
docker-compose exec auth-service bash

# Device service
docker-compose exec device-service bash

# Database
docker-compose exec postgres psql -U postgres -d ransight
```

## Data Persistence

The following data is persisted using Docker volumes:
- `postgres-data`: PostgreSQL database files
- `redis-data`: Redis data files
- `influxdb-data`: InfluxDB time-series data

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 5432, 6379, 8000, 8080, 8081, 8082, 8086, 1883, 9001 are available

2. **Memory issues**: Increase Docker memory allocation if services fail to start

3. **Database connection issues**: Ensure PostgreSQL container is fully started before backend services

4. **Build failures**: Clear Docker cache:
   ```bash
   docker system prune -a
   docker-compose build --no-cache
   ```

### Cleanup
Remove all containers, networks, and volumes:
```bash
docker-compose down -v
docker system prune -a
```

## API Documentation

Once running, API documentation is available at:
- Auth Service: http://localhost:8000/api/docs/
- Device Service: http://localhost:8080/swagger-ui.html
- Gallery Service: http://localhost:8081/swagger-ui.html
- Person Service: http://localhost:8082/swagger-ui.html 