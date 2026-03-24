# Ransight Dashboard - Docker Setup

This guide explains how to run the Ransight Dashboard application using Docker on any PC.

## Prerequisites

- Docker installed on your system
- Docker Compose (usually comes with Docker Desktop)

## Quick Start (Using Docker Compose) - RECOMMENDED

1. **Clone/Copy the project files to your target PC**

2. **Build and run the application:**
   ```bash
   docker-compose up --build
   ```

3. **Access the application:**
   - Open your browser and go to: `http://localhost:3000`

4. **To stop the application:**
   ```bash
   docker-compose down
   ```

## Alternative: Using Docker Commands Directly

### Build the Docker image:
```bash
docker build -t ransight-dashboard .
```

### Run the container:
```bash
docker run -p 3000:3000 --name ransight-app ransight-dashboard
```

### Stop the container:
```bash
docker stop ransight-app
```

### Remove the container:
```bash
docker rm ransight-app
```

## For Production Deployment

### Build and tag for production:
```bash
docker build -t ransight-dashboard:latest .
```

### Run in detached mode (background):
```bash
docker run -d -p 3000:3000 --restart unless-stopped --name ransight-dashboard ransight-dashboard:latest
```

## Useful Docker Commands

### View running containers:
```bash
docker ps
```

### View container logs:
```bash
docker logs ransight-dashboard-app
```

### Access container shell (for debugging):
```bash
docker exec -it ransight-dashboard-app sh
```

### Remove image:
```bash
docker rmi ransight-dashboard
```

## Port Configuration

- **Default Port:** 3000
- **To use a different port:** Change the first number in the port mapping
  - Example for port 8080: `-p 8080:3000` or in docker-compose: `"8080:3000"`

## Notes

- The application runs in production mode inside the container
- All dependencies are included in the container
- The container uses a non-root user for security
- Static files are optimized for production

## Troubleshooting

1. **Port already in use:** Change the external port (first number) in the port mapping
2. **Build fails:** Make sure you have the latest Docker version
3. **Container won't start:** Check logs with `docker logs <container-name>`

## System Requirements

- **Minimum:** 512MB RAM, 1GB disk space
- **Recommended:** 1GB RAM, 2GB disk space
- **OS:** Any system that runs Docker (Windows, macOS, Linux) 