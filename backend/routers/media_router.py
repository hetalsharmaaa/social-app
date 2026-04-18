from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from database import supabase
from dependencies import get_current_user
import uuid

router = APIRouter(prefix="/media", tags=["Media"])

@router.post("/upload")
def upload_media(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4"]
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="File type not allowed")

    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    contents = file.file.read()

    result = supabase.storage.from_("post-media").upload(
        filename,
        contents,
        {"content-type": file.content_type}
    )

    public_url = supabase.storage.from_("post-media").get_public_url(filename)
    return {"url": public_url}