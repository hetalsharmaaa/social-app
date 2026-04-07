from fastapi import APIRouter, HTTPException, Depends
from models import PostCreate
from database import supabase
from dependencies import get_current_user

router = APIRouter(prefix="/posts", tags=["Posts"])

@router.post("/")
def create_post(body: PostCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]

    result = supabase.table("posts").insert({
        "user_id": user_id,
        "content": body.content,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create post")

    return {"message": "Post created", "post": result.data[0]}

@router.get("/feed")
def get_feed(current_user: dict = Depends(get_current_user)):
    result = supabase.table("posts")\
        .select("*, users(username, display_name)")\
        .order("created_at", desc=True)\
        .limit(50)\
        .execute()
    return {"posts": result.data}