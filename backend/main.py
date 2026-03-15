"""
Cloudburst Detection System — FastAPI Backend
=============================================
Endpoints:
  GET  /                    Health check
  POST /predict             Predict cloudburst probability from weather input
  GET  /weather-data        Fetch latest weather data (simulated / real API)
  GET  /alerts              Active alerts for monitored stations
  GET  /stations            List monitored weather stations
  POST /batch-predict       Batch prediction for multiple records
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
import json
import logging
import random
import math
from datetime import datetime, timedelta
from typing import Optional, List
import numpy as np

from backend.models import (
    WeatherInput, PredictionResponse, AlertResponse,
    WeatherDataResponse, BatchWeatherInput, StationInfo
)
from backend.services.predictor import CloudburstPredictor
from backend.services.alert_manager import AlertManager
from backend.services.weather_fetcher import WeatherDataFetcher

# ─── App setup ───────────────────────────────────────────────────────────────

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="☁️ Cloudburst Detection API",
    description="Real-time cloudburst prediction using ML models trained on meteorological data.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Services ─────────────────────────────────────────────────────────────────

MODEL_DIR = os.getenv("MODEL_DIR", "models")
predictor      = CloudburstPredictor(MODEL_DIR)
alert_manager  = AlertManager()
weather_fetcher = WeatherDataFetcher()


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "Cloudburst Detection API",
        "version": "1.0.0",
        "status": "operational",
        "model_loaded": predictor.is_ready(),
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "model_ready": predictor.is_ready()}


@app.post("/predict", response_model=PredictionResponse, tags=["Prediction"])
async def predict(data: WeatherInput, background_tasks: BackgroundTasks):
    """
    Predict cloudburst probability from real-time weather observations.
    
    - **probability**: 0–1 score from the ML model
    - **risk_level**: LOW / MODERATE / HIGH / CRITICAL
    - **alert_triggered**: whether an alert was fired
    - **contributing_factors**: top features driving the prediction
    """
    try:
        result = predictor.predict(data.dict())
        # Fire alert async if needed
        if result["alert_triggered"]:
            background_tasks.add_task(
                alert_manager.trigger_alert,
                station_id=data.station_id,
                probability=result["probability"],
                risk_level=result["risk_level"],
                weather_data=data.dict(),
            )
        return result
    except Exception as e:
        logger.exception("Prediction error")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/batch-predict", tags=["Prediction"])
async def batch_predict(payload: BatchWeatherInput):
    """Predict for multiple weather records in one call."""
    try:
        results = [predictor.predict(record.dict()) for record in payload.records]
        return {"predictions": results, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/weather-data", response_model=WeatherDataResponse, tags=["Data"])
async def get_weather_data(
    station_id: str = Query(default="STN001", description="Station identifier"),
    hours: int = Query(default=24, ge=1, le=168, description="Hours of history"),
):
    """
    Return recent weather observations for a station.
    Uses OpenWeatherMap / IMD API or falls back to simulated data.
    """
    try:
        data = weather_fetcher.get_recent_data(station_id=station_id, hours=hours)
        return data
    except Exception as e:
        logger.exception("Weather data error")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/alerts", tags=["Alerts"])
async def get_alerts(
    active_only: bool = Query(default=True),
    station_id: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
):
    """
    Return recent cloudburst alerts.
    Filter by station or return all active alerts.
    """
    alerts = alert_manager.get_alerts(
        active_only=active_only,
        station_id=station_id,
        limit=limit,
    )
    return {"alerts": alerts, "count": len(alerts), "timestamp": datetime.utcnow().isoformat()}


@app.get("/stations", tags=["Stations"])
async def get_stations():
    """Return list of all monitored weather stations."""
    stations = [
        {"id": "STN001", "name": "Chandigarh",       "lat": 30.7333, "lon": 76.7794, "elevation_m": 321,  "region": "Punjab Plains"},
        {"id": "STN002", "name": "Shimla",            "lat": 31.1048, "lon": 77.1734, "elevation_m": 2202, "region": "Himachal Pradesh"},
        {"id": "STN003", "name": "Manali",             "lat": 32.2190, "lon": 77.1890, "elevation_m": 2050, "region": "Himachal Pradesh"},
        {"id": "STN004", "name": "Dehradun",           "lat": 30.3165, "lon": 78.0322, "elevation_m": 640,  "region": "Uttarakhand"},
        {"id": "STN005", "name": "Mussoorie",          "lat": 30.4598, "lon": 78.0644, "elevation_m": 2005, "region": "Uttarakhand"},
        {"id": "STN006", "name": "Dharamshala",        "lat": 32.2190, "lon": 76.3234, "elevation_m": 1457, "region": "Himachal Pradesh"},
        {"id": "STN007", "name": "Kedarnath",          "lat": 30.7346, "lon": 79.0669, "elevation_m": 3584, "region": "Uttarakhand"},
        {"id": "STN008", "name": "Srinagar",           "lat": 34.0837, "lon": 74.7973, "elevation_m": 1585, "region": "Jammu & Kashmir"},
    ]
    return {"stations": stations, "count": len(stations)}


@app.get("/risk-map", tags=["Visualization"])
async def get_risk_map():
    """Return current risk levels for all stations (for map visualization)."""
    stations_data = []
    station_ids = ["STN001", "STN002", "STN003", "STN004", "STN005", "STN006", "STN007", "STN008"]
    for sid in station_ids:
        try:
            latest = weather_fetcher.get_latest(sid)
            pred = predictor.predict(latest)
            stations_data.append({
                "station_id": sid,
                "probability": pred["probability"],
                "risk_level": pred["risk_level"],
                "lat": latest.get("latitude", 0),
                "lon": latest.get("longitude", 0),
            })
        except Exception:
            pass
    return {"stations": stations_data, "updated_at": datetime.utcnow().isoformat()}


if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
