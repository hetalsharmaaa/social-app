"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { logout } from "@/lib/auth";

interface Post {
  id: string;
  content: string;
  created_at: string;
  users: { username: string; display_name: string };
}

export default function FeedPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");
  const [me, setMe] = useState<any>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadMe();
    loadFeed();
  }, []);

  const loadMe = async () => {
    try {
      const res = await api.get("/users/me");
      setMe(res.data);
    } catch {
      router.push("/login");
    }
  };

  const loadFeed = async () => {
    try {
      const res = await api.get("/posts/feed");
      setPosts(res.data.posts);
    } catch {}
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    setPosting(true);
    setError("");
    try {
      await api.post("/posts/", { content: newPost });
      setNewPost("");
      loadFeed();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">SocialApp</h1>
        <div className="flex items-center gap-4">
          {me && <span className="text-zinc-400 text-sm">@{me.username}</span>}
          <button onClick={logout} className="text-sm text-zinc-500 hover:text-white transition">
            Logout
          </button>
        </div>
      </div>

      {/* Post composer */}
      <form onSubmit={handlePost} className="mb-8 bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
        <textarea
          placeholder="What's on your mind?"
          value={newPost}
          onChange={e => setNewPost(e.target.value)}
          className="w-full bg-transparent resize-none focus:outline-none text-white placeholder-zinc-600 min-h-[80px]"
          maxLength={500}
        />
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <div className="flex justify-between items-center mt-2">
          <span className="text-zinc-600 text-xs">{newPost.length}/500</span>
          <button type="submit" disabled={posting || !newPost.trim()}
            className="bg-white text-black px-5 py-2 rounded-full text-sm font-semibold hover:bg-zinc-200 transition disabled:opacity-40">
            {posting ? "Posting..." : "Post"}
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
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold">
                {(post.users?.display_name || post.users?.username || "?")[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold">{post.users?.display_name || post.users?.username}</p>
                <p className="text-xs text-zinc-500">@{post.users?.username}</p>
              </div>
            </div>
            <p className="text-zinc-200 leading-relaxed">{post.content}</p>
            <p className="text-xs text-zinc-600 mt-3">
              {new Date(post.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}