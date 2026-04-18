"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { saveToken } from "@/lib/auth";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/login", form);
      saveToken(res.data.access_token);
      router.push("/feed");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
        <p className="text-zinc-400 mb-8">Login to continue</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text" placeholder="Username" required
            className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-zinc-400 transition"
            value={form.username} onChange={e => setForm({...form, username: e.target.value})}
          />
          <input
            type="password" placeholder="Password" required
            className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-zinc-400 transition"
            value={form.password} onChange={e => setForm({...form, password: e.target.value})}
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="bg-white text-black py-3 rounded-xl font-semibold hover:bg-zinc-200 transition disabled:opacity-50">
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <p className="text-zinc-500 text-sm mt-6 text-center">
          No account? <Link href="/signup" className="text-white underline">Sign up</Link>
        </p>
      </div>
    </main>
  );
}