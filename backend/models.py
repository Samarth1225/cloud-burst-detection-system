"""
Pydantic models for request/response validation.
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class RiskLevel(str, Enum):
    LOW      = "LOW"
    MODERATE = "MODERATE"
    HIGH     = "HIGH"
    CRITICAL = "CRITICAL"


class WeatherInput(BaseModel):
    station_id: str = Field(default="STN001", description="Weather station identifier")
    timestamp: Optional[str] = Field(default=None, description="ISO timestamp")
    latitude: Optional[float] = Field(default=30.7333, ge=-90, le=90)
    longitude: Optional[float] = Field(default=76.7794, ge=-180, le=180)

    # Core meteorological features
    temperature_c: float = Field(..., ge=-60, le=60, description="Temperature in Celsius")
    humidity_pct: float = Field(..., ge=0, le=100, description="Relative humidity %")
    pressure_hpa: float = Field(..., ge=870, le=1084, description="Atmospheric pressure hPa")
    wind_speed_kmh: float = Field(..., ge=0, le=400, description="Wind speed km/h")
    wind_direction_deg: Optional[float] = Field(default=270, ge=0, le=360)
    rainfall_mm_1h: float = Field(..., ge=0, le=500, description="Rainfall in last 1 hour (mm)")
    rainfall_mm_3h: Optional[float] = Field(default=0, ge=0, le=1500)
    rainfall_mm_6h: Optional[float] = Field(default=0, ge=0, le=3000)
    rainfall_mm_24h: Optional[float] = Field(default=0, ge=0, le=4000)
    dewpoint_c: Optional[float] = Field(default=None, ge=-80, le=40)
    radar_reflectivity_dbz: Optional[float] = Field(default=0, ge=0, le=75)
    lightning_strikes: Optional[int] = Field(default=0, ge=0)
    cloud_cover_pct: Optional[float] = Field(default=50, ge=0, le=100)

    class Config:
        schema_extra = {
            "example": {
                "station_id": "STN001",
                "temperature_c": 19.5,
                "humidity_pct": 96.0,
                "pressure_hpa": 1001.5,
                "wind_speed_kmh": 42.0,
                "wind_direction_deg": 255,
                "rainfall_mm_1h": 55.0,
                "rainfall_mm_3h": 88.0,
                "rainfall_mm_6h": 120.0,
                "radar_reflectivity_dbz": 48.0,
                "lightning_strikes": 22,
            }
        }


class PredictionResponse(BaseModel):
    station_id: str
    timestamp: str
    probability: float = Field(..., ge=0, le=1)
    risk_level: RiskLevel
    alert_triggered: bool
    confidence: float
    contributing_factors: List[Dict[str, Any]]
    model_version: str
    prediction_id: str
    recommendations: List[str]


class AlertResponse(BaseModel):
    alert_id: str
    station_id: str
    timestamp: str
    probability: float
    risk_level: RiskLevel
    message: str
    is_active: bool
    resolved_at: Optional[str]


class WeatherRecord(BaseModel):
    timestamp: str
    temperature_c: float
    humidity_pct: float
    pressure_hpa: float
    wind_speed_kmh: float
    rainfall_mm_1h: float
    rainfall_mm_3h: Optional[float]
    radar_reflectivity_dbz: Optional[float]
    risk_score: Optional[float]
    cloudburst_probability: Optional[float]


class WeatherDataResponse(BaseModel):
    station_id: str
    records: List[WeatherRecord]
    count: int
    period_start: str
    period_end: str


class BatchWeatherInput(BaseModel):
    records: List[WeatherInput]


class StationInfo(BaseModel):
    id: str
    name: str
    lat: float
    lon: float
    elevation_m: int
    region: str
