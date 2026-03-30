"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ChartPoint {
  date: string;
  tournament: number;
  gth: number;
}

export default function DashboardRevenueChart() {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard/revenue-chart")
      .then((r) => r.json())
      .then((d) => {
        setData(d.chartData ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div
        className="h-64 rounded-lg animate-pulse"
        style={{ backgroundColor: "#13202D" }}
      />
    );
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatUSD = (v: number) => `$${v.toFixed(0)}`;

  return (
    <div
      className="rounded-lg border p-5"
      style={{ backgroundColor: "#13202D", borderColor: "#2A3A4A" }}
    >
      <h2 className="text-base font-semibold text-white mb-4">
        Revenue — Last 7 Days
      </h2>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2A3A4A" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: "#64748B", fontSize: 11 }}
            axisLine={{ stroke: "#2A3A4A" }}
          />
          <YAxis
            tickFormatter={formatUSD}
            tick={{ fill: "#64748B", fontSize: 11 }}
            axisLine={{ stroke: "#2A3A4A" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1E2A36",
              border: "1px solid #2A3A4A",
              borderRadius: 6,
            }}
            labelStyle={{ color: "#94A3B8" }}
            formatter={(v: number, name: string) => [
              `$${v.toFixed(2)}`,
              name === "tournament" ? "Tournaments" : "Guess the Hammer",
            ]}
          />
          <Legend
            formatter={(v: string) =>
              v === "tournament" ? "Tournaments" : "Guess the Hammer"
            }
            wrapperStyle={{ color: "#94A3B8", fontSize: 12 }}
          />
          <Line
            type="monotone"
            dataKey="tournament"
            stroke="#F2CA16"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#F2CA16" }}
          />
          <Line
            type="monotone"
            dataKey="gth"
            stroke="#0891B2"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#0891B2" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
