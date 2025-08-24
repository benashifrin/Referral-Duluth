# Use Python runtime as base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy backend requirements and install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Create instance directory for database
RUN mkdir -p instance

# Expose port
EXPOSE 10000

# Run the application
CMD ["python", "app.py"]