"""
Shared utility functions across the Cloudburst Detection System.
"""

import math
import hashlib
import json
import logging
from datetime import datetime
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


# ── Risk level helpers ────────────────────────────────────────────────────────

RISK_THRESHOLDS = {
    "LOW":      (0.00, 0.30),
    "MODERATE": (0.30, 0.55),
    "HIGH":     (0.55, 0.75),
    "CRITICAL": (0.75, 1.01),
}

def probability_to_risk_level(probability: float) -> str:
    for level, (lo, hi) in RISK_THRESHOLDS.items():
        if lo <= probability < hi:
            return level
    return "CRITICAL"


def risk_level_color(level: str) -> str:
    return {
        "LOW": "#639922", "MODERATE": "#EF9F27",
        "HIGH": "#D85A30", "CRITICAL": "#E24B4A",
    }.get(level, "#639922")


# ── Meteorological calculations ───────────────────────────────────────────────

def calculate_dewpoint(temp_c: float, humidity_pct: float) -> float:
    """Magnus formula for dew point approximation."""
    a, b = 17.625, 243.04
    alpha = math.log(humidity_pct / 100) + (a * temp_c) / (b + temp_c)
    return round((b * alpha) / (a - alpha), 2)


def calculate_heat_index(temp_c: float, humidity_pct: float) -> float:
    """Rothfusz heat index (valid for T > 27°C, RH > 40%)."""
    t = temp_c * 9/5 + 32  # to Fahrenheit
    h = humidity_pct
    hi = (-42.379 + 2.04901523*t + 10.14333127*h
          - 0.22475541*t*h - 0.00683783*t**2
          - 0.05481717*h**2 + 0.00122874*t**2*h
          + 0.00085282*t*h**2 - 0.00000199*t**2*h**2)
    return round((hi - 32) * 5/9, 2)  # back to Celsius


def wind_direction_to_compass(degrees: float) -> str:
    """Convert degrees to compass direction (16-point)."""
    dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE",
            "S","SSW","SW","WSW","W","WNW","NW","NNW"]
    idx = round(degrees / 22.5) % 16
    return dirs[idx]


def beaufort_scale(speed_kmh: float) -> tuple:
    """Return (Beaufort number, description) for a wind speed in km/h."""
    thresholds = [
        (1,  "Calm"),         (6,   "Light air"),       (12,  "Light breeze"),
        (20, "Gentle breeze"), (29,  "Moderate breeze"), (39,  "Fresh breeze"),
        (50, "Strong breeze"), (62,  "Near gale"),       (75,  "Gale"),
        (89, "Severe gale"),   (103, "Storm"),           (118, "Violent storm"),
    ]
    for bft, (spd, desc) in enumerate(thresholds):
        if speed_kmh < spd:
            return bft, desc
    return 12, "Hurricane"


# ── Data utilities ────────────────────────────────────────────────────────────

def safe_divide(a: float, b: float, default: float = 0.0) -> float:
    return a / b if b != 0 else default


def clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def normalize(value: float, min_val: float, max_val: float) -> float:
    return clamp(safe_divide(value - min_val, max_val - min_val), 0.0, 1.0)


def round_dict(d: dict, decimals: int = 3) -> dict:
    """Recursively round all floats in a dict."""
    out = {}
    for k, v in d.items():
        if isinstance(v, float):
            out[k] = round(v, decimals)
        elif isinstance(v, dict):
            out[k] = round_dict(v, decimals)
        else:
            out[k] = v
    return out


def hash_record(data: dict) -> str:
    s = json.dumps(data, sort_keys=True, default=str)
    return hashlib.md5(s.encode()).hexdigest()[:8]


# ── Logging helpers ───────────────────────────────────────────────────────────

def log_prediction(station_id: str, probability: float, risk_level: str, model: str):
    logger.info(
        f"[PREDICTION] station={station_id} prob={probability:.4f} "
        f"risk={risk_level} model={model} ts={datetime.utcnow().isoformat()}"
    )


if __name__ == "__main__":
    # Quick smoke test
    print("Dew point (20°C, 80%RH):", calculate_dewpoint(20, 80))
    print("Risk level (0.72):", probability_to_risk_level(0.72))
    print("Wind direction (255°):", wind_direction_to_compass(255))
    print("Beaufort (45 km/h):", beaufort_scale(45))
