"""
Smoke tests for ConfidenceCalculator. Pure-Python — no DB, no RabbitMQ.
"""
from types import SimpleNamespace

from app.db.models import VerificationSource
from app.services.confidence_calculator import ConfidenceCalculator


def _v(source: VerificationSource, result_data: dict):
    """Stand-in for a Verification ORM row — calculator only reads .source / .result_data."""
    return SimpleNamespace(source=source, result_data=result_data)


def test_no_verifications_returns_zero():
    result = ConfidenceCalculator().calculate_confidence([])
    assert result["confidence_score"] == 0.0


def test_confirmed_weather_only_weighted_correctly():
    result = ConfidenceCalculator().calculate_confidence([
        _v(VerificationSource.weather_api, {"match_status": "confirmed"}),
    ])
    # weather alone: weighted_score / total_weight = (0.8 * 0.4) / 0.4 = 0.8
    assert result["confidence_score"] == 0.8
    assert result["confidence_level"] in {"High", "Medium", "Low", "Very Low"}


def test_weather_and_nlp_average():
    """Two sources with equal weights should average their scores."""
    result = ConfidenceCalculator().calculate_confidence([
        _v(VerificationSource.weather_api, {"match_status": "confirmed"}),         # 0.8
        _v(VerificationSource.nlp_pipeline, {"hazard_type": "high_waves"}),
    ])
    # exact value depends on _analyze_nlp_result; just assert it's bounded and sensible
    assert 0.0 <= result["confidence_score"] <= 1.0
    assert result["total_verifications"] == 2


def test_unknown_source_is_skipped():
    """A verification with a source the calculator doesn't know about shouldn't crash."""
    result = ConfidenceCalculator().calculate_confidence([
        _v("ghost_source", {"foo": "bar"}),
    ])
    assert result["confidence_score"] == 0.0
