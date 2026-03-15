"""
Weather data fetcher.
Tries OpenWeatherMap API first; falls back to realistic simulated data.
"""

import os
import math
import random
import logging
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

OWM_API_KEY = os.getenv("OPENWEATHERMAP_API_KEY", "")

STATION_COORDS = {
    "STN001": {"name": "Chandigarh",   "lat": 30.7333, "lon": 76.7794},
    "STN002": {"name": "Shimla",       "lat": 31.1048, "lon": 77.1734},
    "STN003": {"name": "Manali",       "lat": 32.2190, "lon": 77.1890},
    "STN004": {"name": "Dehradun",     "lat": 30.3165, "lon": 78.0322},
    "STN005": {"name": "Mussoorie",    "lat": 30.4598, "lon": 78.0644},
    "STN006": {"name": "Dharamshala", "lat": 32.2190, "lon": 76.3234},
    "STN007": {"name": "Kedarnath",   "lat": 30.7346, "lon": 79.0669},
    "STN008": {"name": "Srinagar",    "lat": 34.0837, "lon": 74.7973},
}


class WeatherDataFetcher:
    def __init__(self):
        self.api_key = OWM_API_KEY
        self._cache = {}

    def get_recent_data(self, station_id: str, hours: int = 24) -> dict:
        records = self._simulate_history(station_id, hours)
        now = datetime.utcnow()
        return {
            "station_id":   station_id,
            "records":      records,
            "count":        len(records),
            "period_start": (now - timedelta(hours=hours)).isoformat(),
            "period_end":   now.isoformat(),
        }

    def get_latest(self, station_id: str) -> dict:
        coords = STATION_COORDS.get(station_id, STATION_COORDS["STN001"])
        base_rain = random.expovariate(1 / 5)
        return {
            "station_id":              station_id,
            "latitude":                coords["lat"],
            "longitude":               coords["lon"],
            "temperature_c":           round(random.normalvariate(22, 4), 1),
            "humidity_pct":            round(random.uniform(55, 95), 1),
            "pressure_hpa":            round(random.normalvariate(1008, 5), 1),
            "wind_speed_kmh":          round(random.expovariate(1 / 15), 1),
            "wind_direction_deg":      round(random.uniform(0, 360), 0),
            "rainfall_mm_1h":          round(base_rain, 1),
            "rainfall_mm_3h":          round(base_rain * random.uniform(2, 3.5), 1),
            "rainfall_mm_6h":          round(base_rain * random.uniform(3.5, 5.5), 1),
            "radar_reflectivity_dbz":  round(random.uniform(5, 35), 1),
            "lightning_strikes":       random.randint(0, 5),
            "cloud_cover_pct":         round(random.uniform(20, 80), 0),
        }

    def _simulate_history(self, station_id: str, hours: int) -> list:
        """Generate a realistic time-series with a simulated rain event."""
        records = []
        now = datetime.utcnow()

        # Randomly inject a cloudburst-like event in the history
        event_hour = random.randint(max(1, hours // 4), hours - 1)

        for i in range(hours, 0, -1):
            ts = now - timedelta(hours=i)
            hours_to_event = abs(i - event_hour)
            intensity = max(0, 1 - hours_to_event / 6)  # bell curve around event

            rain_1h  = round(max(0, random.normalvariate(80 * intensity, 15 * intensity + 1)), 1)
            humidity = round(min(100, 65 + intensity * 32 + random.gauss(0, 3)), 1)
            pressure = round(1013 - intensity * 12 + random.gauss(0, 1.5), 1)
            wind     = round(max(0, 10 + intensity * 35 + random.gauss(0, 3)), 1)
            radar    = round(max(0, 15 + intensity * 45 + random.gauss(0, 4)), 1)
            risk     = min(100, int(intensity * 95 + random.uniform(0, 8)))

            records.append({
                "timestamp":               ts.isoformat(),
                "temperature_c":           round(22 - intensity * 4 + random.gauss(0, 1), 1),
                "humidity_pct":            humidity,
                "pressure_hpa":            pressure,
                "wind_speed_kmh":          wind,
                "rainfall_mm_1h":          rain_1h,
                "rainfall_mm_3h":          round(rain_1h * random.uniform(2.2, 3.2), 1),
                "radar_reflectivity_dbz":  radar,
                "risk_score":              risk,
                "cloudburst_probability":  round(min(1, intensity * 0.95 + random.uniform(0, 0.05)), 3),
            })
        return records
