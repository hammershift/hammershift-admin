import { getAdmins } from "@/app/lib/data";
import React from "react";

interface AdminData {
  _id: string;
  first_name: string;
  last_name: string;
  username: string;
}

interface AdminsPageProps {
  data: AdminData[];
}

const AdminsPage: React.FC<AdminsPageProps> = ({ data }) => {
  const headers = [
    { KEY: "_id", LABEL: "Admin ID" },
    { KEY: "first_name", LABEL: "First Name" },
    { KEY: "last_name", LABEL: "Last Name" },
    { KEY: "username", LABEL: "Username" },
  ];

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
            {headers.map((header, index) => (
              <td className="tw-p-2.5 tw-font-bold" key={index}>
                {header.LABEL}
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index} className="tw-rounded-lg tw-m-2 tw-bg-[#fff]/5">
              <td className="tw-p-2.5">{item._id}</td>
              <td className="tw-p-2.5">{item.first_name}</td>
              <td className="tw-p-2.5">{item.last_name}</td>
              <td className="tw-p-2.5">{item.username}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminsPage;
