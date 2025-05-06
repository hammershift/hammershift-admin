import { getAdmins } from "@/app/lib/data";
import React from "react";

interface AdminData {
  _id: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  role: string;
}

interface AdminsPageProps {
  data: AdminData[];
}

const AdminsPage: React.FC<AdminsPageProps> = ({ data }) => {
  return (
    <div className="section-container mt-4">
      <div className="flex justify-between">
        <h2 className="font-bold text-yellow-500 text-xl m-2">Admin List</h2>
      </div>
      <table className="w-full border-separate border-spacing-y-2 text-center">
        <thead>
          <tr>
            <td className="p-2.5 font-bold max-md:hidden">Admin ID</td>
            <td className="p-2.5 font-bold">First Name</td>
            <td className="p-2.5 font-bold">Last Name</td>
            <td className="p-2.5 font-bold">Email</td>
            <td className="p-2.5 font-bold">Username</td>
            <td className="p-2.5 font-bold">Admin Role</td>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index} className="rounded-lg m-2 bg-[#fff]/5">
              <td className="p-2.5 max-md:hidden">{item._id}</td>
              <td className="p-2.5">{item.first_name}</td>
              <td className="p-2.5">{item.last_name}</td>
              <td className="p-2.5">{item.email}</td>
              <td className="p-2.5">{item.username}</td>
              <td className="p-2.5">{item.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminsPage;
