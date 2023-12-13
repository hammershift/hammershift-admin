"use client";

import React, { useEffect, useState } from "react";
import Search from "@/app/ui/dashboard/search/Search";
import EditIcon from "@mui/icons-material/Edit";
import DvrIcon from "@mui/icons-material/Dvr";
import DeleteIcon from "@mui/icons-material/Delete";
import { getUsers } from "@/app/lib/data";

interface UserData {
  id: string;
  username: string;
  fullName: string;
  email: string;
  state: string;
  country: string;
}
interface UsersPageProps {
  data: UserData[];
}

const UsersPage = () => {
  const [userData, setUserData] = useState<UserData[]>([]);

  const fetchData = async () => {
    try {
      const data = await getUsers();

      if (data && "users" in data) {
        console.log(data);
        setUserData(data.users as UserData[]);
      } else {
        console.error("Unexpected data structure:", data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="section-container tw-mt-4">
      <div className="tw-flex tw-justify-between">
        <Search placeholder="users" />
        <button className="btn-yellow">ADD NEW</button>
      </div>

      <div className="tw-my-4">
        <Table data={userData} />
      </div>

      <div className="tw-flex tw-justify-end ">
        <div className="tw-flex tw-items-center tw-gap-4">
          <button className="btn-transparent-white">prev</button>
          <div className="tw-h-auto">page 1 of 1</div>
          <button className="btn-transparent-white">next</button>
        </div>
      </div>
    </div>
  );
};

export default UsersPage;

const Table: React.FC<UsersPageProps> = ({ data }) => {
  return (
    <table className="tw-w-full tw-border-separate tw-border-spacing-y-2 tw-text-center">
      <thead>
        <tr>
          <th className="tw-p-2.5 tw-font-bold ">Username</th>
          <th className="tw-p-2.5 tw-font-bold ">Full Name</th>
          <th className="tw-p-2.5 tw-font-bold">Email</th>
          <th className="tw-p-2.5 tw-font-bold">State</th>
          <th className="tw-p-2.5 tw-font-bold">Country</th>
          <th className="tw-p-2.5 tw-font-bold">Actions</th>
        </tr>
      </thead>
      <tbody className="tw-w-full">
        {data &&
          data.map((item: UserData, index: number) => (
            <tr key={index} className=" tw-rounded-lg tw-bg-[#fff]/5">
              <td className="tw-p-2.5 tw-w-1/8">{item.username}</td>
              <td className="tw-p-2.5 tw-w-1/8">{item.fullName}</td>
              <td className="tw-p-2.5 tw-w-1/8">{item.email}</td>
              <td className="tw-p-2.5 tw-w-1/8">{item.state}</td>
              <td className="tw-p-2.5 tw-w-1/8">{item.country}</td>
              <td className="tw-p-2.5 tw-w-1/8">
                <div className="tw-flex tw-gap-4 tw-justify-center">
                  <EditIcon />
                  <DvrIcon />
                  <DeleteIcon sx={{ color: "#C2451E" }} />
                </div>
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  );
};
