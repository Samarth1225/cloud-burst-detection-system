FROM python:3.11-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Create model dir
RUN mkdir -p models/results

# Pre-train model on build
RUN python models/train.py || true

EXPOSE 8000

ENV MODEL_DIR=models

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
