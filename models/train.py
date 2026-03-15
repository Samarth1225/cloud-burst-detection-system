"""
Cloudburst Detection System - Model Training Pipeline
======================================================
Trains two complementary models:
  1. Random Forest  – interpretable, handles tabular features well
  2. LSTM           – captures temporal dependencies in time-series

Why these models?
  • Random Forest: Robust to noisy sensors, handles class imbalance via
    class_weight, gives feature importance for meteorological insight.
    Best for real-time single-timestep prediction.
  • LSTM: Learns sequential patterns (pressure drops, rainfall build-up)
    across hours before a cloudburst. Crucial for early warning.
"""

import os
import json
import logging
import numpy as np
import pandas as pd
import joblib
from datetime import datetime

from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import (
    classification_report, confusion_matrix, roc_auc_score,
    precision_recall_curve, average_precision_score, f1_score
)
from sklearn.utils.class_weight import compute_class_weight
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker

# Optional: TensorFlow/Keras for LSTM
try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
    from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
    from tensorflow.keras.optimizers import Adam
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False
    logging.warning("TensorFlow not available. LSTM training will be skipped.")

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.data_preprocessing import WeatherDataPreprocessor

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

RANDOM_SEED = 42
MODEL_DIR = "models"
RESULTS_DIR = "models/results"
SEQUENCE_LENGTH = 12   # 12 hours look-back for LSTM


# ─── Synthetic data generation (for demo when real data is small) ─────────────

def generate_synthetic_data(n_samples: int = 5000, seed: int = 42) -> pd.DataFrame:
    """
    Generate realistic synthetic weather data for training.
    Cloudburst events (~8% base rate) are correlated with:
      - High rainfall, humidity, low pressure, high wind, high reflectivity
    """
    rng = np.random.default_rng(seed)
    n_normal = int(n_samples * 0.92)
    n_event  = n_samples - n_normal

    def make_records(n, is_event):
        if is_event:
            rain_1h   = rng.normal(120, 40, n).clip(80, 300)
            rain_3h   = rng.normal(180, 60, n).clip(100, 500)
            rain_6h   = rng.normal(250, 80, n).clip(150, 700)
            rain_24h  = rng.normal(350, 100, n).clip(200, 900)
            humidity  = rng.normal(96, 2, n).clip(88, 100)
            pressure  = rng.normal(999, 3, n).clip(985, 1005)
            wind      = rng.normal(45, 10, n).clip(25, 90)
            temp      = rng.normal(19, 2, n).clip(12, 28)
            radar     = rng.normal(58, 6, n).clip(45, 75)
            lightning = rng.poisson(40, n)
            label     = np.ones(n, dtype=int)
        else:
            rain_1h   = rng.exponential(3, n).clip(0, 60)
            rain_3h   = rng.exponential(8, n).clip(0, 100)
            rain_6h   = rng.exponential(15, n).clip(0, 150)
            rain_24h  = rng.exponential(30, n).clip(0, 200)
            humidity  = rng.normal(72, 12, n).clip(30, 95)
            pressure  = rng.normal(1010, 5, n).clip(990, 1025)
            wind      = rng.normal(15, 8, n).clip(0, 40)
            temp      = rng.normal(24, 4, n).clip(8, 42)
            radar     = rng.normal(20, 10, n).clip(0, 45)
            lightning = rng.poisson(2, n)
            label     = np.zeros(n, dtype=int)

        months = rng.integers(1, 13, n)
        hours  = rng.integers(0, 24, n)
        return pd.DataFrame({
            "temperature_c": temp,
            "humidity_pct": humidity,
            "pressure_hpa": pressure,
            "wind_speed_kmh": wind,
            "wind_direction_deg": rng.uniform(0, 360, n),
            "rainfall_mm_1h": rain_1h,
            "rainfall_mm_3h": rain_3h,
            "rainfall_mm_6h": rain_6h,
            "rainfall_mm_24h": rain_24h,
            "dewpoint_c": temp - (100 - humidity) / 5,
            "radar_reflectivity_dbz": radar,
            "lightning_strikes": lightning,
            "cloud_cover_pct": rng.normal(85 if is_event else 45, 10, n).clip(0, 100),
            "hour": hours,
            "month": months,
            "cloudburst_event": label,
        })

    df = pd.concat([make_records(n_normal, False), make_records(n_event, True)], ignore_index=True)
    df = df.sample(frac=1, random_state=seed).reset_index(drop=True)

    # Add engineered features matching preprocessor output
    df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)
    df["is_monsoon"] = df["month"].between(6, 9).astype(int)
    df["dewpoint_depression"] = df["temperature_c"] - df["dewpoint_c"]
    df["cape_proxy"] = (
        (df["temperature_c"] - df["dewpoint_depression"]) *
        (1 - (df["pressure_hpa"] - 900) / 200) *
        (df["humidity_pct"] / 100)
    ).clip(0)
    df["moisture_flux"] = df["wind_speed_kmh"] * (df["humidity_pct"] / 100)
    df["instability_index"] = (
        df["humidity_pct"] / 100 * (1 - df["pressure_hpa"] / 1013) * 100 +
        df["radar_reflectivity_dbz"] * 0.5
    )
    df["risk_score"] = (
        (df["rainfall_mm_1h"] / 100).clip(0, 1) * 40 +
        (df["humidity_pct"] / 100) * 20 +
        ((1005 - df["pressure_hpa"]).clip(0) / 20) * 20 +
        (df["wind_speed_kmh"] / 35).clip(0, 1) * 10 +
        (df["radar_reflectivity_dbz"] / 70).clip(0, 1) * 10
    )
    # Fake rolling stats
    for label in ["3h", "6h", "12h"]:
        df[f"rainfall_rolling_mean_{label}"] = df["rainfall_mm_1h"] * rng.uniform(0.8, 1.2, len(df))
        df[f"rainfall_rolling_max_{label}"]  = df["rainfall_mm_1h"] * rng.uniform(1.0, 1.5, len(df))
        df[f"rainfall_rolling_std_{label}"]  = df["rainfall_mm_1h"] * rng.uniform(0.1, 0.4, len(df))
    for label in ["3h"]:
        df[f"pressure_rolling_min_{label}"] = df["pressure_hpa"] - rng.uniform(0, 3, len(df))
        df[f"humidity_rolling_max_{label}"] = (df["humidity_pct"] + rng.uniform(0, 3, len(df))).clip(0, 100)
    for col in ["pressure_hpa", "temperature_c", "humidity_pct", "rainfall_mm_1h"]:
        df[f"{col}_delta"] = rng.normal(0, df[col].std() * 0.05, len(df))

    return df


