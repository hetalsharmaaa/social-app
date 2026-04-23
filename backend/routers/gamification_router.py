from fastapi import APIRouter, Depends
from database import get_supabase
from dependencies import get_current_user
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/gamification", tags=["Gamification"])

BADGES = {
    "first_post": {"label": "First Post", "icon": "✍️", "desc": "Made your first post"},
    "social_butterfly": {"label": "Social Butterfly", "icon": "🦋", "desc": "Added 5 friends"},
    "popular": {"label": "Popular", "icon": "⭐", "desc": "Got 10 likes total"},
    "on_fire": {"label": "On Fire", "icon": "🔥", "desc": "Maintained a 7-day streak"},
    "influencer": {"label": "Influencer", "icon": "📣", "desc": "Got 50 likes total"},
    "connector": {"label": "Connector", "icon": "🔗", "desc": "Added 10 friends"},
    "unlimited": {"label": "Unlimited", "icon": "🚀", "desc": "Unlocked unlimited posting"},
}

def update_streak(user_id: str):
    supabase = get_supabase()
    today = datetime.now(timezone.utc).date()

    result = supabase.table("streaks").select("*").eq("user_id", user_id).execute()

    if not result.data:
        supabase.table("streaks").insert({
            "user_id": user_id,
            "current_streak": 1,
            "longest_streak": 1,
            "last_post_date": today.isoformat(),
        }).execute()
        return 1

    streak = result.data[0]
    last_post = streak["last_post_date"]

    if last_post:
        last_date = datetime.fromisoformat(last_post).date() if isinstance(last_post, str) else last_post
        diff = (today - last_date).days

        if diff == 0:
            return streak["current_streak"]  # Already posted today
        elif diff == 1:
            new_streak = streak["current_streak"] + 1
        else:
            new_streak = 1  # Streak broken
    else:
        new_streak = 1

    longest = max(new_streak, streak["longest_streak"])

    supabase.table("streaks").update({
        "current_streak": new_streak,
        "longest_streak": longest,
        "last_post_date": today.isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("user_id", user_id).execute()

    return new_streak

def check_and_award_badges(user_id: str):
    supabase = get_supabase()

    # Check first post
    posts = supabase.table("posts").select("id").eq("user_id", user_id).execute()
    if len(posts.data) >= 1:
        _award_badge(supabase, user_id, "first_post")

    # Check friend count
    friends = supabase.table("friendships")\
        .select("id")\
        .or_(f"requester_id.eq.{user_id},receiver_id.eq.{user_id}")\
        .eq("status", "accepted")\
        .execute()
    friend_count = len(friends.data)

    if friend_count >= 5:
        _award_badge(supabase, user_id, "social_butterfly")
    if friend_count >= 10:
        _award_badge(supabase, user_id, "connector")
        _award_badge(supabase, user_id, "unlimited")

    # Check likes received
    post_ids = [p["id"] for p in posts.data]
    total_likes = 0
    for pid in post_ids:
        likes = supabase.table("likes").select("id").eq("post_id", pid).execute()
        total_likes += len(likes.data)

    if total_likes >= 10:
        _award_badge(supabase, user_id, "popular")
    if total_likes >= 50:
        _award_badge(supabase, user_id, "influencer")

    # Check streak
    streak = supabase.table("streaks").select("current_streak").eq("user_id", user_id).execute()
    if streak.data and streak.data[0]["current_streak"] >= 7:
        _award_badge(supabase, user_id, "on_fire")

def _award_badge(supabase, user_id: str, badge_type: str):
    try:
        supabase.table("badges").insert({
            "user_id": user_id,
            "badge_type": badge_type,
        }).execute()
    except:
        pass  # Already has badge

@router.get("/stats")
def get_stats(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    user_id = current_user["sub"]

    # Posts count
    posts = supabase.table("posts").select("id, created_at").eq("user_id", user_id).execute()
    post_count = len(posts.data)

    # Total likes received
    post_ids = [p["id"] for p in posts.data]
    total_likes = 0
    for pid in post_ids:
        likes = supabase.table("likes").select("id").eq("post_id", pid).execute()
        total_likes += len(likes.data)

    # Friend count
    friends = supabase.table("friendships")\
        .select("id")\
        .or_(f"requester_id.eq.{user_id},receiver_id.eq.{user_id}")\
        .eq("status", "accepted")\
        .execute()

    # Streak
    streak = supabase.table("streaks").select("*").eq("user_id", user_id).execute()
    streak_data = streak.data[0] if streak.data else {"current_streak": 0, "longest_streak": 0}

    # Badges
    badges = supabase.table("badges").select("*").eq("user_id", user_id).execute()
    badge_list = []
    for b in badges.data:
        if b["badge_type"] in BADGES:
            badge_list.append({**BADGES[b["badge_type"]], "earned_at": b["earned_at"]})

    return {
        "post_count": post_count,
        "total_likes": total_likes,
        "friend_count": len(friends.data),
        "current_streak": streak_data["current_streak"],
        "longest_streak": streak_data["longest_streak"],
        "badges": badge_list,
    }

@router.get("/suggestions")
def get_suggestions(current_user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    user_id = current_user["sub"]

    # Get current friends
    friendships = supabase.table("friendships")\
        .select("requester_id, receiver_id")\
        .or_(f"requester_id.eq.{user_id},receiver_id.eq.{user_id}")\
        .execute()

    connected_ids = {user_id}
    for f in friendships.data:
        connected_ids.add(f["requester_id"])
        connected_ids.add(f["receiver_id"])

    # Get all users not connected
    all_users = supabase.table("users")\
        .select("id, username, display_name")\
        .limit(50)\
        .execute()

    suggestions = [u for u in all_users.data if u["id"] not in connected_ids][:5]

    return {"suggestions": suggestions}