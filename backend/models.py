from pydantic import BaseModel, EmailStr
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

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"