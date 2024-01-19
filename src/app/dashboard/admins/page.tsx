"use client";

import { getAdmins } from "@/app/lib/data";
import AdminsPage from "@/app/ui/dashboard/adminsPage/AdminsPage";
import React, { useEffect, useState } from "react";

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

  const fetchData = async () => {
    try {
      const data = await getAdmins();

      if (data && "admins" in data) {
        console.log(data);
        setAdminData(data.admins as AdminData[]);
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

  return <AdminsPage data={adminData} />;
};

export default Admins;
