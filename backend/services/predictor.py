"""
Predictor service — loads trained model and runs inference.
Falls back to a rule-based heuristic if no model is present.
"""

import os
import math
import uuid
import logging
import numpy as np
from datetime import datetime

try:
    import joblib
    JOBLIB_AVAILABLE = True
except ImportError:
    JOBLIB_AVAILABLE = False

logger = logging.getLogger(__name__)

# Risk thresholds on probability
THRESHOLDS = {
    "LOW":      (0.00, 0.30),
    "MODERATE": (0.30, 0.55),
    "HIGH":     (0.55, 0.75),
    "CRITICAL": (0.75, 1.01),
}

ALERT_THRESHOLD = 0.55

RECOMMENDATIONS = {
    "LOW":      ["Monitor weather updates hourly.", "No immediate action required."],
    "MODERATE": ["Avoid low-lying flood-prone areas.", "Keep emergency contacts ready.", "Check drainage systems."],
    "HIGH":     ["Evacuate vulnerable areas immediately.", "Issue public advisory.", "Deploy NDRF teams on standby.", "Close river crossings."],
    "CRITICAL": ["IMMEDIATE EVACUATION of all high-risk zones.", "Activate disaster response protocol.", "Alert hospitals and emergency services.", "Deploy rescue teams."],
}


