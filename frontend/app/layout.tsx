import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SocialApp",
  description: "A friend-based social platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-white min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}