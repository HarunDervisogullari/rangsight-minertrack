FROM python:3.11-slim

WORKDIR /app

# Copy requirements file from parent directory to build context first
# We'll need to copy this during docker-compose build
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the data-ingestion application
COPY . .

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Run the data ingestion simulation script
CMD ["python", "ingest_simulation.py"] 