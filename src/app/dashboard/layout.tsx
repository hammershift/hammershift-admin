"use client";
import Navbar from "../ui/dashboard/navbar/navbar";
import Sidebar from "../ui/dashboard/sidebar/sidebar";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="tw-flex tw-h-full">
      <div className="flex-4">
        <Sidebar />
      </div>
      <div className="flex-1 tw-bg-slate-900 tw-m-1 tw-p-1 tw-pt-1 tw-flex tw-flex-col tw-w-auto tw-h-full sm:tw-w-full">
        <div className="tw-w-auto">
          <Navbar />
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

// export default withAuth(Layout);
export default Layout;
