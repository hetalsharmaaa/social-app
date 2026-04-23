from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from database import get_supabase, get_service_supabase
from dependencies import get_current_user
from models import UpdateProfile
import uuid

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    user_id = current_user["sub"]
    result = supabase.table("users").select("id, username, display_name, email, avatar_url, created_at").eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return result.data[0]

@router.put("/me")
def update_profile(body: UpdateProfile, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    user_id = current_user["sub"]

    updates = {}
    if body.display_name is not None:
        updates["display_name"] = body.display_name

    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")

    result = supabase.table("users").update(updates).eq("id", user_id).execute()
    return result.data[0]

@router.post("/me/avatar")
def upload_avatar(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    storage = get_service_supabase()
    user_id = current_user["sub"]

    allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only images allowed for avatar")

    ext = file.filename.split(".")[-1]
    filename = f"avatars/{user_id}.{ext}"
    contents = file.file.read()

    # Delete old avatar first
    try:
        storage.storage.from_("post-media").remove([filename])
    except:
        pass

    storage.storage.from_("post-media").upload(
        filename,
        contents,
        {"content-type": file.content_type}
    )

    public_url = storage.storage.from_("post-media").get_public_url(filename)

    # Save to user record
    result = supabase.table("users").update({"avatar_url": public_url}).eq("id", user_id).execute()
    return {"avatar_url": public_url}

@router.get("/search")
def search_users(q: str, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    if len(q) < 2:
        raise HTTPException(status_code=400, detail="Query too short")

    result = supabase.table("users")\
        .select("id, username, display_name, avatar_url")\
        .ilike("username", f"%{q}%")\
        .limit(10)\
        .execute()

    return {"users": result.data}

@router.get("/{username}")
def get_profile(username: str, current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    result = supabase.table("users").select("id, username, display_name, avatar_url, created_at").eq("username", username).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")

    user = result.data[0]
    posts = supabase.table("posts").select("*").eq("user_id", user["id"]).order("created_at", desc=True).execute()

    friends = supabase.table("friendships")\
        .select("id")\
        .or_(f"requester_id.eq.{user['id']},receiver_id.eq.{user['id']}")\
        .eq("status", "accepted")\
        .execute()

    return {"user": user, "posts": posts.data, "friend_count": len(friends.data)}