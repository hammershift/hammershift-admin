import Navbar from "../ui/dashboard/navbar/navbar";
import Sidebar from "../ui/dashboard/sidebar/sidebar";
import {auth} from'../api/auth/[...nextauth]/route';


const Layout = async ({ children }: { children: React.ReactNode }) => {
  const data = await auth();
  console.log(data);

  return (
    <div className="tw-flex">
      <div className="flex-4 tw-bg-slate-800 tw-p-5 tw-h-screen">
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
