"use client";

import { useEffect, useState } from "react";

interface ActivityItem {
  _id: string;
  source: "audit" | "transaction";
  type?: string;
  action?: string;
  amount?: number;
  description?: string;
  user?: string | { username?: string; email?: string };
  createdAt: string;
  status?: string;
}

const TYPE_COLORS: Record<string, string> = {
  entry_fee: "#F2CA16",
  prize: "#22C55E",
  withdraw: "#F97316",
  deposit: "#0891B2",
  refund: "#94A3B8",
  ban: "#EF4444",
  tournament: "#F2CA16",
  gth: "#0891B2",
};

const TYPE_LABELS: Record<string, string> = {
  entry_fee: "Entry",
  prize: "Prize Paid",
  withdraw: "Withdrawal",
  deposit: "Deposit",
  refund: "Refund",
  ban: "User Banned",
};

export default function DashboardActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () =>
      fetch("/api/admin/dashboard/activity")
        .then((r) => r.json())
        .then((d) => {
          setItems(d.activity ?? []);
          setLoading(false);
        })
        .catch(() => setLoading(false));

    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  };

  const getLabel = (item: ActivityItem) => {
    const type = item.type || item.action || "unknown";
    return TYPE_LABELS[type] ?? type.replace(/_/g, " ");
  };

  const getColor = (item: ActivityItem) => {
    const type = item.type || item.action || "";
    return TYPE_COLORS[type] ?? "#94A3B8";
  };

  const getDescription = (item: ActivityItem) => {
    if (item.description) return item.description;
    if (item.amount) {
      const sign = ["prize", "deposit"].includes(item.type ?? "") ? "+" : "-";
      return `${sign}$${item.amount.toFixed(2)}`;
    }
    return item.action ?? "Action recorded";
  };

  return (
    <div
      className="rounded-lg border h-full"
      style={{ backgroundColor: "#13202D", borderColor: "#2A3A4A" }}
    >
      <div
        className="px-5 py-4 border-b"
        style={{ borderColor: "#2A3A4A" }}
      >
        <h2 className="text-base font-semibold text-white">Recent Activity</h2>
        <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
          Last 20 platform actions · auto-refreshes
        </p>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: "420px" }}>
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-10 rounded animate-pulse"
                style={{ backgroundColor: "#1E2A36" }}
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div
            className="p-5 text-center text-sm"
            style={{ color: "#64748B" }}
          >
            No recent activity
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: "#2A3A4A" }}>
            {items.map((item, idx) => (
              <li
                key={item._id ?? idx}
                className="px-5 py-3 flex items-start gap-3"
              >
                <span
                  className="mt-0.5 shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: getColor(item) + "22",
                    color: getColor(item),
                  }}
                >
                  {getLabel(item)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    {getDescription(item)}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
                    {formatTime(item.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
