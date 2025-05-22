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
  const [navBarOpen, setnavBarOpen] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/");
    }
  }, [status]);

  const openSidebar = () => {
    if (menuOpen === false) {
      setMenuOpen(true);
    } else setMenuOpen(false);
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
        console.log("window.innerWidth");
        console.log(window.innerWidth);
        setMenuOpen(window.innerWidth >= 768);
        setnavBarOpen(window.innerWidth < 768);
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  if (status === "loading") return null;

  return (
    <div>
      {" "}
      <div className="flex max-md:flex-col h-auto w-auto">
        <div>
          {navBarOpen ? (
            <div className="w-auto">
              <Navbar openSidebar={openSidebar} />
            </div>
          ) : null}
          {menuOpen ? (
            <div className="flex-4 z-10 w-auto max-md:absolute max-md:w-full max-md:bg-slate-900 max-md:m-1 max-md:p-1 pt-1">
              <Sidebar closeSidebar={closeSidebar} />
            </div>
          ) : null}
        </div>
        <div className="flex-1 bg-slate-900 m-1 p-1 pt-1 flex flex-col w-auto h-full">
          <div className="w-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default Layout;
