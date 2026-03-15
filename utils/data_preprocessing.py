"""
Cloudburst Detection System - Data Preprocessing Pipeline
==========================================================
Handles loading, cleaning, feature engineering, and preparation
of meteorological data for ML model training and inference.
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.impute import KNNImputer
import joblib
import os
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ─── Thresholds (IMD standards for Indian subcontinent) ──────────────────────
CLOUDBURST_RAINFALL_THRESHOLD_1H = 100   # mm in 1 hour
CLOUDBURST_RAINFALL_THRESHOLD_3H = 65    # mm in 3 hours (relaxed)
EXTREME_WIND_THRESHOLD = 35              # km/h
HIGH_HUMIDITY_THRESHOLD = 90            # %
LOW_PRESSURE_THRESHOLD = 1005           # hPa
HIGH_REFLECTIVITY_THRESHOLD = 50        # dBZ


class WeatherDataPreprocessor:
    """
    Full preprocessing pipeline for weather station data.
    
    Steps:
        1. Load & validate raw data
        2. Handle missing values (KNN imputation)
        3. Feature engineering (rolling stats, composite indices)
        4. Label engineering (cloudburst event detection)
        5. Scale features for ML
        6. Save artifacts
    """

    def __init__(self, scaler_type: str = "robust"):
        self.scaler = RobustScaler() if scaler_type == "robust" else StandardScaler()
        self.imputer = KNNImputer(n_neighbors=5)
        self.feature_columns = []
        self.is_fitted = False

    # ─── 1. Load & validate ──────────────────────────────────────────────────

    def load_data(self, filepath: str) -> pd.DataFrame:
        """Load CSV and parse timestamps."""
        logger.info(f"Loading data from {filepath}")
        df = pd.read_csv(filepath, parse_dates=["timestamp"])
        df = df.sort_values(["station_id", "timestamp"]).reset_index(drop=True)
        logger.info(f"Loaded {len(df)} records from {df['station_id'].nunique()} stations")
        return df

    def validate_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clamp values to physically plausible ranges."""
        bounds = {
            "temperature_c":        (-60, 60),
            "humidity_pct":         (0, 100),
            "pressure_hpa":         (870, 1084),
            "wind_speed_kmh":       (0, 400),
            "rainfall_mm_1h":       (0, 500),
            "rainfall_mm_3h":       (0, 1000),
            "rainfall_mm_6h":       (0, 2000),
            "rainfall_mm_24h":      (0, 4000),
            "radar_reflectivity_dbz": (0, 75),
        }
        for col, (lo, hi) in bounds.items():
            if col in df.columns:
                before = df[col].isna().sum()
                df[col] = df[col].clip(lo, hi)
                after = df[col].isna().sum()
                if after > before:
                    logger.warning(f"Clipping created {after - before} NaNs in {col}")
        return df

    # ─── 2. Missing value handling ───────────────────────────────────────────

    def handle_missing_values(self, df: pd.DataFrame) -> pd.DataFrame:
        """Forward-fill within station groups, then KNN for remaining."""
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        df[numeric_cols] = (
            df.groupby("station_id")[numeric_cols]
              .transform(lambda g: g.fillna(method="ffill").fillna(method="bfill"))
        )
        missing_pct = df[numeric_cols].isna().mean() * 100
        cols_to_impute = missing_pct[missing_pct > 0].index.tolist()
        if cols_to_impute:
            logger.info(f"KNN imputing {len(cols_to_impute)} columns")
            df[cols_to_impute] = self.imputer.fit_transform(df[cols_to_impute])
        return df

    # ─── 3. Feature engineering ──────────────────────────────────────────────

    def engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Derive meteorological composite features:
          • Rolling statistics (3h, 6h, 12h windows)
          • Rate-of-change indicators
          • CAPE proxy, moisture flux, instability index
          • Temporal cyclical encoding
        """
        df = df.copy()
        grp = df.groupby("station_id")

        # Rolling windows (sorted by time within each station)
        for window, label in [(3, "3h"), (6, "6h"), (12, "12h")]:
            df[f"rainfall_rolling_mean_{label}"] = grp["rainfall_mm_1h"].transform(
                lambda x: x.rolling(window, min_periods=1).mean()
            )
            df[f"rainfall_rolling_max_{label}"] = grp["rainfall_mm_1h"].transform(
                lambda x: x.rolling(window, min_periods=1).max()
            )
            df[f"rainfall_rolling_std_{label}"] = grp["rainfall_mm_1h"].transform(
                lambda x: x.rolling(window, min_periods=1).std().fillna(0)
            )
            df[f"pressure_rolling_min_{label}"] = grp["pressure_hpa"].transform(
                lambda x: x.rolling(window, min_periods=1).min()
            )
            df[f"humidity_rolling_max_{label}"] = grp["humidity_pct"].transform(
                lambda x: x.rolling(window, min_periods=1).max()
            )

        # Rate-of-change (1-step delta)
        for col in ["pressure_hpa", "temperature_c", "humidity_pct", "rainfall_mm_1h"]:
            df[f"{col}_delta"] = grp[col].transform(lambda x: x.diff().fillna(0))

        # Dew point depression (lower → more unstable air)
        if "dewpoint_c" in df.columns:
            df["dewpoint_depression"] = df["temperature_c"] - df["dewpoint_c"]
        else:
            # Magnus approximation
            df["dewpoint_c"] = df["temperature_c"] - ((100 - df["humidity_pct"]) / 5)
            df["dewpoint_depression"] = df["temperature_c"] - df["dewpoint_c"]

        # CAPE proxy: combination of temp, dewpoint depression, and low pressure
        df["cape_proxy"] = (
            (df["temperature_c"] - df["dewpoint_depression"]) *
            (1 - (df["pressure_hpa"] - 900) / 200) *
            (df["humidity_pct"] / 100)
        ).clip(0)

        # Moisture flux index
        df["moisture_flux"] = (
            df["wind_speed_kmh"] * (df["humidity_pct"] / 100) *
            np.cos(np.radians(df.get("wind_direction_deg", 270)))
        )

        # Atmospheric instability index (higher = more unstable)
        df["instability_index"] = (
            df["humidity_pct"] / 100 *
            (1 - df["pressure_hpa"] / 1013) * 100 +
            df.get("radar_reflectivity_dbz", 0) * 0.5
        )

        # Composite cloudburst risk score (pre-model heuristic)
        df["risk_score"] = (
            (df["rainfall_mm_1h"] / CLOUDBURST_RAINFALL_THRESHOLD_1H).clip(0, 1) * 40 +
            ((100 - df["humidity_pct"]).clip(0) / 100).map(lambda x: 1 - x) * 20 +
            ((LOW_PRESSURE_THRESHOLD - df["pressure_hpa"]).clip(0) / 20) * 20 +
            (df["wind_speed_kmh"] / EXTREME_WIND_THRESHOLD).clip(0, 1) * 10 +
            (df.get("radar_reflectivity_dbz", 0) / 70).clip(0, 1) * 10
        )

        # Temporal features (cyclic encoding to avoid ordinality)
        df["hour"] = df["timestamp"].dt.hour
        df["month"] = df["timestamp"].dt.month
        df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
        df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)
        df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
        df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)

        # Is monsoon season (June–September for South Asia)
        df["is_monsoon"] = df["month"].between(6, 9).astype(int)

        logger.info(f"Feature engineering complete. Shape: {df.shape}")
        return df

    # ─── 4. Label engineering ────────────────────────────────────────────────

    def create_labels(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Generate cloudburst labels if not present.
        IMD definition: ≥100mm rainfall in ≤3 hours over ≤30 km² area.
        We use the hourly proxy: ≥100mm/h OR ≥65mm in 3h rolling window.
        """
        if "cloudburst_event" not in df.columns:
            logger.info("Generating cloudburst_event labels from rainfall thresholds")
            cond_1h = df["rainfall_mm_1h"] >= CLOUDBURST_RAINFALL_THRESHOLD_1H
            cond_3h = df.get("rainfall_mm_3h", pd.Series(0, index=df.index)) >= CLOUDBURST_RAINFALL_THRESHOLD_3H
            cond_roll = df.get("rainfall_rolling_max_3h", pd.Series(0, index=df.index)) >= CLOUDBURST_RAINFALL_THRESHOLD_1H
            df["cloudburst_event"] = (cond_1h | cond_3h | cond_roll).astype(int)

        event_rate = df["cloudburst_event"].mean() * 100
        logger.info(f"Cloudburst event rate: {event_rate:.2f}%")
        return df

    # ─── 5. Feature selection & scaling ─────────────────────────────────────

    def get_feature_columns(self) -> list:
        return [
            # Core meteorological
            "temperature_c", "humidity_pct", "pressure_hpa",
            "wind_speed_kmh", "rainfall_mm_1h", "rainfall_mm_3h",
            "rainfall_mm_6h", "radar_reflectivity_dbz",
            # Deltas
            "pressure_hpa_delta", "temperature_c_delta",
            "humidity_pct_delta", "rainfall_mm_1h_delta",
            # Rolling stats
            "rainfall_rolling_mean_3h", "rainfall_rolling_max_3h",
            "rainfall_rolling_std_3h", "rainfall_rolling_mean_6h",
            "rainfall_rolling_max_6h", "pressure_rolling_min_3h",
            "humidity_rolling_max_3h",
            # Composite
            "dewpoint_depression", "cape_proxy", "moisture_flux",
            "instability_index", "risk_score",
            # Temporal
            "hour_sin", "hour_cos", "month_sin", "month_cos", "is_monsoon",
        ]

    def prepare_features(self, df: pd.DataFrame, fit: bool = True) -> tuple:
        """Return (X_scaled, y, feature_names)."""
        self.feature_columns = [c for c in self.get_feature_columns() if c in df.columns]
        X = df[self.feature_columns].copy()
        y = df["cloudburst_event"].values if "cloudburst_event" in df.columns else None

        if fit:
            X_scaled = self.scaler.fit_transform(X)
            self.is_fitted = True
        else:
            if not self.is_fitted:
                raise RuntimeError("Scaler not fitted. Run with fit=True first or load saved scaler.")
            X_scaled = self.scaler.transform(X)

        return X_scaled, y, self.feature_columns

    # ─── 6. Save / load artifacts ────────────────────────────────────────────

    def save_artifacts(self, output_dir: str = "models"):
        os.makedirs(output_dir, exist_ok=True)
        joblib.dump(self.scaler, os.path.join(output_dir, "scaler.pkl"))
        joblib.dump(self.imputer, os.path.join(output_dir, "imputer.pkl"))
        joblib.dump(self.feature_columns, os.path.join(output_dir, "feature_columns.pkl"))
        logger.info(f"Preprocessing artifacts saved to {output_dir}/")

    def load_artifacts(self, model_dir: str = "models"):
        self.scaler = joblib.load(os.path.join(model_dir, "scaler.pkl"))
        self.imputer = joblib.load(os.path.join(model_dir, "imputer.pkl"))
        self.feature_columns = joblib.load(os.path.join(model_dir, "feature_columns.pkl"))
        self.is_fitted = True
        logger.info("Preprocessing artifacts loaded.")

    # ─── Full pipeline ────────────────────────────────────────────────────────

    def run_pipeline(self, filepath: str, fit: bool = True) -> tuple:
        df = self.load_data(filepath)
        df = self.validate_data(df)
        df = self.handle_missing_values(df)
        df = self.engineer_features(df)
        df = self.create_labels(df)
        X, y, features = self.prepare_features(df, fit=fit)
        return X, y, features, df


if __name__ == "__main__":
    preprocessor = WeatherDataPreprocessor()
    X, y, features, df = preprocessor.run_pipeline("data/sample/weather_data_sample.csv")
    preprocessor.save_artifacts("models")
    print(f"\n✅ Preprocessing complete")
    print(f"   Features: {len(features)}")
    print(f"   Samples:  {X.shape[0]}")
    print(f"   Positives:{y.sum()} ({y.mean()*100:.1f}%)")
    print(f"\nFeature list:\n  " + "\n  ".join(features))
