"use client";

import { useState, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UserWallet {
  userId: string;
  username: string;
  email: string;
  balance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalPrizes: number;
  lastActivity: string;
  walletId: string;
}

interface WalletTransaction {
  _id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TYPE_COLORS: Record<string, string> = {
  deposit: "#22C55E",
  prize: "#22C55E",
  payout: "#22C55E",
  withdraw: "#EF4444",
  withdrawal: "#EF4444",
  refund: "#0891B2",
  entry_fee: "#F97316",
  buy_in: "#F97316",
  adjustment: "#94A3B8",
};

const CREDIT_TYPES = new Set(["deposit", "prize", "payout", "winnings", "refund"]);

const fmt = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function WalletBrowserPage() {
  // Search
  const [searchTerm, setSearchTerm] = useState("");
  const [wallets, setWallets] = useState<UserWallet[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Detail
  const [selected, setSelected] = useState<UserWallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  // Adjustment modal
  const [modalOpen, setModalOpen] = useState(false);
  const [adjustMode, setAdjustMode] = useState<"add" | "deduct">("add");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState("");

  /* ---- Handlers ---- */

  const searchWallets = useCallback(async () => {
    if (!searchTerm.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(
        `/api/admin/financials/wallets?search=${encodeURIComponent(searchTerm.trim())}`
      );
      if (!res.ok) throw new Error("Search failed");
      const data: UserWallet[] = await res.json();
      setWallets(data);
      setSelected(null);
      setTransactions([]);
    } catch {
      setWallets([]);
    } finally {
      setSearchLoading(false);
    }
  }, [searchTerm]);

  const selectWallet = useCallback(async (wallet: UserWallet) => {
    setSelected(wallet);
    setTxLoading(true);
    try {
      const res = await fetch(
        `/api/admin/financials/wallets?userId=${wallet.userId}&history=1`
      );
      if (!res.ok) throw new Error("Failed to load history");
      const data: WalletTransaction[] = await res.json();
      setTransactions(data);
    } catch {
      setTransactions([]);
    } finally {
      setTxLoading(false);
    }
  }, []);

  const submitAdjustment = useCallback(async () => {
    if (!selected) return;
    if (!adjustAmount || Number(adjustAmount) <= 0) {
      setAdjustError("Enter a valid amount greater than 0.");
      return;
    }
    if (!adjustReason.trim()) {
      setAdjustError("Reason is required for audit purposes.");
      return;
    }
    setAdjusting(true);
    setAdjustError("");
    try {
      const res = await fetch("/api/admin/financials/wallets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selected.userId,
          amount: Number(adjustAmount) * (adjustMode === "deduct" ? -1 : 1),
          reason: adjustReason.trim(),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Adjustment failed");
      }
      // Refresh wallet detail
      const updatedWallet: UserWallet = await res.json();
      setSelected(updatedWallet);
      // Refresh wallet in the list
      setWallets((prev) =>
        prev.map((w) => (w.userId === updatedWallet.userId ? updatedWallet : w))
      );
      // Refresh transactions
      await selectWallet(updatedWallet);
      closeModal();
    } catch (err: unknown) {
      setAdjustError(err instanceof Error ? err.message : "Adjustment failed");
    } finally {
      setAdjusting(false);
    }
  }, [selected, adjustAmount, adjustMode, adjustReason, selectWallet]);

  const closeModal = () => {
    setModalOpen(false);
    setAdjustAmount("");
    setAdjustReason("");
    setAdjustMode("add");
    setAdjustError("");
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") searchWallets();
  };

  /* ---- Render ---- */

  return (
    <div className="p-6 space-y-6" style={{ backgroundColor: "#0C1924", minHeight: "100vh" }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Wallet Browser</h1>
        <p className="text-sm mt-1" style={{ color: "#94A3B8" }}>
          Search users, view balances, and manage wallet adjustments
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search by username, email, or user ID..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="flex-1 text-sm rounded px-3 py-2 outline-none"
          style={{
            backgroundColor: "#1E2A36",
            color: "#fff",
            border: "1px solid #2A3A4A",
          }}
        />
        <button
          onClick={searchWallets}
          disabled={searchLoading}
          className="text-sm px-4 py-2 rounded font-medium"
          style={{
            backgroundColor: "#F2CA16",
            color: "#0C1924",
            opacity: searchLoading ? 0.6 : 1,
          }}
        >
          {searchLoading ? "Searching..." : "Search"}
        </button>
      </div>

      {/* Main Layout: 3-column grid (1 left, 2 right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ minHeight: 500 }}>
        {/* Left Column: Wallet List */}
        <div
          className="rounded-lg border overflow-hidden"
          style={{ backgroundColor: "#13202D", borderColor: "#2A3A4A" }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: "#2A3A4A" }}>
            <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: "#64748B" }}>
              Wallets ({wallets.length})
            </p>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 560 }}>
            {wallets.length === 0 ? (
              <div className="p-6 text-center" style={{ color: "#64748B" }}>
                <p className="text-sm">
                  {searchTerm ? "No wallets found" : "Search for a user to begin"}
                </p>
              </div>
            ) : (
              wallets.map((w) => (
                <button
                  key={w.userId}
                  onClick={() => selectWallet(w)}
                  className="w-full text-left px-4 py-3 border-b transition-colors"
                  style={{
                    borderColor: "#2A3A4A",
                    backgroundColor: selected?.userId === w.userId ? "#1E2A36" : "transparent",
                  }}
                >
                  <p className="text-sm font-medium text-white truncate">{w.username}</p>
                  <p className="text-xs truncate" style={{ color: "#64748B" }}>
                    {w.email}
                  </p>
                  <p className="text-sm font-semibold mt-1" style={{ color: "#F2CA16" }}>
                    {fmt(w.balance)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Detail (spans 2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {!selected ? (
            <div
              className="rounded-lg border flex items-center justify-center"
              style={{
                backgroundColor: "#13202D",
                borderColor: "#2A3A4A",
                minHeight: 400,
              }}
            >
              <p className="text-sm" style={{ color: "#64748B" }}>
                Select a wallet to view details
              </p>
            </div>
          ) : (
            <>
              {/* Overview Cards */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">{selected.username}</h2>
                  <p className="text-xs" style={{ color: "#64748B" }}>
                    {selected.email} &middot; {selected.walletId}
                  </p>
                </div>
                <button
                  onClick={() => setModalOpen(true)}
                  className="text-sm px-4 py-2 rounded font-medium"
                  style={{
                    backgroundColor: "#F2CA1622",
                    color: "#F2CA16",
                    border: "1px solid #F2CA1644",
                  }}
                >
                  Adjust Wallet
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Balance", value: fmt(selected.balance), color: "#F2CA16" },
                  { label: "Total Deposited", value: fmt(selected.totalDeposited), color: "#22C55E" },
                  { label: "Total Prizes", value: fmt(selected.totalPrizes), color: "#22C55E" },
                  { label: "Total Withdrawn", value: fmt(selected.totalWithdrawn), color: "#EF4444" },
                ].map((c) => (
                  <div
                    key={c.label}
                    className="rounded-lg p-4 border"
                    style={{ backgroundColor: "#13202D", borderColor: "#2A3A4A" }}
                  >
                    <p className="text-xs uppercase tracking-wider" style={{ color: "#64748B" }}>
                      {c.label}
                    </p>
                    <p className="text-lg font-bold mt-1" style={{ color: c.color }}>
                      {c.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Last Activity */}
              {selected.lastActivity && (
                <p className="text-xs" style={{ color: "#64748B" }}>
                  Last activity: {new Date(selected.lastActivity).toLocaleString()}
                </p>
              )}

              {/* Transaction History Table */}
              <div
                className="rounded-lg border overflow-hidden"
                style={{ backgroundColor: "#13202D", borderColor: "#2A3A4A" }}
              >
                <div className="px-4 py-3 border-b" style={{ borderColor: "#2A3A4A" }}>
                  <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: "#64748B" }}>
                    Transaction History (last 100)
                  </p>
                </div>

                {txLoading ? (
                  <div className="p-6 space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-8 rounded animate-pulse"
                        style={{ backgroundColor: "#1E2A36" }}
                      />
                    ))}
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm" style={{ color: "#64748B" }}>
                      No transactions found
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: "#1E2A36" }}>
                          {["Date", "Type", "Amount", "Description", "Status"].map((h) => (
                            <th
                              key={h}
                              className="text-left px-4 py-2 text-xs uppercase tracking-wider font-semibold"
                              style={{ color: "#64748B" }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx) => {
                          const isCredit = CREDIT_TYPES.has(tx.type);
                          const typeColor = TYPE_COLORS[tx.type] ?? "#94A3B8";
                          return (
                            <tr
                              key={tx._id}
                              className="border-t"
                              style={{ borderColor: "#2A3A4A" }}
                            >
                              <td className="px-4 py-2 whitespace-nowrap" style={{ color: "#94A3B8" }}>
                                {new Date(tx.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-2">
                                <span
                                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: `${typeColor}22`,
                                    color: typeColor,
                                  }}
                                >
                                  {tx.type.replace(/_/g, " ")}
                                </span>
                              </td>
                              <td
                                className="px-4 py-2 font-medium whitespace-nowrap"
                                style={{ color: isCredit ? "#22C55E" : "#EF4444" }}
                              >
                                {isCredit ? "+" : "-"}
                                {fmt(Math.abs(tx.amount))}
                              </td>
                              <td className="px-4 py-2 truncate max-w-xs" style={{ color: "#94A3B8" }}>
                                {tx.description || "\u2014"}
                              </td>
                              <td className="px-4 py-2">
                                <span
                                  className="text-xs"
                                  style={{
                                    color:
                                      tx.status === "completed"
                                        ? "#22C55E"
                                        : tx.status === "pending"
                                          ? "#F97316"
                                          : tx.status === "failed"
                                            ? "#EF4444"
                                            : "#94A3B8",
                                  }}
                                >
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
              </div>
            </>
          )}
        </div>
      </div>

      {/* Adjustment Modal */}
      {modalOpen && selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
          onClick={closeModal}
        >
          <div
            className="rounded-lg border w-full max-w-md mx-4 p-6 space-y-4"
            style={{ backgroundColor: "#13202D", borderColor: "#2A3A4A" }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white">
              Adjust Wallet &mdash; {selected.username}
            </h3>

            {/* Warning Banner */}
            <div
              className="rounded-lg p-3 text-sm"
              style={{
                backgroundColor: "#EF444422",
                border: "1px solid #EF444444",
                color: "#EF4444",
              }}
            >
              Warning: Wallet adjustments are permanent and cannot be undone. All adjustments are
              recorded in the audit log.
            </div>

            {/* +/- Toggle */}
            <div className="flex rounded overflow-hidden" style={{ border: "1px solid #2A3A4A" }}>
              <button
                onClick={() => setAdjustMode("add")}
                className="flex-1 text-sm py-2 font-medium transition-colors"
                style={{
                  backgroundColor: adjustMode === "add" ? "#22C55E22" : "#1E2A36",
                  color: adjustMode === "add" ? "#22C55E" : "#64748B",
                }}
              >
                + Add Funds
              </button>
              <button
                onClick={() => setAdjustMode("deduct")}
                className="flex-1 text-sm py-2 font-medium transition-colors"
                style={{
                  backgroundColor: adjustMode === "deduct" ? "#EF444422" : "#1E2A36",
                  color: adjustMode === "deduct" ? "#EF4444" : "#64748B",
                }}
              >
                - Deduct Funds
              </button>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>
                Amount ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={adjustAmount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdjustAmount(e.target.value)}
                placeholder="0.00"
                className="w-full text-sm rounded px-3 py-2 outline-none"
                style={{
                  backgroundColor: "#1E2A36",
                  color: "#fff",
                  border: "1px solid #2A3A4A",
                }}
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>
                Reason (required)
              </label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdjustReason(e.target.value)}
                placeholder="e.g. Compensation for service issue"
                className="w-full text-sm rounded px-3 py-2 outline-none"
                style={{
                  backgroundColor: "#1E2A36",
                  color: "#fff",
                  border: "1px solid #2A3A4A",
                }}
              />
            </div>

            {/* Error */}
            {adjustError && (
              <p className="text-xs" style={{ color: "#EF4444" }}>
                {adjustError}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={closeModal}
                className="flex-1 text-sm py-2 rounded font-medium"
                style={{
                  backgroundColor: "#1E2A36",
                  color: "#94A3B8",
                  border: "1px solid #2A3A4A",
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitAdjustment}
                disabled={adjusting}
                className="flex-1 text-sm py-2 rounded font-medium"
                style={{
                  backgroundColor: adjustMode === "add" ? "#22C55E" : "#EF4444",
                  color: "#fff",
                  opacity: adjusting ? 0.6 : 1,
                }}
              >
                {adjusting
                  ? "Processing..."
                  : adjustMode === "add"
                    ? "Add Funds"
                    : "Deduct Funds"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
