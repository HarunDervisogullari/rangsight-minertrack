FROM python:3.11-slim

WORKDIR /app

# Copy requirements file from parent directory to build context first
# We'll need to copy this during docker-compose build
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend application
COPY . .

# Expose port 8001
EXPOSE 8001

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Run the FastAPI application with uvicorn
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"] 