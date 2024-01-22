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
    <div className="section-container tw-mt-4">
      <div className="tw-flex tw-justify-between">
        <h2 className="tw-font-bold tw-text-yellow-500 tw-text-xl tw-m-2">
          Admin List
        </h2>
      </div>
      <table className="tw-w-full tw-border-separate tw-border-spacing-y-2 tw-text-left">
        <thead>
          <tr>
            <td className="tw-p-2.5 tw-font-bold max-md:tw-hidden">Admin ID</td>
            <td className="tw-p-2.5 tw-font-bold">First Name</td>
            <td className="tw-p-2.5 tw-font-bold">Last Name</td>
            <td className="tw-p-2.5 tw-font-bold">Email</td>
            <td className="tw-p-2.5 tw-font-bold">Username</td>
            <td className="tw-p-2.5 tw-font-bold">Admin Role</td>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index} className="tw-rounded-lg tw-m-2 tw-bg-[#fff]/5">
              <td className="tw-p-2.5 max-md:tw-hidden">{item._id}</td>
              <td className="tw-p-2.5">{item.first_name}</td>
              <td className="tw-p-2.5">{item.last_name}</td>
              <td className="tw-p-2.5">{item.email}</td>
              <td className="tw-p-2.5">{item.username}</td>
              <td className="tw-p-2.5">{item.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminsPage;
