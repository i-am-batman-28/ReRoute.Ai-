from fastapi import APIRouter, Query, HTTPException
from datetime import date
from agent.tools import fetch_flight_status
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/public", tags=["public"])

@router.get("/flight-status")
async def public_flight_status(
    flight_number: str = Query(..., description="E.g., AA104 or UA 123"),
    check_date: str | None = Query(None, description="ISO Date string"),
):
    try:
        # Default to today if no date provided
        target_date = check_date if check_date else date.today().isoformat()
        
        # Call the internal agent tool
        status_info = await fetch_flight_status(flight_number=flight_number, date=target_date)
        
        return {
            "flight_number": flight_number,
            "date": target_date,
            "status": status_info.get("status", "unknown"),
            "delay_minutes": status_info.get("delay_minutes", 0),
            "source": status_info.get("source", "aviationstack")
        }
    except Exception as e:
        logger.exception("public_flight_status_error")
        raise HTTPException(status_code=500, detail="Failed to fetch flight status right now.")
