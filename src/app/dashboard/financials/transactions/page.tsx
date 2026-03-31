"use client";

import { useState, useEffect, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type TxType =
  | "all"
  | "entry_fee"
  | "prize"
  | "deposit"
  | "withdraw"
  | "refund"
  | "adjustment";

interface Transaction {
  _id: string;
  user: { _id: string; username: string; email: string } | null;
  type: string;
  amount: number;
  description: string;
  status: string;
  source?: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TYPE_OPTIONS: { value: TxType; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "entry_fee", label: "Entry Fee" },
  { value: "prize", label: "Prize / Payout" },
  { value: "deposit", label: "Deposit" },
  { value: "withdraw", label: "Withdrawal" },
  { value: "refund", label: "Refund" },
  { value: "adjustment", label: "Admin Adjustment" },
];

const TYPE_COLORS: Record<string, string> = {
  deposit: "#22C55E",
  prize: "#22C55E",
  payout: "#22C55E",
  winnings: "#22C55E",
  withdraw: "#EF4444",
  withdrawal: "#EF4444",
  refund: "#0891B2",
  entry_fee: "#F97316",
  buy_in: "#F97316",
  adjustment: "#94A3B8",
};

const CREDIT_TYPES = new Set(["deposit", "prize", "payout", "winnings", "refund"]);

const LIMIT = 50;

const fmt = (n: number) =>
  `$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TransactionBrowserPage() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<TxType>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  /* ---- Data Loading ---- */

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(LIMIT));
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      if (amountMin) params.set("minAmount", amountMin);
      if (amountMax) params.set("maxAmount", amountMax);
      if (userSearch.trim()) params.set("user", userSearch.trim());

      const res = await fetch(
        `/api/admin/financials/transactions?${params.toString()}`
      );
      if (!res.ok) throw new Error("Failed to fetch transactions");
      const data = await res.json();
      setTxs(data.transactions ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setTxs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, dateFrom, dateTo, amountMin, amountMax, userSearch]);

  useEffect(() => {
    load();
  }, [load]);

  /* ---- Handlers ---- */

  const handleApply = () => {
    setPage(1);
    // load() will fire via useEffect when page resets (or is already 1)
    // If page is already 1, the useCallback deps haven't changed from setPage alone,
    // so we trigger a manual load.
    if (page === 1) load();
  };

  /* ---- Render ---- */

  return (
    <div
      className="p-6 space-y-6"
      style={{ backgroundColor: "#0C1924", minHeight: "100vh" }}
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Transaction Browser</h1>
        <p className="text-sm mt-1" style={{ color: "#94A3B8" }}>
          Browse, filter, and inspect all platform transactions
        </p>
      </div>

      {/* Filter Bar */}
      <div
        className="rounded-lg border p-4"
        style={{ backgroundColor: "#13202D", borderColor: "#2A3A4A" }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          {/* Type Select */}
          <div>
            <label
              className="block text-xs uppercase tracking-wider mb-1 font-semibold"
              style={{ color: "#64748B" }}
            >
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setTypeFilter(e.target.value as TxType)
              }
              className="w-full text-sm rounded px-3 py-2 outline-none appearance-none"
              style={{
                backgroundColor: "#1E2A36",
                color: "#fff",
                border: "1px solid #2A3A4A",
              }}
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label
              className="block text-xs uppercase tracking-wider mb-1 font-semibold"
              style={{ color: "#64748B" }}
            >
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setDateFrom(e.target.value)
              }
              className="w-full text-sm rounded px-3 py-2 outline-none"
              style={{
                backgroundColor: "#1E2A36",
                color: "#fff",
                border: "1px solid #2A3A4A",
                colorScheme: "dark",
              }}
            />
          </div>

          {/* Date To */}
          <div>
            <label
              className="block text-xs uppercase tracking-wider mb-1 font-semibold"
              style={{ color: "#64748B" }}
            >
              To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setDateTo(e.target.value)
              }
              className="w-full text-sm rounded px-3 py-2 outline-none"
              style={{
                backgroundColor: "#1E2A36",
                color: "#fff",
                border: "1px solid #2A3A4A",
                colorScheme: "dark",
              }}
            />
          </div>

          {/* Amount Min */}
          <div>
            <label
              className="block text-xs uppercase tracking-wider mb-1 font-semibold"
              style={{ color: "#64748B" }}
            >
              Min $
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amountMin}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setAmountMin(e.target.value)
              }
              placeholder="0.00"
              className="w-full text-sm rounded px-3 py-2 outline-none"
              style={{
                backgroundColor: "#1E2A36",
                color: "#fff",
                border: "1px solid #2A3A4A",
              }}
            />
          </div>

          {/* Amount Max */}
          <div>
            <label
              className="block text-xs uppercase tracking-wider mb-1 font-semibold"
              style={{ color: "#64748B" }}
            >
              Max $
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amountMax}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setAmountMax(e.target.value)
              }
              placeholder="0.00"
              className="w-full text-sm rounded px-3 py-2 outline-none"
              style={{
                backgroundColor: "#1E2A36",
                color: "#fff",
                border: "1px solid #2A3A4A",
              }}
            />
          </div>

          {/* Apply Button */}
          <div>
            <label className="block text-xs mb-1 invisible">Apply</label>
            <button
              onClick={handleApply}
              className="w-full text-sm px-4 py-2 rounded font-medium"
              style={{ backgroundColor: "#F2CA16", color: "#0C1924" }}
            >
              Apply
            </button>
          </div>
        </div>

        {/* User Search (full-width row below) */}
        <div className="mt-3">
          <label
            className="block text-xs uppercase tracking-wider mb-1 font-semibold"
            style={{ color: "#64748B" }}
          >
            User Search
          </label>
          <input
            type="text"
            value={userSearch}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setUserSearch(e.target.value)
            }
            placeholder="Search by email or username..."
            className="w-full text-sm rounded px-3 py-2 outline-none"
            style={{
              backgroundColor: "#1E2A36",
              color: "#fff",
              border: "1px solid #2A3A4A",
            }}
          />
        </div>
      </div>

      {/* Transaction Table */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{ backgroundColor: "#13202D", borderColor: "#2A3A4A" }}
      >
        {loading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-8 rounded animate-pulse"
                style={{ backgroundColor: "#1E2A36" }}
              />
            ))}
          </div>
        ) : txs.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm" style={{ color: "#64748B" }}>
              No transactions found matching the current filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "#1E2A36" }}>
                  {[
                    "Date",
                    "User",
                    "Type",
                    "Amount",
                    "Description",
                    "Source",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-2.5 text-xs uppercase tracking-wider font-semibold"
                      style={{ color: "#64748B" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txs.map((tx) => {
                  const isCredit = CREDIT_TYPES.has(tx.type);
                  const typeColor = TYPE_COLORS[tx.type] ?? "#94A3B8";
                  const statusColor =
                    tx.status === "completed"
                      ? "#22C55E"
                      : tx.status === "pending"
                        ? "#F97316"
                        : "#94A3B8";

                  return (
                    <tr
                      key={tx._id}
                      className="border-t"
                      style={{ borderColor: "#2A3A4A" }}
                    >
                      {/* Date */}
                      <td
                        className="px-4 py-2.5 whitespace-nowrap"
                        style={{ color: "#94A3B8" }}
                      >
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>

                      {/* User */}
                      <td className="px-4 py-2.5">
                        {tx.user ? (
                          <div>
                            <p
                              className="text-sm font-medium truncate"
                              style={{ color: "#fff" }}
                            >
                              {tx.user.username}
                            </p>
                            <p
                              className="text-xs truncate"
                              style={{ color: "#64748B" }}
                            >
                              {tx.user.email}
                            </p>
                          </div>
                        ) : (
                          <span style={{ color: "#64748B" }}>&mdash;</span>
                        )}
                      </td>

                      {/* Type Badge */}
                      <td className="px-4 py-2.5">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                          style={{
                            backgroundColor: `${typeColor}22`,
                            color: typeColor,
                          }}
                        >
                          {tx.type.replace(/_/g, " ")}
                        </span>
                      </td>

                      {/* Amount */}
                      <td
                        className="px-4 py-2.5 font-medium whitespace-nowrap"
                        style={{ color: isCredit ? "#22C55E" : "#EF4444" }}
                      >
                        {isCredit ? "+" : "-"}
                        {fmt(tx.amount)}
                      </td>

                      {/* Description */}
                      <td
                        className="px-4 py-2.5 truncate max-w-xs"
                        style={{ color: "#94A3B8" }}
                      >
                        {tx.description || "\u2014"}
                      </td>

                      {/* Source */}
                      <td
                        className="px-4 py-2.5 whitespace-nowrap"
                        style={{ color: "#64748B" }}
                      >
                        {tx.source || "\u2014"}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-2.5">
                        <span className="text-xs" style={{ color: statusColor }}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && total > 0 && (
          <div
            className="flex items-center justify-between px-4 py-3 border-t"
            style={{ borderColor: "#2A3A4A" }}
          >
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="text-sm px-3 py-1.5 rounded font-medium"
              style={{
                backgroundColor: "#1E2A36",
                color: page <= 1 ? "#64748B" : "#94A3B8",
                border: "1px solid #2A3A4A",
                opacity: page <= 1 ? 0.5 : 1,
                cursor: page <= 1 ? "not-allowed" : "pointer",
              }}
            >
              Previous
            </button>

            <p className="text-sm" style={{ color: "#94A3B8" }}>
              Page {page} of {totalPages} ({total} total)
            </p>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="text-sm px-3 py-1.5 rounded font-medium"
              style={{
                backgroundColor: "#1E2A36",
                color: page >= totalPages ? "#64748B" : "#94A3B8",
                border: "1px solid #2A3A4A",
                opacity: page >= totalPages ? 0.5 : 1,
                cursor: page >= totalPages ? "not-allowed" : "pointer",
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
