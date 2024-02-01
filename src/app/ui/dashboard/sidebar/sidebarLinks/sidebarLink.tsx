"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect } from "react";

interface SidebarLinkProps {
    item: {
        path: string;
        icon: React.ReactNode;
        title: string;
    };
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ item }) => {
    const currentPath = usePathname();
    const isActive = currentPath === item.path;
    const linkStyles = `tw-flex tw-items-center tw-gap-2 tw-p-3 hover:tw-bg-yellow-400 hover:tw-text-black tw-m-1 tw-rounded ${
        isActive ? "tw-bg-gray-400 tw-text-black" : ""
    }`;

    return (
        <Link href={item.path} className={linkStyles}>
            {item.icon}
            {item.title}
        </Link>
    );
};

export default SidebarLink;
