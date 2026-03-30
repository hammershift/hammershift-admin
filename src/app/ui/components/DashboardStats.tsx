"use client";

import { useEffect, useState } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  accent?: boolean;
  warning?: boolean;
}

function StatCard({ label, value, subtext, accent, warning }: StatCardProps) {
  return (
    <div
      className="rounded-lg p-4 border"
      style={{
        backgroundColor: "#13202D",
        borderColor: "#2A3A4A",
      }}
    >
      <p
        className="text-xs font-medium uppercase tracking-wider"
        style={{ color: "#64748B" }}
      >
        {label}
      </p>
      <p
        className="text-2xl font-bold mt-1"
        style={{
          color: accent ? "#F2CA16" : warning ? "#F97316" : "#FFFFFF",
        }}
      >
        {value}
      </p>
      {subtext && (
        <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>
          {subtext}
        </p>
      )}
    </div>
  );
}

interface DashboardStatsData {
  totalUsers: number;
  activeTournaments: number;
  pendingWithdrawals: { count: number; total: number };
  totalAuctions: number;
  totalWalletBalance: number;
  totalRakeRevenue: number;
  activeGTHGames: number;
  activePredictions: number;
}

export default function DashboardStats() {
  const [stats, setStats] = useState<DashboardStatsData>({
    totalUsers: 0,
    activeTournaments: 0,
    pendingWithdrawals: { count: 0, total: 0 },
    totalAuctions: 0,
    totalWalletBalance: 0,
    totalRakeRevenue: 0,
    activeGTHGames: 0,
    activePredictions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard/stats")
      .then((r) => r.json())
      .then((d) => {
        setStats(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const fmt = (n: number, opts?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat("en-US", opts).format(n);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-lg animate-pulse"
              style={{ backgroundColor: "#13202D" }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={fmt(stats.totalUsers)} />
        <StatCard
          label="All-Time Revenue"
          value={fmt(stats.totalRakeRevenue, {
            style: "currency",
            currency: "USD",
          })}
          subtext="Rake from tournaments + GTH"
          accent
        />
        <StatCard
          label="Active Tournaments"
          value={stats.activeTournaments}
        />
        <StatCard
          label="Active GTH Games"
          value={stats.activeGTHGames}
          subtext="Auctions with pending guesses"
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Wallet Balance"
          value={fmt(stats.totalWalletBalance, {
            style: "currency",
            currency: "USD",
          })}
          subtext="Across all user wallets"
        />
        <StatCard
          label="Pending Withdrawals"
          value={`${stats.pendingWithdrawals.count} (${fmt(
            stats.pendingWithdrawals.total,
            { style: "currency", currency: "USD" }
          )})`}
          warning={stats.pendingWithdrawals.count > 0}
        />
        <StatCard
          label="Active Predictions"
          value={fmt(stats.activePredictions)}
        />
        <StatCard label="Total Auctions" value={fmt(stats.totalAuctions)} />
      </div>
    </div>
  );
}
