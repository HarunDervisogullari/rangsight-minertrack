from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
import os

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    # Try relative imports first
    from .routers import environment, devices, occupancy, miners
except ImportError:
    # Fallback to direct imports if relative imports fail
    try:
        from routers import environment, devices, occupancy, miners
    except ImportError:
        # Create dummy routers if not found
        from fastapi import APIRouter
        environment = APIRouter()
        devices = APIRouter()
        occupancy = APIRouter()
        miners = APIRouter()

import influxdb_client

app = FastAPI()

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Frontend origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

app.include_router(environment.router)
app.include_router(devices.router)
app.include_router(occupancy.router)
app.include_router(miners.router) 