from fastapi import APIRouter, HTTPException, Depends
from models import PostCreate, CommentCreate
from database import supabase
from dependencies import get_current_user

router = APIRouter(prefix="/posts", tags=["Posts"])

@router.post("/")
def create_post(body: PostCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]

    result = supabase.table("posts").insert({
        "user_id": user_id,
        "content": body.content,
        "media_url": body.media_url,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create post")

    return {"message": "Post created", "post": result.data[0]}

@router.get("/feed")
def get_feed(current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]

    result = supabase.table("posts")\
        .select("*, users(username, display_name)")\
        .order("created_at", desc=True)\
        .limit(50)\
        .execute()

    posts = result.data

    # Attach like count + whether current user liked + comments for each post
    for post in posts:
        likes = supabase.table("likes").select("id, user_id").eq("post_id", post["id"]).execute()
        post["like_count"] = len(likes.data)
        post["liked_by_me"] = any(l["user_id"] == user_id for l in likes.data)

        comments = supabase.table("comments")\
            .select("*, users(username, display_name)")\
            .eq("post_id", post["id"])\
            .order("created_at")\
            .execute()
        post["comments"] = comments.data

    return {"posts": posts}

@router.post("/{post_id}/like")
def toggle_like(post_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]

    existing = supabase.table("likes").select("id").eq("post_id", post_id).eq("user_id", user_id).execute()

    if existing.data:
        supabase.table("likes").delete().eq("post_id", post_id).eq("user_id", user_id).execute()
        return {"liked": False}
    else:
        supabase.table("likes").insert({"user_id": user_id, "post_id": post_id}).execute()
        return {"liked": True}

@router.post("/{post_id}/comment")
def add_comment(post_id: str, body: CommentCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]

    result = supabase.table("comments").insert({
        "user_id": user_id,
        "post_id": post_id,
        "content": body.content,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to add comment")

    return {"comment": result.data[0]}

@router.delete("/{post_id}/comment/{comment_id}")
def delete_comment(post_id: str, comment_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]

    result = supabase.table("comments").delete()\
        .eq("id", comment_id).eq("user_id", user_id).execute()

    return {"message": "Deleted"}