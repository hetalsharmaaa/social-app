from fastapi import APIRouter, HTTPException, Depends
from database import get_supabase
supabase = get_supabase()
from dependencies import get_current_user

router = APIRouter(prefix="/friends", tags=["Friends"])

@router.post("/request/{receiver_username}")
def send_request(receiver_username: str, current_user: dict = Depends(get_current_user)):
    requester_id = current_user["sub"]

    # Get receiver
    result = supabase.table("users").select("id").eq("username", receiver_username).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")

    receiver_id = result.data[0]["id"]

    if requester_id == receiver_id:
        raise HTTPException(status_code=400, detail="Cannot add yourself")

    # Check if already exists
    existing = supabase.table("friendships")\
        .select("id, status")\
        .or_(f"and(requester_id.eq.{requester_id},receiver_id.eq.{receiver_id}),and(requester_id.eq.{receiver_id},receiver_id.eq.{requester_id})")\
        .execute()

    if existing.data:
        status = existing.data[0]["status"]
        if status == "accepted":
            raise HTTPException(status_code=400, detail="Already friends")
        elif status == "pending":
            raise HTTPException(status_code=400, detail="Request already sent")

    supabase.table("friendships").insert({
        "requester_id": requester_id,
        "receiver_id": receiver_id,
        "status": "pending"
    }).execute()

    return {"message": "Friend request sent"}

@router.post("/accept/{requester_username}")
def accept_request(requester_username: str, current_user: dict = Depends(get_current_user)):
    receiver_id = current_user["sub"]

    result = supabase.table("users").select("id").eq("username", requester_username).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    requester_id = result.data[0]["id"]

    supabase.table("friendships")\
        .update({"status": "accepted"})\
        .eq("requester_id", requester_id)\
        .eq("receiver_id", receiver_id)\
        .eq("status", "pending")\
        .execute()

    # Notify requester their request was accepted
    try:
        supabase.table("notifications").insert({
            "user_id": requester_id,
            "actor_id": receiver_id,
            "type": "friend_accepted",
        }).execute()
    except:
        pass

    return {"message": "Friend request accepted"}
    
@router.post("/reject/{requester_username}")
def reject_request(requester_username: str, current_user: dict = Depends(get_current_user)):
    receiver_id = current_user["sub"]

    result = supabase.table("users").select("id").eq("username", requester_username).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    requester_id = result.data[0]["id"]

    supabase.table("friendships")\
        .update({"status": "rejected"})\
        .eq("requester_id", requester_id)\
        .eq("receiver_id", receiver_id)\
        .eq("status", "pending")\
        .execute()

    return {"message": "Friend request rejected"}

@router.delete("/remove/{username}")
def remove_friend(username: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]

    result = supabase.table("users").select("id").eq("username", username).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    other_id = result.data[0]["id"]

    supabase.table("friendships")\
        .delete()\
        .or_(f"and(requester_id.eq.{user_id},receiver_id.eq.{other_id}),and(requester_id.eq.{other_id},receiver_id.eq.{user_id})")\
        .execute()

    return {"message": "Friend removed"}

@router.get("/list")
def get_friends(current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]

    result = supabase.table("friendships")\
        .select("*, requester:requester_id(id, username, display_name), receiver:receiver_id(id, username, display_name)")\
        .or_(f"requester_id.eq.{user_id},receiver_id.eq.{user_id}")\
        .eq("status", "accepted")\
        .execute()

    friends = []
    for f in result.data:
        if f["requester_id"] == user_id:
            friends.append(f["receiver"])
        else:
            friends.append(f["requester"])

    return {"friends": friends, "count": len(friends)}

@router.get("/requests")
def get_pending_requests(current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]

    result = supabase.table("friendships")\
        .select("*, requester:requester_id(id, username, display_name)")\
        .eq("receiver_id", user_id)\
        .eq("status", "pending")\
        .execute()

    return {"requests": result.data}

@router.get("/status/{username}")
def get_friendship_status(username: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]

    result = supabase.table("users").select("id").eq("username", username).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    other_id = result.data[0]["id"]

    existing = supabase.table("friendships")\
        .select("*")\
        .or_(f"and(requester_id.eq.{user_id},receiver_id.eq.{other_id}),and(requester_id.eq.{other_id},receiver_id.eq.{user_id})")\
        .execute()

    if not existing.data:
        return {"status": "none"}

    f = existing.data[0]
    if f["status"] == "accepted":
        return {"status": "friends"}
    elif f["status"] == "pending":
        if f["requester_id"] == user_id:
            return {"status": "request_sent"}
        else:
            return {"status": "request_received"}
    return {"status": "none"}