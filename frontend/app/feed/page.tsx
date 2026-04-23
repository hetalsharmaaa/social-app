"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { logout } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  users: { username: string; display_name: string };
}

interface Post {
  id: string;
  content: string;
  media_url?: string;
  media_type?: string;
  created_at: string;
  like_count: number;
  liked_by_me: boolean;
  is_mine: boolean;
  comments: Comment[];
  users: { username: string; display_name: string; avatar_url?: string };
}

export default function FeedPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");
  const [me, setMe] = useState<any>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string>("image");
  const [uploading, setUploading] = useState(false);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [postStatus, setPostStatus] = useState<any>(null);
  const [sort, setSort] = useState("latest");
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [deletingPost, setDeletingPost] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const refreshInterval = useRef<any>(null);

  useEffect(() => {
    loadMe();
    loadFeed();
    loadPostStatus();
    loadUnreadCount();

    refreshInterval.current = setInterval(() => {
      loadFeed();
      loadUnreadCount();
      setLastRefresh(new Date());
    }, 30000);

    const channel = supabase
      .channel("posts-channel")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => loadFeed())
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "posts" }, () => loadFeed())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "likes" }, () => loadFeed())
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "likes" }, () => loadFeed())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, () => loadFeed())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => loadUnreadCount())
      .subscribe();

    return () => {
      clearInterval(refreshInterval.current);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => { loadFeed(); }, [sort]);

  const loadMe = async () => {
    try {
      const res = await api.get("/users/me");
      setMe(res.data);
    } catch { router.push("/login"); }
  };

  const loadFeed = async () => {
    try {
      const res = await api.get(`/posts/feed?sort=${sort}`);
      setPosts(res.data.posts);
    } catch {}
  };

  const loadPostStatus = async () => {
    try {
      const res = await api.get("/posts/my-status");
      setPostStatus(res.data);
    } catch {}
  };

  const loadUnreadCount = async () => {
    try {
      const res = await api.get("/notifications/unread-count");
      setUnreadCount(res.data.count);
    } catch {}
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    setMediaType(file.type.startsWith("video") ? "video" : "image");
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() && !mediaFile) return;
    setPosting(true);
    setError("");

    try {
      let media_url = null;
      let media_type = null;

      if (mediaFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append("file", mediaFile);
        const uploadRes = await api.post("/media/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        media_url = uploadRes.data.url;
        media_type = mediaType;
        setUploading(false);
      }

      await api.post("/posts/", { content: newPost, media_url, media_type });
      setNewPost("");
      setMediaFile(null);
      setMediaPreview(null);
      loadFeed();
      loadPostStatus();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to post");
    } finally {
      setPosting(false);
      setUploading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Delete this post?")) return;
    setDeletingPost(postId);
    try {
      await api.delete(`/posts/${postId}`);
      setPosts(prev => prev.filter(p => p.id !== postId));
      loadPostStatus();
    } catch {}
    setDeletingPost(null);
  };

  const handleLike = async (postId: string) => {
    setPosts(prev => prev.map(p => p.id === postId ? {
      ...p,
      liked_by_me: !p.liked_by_me,
      like_count: p.liked_by_me ? p.like_count - 1 : p.like_count + 1
    } : p));
    try {
      await api.post(`/posts/${postId}/like`);
    } catch {
      setPosts(prev => prev.map(p => p.id === postId ? {
        ...p,
        liked_by_me: !p.liked_by_me,
        like_count: p.liked_by_me ? p.like_count - 1 : p.like_count + 1
      } : p));
    }
  };

  const handleComment = async (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;
    try {
      await api.post(`/posts/${postId}/comment`, { content });
      setCommentInputs(prev => ({ ...prev, [postId]: "" }));
      loadFeed();
    } catch {}
  };

  const getAvatar = (user: any, size = "w-8 h-8") => {
    if (user?.avatar_url) {
      return <img src={user.avatar_url} alt="avatar" className={`${size} rounded-full object-cover`} />;
    }
    return (
      <div className={`${size} rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold flex-shrink-0`}>
        {(user?.display_name || user?.username || "?")[0].toUpperCase()}
      </div>
    );
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold">SocialApp</h1>
          <Link href="/people" className="text-sm text-zinc-400 hover:text-white transition">👥 People</Link>
          <Link href="/profile" className="text-sm text-zinc-400 hover:text-white transition">👤 Profile</Link>
        </div>
        <div className="flex items-center gap-4">
          {me && <span className="text-zinc-400 text-sm">@{me.username}</span>}
          <Link href="/notifications" className="text-sm text-zinc-400 hover:text-white transition relative">
            🔔
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-white text-black text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          <button onClick={logout} className="text-sm text-zinc-500 hover:text-white transition">Logout</button>
        </div>
      </div>

      {/* Sort controls */}
      <div className="flex gap-2 mb-4">
        {["latest", "friends", "trending"].map(s => (
          <button key={s} onClick={() => setSort(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition capitalize ${
              sort === s ? "bg-white text-black" : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
            }`}>
            {s === "latest" ? "⏱ Latest" : s === "friends" ? "👥 Friends" : "🔥 Trending"}
          </button>
        ))}
        <span className="ml-auto text-xs text-zinc-600 self-center">
          {lastRefresh.toLocaleTimeString()}
        </span>
      </div>

      {/* Posting status */}
      {postStatus && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm flex items-center justify-between ${
          postStatus.can_post ? "bg-zinc-900 border border-zinc-800" : "bg-red-950/40 border border-red-800/40"
        }`}>
          <span className={postStatus.can_post ? "text-zinc-400" : "text-red-400"}>
            {postStatus.friend_count === 0 && "⚠️ Add friends to unlock posting"}
            {postStatus.friend_count > 0 && postStatus.unlimited && "🚀 Unlimited posts unlocked!"}
            {postStatus.friend_count > 0 && !postStatus.unlimited && `📝 ${postStatus.today_posts}/${postStatus.daily_limit} posts today`}
          </span>
          <span className="text-zinc-600 text-xs">{postStatus.friend_count} friend{postStatus.friend_count !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Composer */}
      <form onSubmit={handlePost} className="mb-8 bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
        <textarea
          placeholder={postStatus?.can_post === false ? "Add more friends to post..." : "What's on your mind?"}
          value={newPost}
          onChange={e => setNewPost(e.target.value)}
          disabled={postStatus?.can_post === false}
          className="w-full bg-transparent resize-none focus:outline-none text-white placeholder-zinc-600 min-h-[80px] disabled:opacity-40"
          maxLength={500}
        />

        {mediaPreview && (
          <div className="relative mt-2 mb-3">
            {mediaType === "video" ? (
              <video src={mediaPreview} controls className="rounded-xl max-h-60 w-full object-cover" />
            ) : (
              <img src={mediaPreview} alt="preview" className="rounded-xl max-h-60 object-cover w-full" />
            )}
            <button type="button" onClick={() => { setMediaFile(null); setMediaPreview(null); }}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-black transition">
              ✕
            </button>
          </div>
        )}

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => fileRef.current?.click()}
              disabled={postStatus?.can_post === false}
              className="text-zinc-500 hover:text-white transition text-sm disabled:opacity-40">
              📸 Photo/Video
            </button>
            <input ref={fileRef} type="file" accept="image/*,video/mp4,video/mov,video/avi" className="hidden" onChange={handleFileChange} />
            <span className="text-zinc-600 text-xs">{newPost.length}/500</span>
          </div>
          <button type="submit" disabled={posting || (!newPost.trim() && !mediaFile) || postStatus?.can_post === false}
            className="bg-white text-black px-5 py-2 rounded-full text-sm font-semibold hover:bg-zinc-200 transition disabled:opacity-40">
            {uploading ? "Uploading..." : posting ? "Posting..." : "Post"}
          </button>
        </div>
      </form>

      {/* Feed */}
      <div className="flex flex-col gap-4">
        {posts.length === 0 && (
          <p className="text-zinc-600 text-center py-12">No posts yet. Be the first!</p>
        )}
        {posts.map(post => (
          <div key={post.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              {getAvatar(post.users)}
              <div className="flex-1">
                <p className="text-sm font-semibold">{post.users?.display_name || post.users?.username}</p>
                <p className="text-xs text-zinc-500">@{post.users?.username}</p>
              </div>
              {post.is_mine && (
                <button
                  onClick={() => handleDeletePost(post.id)}
                  disabled={deletingPost === post.id}
                  className="text-zinc-600 hover:text-red-400 transition text-xs px-2 py-1 rounded-lg hover:bg-red-400/10 disabled:opacity-40">
                  {deletingPost === post.id ? "..." : "🗑 Delete"}
                </button>
              )}
            </div>

            {post.content && <p className="text-zinc-200 leading-relaxed mb-3">{post.content}</p>}

            {post.media_url && (
              <div className="mb-3">
                {post.media_type === "video" || post.media_url.match(/\.(mp4|mov|avi)$/i) ? (
                  <video src={post.media_url} controls className="rounded-xl w-full max-h-80 object-cover" />
                ) : (
                  <img src={post.media_url} alt="media" className="rounded-xl w-full max-h-80 object-cover" />
                )}
              </div>
            )}

            <p className="text-xs text-zinc-600 mb-3">{new Date(post.created_at).toLocaleString()}</p>

            <div className="flex items-center gap-4 border-t border-zinc-800 pt-3">
              <button onClick={() => handleLike(post.id)}
                className={`flex items-center gap-1 text-sm transition ${post.liked_by_me ? "text-red-400" : "text-zinc-500 hover:text-red-400"}`}>
                {post.liked_by_me ? "❤️" : "🤍"} {post.like_count}
              </button>
              <button onClick={() => setShowComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                className="flex items-center gap-1 text-sm text-zinc-500 hover:text-white transition">
                💬 {post.comments.length}
              </button>
            </div>

            {showComments[post.id] && (
              <div className="mt-3 border-t border-zinc-800 pt-3">
                {post.comments.map(c => (
                  <div key={c.id} className="flex gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {(c.users?.display_name || c.users?.username || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-zinc-300">@{c.users?.username} </span>
                      <span className="text-xs text-zinc-400">{c.content}</span>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 mt-3">
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    value={commentInputs[post.id] || ""}
                    onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && handleComment(post.id)}
                    className="flex-1 bg-zinc-800 rounded-xl px-3 py-2 text-sm focus:outline-none text-white placeholder-zinc-600"
                  />
                  <button onClick={() => handleComment(post.id)}
                    className="bg-white text-black px-3 py-2 rounded-xl text-sm font-semibold hover:bg-zinc-200 transition">
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}