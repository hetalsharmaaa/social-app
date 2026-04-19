"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Link from "next/link";

interface User {
  id: string;
  username: string;
  display_name: string;
}

interface FriendRequest {
  id: string;
  requester: { username: string; display_name: string };
}

export default function PeoplePage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFriends();
    loadRequests();
  }, []);

  const loadFriends = async () => {
    try {
      const res = await api.get("/friends/list");
      setFriends(res.data.friends);
    } catch { router.push("/login"); }
  };

  const loadRequests = async () => {
    try {
      const res = await api.get("/friends/requests");
      setRequests(res.data.requests);
    } catch {}
  };

  const handleSearch = async (q: string) => {
    setSearch(q);
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await api.get(`/users/search?q=${q}`);
      const users = res.data.users;
      setResults(users);

      // Fetch status for each user
      const statusMap: Record<string, string> = {};
      await Promise.all(users.map(async (u: User) => {
        const s = await api.get(`/friends/status/${u.username}`);
        statusMap[u.username] = s.data.status;
      }));
      setStatuses(statusMap);
    } catch {}
    setLoading(false);
  };

  const sendRequest = async (username: string) => {
    try {
      await api.post(`/friends/request/${username}`);
      setStatuses(prev => ({ ...prev, [username]: "request_sent" }));
    } catch {}
  };

  const acceptRequest = async (username: string) => {
    try {
      await api.post(`/friends/accept/${username}`);
      loadFriends();
      loadRequests();
    } catch {}
  };

  const rejectRequest = async (username: string) => {
    try {
      await api.post(`/friends/reject/${username}`);
      loadRequests();
    } catch {}
  };

  const getActionButton = (user: User) => {
    const status = statuses[user.username];
    if (status === "friends") return <span className="text-xs text-green-400 px-3 py-1 border border-green-400/30 rounded-full">Friends ✓</span>;
    if (status === "request_sent") return <span className="text-xs text-zinc-500 px-3 py-1 border border-zinc-700 rounded-full">Requested</span>;
    if (status === "request_received") return (
      <div className="flex gap-2">
        <button onClick={() => acceptRequest(user.username)} className="text-xs bg-white text-black px-3 py-1 rounded-full font-semibold hover:bg-zinc-200 transition">Accept</button>
        <button onClick={() => rejectRequest(user.username)} className="text-xs border border-zinc-600 px-3 py-1 rounded-full hover:border-zinc-400 transition">Reject</button>
      </div>
    );
    return <button onClick={() => sendRequest(user.username)} className="text-xs bg-white text-black px-3 py-1 rounded-full font-semibold hover:bg-zinc-200 transition">Add Friend</button>;
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">People</h1>
        <Link href="/feed" className="text-sm text-zinc-500 hover:text-white transition">← Feed</Link>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search users..."
        value={search}
        onChange={e => handleSearch(e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-zinc-400 transition mb-6"
      />

      {/* Search Results */}
      {results.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm text-zinc-500 mb-3 uppercase tracking-wider">Search Results</h2>
          <div className="flex flex-col gap-2">
            {results.map(user => (
              <div key={user.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center font-bold">
                    {(user.display_name || user.username)[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{user.display_name || user.username}</p>
                    <p className="text-xs text-zinc-500">@{user.username}</p>
                  </div>
                </div>
                {getActionButton(user)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Requests */}
      {requests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm text-zinc-500 mb-3 uppercase tracking-wider">Friend Requests ({requests.length})</h2>
          <div className="flex flex-col gap-2">
            {requests.map(req => (
              <div key={req.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center font-bold">
                    {(req.requester.display_name || req.requester.username)[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{req.requester.display_name || req.requester.username}</p>
                    <p className="text-xs text-zinc-500">@{req.requester.username}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => acceptRequest(req.requester.username)} className="text-xs bg-white text-black px-3 py-1 rounded-full font-semibold hover:bg-zinc-200 transition">Accept</button>
                  <button onClick={() => rejectRequest(req.requester.username)} className="text-xs border border-zinc-600 px-3 py-1 rounded-full hover:border-zinc-400 transition">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div>
        <h2 className="text-sm text-zinc-500 mb-3 uppercase tracking-wider">Your Friends ({friends.length})</h2>
        {friends.length === 0 ? (
          <p className="text-zinc-600 text-center py-8">No friends yet. Search for people above!</p>
        ) : (
          <div className="flex flex-col gap-2">
            {friends.map(user => (
              <div key={user.id} className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center font-bold">
                  {(user.display_name || user.username)[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold">{user.display_name || user.username}</p>
                  <p className="text-xs text-zinc-500">@{user.username}</p>
                </div>
                <span className="ml-auto text-xs text-green-400">Friends</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}