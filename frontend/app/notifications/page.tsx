"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  read: boolean;
  created_at: string;
  actor: { username: string; display_name: string };
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    loadNotifications();
    markAllRead();
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await api.get("/notifications/");
      setNotifications(res.data.notifications);
    } catch {}
  };

  const markAllRead = async () => {
    try { await api.post("/notifications/read-all"); } catch {}
  };

  const getNotificationText = (n: Notification) => {
    const name = n.actor?.display_name || n.actor?.username || "Someone";
    switch (n.type) {
      case "like": return `${name} liked your post ❤️`;
      case "comment": return `${name} commented on your post 💬`;
      case "friend_request": return `${name} sent you a friend request 👥`;
      case "friend_accepted": return `${name} accepted your friend request ✅`;
      default: return `${name} interacted with you`;
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <Link href="/feed" className="text-sm text-zinc-500 hover:text-white transition">← Feed</Link>
      </div>

      <div className="flex flex-col gap-2">
        {notifications.length === 0 && (
          <p className="text-zinc-600 text-center py-12">No notifications yet</p>
        )}
        {notifications.map(n => (
          <div key={n.id} className={`px-4 py-3 rounded-xl border ${n.read ? "bg-zinc-900 border-zinc-800" : "bg-zinc-800 border-zinc-600"}`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {(n.actor?.display_name || n.actor?.username || "?")[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm text-zinc-200">{getNotificationText(n)}</p>
                <p className="text-xs text-zinc-500 mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              {!n.read && <div className="w-2 h-2 rounded-full bg-white flex-shrink-0" />}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}