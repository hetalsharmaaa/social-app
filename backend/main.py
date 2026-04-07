from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.auth_router import router as auth_router
from routers.posts_router import router as posts_router
from routers.users_router import router as users_router

app = FastAPI(title="SocialApp API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(posts_router)
app.include_router(users_router)

@app.get("/")
def root():
    return {"status": "SocialApp API is running"}