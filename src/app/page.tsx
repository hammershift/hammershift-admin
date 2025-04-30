"use client";
import Image from "next/image";
import LoginPage from "./ui/login/loginPage/LoginPage";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  // check if logged in and has session
  const { data: session } = useSession();
  useEffect(() => {
    if (session) {
      redirect("/dashboard");
    }
  }, [session]);

  return (
    <div className="flex justify-center items-center pt-64">
      <LoginPage />
    </div>
  );
}