# ─── Evaluation helpers ───────────────────────────────────────────────────────

def evaluate_model(model, X_test, y_test, model_name: str, threshold: float = 0.3) -> dict:
    """Compute full evaluation metrics. Lower threshold biases toward recall (safety critical)."""
    proba = model.predict_proba(X_test)[:, 1]
    preds = (proba >= threshold).astype(int)

    report = classification_report(y_test, preds, output_dict=True, zero_division=0)
    cm = confusion_matrix(y_test, preds)
    auc_roc = roc_auc_score(y_test, proba)
    auc_pr  = average_precision_score(y_test, proba)
    f1      = f1_score(y_test, preds, zero_division=0)

    metrics = {
        "model": model_name,
        "threshold": threshold,
        "accuracy":  report["accuracy"],
        "precision": report.get("1", {}).get("precision", 0),
        "recall":    report.get("1", {}).get("recall", 0),
        "f1_score":  f1,
        "auc_roc":   auc_roc,
        "auc_pr":    auc_pr,
        "confusion_matrix": cm.tolist(),
        "classification_report": report,
    }

    logger.info(f"\n{'='*50}")
    logger.info(f"  {model_name} Evaluation (threshold={threshold})")
    logger.info(f"{'='*50}")
    logger.info(f"  Accuracy:  {metrics['accuracy']:.4f}")
    logger.info(f"  Precision: {metrics['precision']:.4f}")
    logger.info(f"  Recall:    {metrics['recall']:.4f}")
    logger.info(f"  F1 Score:  {metrics['f1_score']:.4f}")
    logger.info(f"  AUC-ROC:   {metrics['auc_roc']:.4f}")
    logger.info(f"  AUC-PR:    {metrics['auc_pr']:.4f}")
    logger.info(f"  Confusion Matrix:\n{cm}")

    return metrics


