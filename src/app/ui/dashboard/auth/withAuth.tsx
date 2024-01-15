"use client";
import React, { useEffect } from "react";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";

const withAuth = (Component: any) => {
    return function WithAuth(props: any) {
        const { data: session } = useSession();
        useEffect(() => {
            if (session == null) {
                redirect("/");
            }
        }, []);

        if (!session) return null;

        return <Component {...props} />;
    };
};

export default withAuth;
