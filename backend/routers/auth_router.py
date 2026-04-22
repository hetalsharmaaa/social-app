from fastapi import APIRouter, HTTPException
from models import SignupRequest, LoginRequest, TokenResponse
from database import get_supabase
supabase = get_supabase()
from auth import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/signup", response_model=TokenResponse)
def signup(body: SignupRequest):
    # Check if username already exists
    existing = supabase.table("users").select("id").eq("username", body.username).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Username already taken")

    # Check if email already exists
    existing_email = supabase.table("users").select("id").eq("email", body.email).execute()
    if existing_email.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_password(body.password)

    result = supabase.table("users").insert({
        "email": body.email,
        "username": body.username,
        "password_hash": hashed,
        "display_name": body.display_name or body.username,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create user")

    user = result.data[0]
    token = create_access_token({"sub": str(user["id"]), "username": user["username"]})
    return {"access_token": token}

@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    result = supabase.table("users").select("*").eq("username", body.username).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    user = result.data[0]
    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token({"sub": str(user["id"]), "username": user["username"]})
    return {"access_token": token}