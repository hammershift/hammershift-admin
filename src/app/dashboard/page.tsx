"use client";

import DashboardStats from "@/app/ui/components/DashboardStats";
import DashboardRevenueChart from "@/app/ui/components/DashboardRevenueChart";
import DashboardActivityFeed from "@/app/ui/components/DashboardActivityFeed";

export default function Dashboard() {
  return (
    <div
      className="p-6 space-y-6"
      style={{ backgroundColor: "#0C1924", minHeight: "100vh" }}
    >
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "#94A3B8" }}>
          Platform overview —{" "}
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <DashboardStats />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <DashboardRevenueChart />
        </div>
        <div>
          <DashboardActivityFeed />
        </div>
      </div>
    </div>
  );
}
