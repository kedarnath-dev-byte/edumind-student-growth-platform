from fastapi import APIRouter, Depends

from core.auth import get_current_supabase_user

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
