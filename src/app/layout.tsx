import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./ui/globals.css";
import AuthProvider from "./context/AuthProvider";
import { useSession } from "next-auth/react";

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
