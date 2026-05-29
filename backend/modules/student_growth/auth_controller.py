from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.auth import get_current_supabase_user
from core.database import get_db
from modules.student_growth.auth_profile_service import AuthProfileService
from modules.student_growth.user_schemas import (
    AppUserResponse,
    CurrentEduMindUserResponse,
    LinkSupabaseUserRequest,
)

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


@router.get("/me")
async def read_current_user(payload: dict = Depends(get_current_supabase_user)):
    return {
        "authenticated": True,
        "supabase_user_id": payload.get("sub"),
        "email": payload.get("email"),
        "role": payload.get("role"),
        "aud": payload.get("aud"),
    }


@router.get("/me/profile", response_model=CurrentEduMindUserResponse)
async def read_current_user_profile(
    payload: dict = Depends(get_current_supabase_user),
    db: Session = Depends(get_db),
):
    return AuthProfileService(db).resolve_current_user(payload)


@router.post("/link-current-user", response_model=AppUserResponse)
async def link_current_user(
    request: LinkSupabaseUserRequest,
    payload: dict = Depends(get_current_supabase_user),
    db: Session = Depends(get_db),
):
    return AuthProfileService(db).link_current_user(
        token_payload=payload,
        app_user_id=request.app_user_id,
    )
