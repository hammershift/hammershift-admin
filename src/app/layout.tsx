import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./ui/globals.css";
import AuthProvider from "./context/AuthProvider";

// Force all pages to server-render on demand — no static prerendering.
// This admin panel requires auth on every page; SSG is pointless and
// crashes the build when MONGODB_URI isn't available at build time.
export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Admin - Velocity Markets",
  description: "Admin Dashboard for Velocity Markets",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} h-screen bg-slate-900`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
