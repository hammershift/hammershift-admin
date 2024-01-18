"use client";
import Image from "next/image";
import LoginPage from "./ui/login/loginPage/LoginPage";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
    const { data: session } = useSession();
    useEffect(() => {
        if (session) {
            redirect("/dashboard");
        }
    }, [session]);

    return (
        <div className="tw-flex tw-justify-center tw-items-center tw-pt-64">
            <LoginPage />
        </div>
    );
}
