"use client";
import DashboardPage from "../ui/dashboard/dashboardPage/DashboardPage";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

const Dashboard = () => {
  return (
    <div className="mt-4">
      <DashboardPage />
    </div>
  );
};

export default Dashboard;
