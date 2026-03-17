# Alpine — smallest size, fewest vulnerabilities
FROM python:3.11-alpine

# Install build dependencies for psycopg2
# These are needed to compile psycopg2 on Alpine
# --no-cache keeps the image small
RUN apk add --no-cache \
    gcc \
    musl-dev \
    postgresql-dev \
    libffi-dev

# Set working directory
WORKDIR /app

# Copy and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .

# Expose port
EXPOSE 8000

# Start server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]