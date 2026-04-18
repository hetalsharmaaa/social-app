from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from supabase import create_client
from dependencies import get_current_user
import uuid
import os
from dotenv import load_dotenv

load_dotenv()

# Use service role key for storage (bypasses RLS)
storage_client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

router = APIRouter(prefix="/media", tags=["Media"])

@router.post("/upload")
def upload_media(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4"]
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="File type not allowed")

    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    contents = file.file.read()

    storage_client.storage.from_("post-media").upload(
        filename,
        contents,
        {"content-type": file.content_type}
    )

    public_url = storage_client.storage.from_("post-media").get_public_url(filename)
    return {"url": public_url}