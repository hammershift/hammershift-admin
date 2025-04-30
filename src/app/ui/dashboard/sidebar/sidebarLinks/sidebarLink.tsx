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
  const linkStyles = `flex items-center gap-2 p-3 hover:bg-yellow-400 hover:text-black m-1 rounded ${
    isActive ? "bg-gray-400 text-black" : ""
  }`;

  return (
    <Link href={item.path} className={linkStyles}>
      {item.icon}
      {item.title}
    </Link>
  );
};

export default SidebarLink;