def plot_evaluation(metrics: dict, feature_importances: dict = None, output_dir: str = RESULTS_DIR):
    os.makedirs(output_dir, exist_ok=True)
    fig, axes = plt.subplots(1, 3 if feature_importances else 2, figsize=(16, 5))
    fig.suptitle(f"{metrics['model']} — Evaluation", fontsize=14, fontweight="bold")
    fig.patch.set_facecolor("#0f1117")
    for ax in axes:
        ax.set_facecolor("#1a1d27")
        for sp in ax.spines.values():
            sp.set_color("#2e3250")

    # Confusion Matrix
    cm = np.array(metrics["confusion_matrix"])
    im = axes[0].imshow(cm, cmap="Blues")
    axes[0].set_title("Confusion Matrix", color="white")
    for i in range(2):
        for j in range(2):
            axes[0].text(j, i, cm[i, j], ha="center", va="center", color="white", fontsize=14)
    axes[0].set_xticks([0, 1]); axes[0].set_yticks([0, 1])
    axes[0].set_xticklabels(["Normal", "Cloudburst"], color="white")
    axes[0].set_yticklabels(["Normal", "Cloudburst"], color="white")
    axes[0].set_xlabel("Predicted", color="#aaaaaa")
    axes[0].set_ylabel("Actual", color="#aaaaaa")

    # Metric bar chart
    metric_names = ["Accuracy", "Precision", "Recall", "F1", "AUC-ROC", "AUC-PR"]
    values = [
        metrics["accuracy"], metrics["precision"], metrics["recall"],
        metrics["f1_score"], metrics["auc_roc"], metrics["auc_pr"]
    ]
    colors = ["#4fc3f7", "#81c784", "#ffb74d", "#f06292", "#ce93d8", "#80cbc4"]
    bars = axes[1].bar(metric_names, values, color=colors)
    axes[1].set_ylim(0, 1.1)
    axes[1].set_title("Performance Metrics", color="white")
    axes[1].tick_params(colors="white")
    axes[1].set_xticklabels(metric_names, rotation=30, ha="right", color="white")
    for bar, val in zip(bars, values):
        axes[1].text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.02,
                     f"{val:.3f}", ha="center", va="bottom", color="white", fontsize=9)

    # Feature importance
    if feature_importances and len(axes) > 2:
        top_n = sorted(feature_importances.items(), key=lambda x: x[1], reverse=True)[:15]
        names, imps = zip(*top_n)
        axes[2].barh(names[::-1], imps[::-1], color="#4fc3f7")
        axes[2].set_title("Top 15 Feature Importances", color="white")
        axes[2].tick_params(colors="white")
        axes[2].set_xlabel("Importance", color="#aaaaaa")

    plt.tight_layout()
    path = os.path.join(output_dir, f"{metrics['model'].replace(' ', '_')}_evaluation.png")
    plt.savefig(path, dpi=150, bbox_inches="tight", facecolor="#0f1117")
    plt.close()
    logger.info(f"Evaluation plot saved to {path}")


# ─── Random Forest Training ───────────────────────────────────────────────────

