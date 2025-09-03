# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy backend requirements first (for better caching)
COPY backend/requirements.txt backend/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend/ backend/
COPY requirements.txt .

# Set environment variables
ENV PYTHONPATH="/app/backend"
ENV FLASK_APP="backend/app.py"

# Expose port
EXPOSE 5000

# Use gunicorn to run the app
CMD ["gunicorn", "--config", "backend/gunicorn.conf.py", "--chdir", "backend", "app:app"]