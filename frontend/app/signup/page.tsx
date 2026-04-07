"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { saveToken } from "@/lib/auth";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", username: "", password: "", display_name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/signup", form);
      saveToken(res.data.access_token);
      router.push("/feed");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-2">Create account</h1>
        <p className="text-zinc-400 mb-8">Join and start connecting</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text" placeholder="Display name (optional)"
            className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-zinc-400 transition"
            value={form.display_name} onChange={e => setForm({...form, display_name: e.target.value})}
          />
          <input
            type="email" placeholder="Email" required
            className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-zinc-400 transition"
            value={form.email} onChange={e => setForm({...form, email: e.target.value})}
          />
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
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="text-zinc-500 text-sm mt-6 text-center">
          Already have an account? <Link href="/login" className="text-white underline">Login</Link>
        </p>
      </div>
    </main>
  );
}