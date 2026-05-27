"""Development-only endpoint for local demo seed data."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.database import get_db
from modules.student_growth.dev_seed_service import DevSeedService

router = APIRouter(prefix="/api/v1/dev", tags=["Development Seed"])


@router.post("/seed-demo-data")
async def seed_demo_data(db: Session = Depends(get_db)):
    return DevSeedService(db).seed_demo_data()
