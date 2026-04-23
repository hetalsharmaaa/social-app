from fastapi import APIRouter, Depends
from database import get_supabase
from dependencies import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/")
def get_notifications(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    user_id = current_user["sub"]

    result = supabase.table("notifications")\
        .select("*, actor:actor_id(username, display_name)")\
        .eq("user_id", user_id)\
        .order("created_at", desc=True)\
        .limit(30)\
        .execute()

    return {"notifications": result.data}

@router.post("/read-all")
def mark_all_read(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    user_id = current_user["sub"]

    supabase.table("notifications")\
        .update({"read": True})\
        .eq("user_id", user_id)\
        .execute()

    return {"message": "All marked as read"}

@router.get("/unread-count")
def unread_count(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    user_id = current_user["sub"]

    result = supabase.table("notifications")\
        .select("id")\
        .eq("user_id", user_id)\
        .eq("read", False)\
        .execute()

    return {"count": len(result.data)}