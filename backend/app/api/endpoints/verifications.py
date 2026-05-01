import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import Verification, VerificationSource, Report
from app.models.pydantic_models import VerificationCreate
from app.services.confidence_calculator import confidence_calculator
from app.services.verification_tracker import verification_tracker
from sqlalchemy.future import select

router = APIRouter()

@router.post(
    "/weather",
    status_code=201,
    summary="Submit Weather API Verification",
    description="An endpoint for the standalone weather worker to submit its findings."
)
async def submit_weather_verification(
    verification_in: VerificationCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new verification record with the source set to 'weather_api'.
    It first checks if the original report exists.
    """
    # Check if the report exists before adding a verification for it
    report_exists = await db.get(Report, verification_in.report_id)
    if not report_exists:
        raise HTTPException(
            status_code=404,
            detail=f"Report with ID {verification_in.report_id} not found."
        )

    new_verification_record = Verification(
        report_id=verification_in.report_id,
        source=VerificationSource.weather_api, # Set the source
        result_data=verification_in.result_data # Store the flexible JSON data
    )
    db.add(new_verification_record)
    await db.commit()
    
    # Trigger automatic confidence calculation
    confidence_result = await verification_tracker.check_and_calculate_confidence(
        str(verification_in.report_id), db
    )
    
    response_message = "Weather verification successfully recorded."
    if confidence_result:
        response_message += f" Confidence automatically calculated: {confidence_result['confidence_score']:.2f} ({confidence_result['confidence_level']})"
    
    return {"message": response_message}

@router.post(
    "/nlp",
    status_code=201,
    summary="Submit NLP Verification",
    description="An endpoint for the standalone NLP worker to submit its findings."
)
async def submit_nlp_verification(
    verification_in: VerificationCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new verification record with the source set to 'nlp_pipeline'.
    It first checks if the original report exists.
    """
    # Check if the report exists before adding a verification for it
    report_exists = await db.get(Report, verification_in.report_id)
    if not report_exists:
        raise HTTPException(
            status_code=404,
            detail=f"Report with ID {verification_in.report_id} not found."
        )

    new_verification_record = Verification(
        report_id=verification_in.report_id,
        source=VerificationSource.nlp_pipeline, # Set the source
        result_data=verification_in.result_data # Store the flexible JSON data
    )
    db.add(new_verification_record)
    await db.commit()
    
    # Trigger automatic confidence calculation
    confidence_result = await verification_tracker.check_and_calculate_confidence(
        str(verification_in.report_id), db
    )
    
    response_message = "NLP verification successfully recorded."
    if confidence_result:
        response_message += f" Confidence automatically calculated: {confidence_result['confidence_score']:.2f} ({confidence_result['confidence_level']})"
    
    return {"message": response_message}

@router.get(
    "/confidence/{report_id}",
    summary="Get Confidence Score",
    description="Calculate and return confidence score for a report based on all verifications."
)
async def get_confidence_score(
    report_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Calculate confidence score based on all verification results for a report.
    """
    # Get the report
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(
            status_code=404,
            detail=f"Report with ID {report_id} not found."
        )
    
    # Get all verifications for this report
    result = await db.execute(
        select(Verification).where(Verification.report_id == report_id)
    )
    verifications = result.scalars().all()
    
    # Calculate confidence score
    confidence_result = confidence_calculator.calculate_confidence(verifications)
    
    # Update the report with the confidence score and status
    report.final_confidence_score = confidence_result["confidence_score"]
    
    # Update report status based on confidence level
    confidence_level = confidence_result["confidence_level"]
    if confidence_level == "High":
        report.status = "verified"
    elif confidence_level == "Very Low":
        report.status = "rejected"
    # Medium and Low remain "under_verification" for manual review
    
    await db.commit()
    
    return {
        "report_id": report_id,
        "confidence_score": confidence_result["confidence_score"],
        "confidence_level": confidence_result["confidence_level"],
        "total_verifications": confidence_result["total_verifications"],
        "details": confidence_result["details"],
        "calculation_method": confidence_result["calculation_method"]
    }

