import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6 px-4">
      <h1 className="text-5xl font-bold tracking-tight">SocialApp</h1>
      <p className="text-zinc-400 text-lg text-center max-w-md">
        A social platform where your network unlocks your voice.
      </p>
      <div className="flex gap-4 mt-4">
        <Link href="/signup" className="bg-white text-black px-6 py-3 rounded-full font-semibold hover:bg-zinc-200 transition">
          Get Started
        </Link>
        <Link href="/login" className="border border-zinc-600 px-6 py-3 rounded-full font-semibold hover:border-zinc-400 transition">
          Login
        </Link>
      </div>
    </main>
  );
}