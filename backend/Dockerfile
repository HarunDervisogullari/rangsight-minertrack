FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-client \
        build-essential \
        libpq-dev \
        netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Create and copy requirements.txt
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . /app/

# Collect static files
RUN python manage.py collectstatic --noinput

# Copy entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
COPY seed_data.sql /app/seed_data.sql

# Create a wrapper script to handle CRLF issues with volume mounted entrypoint.sh
RUN echo '#!/bin/sh' > /entrypoint-wrapper.sh && \
    echo 'sed -i "s/\r$//g" /app/entrypoint.sh' >> /entrypoint-wrapper.sh && \
    echo 'exec sh /app/entrypoint.sh "$@"' >> /entrypoint-wrapper.sh && \
    chmod +x /entrypoint-wrapper.sh

# Run the application using the wrapper
ENTRYPOINT ["sh", "/entrypoint-wrapper.sh"]
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"] 