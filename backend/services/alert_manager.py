"""Alert manager — stores and retrieves cloudburst alerts."""

import uuid
import logging
from datetime import datetime
from typing import Optional, List
from collections import deque

logger = logging.getLogger(__name__)

# In-memory store (replace with Redis/DB in production)
_alerts = deque(maxlen=500)


class AlertManager:
    def trigger_alert(self, station_id: str, probability: float,
                      risk_level: str, weather_data: dict):
        alert = {
            "alert_id":   str(uuid.uuid4())[:8],
            "station_id": station_id,
            "timestamp":  datetime.utcnow().isoformat(),
            "probability": round(probability, 4),
            "risk_level":  risk_level,
            "message":    self._build_message(station_id, probability, risk_level),
            "is_active":  True,
            "resolved_at": None,
            "weather_snapshot": {
                k: weather_data.get(k)
                for k in ["temperature_c", "humidity_pct", "pressure_hpa",
                          "wind_speed_kmh", "rainfall_mm_1h", "rainfall_mm_3h"]
            },
        }
        _alerts.appendleft(alert)
        logger.warning(f"ALERT [{risk_level}] Station {station_id}: prob={probability:.2%}")
        return alert

    def get_alerts(self, active_only: bool = True,
                   station_id: Optional[str] = None,
                   limit: int = 50) -> List[dict]:
        results = list(_alerts)
        if active_only:
            results = [a for a in results if a["is_active"]]
        if station_id:
            results = [a for a in results if a["station_id"] == station_id]
        return results[:limit]

    def resolve_alert(self, alert_id: str):
        for alert in _alerts:
            if alert["alert_id"] == alert_id:
                alert["is_active"] = False
                alert["resolved_at"] = datetime.utcnow().isoformat()
                return alert
        return None

    @staticmethod
    def _build_message(station_id: str, prob: float, level: str) -> str:
        msgs = {
            "MODERATE": f"⚠️ Elevated cloudburst risk at {station_id}. Probability: {prob:.0%}. Monitor closely.",
            "HIGH":     f"🚨 HIGH cloudburst risk at {station_id}! Probability: {prob:.0%}. Prepare evacuation.",
            "CRITICAL": f"🔴 CRITICAL! Imminent cloudburst at {station_id}. Probability: {prob:.0%}. EVACUATE NOW!",
        }
        return msgs.get(level, f"Cloudburst alert at {station_id}: {prob:.0%}")
