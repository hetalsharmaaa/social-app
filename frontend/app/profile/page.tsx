"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Link from "next/link";

interface Stats {
  post_count: number;
  total_likes: number;
  friend_count: number;
  current_streak: number;
  longest_streak: number;
  badges: Array<{ label: string; icon: string; desc: string; earned_at: string }>;
}

interface Suggestion {
  id: string;
  username: string;
  display_name: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [addedUsers, setAddedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadMe();
    loadStats();
    loadSuggestions();
  }, []);

  const loadMe = async () => {
    try {
      const res = await api.get("/users/me");
      setMe(res.data);
    } catch { router.push("/login"); }
  };

  const loadStats = async () => {
    try {
      const res = await api.get("/gamification/stats");
      setStats(res.data);
    } catch {}
  };

  const loadSuggestions = async () => {
    try {
      const res = await api.get("/gamification/suggestions");
      setSuggestions(res.data.suggestions);
    } catch {}
  };

  const sendRequest = async (username: string) => {
    try {
      await api.post(`/friends/request/${username}`);
      setAddedUsers(prev => new Set([...prev, username]));
    } catch {}
  };

  const getStreakColor = (streak: number) => {
    if (streak >= 7) return "text-orange-400";
    if (streak >= 3) return "text-yellow-400";
    return "text-zinc-400";
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Profile</h1>
        <Link href="/feed" className="text-sm text-zinc-500 hover:text-white transition">← Feed</Link>
      </div>

      {/* User info */}
      {me && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-zinc-700 flex items-center justify-center text-2xl font-bold">
              {(me.display_name || me.username)[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold">{me.display_name || me.username}</h2>
              <p className="text-zinc-500">@{me.username}</p>
              <p className="text-zinc-600 text-xs mt-1">
                Joined {new Date(me.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold">{stats.post_count}</p>
            <p className="text-zinc-500 text-sm mt-1">Posts</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold">{stats.total_likes}</p>
            <p className="text-zinc-500 text-sm mt-1">Likes Received</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold">{stats.friend_count}</p>
            <p className="text-zinc-500 text-sm mt-1">Friends</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
            <p className={`text-3xl font-bold ${getStreakColor(stats.current_streak)}`}>
              {stats.current_streak} 🔥
            </p>
            <p className="text-zinc-500 text-sm mt-1">Day Streak</p>
            <p className="text-zinc-600 text-xs">Best: {stats.longest_streak}</p>
          </div>
        </div>
      )}

      {/* Posting limit info */}
      {stats && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
          <h3 className="text-sm font-semibold mb-3 text-zinc-400 uppercase tracking-wider">Posting Power</h3>
          <div className="flex items-center justify-between">
            <div>
              {stats.friend_count === 0 && <p className="text-red-400 text-sm">⚠️ Add friends to unlock posting</p>}
              {stats.friend_count === 1 && <p className="text-yellow-400 text-sm">📝 1 post/day unlocked</p>}
              {stats.friend_count >= 2 && stats.friend_count < 10 && <p className="text-blue-400 text-sm">📝 2 posts/day unlocked</p>}
              {stats.friend_count >= 10 && <p className="text-green-400 text-sm">🚀 Unlimited posting unlocked!</p>}
            </div>
            <div className="text-right">
              <p className="text-zinc-400 text-sm">{stats.friend_count}/10 friends</p>
              {stats.friend_count < 10 && (
                <p className="text-zinc-600 text-xs">{10 - stats.friend_count} more for unlimited</p>
              )}
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 bg-zinc-800 rounded-full h-2">
            <div
              className="bg-white rounded-full h-2 transition-all"
              style={{ width: `${Math.min((stats.friend_count / 10) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Badges */}
      {stats && stats.badges.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
          <h3 className="text-sm font-semibold mb-3 text-zinc-400 uppercase tracking-wider">
            Badges ({stats.badges.length})
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {stats.badges.map(badge => (
              <div key={badge.label} className="flex items-center gap-3 bg-zinc-800 rounded-xl p-3">
                <span className="text-2xl">{badge.icon}</span>
                <div>
                  <p className="text-sm font-semibold">{badge.label}</p>
                  <p className="text-xs text-zinc-500">{badge.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friend suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <h3 className="text-sm font-semibold mb-3 text-zinc-400 uppercase tracking-wider">
            People You May Know
          </h3>
          <div className="flex flex-col gap-2">
            {suggestions.map(user => (
              <div key={user.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold">
                    {(user.display_name || user.username)[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{user.display_name || user.username}</p>
                    <p className="text-xs text-zinc-500">@{user.username}</p>
                  </div>
                </div>
                {addedUsers.has(user.username) ? (
                  <span className="text-xs text-zinc-500 border border-zinc-700 px-3 py-1 rounded-full">Requested</span>
                ) : (
                  <button onClick={() => sendRequest(user.username)}
                    className="text-xs bg-white text-black px-3 py-1 rounded-full font-semibold hover:bg-zinc-200 transition">
                    Add
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}