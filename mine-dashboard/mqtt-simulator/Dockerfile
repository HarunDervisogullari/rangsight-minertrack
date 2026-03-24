FROM python:3.11-slim

WORKDIR /app

# Copy requirements file from parent directory to build context first
# We'll need to copy this during docker-compose build
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the MQTT simulator application
COPY . .

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Run the MQTT simulator
CMD ["python", "simulator.py"] 