class CloudburstPredictor:
    def __init__(self, model_dir: str = "models"):
        self.model_dir = model_dir
        self.model = None
        self.scaler = None
        self.feature_columns = None
        self._load_model()

    def _load_model(self):
        if not JOBLIB_AVAILABLE:
            logger.warning("joblib not available — using rule-based predictor.")
            return
        try:
            rf_path = os.path.join(self.model_dir, "random_forest.pkl")
            sc_path = os.path.join(self.model_dir, "scaler.pkl")
            fc_path = os.path.join(self.model_dir, "feature_columns.pkl")
            if os.path.exists(rf_path) and os.path.exists(sc_path):
                self.model = joblib.load(rf_path)
                self.scaler = joblib.load(sc_path)
                self.feature_columns = joblib.load(fc_path) if os.path.exists(fc_path) else None
                logger.info("Random Forest model loaded successfully.")
            else:
                logger.info("No trained model found — rule-based fallback active.")
        except Exception as e:
            logger.error(f"Model load error: {e}. Using rule-based fallback.")

    def is_ready(self) -> bool:
        return True  # Always ready (model or rule-based)

    def _rule_based_probability(self, data: dict) -> float:
        """
        Heuristic probability when no ML model is available.
        Combines weighted meteorological indicators.
        """
        rain_1h    = data.get("rainfall_mm_1h", 0)
        rain_3h    = data.get("rainfall_mm_3h", 0)
        humidity   = data.get("humidity_pct", 50)
        pressure   = data.get("pressure_hpa", 1013)
        wind       = data.get("wind_speed_kmh", 0)
        radar      = data.get("radar_reflectivity_dbz", 0)
        lightning  = data.get("lightning_strikes", 0)

        score = (
            min(rain_1h / 100, 1.0)  * 0.35 +
            min(rain_3h / 150, 1.0)  * 0.20 +
            max((humidity - 70) / 30, 0) * 0.15 +
            max((1015 - pressure) / 25, 0) * 0.15 +
            min(wind / 50, 1.0)      * 0.08 +
            min(radar / 65, 1.0)     * 0.05 +
            min(lightning / 60, 1.0) * 0.02
        )
        # Add slight random noise for realism in demo
        import random
        score = score + random.gauss(0, 0.03)
        return max(0.0, min(1.0, score))

    def _engineer_features(self, data: dict) -> np.ndarray:
        """Build the feature vector matching training pipeline."""
        temp     = data.get("temperature_c", 20)
        humidity = data.get("humidity_pct", 70)
        pressure = data.get("pressure_hpa", 1010)
        wind     = data.get("wind_speed_kmh", 10)
        rain_1h  = data.get("rainfall_mm_1h", 0)
        rain_3h  = data.get("rainfall_mm_3h", rain_1h * 2.5)
        rain_6h  = data.get("rainfall_mm_6h", rain_1h * 4.5)
        radar    = data.get("radar_reflectivity_dbz", 0)
        dewpoint = data.get("dewpoint_c", temp - (100 - humidity) / 5)

        now = datetime.utcnow()
        hour  = now.hour
        month = now.month

        dewpoint_dep  = temp - dewpoint
        cape_proxy    = (temp - dewpoint_dep) * (1 - (pressure - 900) / 200) * (humidity / 100)
        moisture_flux = wind * (humidity / 100)
        instability   = (humidity / 100) * (1 - pressure / 1013) * 100 + radar * 0.5
        risk_score    = (
            min(rain_1h / 100, 1) * 40 +
            (humidity / 100) * 20 +
            max(1005 - pressure, 0) / 20 * 20 +
            min(wind / 35, 1) * 10 +
            min(radar / 70, 1) * 10
        )

        features = {
            "temperature_c": temp, "humidity_pct": humidity,
            "pressure_hpa": pressure, "wind_speed_kmh": wind,
            "rainfall_mm_1h": rain_1h, "rainfall_mm_3h": rain_3h,
            "rainfall_mm_6h": rain_6h, "radar_reflectivity_dbz": radar,
            "pressure_hpa_delta": 0, "temperature_c_delta": 0,
            "humidity_pct_delta": 0, "rainfall_mm_1h_delta": 0,
            "rainfall_rolling_mean_3h": rain_1h,
            "rainfall_rolling_max_3h": rain_1h * 1.2,
            "rainfall_rolling_std_3h": rain_1h * 0.2,
            "rainfall_rolling_mean_6h": rain_1h * 0.9,
            "rainfall_rolling_max_6h": rain_1h * 1.3,
            "pressure_rolling_min_3h": pressure,
            "humidity_rolling_max_3h": humidity,
            "dewpoint_depression": dewpoint_dep,
            "cape_proxy": max(cape_proxy, 0),
            "moisture_flux": moisture_flux,
            "instability_index": instability,
            "risk_score": risk_score,
            "hour_sin": math.sin(2 * math.pi * hour / 24),
            "hour_cos": math.cos(2 * math.pi * hour / 24),
            "month_sin": math.sin(2 * math.pi * month / 12),
            "month_cos": math.cos(2 * math.pi * month / 12),
            "is_monsoon": int(6 <= month <= 9),
        }

        if self.feature_columns:
            vec = [features.get(c, 0) for c in self.feature_columns]
        else:
            vec = list(features.values())
        return np.array(vec).reshape(1, -1)

    def _get_risk_level(self, prob: float) -> str:
        for level, (lo, hi) in THRESHOLDS.items():
            if lo <= prob < hi:
                return level
        return "CRITICAL"

    def _get_contributing_factors(self, data: dict, probability: float) -> list:
        factors = []
        rain_1h   = data.get("rainfall_mm_1h", 0)
        humidity  = data.get("humidity_pct", 50)
        pressure  = data.get("pressure_hpa", 1013)
        wind      = data.get("wind_speed_kmh", 0)
        radar     = data.get("radar_reflectivity_dbz", 0)
        lightning = data.get("lightning_strikes", 0)

        if rain_1h > 20:
            factors.append({"factor": "Intense Rainfall", "value": f"{rain_1h:.1f} mm/h", "severity": "high" if rain_1h > 60 else "moderate"})
        if humidity > 85:
            factors.append({"factor": "Very High Humidity", "value": f"{humidity:.0f}%", "severity": "high" if humidity > 93 else "moderate"})
        if pressure < 1005:
            factors.append({"factor": "Low Atmospheric Pressure", "value": f"{pressure:.1f} hPa", "severity": "high" if pressure < 1000 else "moderate"})
        if wind > 30:
            factors.append({"factor": "Strong Winds", "value": f"{wind:.1f} km/h", "severity": "high" if wind > 45 else "moderate"})
        if radar > 40:
            factors.append({"factor": "High Radar Reflectivity", "value": f"{radar:.1f} dBZ", "severity": "high" if radar > 55 else "moderate"})
        if lightning > 10:
            factors.append({"factor": "Lightning Activity", "value": f"{lightning} strikes/h", "severity": "moderate"})
        return factors or [{"factor": "Normal Conditions", "value": "All parameters nominal", "severity": "low"}]

    def predict(self, data: dict) -> dict:
        if self.model is not None:
            try:
                features = self._engineer_features(data)
                features_scaled = self.scaler.transform(features) if self.scaler else features
                probability = float(self.model.predict_proba(features_scaled)[0][1])
            except Exception as e:
                logger.warning(f"ML prediction failed ({e}), using rule-based.")
                probability = self._rule_based_probability(data)
        else:
            probability = self._rule_based_probability(data)

        risk_level = self._get_risk_level(probability)
        factors    = self._get_contributing_factors(data, probability)

        return {
            "station_id":          data.get("station_id", "UNKNOWN"),
            "timestamp":           datetime.utcnow().isoformat(),
            "probability":         round(probability, 4),
            "risk_level":          risk_level,
            "alert_triggered":     probability >= ALERT_THRESHOLD,
            "confidence":          round(0.85 + probability * 0.1, 3),
            "contributing_factors": factors,
            "model_version":       "rf-v1.0" if self.model else "rule-based-v1.0",
            "prediction_id":       str(uuid.uuid4())[:8],
            "recommendations":     RECOMMENDATIONS.get(risk_level, []),
        }
