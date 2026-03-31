"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

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

  return (
    <Link
      href={item.path}
      className={`flex items-center gap-2 max-md:p-1 p-3 max-md:text-sm m-1 rounded transition-colors ${
        isActive
          ? "border-l-2 border-[#F2CA16] bg-[#253D54] text-[#F2CA16]"
          : "hover:bg-[#253D54] hover:text-[#F2CA16]"
      }`}
    >
      {item.icon}
      {item.title}
    </Link>
  );
};

export default SidebarLink;
