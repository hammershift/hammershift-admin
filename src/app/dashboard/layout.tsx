"use client";
import { useEffect, useState } from "react";
import Navbar from "../ui/dashboard/navbar/navbar";
import Sidebar from "../ui/dashboard/sidebar/sidebar";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

function Layout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 768 : false
  );
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const { data: session } = useSession();
  useEffect(() => {
    setIsLoggedIn(!!session);
    if (session === null) {
      redirect("/");
    }
  }, [session]);

  const openSidebar = () => {
    if (menuOpen === false) {
      setMenuOpen(true);
    }
  };

  const closeSidebar = () => {
    if (window.innerWidth < 768) {
      setMenuOpen(false);
    } else {
      setMenuOpen(true);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleResize = () => {
        setMenuOpen(window.innerWidth >= 768);
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  if (session === null) return null;

  return (
    <div>
      {" "}
      <div className="flex h-auto w-auto">
        {menuOpen ? (
          <div className="flex-4 z-10 w-auto max-md:absolute max-md:w-full">
            <Sidebar closeSidebar={closeSidebar} />
          </div>
        ) : null}
        <div className="flex-1 bg-slate-900 m-1 p-1 pt-1 flex flex-col w-auto h-full">
          {/* <div className="w-auto">
            <Navbar openSidebar={openSidebar} />
          </div> */}
          <div className="w-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default Layout;
