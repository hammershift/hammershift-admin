"use client";

import { useEffect, useState } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, AreaChart, Area,
} from "recharts";
import Link from "next/link";

type TimeRange = "7d" | "30d" | "90d";

interface FinancialSummary {
  totalRevenue: number;
  totalRake: number;
  totalPayouts: number;
  netRevenue: number;
  pendingWithdrawals: { count: number; amount: number };
  depositsTotal: number;
  refundsTotal: number;
  breakdown: {
    tournamentRevenue: number;
    gthRevenue: number;
    tournamentRake: number;
    gthRake: number;
  };
}

interface ChartPoint {
  date: string;
  tournament: number;
  gth: number;
  deposits: number;
  refunds: number;
}

interface PayoutPoint {
  date: string;
  prizes: number;
  withdrawals: number;
  refunds: number;
}

export default function FinancialsPage() {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [payoutData, setPayoutData] = useState<PayoutPoint[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [loading, setLoading] = useState(true);

  const load = (range: TimeRange) => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/financials/summary").then((r) => r.json()),
      fetch(`/api/admin/financials/revenue-chart?range=${range}`).then((r) => r.json()),
    ])
      .then(([sum, chart]) => {
        setSummary(sum);
        setChartData(chart.revenue ?? []);
        setPayoutData(chart.payouts ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(timeRange); }, [timeRange]);

  const fmt = (n: number | undefined) =>
    `$${(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtShort = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

  const summaryCards = summary
    ? [
        { label: "Total Revenue", value: fmt(summary.totalRevenue), sub: "All entry fees collected", accent: false },
        { label: "Total Rake (10%)", value: fmt(summary.totalRake), sub: "Platform cut", accent: true },
        { label: "Total Payouts", value: fmt(summary.totalPayouts), sub: "Prizes paid to winners", accent: false },
        { label: "Net Revenue", value: fmt(summary.netRevenue), sub: "Rake minus refunds", accent: true },
        {
          label: "Pending Withdrawals",
          value: `${summary.pendingWithdrawals.count} (${fmt(summary.pendingWithdrawals.amount)})`,
          sub: "Awaiting approval",
          accent: false,
          warning: summary.pendingWithdrawals.count > 0,
        },
        { label: "Total Deposits", value: fmt(summary.depositsTotal), sub: "User deposits all time", accent: false },
        { label: "Total Refunds", value: fmt(summary.refundsTotal), sub: "Refunds issued", accent: false },
        { label: "Tournament Revenue", value: fmt(summary.breakdown?.tournamentRevenue), sub: "Tournament entry fees", accent: false },
      ]
    : [];

  return (
    <div className="p-6 space-y-6" style={{ backgroundColor: "#0C1924", minHeight: "100vh" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Financial Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: "#94A3B8" }}>
            Revenue, payouts, and platform financials
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/financials/wallets">
            <button
              className="text-sm px-3 py-1.5 rounded"
              style={{ backgroundColor: "#1E2A36", color: "#94A3B8", border: "1px solid #2A3A4A" }}
            >
              Wallet Browser
            </button>
          </Link>
          <Link href="/dashboard/financials/transactions">
            <button
              className="text-sm px-3 py-1.5 rounded"
              style={{ backgroundColor: "#1E2A36", color: "#94A3B8", border: "1px solid #2A3A4A" }}
            >
              All Transactions
            </button>
          </Link>
          <Link href="/dashboard/transactions">
            <button
              className="text-sm px-3 py-1.5 rounded"
              style={{ backgroundColor: "#F2CA1622", color: "#F2CA16", border: "1px solid #F2CA1644" }}
            >
              Withdrawal Requests
            </button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg animate-pulse" style={{ backgroundColor: "#13202D" }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summaryCards.map((c) => (
            <div
              key={c.label}
              className="rounded-lg p-4 border"
              style={{ backgroundColor: "#13202D", borderColor: "#2A3A4A" }}
            >
              <p className="text-xs uppercase tracking-wider" style={{ color: "#64748B" }}>
                {c.label}
              </p>
              <p
                className="text-xl font-bold mt-1"
                style={{
                  color: c.warning ? "#F97316" : c.accent ? "#F2CA16" : "#fff",
                }}
              >
                {c.value}
              </p>
              <p className="text-xs mt-1" style={{ color: "#64748B" }}>
                {c.sub}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Revenue Chart */}
      <div className="rounded-lg border p-5" style={{ backgroundColor: "#13202D", borderColor: "#2A3A4A" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Revenue by Source</h2>
          <div className="flex gap-2">
            {(["7d", "30d", "90d"] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className="text-xs px-2 py-1 rounded"
                style={{
                  backgroundColor: timeRange === r ? "#F2CA16" : "#1E2A36",
                  color: timeRange === r ? "#0C1924" : "#94A3B8",
                  border: "1px solid #2A3A4A",
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="h-64 rounded animate-pulse" style={{ backgroundColor: "#1E2A36" }} />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A3A4A" />
              <XAxis dataKey="date" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={{ stroke: "#2A3A4A" }} />
              <YAxis tickFormatter={fmtShort} tick={{ fill: "#64748B", fontSize: 11 }} axisLine={{ stroke: "#2A3A4A" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1E2A36", border: "1px solid #2A3A4A", borderRadius: 6 }}
                labelStyle={{ color: "#94A3B8" }}
                formatter={((v: number, n: string) => [`$${v.toFixed(2)}`, n]) as never}
              />
              <Legend wrapperStyle={{ color: "#94A3B8", fontSize: 12 }} />
              <Bar dataKey="tournament" stackId="a" fill="#F2CA16" name="Tournaments" radius={[0, 0, 0, 0]} />
              <Bar dataKey="gth" stackId="a" fill="#0891B2" name="GTH" radius={[4, 4, 0, 0]} />
              <Bar dataKey="deposits" stackId="a" fill="#22C55E" name="Deposits" radius={[0, 0, 0, 0]} />
              <Line dataKey="refunds" stroke="#EF4444" strokeWidth={2} dot={false} name="Refunds" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Payout Chart */}
      <div className="rounded-lg border p-5" style={{ backgroundColor: "#13202D", borderColor: "#2A3A4A" }}>
        <h2 className="text-base font-semibold text-white mb-4">Payouts &amp; Withdrawals</h2>
        {loading ? (
          <div className="h-48 rounded animate-pulse" style={{ backgroundColor: "#1E2A36" }} />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={payoutData}>
              <defs>
                <linearGradient id="gradPrizes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradWithdrawals" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0891B2" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0891B2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A3A4A" />
              <XAxis dataKey="date" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={{ stroke: "#2A3A4A" }} />
              <YAxis tickFormatter={fmtShort} tick={{ fill: "#64748B", fontSize: 11 }} axisLine={{ stroke: "#2A3A4A" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1E2A36", border: "1px solid #2A3A4A", borderRadius: 6 }}
                labelStyle={{ color: "#94A3B8" }}
                formatter={((v: number, n: string) => [`$${v.toFixed(2)}`, n]) as never}
              />
              <Legend wrapperStyle={{ color: "#94A3B8", fontSize: 12 }} />
              <Area type="monotone" dataKey="prizes" stroke="#22C55E" fill="url(#gradPrizes)" name="Prizes Paid" />
              <Area type="monotone" dataKey="withdrawals" stroke="#0891B2" fill="url(#gradWithdrawals)" name="Withdrawals" />
              <Line type="monotone" dataKey="refunds" stroke="#EF4444" strokeWidth={1.5} dot={false} name="Refunds" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
