"use client";
import DashboardPage from "../ui/dashboard/dashboardPage/DashboardPage";
import withAuth from "../ui/dashboard/auth/withAuth";
import { useSession } from "next-auth/react";
import { redirect } from "next/dist/server/api-utils";

const Dashboard = () => {
    return (
        <div className="tw-mt-4">
            <DashboardPage />
        </div>
    );
};

export default Dashboard;
