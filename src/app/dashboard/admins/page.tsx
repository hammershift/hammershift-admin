"use client";

import { getAdminsWithSearch } from "@/app/lib/data";
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
  const [searchValue, setSearchValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [displayCount, setDisplayCount] = useState(5);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await getAdminsWithSearch({
        search: searchValue,
        offset: (currentPage - 1) * displayCount,
        limit: displayCount,
      });

      if (data && "admins" in data) {
        setTotalAdmins(data.total);
        setTotalPages(data.totalPages);
        setAdminData(data.admins as AdminData[]);
        setIsLoading(false);
      } else {
        console.error("Unexpected data structure:", data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, searchValue]);

  return (
    <div className="section-container mt-4">
      <AdminsPage
        adminData={adminData}
        fetchData={fetchData}
        setSearchValue={setSearchValue}
        isLoading={isLoading}
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
      />
    </div>
  );
};

export default Admins;
