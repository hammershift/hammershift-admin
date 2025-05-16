"use client";

import { getAdmins } from "@/app/lib/data";
import AdminsPage from "@/app/ui/dashboard/adminsPage/AdminsPage";
import React, { useEffect, useState } from "react";
import { BeatLoader } from "react-spinners";

interface AdminData {
  _id: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  role: string;
}

const Admins = () => {
  const [adminData, setAdminData] = useState<AdminData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const data = await getAdmins();

      if (data && "admins" in data) {
        console.log(data);
        setAdminData(data.admins as AdminData[]);
        setIsLoading(false);
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
    <div className="section-container mt-4">
      {isLoading ? (
        <div className="flex justify-center items-center h-[592px]">
          <BeatLoader color="#F2CA16" />
        </div>
      ) : (
        <AdminsPage adminData={adminData} fetchData={fetchData} />
      )}
    </div>
  );
};

export default Admins;
