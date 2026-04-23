from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.auth_router import router as auth_router
from routers.posts_router import router as posts_router
from routers.users_router import router as users_router
from routers.media_router import router as media_router
from routers.friends_router import router as friends_router
from routers.notifications_router import router as notifications_router
from routers.gamification_router import router as gamification_router

app = FastAPI(title="SocialApp API", version="7.0.0")

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
app.include_router(media_router)
app.include_router(friends_router)
app.include_router(notifications_router)
app.include_router(gamification_router)

@app.get("/")
def root():
    return {"status": "SocialApp API v7 is running"}