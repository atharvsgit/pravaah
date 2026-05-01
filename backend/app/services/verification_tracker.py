from typing import Dict, Set, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models import Verification, VerificationSource, Report
from app.services.confidence_calculator import confidence_calculator
import asyncio

class VerificationTracker:
    """
    Tracks verification completion and triggers automatic confidence calculation
    when both weather_api and nlp_pipeline verifications are complete.
    """
    
    def __init__(self):
        # Track which reports have pending verifications
        self.pending_reports: Dict[str, Set[VerificationSource]] = {}
        # Required sources for automatic calculation
        self.required_sources = {VerificationSource.weather_api, VerificationSource.nlp_pipeline}
    
    async def check_and_calculate_confidence(self, report_id: str, db: AsyncSession) -> Optional[Dict]:
        """
        Check if all required verifications are complete and calculate confidence if so.
        Returns the confidence result if calculated, None otherwise.
        """
        try:
            # Get all verifications for this report
            result = await db.execute(
                select(Verification).where(Verification.report_id == report_id)
            )
            verifications = result.scalars().all()
            
            # Check if we have both required sources
            completed_sources = {v.source for v in verifications}
            if not self.required_sources.issubset(completed_sources):
                print(f"[VerificationTracker] Report {report_id} missing required verifications. "
                      f"Completed: {completed_sources}, Required: {self.required_sources}")
                return None
            
            # Check if any verification has errors (don't auto-calculate if there are errors)
            has_errors = any("error" in v.result_data for v in verifications)
            if has_errors:
                print(f"[VerificationTracker] Report {report_id} has verification errors, skipping auto-calculation")
                return None
            
            print(f"[VerificationTracker] All required verifications complete for report {report_id}. Calculating confidence...")
            
            # Calculate confidence score
            confidence_result = confidence_calculator.calculate_confidence(verifications)
            
            # Get the report and update it
            report = await db.get(Report, report_id)
            if not report:
                print(f"[VerificationTracker] Report {report_id} not found in database")
                return None
            
            # Update report with confidence score and status
            report.final_confidence_score = confidence_result["confidence_score"]
            
            # Update report status based on confidence level
            confidence_level = confidence_result["confidence_level"]
            if confidence_level == "High":
                report.status = "verified"
            elif confidence_level == "Very Low":
                report.status = "rejected"
            # Medium and Low remain "under_verification" for manual review
            
            await db.commit()
            
            print(f"[VerificationTracker]  Confidence calculated for report {report_id}: "
                  f"Score={confidence_result['confidence_score']}, Level={confidence_level}")
            
            return confidence_result
            
        except Exception as e:
            print(f"[VerificationTracker] Error calculating confidence for report {report_id}: {e}")
            return None
    
    def add_pending_verification(self, report_id: str, source: VerificationSource):
        """Add a pending verification to track."""
        if report_id not in self.pending_reports:
            self.pending_reports[report_id] = set()
        self.pending_reports[report_id].add(source)
        print(f"[VerificationTracker] Added pending {source.value} verification for report {report_id}")
    
    def remove_pending_verification(self, report_id: str, source: VerificationSource):
        """Remove a completed verification from pending list."""
        if report_id in self.pending_reports:
            self.pending_reports[report_id].discard(source)
            if not self.pending_reports[report_id]:
                del self.pending_reports[report_id]
        print(f"[VerificationTracker] Completed {source.value} verification for report {report_id}")

# Global instance
verification_tracker = VerificationTracker()
