from fastapi import APIRouter, HTTPException, Depends
from models import PostCreate, CommentCreate
from database import get_supabase
supabase = get_supabase()
from dependencies import get_current_user
from datetime import datetime, timezone

router = APIRouter(prefix="/posts", tags=["Posts"])

def get_friend_count(user_id: str) -> int:
    result = supabase.table("friendships")\
        .select("id")\
        .or_(f"requester_id.eq.{user_id},receiver_id.eq.{user_id}")\
        .eq("status", "accepted")\
        .execute()
    return len(result.data)

def get_today_post_count(user_id: str) -> int:
    today = datetime.now(timezone.utc).date().isoformat()
    result = supabase.table("posts")\
        .select("id")\
        .eq("user_id", user_id)\
        .gte("created_at", f"{today}T00:00:00+00:00")\
        .execute()
    return len(result.data)

def check_posting_allowed(user_id: str):
    friend_count = get_friend_count(user_id)
    today_posts = get_today_post_count(user_id)

    if friend_count == 0:
        raise HTTPException(status_code=403, detail="You need at least 1 friend to post. Go add some friends!")
    elif friend_count == 1 and today_posts >= 1:
        raise HTTPException(status_code=403, detail="You can only post 1 time per day with 1 friend. Add more friends to post more!")
    elif 2 <= friend_count <= 9 and today_posts >= 2:
        raise HTTPException(status_code=403, detail="You can only post 2 times per day. Add more friends to unlock unlimited posts!")

def create_notification(user_id: str, actor_id: str, type: str, post_id: str = None):
    if user_id == actor_id:
        return
    try:
        supabase.table("notifications").insert({
            "user_id": user_id,
            "actor_id": actor_id,
            "type": type,
            "post_id": post_id,
        }).execute()
    except:
        pass

@router.post("/")
def create_post(body: PostCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]
    check_posting_allowed(user_id)

    result = supabase.table("posts").insert({
        "user_id": user_id,
        "content": body.content,
        "media_url": body.media_url,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create post")

    return {"message": "Post created", "post": result.data[0]}

@router.get("/feed")
def get_feed(current_user: dict = Depends(get_current_user), sort: str = "latest"):
    user_id = current_user["sub"]

    # Get friend IDs
    friendships = supabase.table("friendships")\
        .select("requester_id, receiver_id")\
        .or_(f"requester_id.eq.{user_id},receiver_id.eq.{user_id}")\
        .eq("status", "accepted")\
        .execute()

    friend_ids = set()
    for f in friendships.data:
        if f["requester_id"] != user_id:
            friend_ids.add(f["requester_id"])
        if f["receiver_id"] != user_id:
            friend_ids.add(f["receiver_id"])

    # Get all posts
    result = supabase.table("posts")\
        .select("*, users(username, display_name)")\
        .order("created_at", desc=True)\
        .limit(50)\
        .execute()

    posts = result.data

    # Attach likes + comments
    for post in posts:
        likes = supabase.table("likes").select("id, user_id").eq("post_id", post["id"]).execute()
        post["like_count"] = len(likes.data)
        post["liked_by_me"] = any(l["user_id"] == user_id for l in likes.data)
        post["is_friend"] = post["user_id"] in friend_ids or post["user_id"] == user_id

        comments = supabase.table("comments")\
            .select("*, users(username, display_name)")\
            .eq("post_id", post["id"])\
            .order("created_at")\
            .execute()
        post["comments"] = comments.data

    # Sort: friends first, then latest
    if sort == "friends":
        posts.sort(key=lambda p: (not p["is_friend"], p["created_at"]), reverse=False)
        posts.sort(key=lambda p: p["is_friend"], reverse=True)
    elif sort == "trending":
        posts.sort(key=lambda p: p["like_count"] + len(p["comments"]), reverse=True)

    return {"posts": posts}

@router.get("/my-status")
def get_posting_status(current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]
    friend_count = get_friend_count(user_id)
    today_posts = get_today_post_count(user_id)

    if friend_count == 0:
        limit = 0
        can_post = False
    elif friend_count == 1:
        limit = 1
        can_post = today_posts < 1
    elif friend_count < 10:
        limit = 2
        can_post = today_posts < 2
    else:
        limit = -1
        can_post = True

    return {
        "friend_count": friend_count,
        "today_posts": today_posts,
        "daily_limit": limit,
        "can_post": can_post,
        "unlimited": friend_count >= 10
    }

@router.post("/{post_id}/like")
def toggle_like(post_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]

    existing = supabase.table("likes").select("id").eq("post_id", post_id).eq("user_id", user_id).execute()

    if existing.data:
        supabase.table("likes").delete().eq("post_id", post_id).eq("user_id", user_id).execute()
        return {"liked": False}
    else:
        supabase.table("likes").insert({"user_id": user_id, "post_id": post_id}).execute()
        # Notify post owner
        post = supabase.table("posts").select("user_id").eq("id", post_id).execute()
        if post.data:
            create_notification(post.data[0]["user_id"], user_id, "like", post_id)
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

    # Notify post owner
    post = supabase.table("posts").select("user_id").eq("id", post_id).execute()
    if post.data:
        create_notification(post.data[0]["user_id"], user_id, "comment", post_id)

    return {"comment": result.data[0]}

@router.delete("/{post_id}/comment/{comment_id}")
def delete_comment(post_id: str, comment_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]
    supabase.table("comments").delete()\
        .eq("id", comment_id).eq("user_id", user_id).execute()
    return {"message": "Deleted"}