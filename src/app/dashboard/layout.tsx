"use client";
import { useEffect, useState } from "react";
import Navbar from "../ui/dashboard/navbar/navbar";
import Sidebar from "../ui/dashboard/sidebar/sidebar";

function Layout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(window.innerWidth >= 768);

  const openSidebar = () => {
    if (menuOpen === false) {
      setMenuOpen(true);
    } else {
      setMenuOpen(false);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setMenuOpen(window.innerWidth >= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="tw-flex tw-h-auto tw-w-auto">
      {menuOpen ? (
        <div className="tw-flex-4 tw-w-auto">
          <Sidebar />
        </div>
      ) : null}
      <div className="tw-flex-1 tw-bg-slate-900 tw-m-1 tw-p-1 tw-pt-1 tw-flex tw-flex-col tw-w-auto tw-h-full">
        <div className="tw-w-auto">
          <Navbar openSidebar={openSidebar} />
        </div>
        <div className="tw-w-auto">{children}</div>
      </div>
    </div>
  );
}

// export default withAuth(Layout);
export default Layout;
