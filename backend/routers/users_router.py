from fastapi import APIRouter, HTTPException, Depends
from database import supabase
from dependencies import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]
    result = supabase.table("users").select("id, username, display_name, email, created_at").eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return result.data[0]

@router.get("/{username}")
def get_profile(username: str, current_user: dict = Depends(get_current_user)):
    result = supabase.table("users").select("id, username, display_name, created_at").eq("username", username).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = result.data[0]
    posts = supabase.table("posts").select("*").eq("user_id", user["id"]).order("created_at", desc=True).execute()
    return {"user": user, "posts": posts.data}