import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spy Bluff — Bluff It Till You Make It",
  description:
    "A party game where one of you is lying through their teeth, and the rest are about to find out.",
  openGraph: {
    title: "Spy Bluff",
    description: "Online multiplayer party association game. Find the impostor!",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
