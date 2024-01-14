"use client";
import Navbar from "../ui/dashboard/navbar/navbar";
import Sidebar from "../ui/dashboard/sidebar/sidebar";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

function Layout({ children }: { children: React.ReactNode }) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const { data: session } = useSession();
    useEffect(() => {
        setIsLoggedIn(!!session);
        if (session === null) {
            redirect("/");
        }
    }, [session]);

    if (session === null) return null;

    return (
        <div className="tw-flex tw-h-full">
            <div className="sticky tw-top-0 flex-4 tw-bg-slate-800 tw-p-5 tw-h-auto">
                <Sidebar />
            </div>
            <div className="flex-1 tw-bg-slate-900 tw-m-1 tw-p-1 tw-pt-1 tw-flex tw-flex-col tw-w-full tw-h-screen">
                <Navbar />
                {children}
            </div>
        </div>
    );
}

export default Layout;
