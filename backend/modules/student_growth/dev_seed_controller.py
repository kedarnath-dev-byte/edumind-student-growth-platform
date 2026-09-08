"""Development-only endpoint for local demo seed data."""

import os
from fastapi import APIRouter, Depends, HTTPException
from core.access import require_admin
from sqlalchemy.orm import Session

from core.database import get_db
from modules.student_growth.dev_seed_service import DevSeedService

router = APIRouter(dependencies=[Depends(require_admin)], prefix="/api/v1/dev", tags=["Development Seed"])


@router.post("/seed-demo-data")
def seed_demo_data(db: Session = Depends(get_db)):
    if os.getenv("ENVIRONMENT") != "development" or os.getenv("ENABLE_DEMO_SEED") != "true":
        raise HTTPException(404, "Not found")
    return DevSeedService(db).seed_demo_data()
