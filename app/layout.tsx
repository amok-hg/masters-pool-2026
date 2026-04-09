import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Masters Pool 2026 ⛳",
  description: "Live leaderboard — Masters Pool 2026",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Source+Sans+3:wght@300;400;500;600&family=Source+Code+Pro:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