def train_random_forest(X_train, y_train, X_test, y_test, feature_names: list) -> tuple:
    logger.info("Training Random Forest Classifier...")

    classes = np.unique(y_train)
    weights = compute_class_weight("balanced", classes=classes, y=y_train)
    class_weight = dict(zip(classes, weights))

    rf = RandomForestClassifier(
        n_estimators=300,
        max_depth=15,
        min_samples_split=10,
        min_samples_leaf=5,
        max_features="sqrt",
        class_weight=class_weight,
        random_state=RANDOM_SEED,
        n_jobs=-1,
        oob_score=True,
    )
    rf.fit(X_train, y_train)

    # Cross-validation
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_SEED)
    cv_scores = cross_val_score(rf, X_train, y_train, cv=cv, scoring="roc_auc", n_jobs=-1)
    logger.info(f"CV AUC-ROC: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
    logger.info(f"OOB Score: {rf.oob_score_:.4f}")

    metrics = evaluate_model(rf, X_test, y_test, "Random Forest")
    feature_importances = dict(zip(feature_names, rf.feature_importances_))
    plot_evaluation(metrics, feature_importances)

    joblib.dump(rf, os.path.join(MODEL_DIR, "random_forest.pkl"))
    logger.info(f"Random Forest saved to {MODEL_DIR}/random_forest.pkl")

    return rf, metrics, feature_importances


# ─── LSTM Training ────────────────────────────────────────────────────────────

def create_sequences(X: np.ndarray, y: np.ndarray, seq_len: int) -> tuple:
    """Convert flat feature arrays to (samples, timesteps, features) for LSTM."""
    Xs, ys = [], []
    for i in range(seq_len, len(X)):
        Xs.append(X[i - seq_len:i])
        ys.append(y[i])
    return np.array(Xs), np.array(ys)


def train_lstm(X_train, y_train, X_test, y_test, n_features: int) -> tuple:
    if not TENSORFLOW_AVAILABLE:
        logger.warning("Skipping LSTM — TensorFlow not installed.")
        return None, {}

    logger.info("Building LSTM model...")
    X_seq_train, y_seq_train = create_sequences(X_train, y_train, SEQUENCE_LENGTH)
    X_seq_test,  y_seq_test  = create_sequences(X_test,  y_test,  SEQUENCE_LENGTH)

    # Class weight for imbalanced labels
    pos_weight = (y_seq_train == 0).sum() / max((y_seq_train == 1).sum(), 1)

    model = Sequential([
        LSTM(128, return_sequences=True, input_shape=(SEQUENCE_LENGTH, n_features)),
        BatchNormalization(),
        Dropout(0.3),
        LSTM(64, return_sequences=False),
        BatchNormalization(),
        Dropout(0.3),
        Dense(32, activation="relu"),
        Dropout(0.2),
        Dense(1, activation="sigmoid"),
    ])

    model.compile(
        optimizer=Adam(learning_rate=1e-3),
        loss="binary_crossentropy",
        metrics=["accuracy", tf.keras.metrics.AUC(name="auc")],
    )

    callbacks = [
        EarlyStopping(patience=10, restore_best_weights=True, monitor="val_auc", mode="max"),
        ReduceLROnPlateau(factor=0.5, patience=5, monitor="val_loss"),
        ModelCheckpoint(os.path.join(MODEL_DIR, "lstm_best.h5"), save_best_only=True, monitor="val_auc", mode="max"),
    ]

    history = model.fit(
        X_seq_train, y_seq_train,
        validation_split=0.15,
        epochs=50,
        batch_size=64,
        class_weight={0: 1.0, 1: pos_weight},
        callbacks=callbacks,
        verbose=1,
    )

    # Wrap for sklearn-compatible predict_proba interface
    class LSTMWrapper:
        def __init__(self, keras_model, seq_len):
            self.model = keras_model
            self.seq_len = seq_len

        def predict_proba(self, X):
            if len(X.shape) == 2:
                # If flat, create sequences
                seqs = np.array([X[max(0, i - self.seq_len):i] for i in range(self.seq_len, len(X) + self.seq_len)])
            else:
                seqs = X
            preds = self.model.predict(seqs, verbose=0).flatten()
            return np.column_stack([1 - preds, preds])

    wrapper = LSTMWrapper(model, SEQUENCE_LENGTH)
    metrics = evaluate_model(wrapper, X_seq_test, y_seq_test, "LSTM")
    plot_evaluation(metrics)
    model.save(os.path.join(MODEL_DIR, "lstm_model.h5"))

    return model, metrics


# ─── Main ──────────────────────────────────────────────────────────────────────

def main():
    os.makedirs(MODEL_DIR, exist_ok=True)
    os.makedirs(RESULTS_DIR, exist_ok=True)

    logger.info("Generating synthetic training data...")
    df = generate_synthetic_data(n_samples=8000)

    feature_cols = [
        "temperature_c", "humidity_pct", "pressure_hpa", "wind_speed_kmh",
        "rainfall_mm_1h", "rainfall_mm_3h", "rainfall_mm_6h", "radar_reflectivity_dbz",
        "pressure_hpa_delta", "temperature_c_delta", "humidity_pct_delta", "rainfall_mm_1h_delta",
        "rainfall_rolling_mean_3h", "rainfall_rolling_max_3h", "rainfall_rolling_std_3h",
        "rainfall_rolling_mean_6h", "rainfall_rolling_max_6h",
        "pressure_rolling_min_3h", "humidity_rolling_max_3h",
        "dewpoint_depression", "cape_proxy", "moisture_flux", "instability_index", "risk_score",
        "hour_sin", "hour_cos", "month_sin", "month_cos", "is_monsoon",
    ]
    feature_cols = [c for c in feature_cols if c in df.columns]

    from sklearn.preprocessing import RobustScaler
    scaler = RobustScaler()
    X = scaler.fit_transform(df[feature_cols])
    y = df["cloudburst_event"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=y
    )
    logger.info(f"Train: {X_train.shape}, Test: {X_test.shape}")
    logger.info(f"Class distribution — Train: {y_train.mean():.2%}, Test: {y_test.mean():.2%}")

    # Save scaler + feature list
    joblib.dump(scaler, os.path.join(MODEL_DIR, "scaler.pkl"))
    joblib.dump(feature_cols, os.path.join(MODEL_DIR, "feature_columns.pkl"))

    # Train Random Forest
    rf_model, rf_metrics, rf_importance = train_random_forest(X_train, y_train, X_test, y_test, feature_cols)

    # Train LSTM (optional)
    lstm_model, lstm_metrics = train_lstm(X_train, y_train, X_test, y_test, len(feature_cols))

    # Save results
    all_results = {
        "training_date": datetime.now().isoformat(),
        "n_features": len(feature_cols),
        "feature_names": feature_cols,
        "random_forest": {k: v for k, v in rf_metrics.items() if k != "classification_report"},
    }
    if lstm_metrics:
        all_results["lstm"] = {k: v for k, v in lstm_metrics.items() if k != "classification_report"}

    with open(os.path.join(RESULTS_DIR, "training_results.json"), "w") as f:
        json.dump(all_results, f, indent=2, default=str)

    logger.info("\n🎉 Training complete! Models saved to ./models/")
    logger.info(f"   Random Forest AUC-ROC: {rf_metrics['auc_roc']:.4f}")
    if lstm_metrics:
        logger.info(f"   LSTM AUC-ROC:          {lstm_metrics.get('auc_roc', 'N/A')}")


if __name__ == "__main__":
    main()
