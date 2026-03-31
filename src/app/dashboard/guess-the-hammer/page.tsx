"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface GTHSummary {
  totalGames: number;
  activeGames: number;
  totalGuesses: number;
  totalPrizePaid: number;
  totalRakeRevenue: number;
  totalEntryFees: number;
}

interface ActiveAuction {
  _id: string;
  auctionTitle: string;
  auctionEndTime: string;
  auctionImage?: string;
  guessCount: number;
  totalEntryFees: number;
  prizePool: number;
}

interface GradedAuction {
  _id: string;
  auctionTitle: string;
  guessCount: number;
  actualPrice: number;
  totalPrizes: number;
  gradedAt: string;
  winner?: {
    user: string;
    guessedPrice: number;
    penalizedError: number;
    prizePaid: number;
  };
}

interface GTHData {
  summary: GTHSummary;
  activeAuctions: ActiveAuction[];
  gradedAuctions: GradedAuction[];
}

export default function GuessTheHammerAdminPage() {
  const [data, setData] = useState<GTHData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/guess-the-hammer")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const fmt = (n: number) => `$${(n ?? 0).toFixed(2)}`;
  const fmtNum = (n: number) =>
    new Intl.NumberFormat("en-US").format(n ?? 0);
  const fmtDate = (d: string) =>
    d
      ? new Date(d).toLocaleString("en-US", {
          dateStyle: "short",
          timeStyle: "short",
        })
      : "\u2014";

  const timeUntil = (d: string) => {
    if (!d) return "\u2014";
    const diff = new Date(d).getTime() - Date.now();
    if (diff < 0) return "Ended";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div
      className="p-6 space-y-6"
      style={{ backgroundColor: "#0C1924", minHeight: "100vh" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Guess the Hammer</h1>
          <p className="text-sm mt-1" style={{ color: "#94A3B8" }}>
            Manage GTH games, grade results, and configure entry fees
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetch("/api/admin/guess-the-hammer")
              .then((r) => r.json())
              .then((d) => {
                setData(d);
                setLoading(false);
              });
          }}
          className="text-sm px-3 py-1.5 rounded"
          style={{
            backgroundColor: "#1E2A36",
            color: "#94A3B8",
            border: "1px solid #2A3A4A",
          }}
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-lg animate-pulse"
              style={{ backgroundColor: "#13202D" }}
            />
          ))}
        </div>
      ) : (
        data?.summary && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              {
                label: "Total Games",
                value: fmtNum(data.summary.totalGames),
                sub: "distinct auctions",
              },
              {
                label: "Active Games",
                value: fmtNum(data.summary.activeGames),
                sub: "awaiting close",
              },
              {
                label: "Total Guesses",
                value: fmtNum(data.summary.totalGuesses),
                sub: "across all games",
              },
              {
                label: "Total Prize Pool",
                value: fmt(data.summary.totalPrizePaid),
                sub: "paid to winners",
                accent: true,
              },
              {
                label: "Rake Revenue",
                value: fmt(data.summary.totalRakeRevenue),
                sub: "10% of entry fees",
                accent: true,
              },
              {
                label: "Entry Fees",
                value: fmt(data.summary.totalEntryFees),
                sub: "total collected",
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-lg p-4 border"
                style={{
                  backgroundColor: "#13202D",
                  borderColor: "#2A3A4A",
                }}
              >
                <p
                  className="text-xs uppercase tracking-wider"
                  style={{ color: "#64748B" }}
                >
                  {card.label}
                </p>
                <p
                  className="text-2xl font-bold mt-1"
                  style={{ color: card.accent ? "#F2CA16" : "#fff" }}
                >
                  {card.value}
                </p>
                <p className="text-xs mt-1" style={{ color: "#64748B" }}>
                  {card.sub}
                </p>
              </div>
            ))}
          </div>
        )
      )}

      {/* Active Auctions */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{ backgroundColor: "#13202D", borderColor: "#2A3A4A" }}
      >
        <div
          className="px-5 py-4 border-b"
          style={{ borderColor: "#2A3A4A" }}
        >
          <h2 className="text-base font-semibold text-white">
            Active GTH Games
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
            Auctions with pending guesses — awaiting close and grading
          </p>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-10 rounded animate-pulse"
                style={{ backgroundColor: "#1E2A36" }}
              />
            ))}
          </div>
        ) : (data?.activeAuctions?.length ?? 0) === 0 ? (
          <div
            className="p-5 text-sm text-center"
            style={{ color: "#64748B" }}
          >
            No active GTH games
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr
                className="border-b"
                style={{ borderColor: "#2A3A4A" }}
              >
                {[
                  "Auction",
                  "Ends In",
                  "Guesses",
                  "Prize Pool",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-xs uppercase tracking-wider font-medium"
                    style={{ color: "#64748B" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data!.activeAuctions.map((a) => (
                <tr
                  key={a._id}
                  className="border-b hover:bg-[#1E2A36] transition-colors"
                  style={{ borderColor: "#2A3A4A" }}
                >
                  <td className="px-5 py-3 text-white font-medium truncate max-w-xs">
                    {a.auctionTitle}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded"
                      style={{
                        backgroundColor:
                          timeUntil(a.auctionEndTime) === "Ended"
                            ? "#EF444422"
                            : "#F2CA1622",
                        color:
                          timeUntil(a.auctionEndTime) === "Ended"
                            ? "#EF4444"
                            : "#F2CA16",
                      }}
                    >
                      {timeUntil(a.auctionEndTime)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-white">
                    {fmtNum(a.guessCount)}
                  </td>
                  <td
                    className="px-5 py-3 font-semibold"
                    style={{ color: "#F2CA16" }}
                  >
                    {fmt(a.prizePool)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/guess-the-hammer/${a._id}`}
                      >
                        <button
                          className="text-xs px-3 py-1 rounded"
                          style={{
                            backgroundColor: "#1E2A36",
                            color: "#94A3B8",
                            border: "1px solid #2A3A4A",
                          }}
                        >
                          View Guesses
                        </button>
                      </Link>
                      <Link
                        href={`/dashboard/guess-the-hammer/${a._id}?action=config`}
                      >
                        <button
                          className="text-xs px-3 py-1 rounded"
                          style={{
                            backgroundColor: "#1E2A36",
                            color: "#94A3B8",
                            border: "1px solid #2A3A4A",
                          }}
                        >
                          Config
                        </button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Graded Results */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{ backgroundColor: "#13202D", borderColor: "#2A3A4A" }}
      >
        <div
          className="px-5 py-4 border-b"
          style={{ borderColor: "#2A3A4A" }}
        >
          <h2 className="text-base font-semibold text-white">
            Recent Graded Results
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
            Last 20 completed GTH games
          </p>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-10 rounded animate-pulse"
                style={{ backgroundColor: "#1E2A36" }}
              />
            ))}
          </div>
        ) : (data?.gradedAuctions?.length ?? 0) === 0 ? (
          <div
            className="p-5 text-sm text-center"
            style={{ color: "#64748B" }}
          >
            No graded results yet
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr
                className="border-b"
                style={{ borderColor: "#2A3A4A" }}
              >
                {[
                  "Auction",
                  "Final Price",
                  "Guesses",
                  "Total Prizes",
                  "Graded",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-xs uppercase tracking-wider font-medium"
                    style={{ color: "#64748B" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data!.gradedAuctions.map((a) => (
                <tr
                  key={a._id}
                  className="border-b hover:bg-[#1E2A36] transition-colors"
                  style={{ borderColor: "#2A3A4A" }}
                >
                  <td className="px-5 py-3 text-white font-medium truncate max-w-xs">
                    {a.auctionTitle}
                  </td>
                  <td
                    className="px-5 py-3 font-semibold"
                    style={{ color: "#F2CA16" }}
                  >
                    {a.actualPrice ? fmt(a.actualPrice) : "\u2014"}
                  </td>
                  <td className="px-5 py-3 text-white">
                    {fmtNum(a.guessCount)}
                  </td>
                  <td className="px-5 py-3 text-white">
                    {fmt(a.totalPrizes)}
                  </td>
                  <td
                    className="px-5 py-3 text-xs"
                    style={{ color: "#94A3B8" }}
                  >
                    {fmtDate(a.gradedAt)}
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/dashboard/guess-the-hammer/${a._id}`}
                    >
                      <button
                        className="text-xs px-3 py-1 rounded"
                        style={{
                          backgroundColor: "#1E2A36",
                          color: "#94A3B8",
                          border: "1px solid #2A3A4A",
                        }}
                      >
                        View Results
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
