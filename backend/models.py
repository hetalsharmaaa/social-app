from pydantic import BaseModel
from typing import Optional

class SignupRequest(BaseModel):
    email: str
    username: str
    password: str
    display_name: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class PostCreate(BaseModel):
    content: str
    media_url: Optional[str] = None
    media_type: Optional[str] = None  # 'image' or 'video'

class CommentCreate(BaseModel):
    content: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UpdateProfile(BaseModel):
    display_name: Optional[str] = None