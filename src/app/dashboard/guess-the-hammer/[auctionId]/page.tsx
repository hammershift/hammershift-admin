"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Guess {
  _id: string;
  userId: string;
  username: string;
  userEmail: string;
  guessedPrice: number;
  actualPrice: number | null;
  absoluteError: number | null;
  penalizedError: number | null;
  rank: number | null;
  entryFee: number;
  prizePaid: number;
  isVirtual: boolean;
  status: string;
  createdAt: string;
}

interface AuctionStats {
  totalGuesses: number;
  realMoneyGuesses: number;
  freeGuesses: number;
  totalEntryFees: number;
  prizePool: number;
  rake: number;
  isGraded: boolean;
}

interface PageData {
  auction: Record<string, unknown> | null;
  guesses: Guess[];
  stats: AuctionStats;
}

export default function GTHDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const auctionId = params?.auctionId as string;
  const showConfig = searchParams?.get("action") === "config";

  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [finalPriceInput, setFinalPriceInput] = useState("");
  const [gradeError, setGradeError] = useState("");
  const [gradeSuccess, setGradeSuccess] = useState("");

  const [overrideModal, setOverrideModal] = useState<{
    open: boolean;
    entryId: string;
    username: string;
    currentRank: number | null;
    currentPrize: number;
  }>({
    open: false,
    entryId: "",
    username: "",
    currentRank: null,
    currentPrize: 0,
  });
  const [overrideRank, setOverrideRank] = useState("");
  const [overridePrize, setOverridePrize] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  const [gthConfig, setGthConfig] = useState({
    gthEnabled: true,
    gthEntryFee: 5,
  });

  const load = () => {
    setLoading(true);
    fetch(`/api/admin/guess-the-hammer/${auctionId}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
        if (d.auction?.finalPrice)
          setFinalPriceInput(String(d.auction.finalPrice));
      });
  };

  useEffect(() => {
    load();
    if (showConfig) {
      fetch(`/api/admin/guess-the-hammer/config?auctionId=${auctionId}`)
        .then((r) => r.json())
        .then((d) => setGthConfig(d));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auctionId]);

  const handleGrade = async () => {
    const price = parseFloat(finalPriceInput);
    if (!price || price <= 0) {
      setGradeError("Enter a valid final price");
      return;
    }
    setGrading(true);
    setGradeError("");
    setGradeSuccess("");
    try {
      const res = await fetch(
        `/api/admin/guess-the-hammer/${auctionId}/grade`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ finalPrice: price }),
        }
      );
      const d = await res.json();
      if (!res.ok) {
        setGradeError(d.error ?? "Grading failed");
      } else {
        setGradeSuccess(d.message);
        load();
      }
    } finally {
      setGrading(false);
    }
  };

  const handleOverride = async () => {
    if (!overrideReason.trim()) return;
    const body: Record<string, unknown> = {
      entryId: overrideModal.entryId,
      reason: overrideReason,
    };
    if (overrideRank.trim()) body.rank = parseInt(overrideRank, 10);
    if (overridePrize.trim()) body.prizePaid = parseFloat(overridePrize);

    await fetch(`/api/admin/guess-the-hammer/${auctionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setOverrideModal({
      open: false,
      entryId: "",
      username: "",
      currentRank: null,
      currentPrize: 0,
    });
    setOverrideRank("");
    setOverridePrize("");
    setOverrideReason("");
    load();
  };

  const saveConfig = async () => {
    await fetch("/api/admin/guess-the-hammer/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auctionId, ...gthConfig }),
    });
  };

  const fmt = (n: number | null) => (n != null ? `$${n.toFixed(2)}` : "\u2014");
  const fmtDate = (d: string) =>
    new Date(d).toLocaleString("en-US", {
      dateStyle: "short",
      timeStyle: "short",
    });

  const getAuctionTitle = (a: Record<string, unknown> | null) => {
    if (!a) return `Auction ${auctionId.slice(-8)}`;
    return (
      (a.title as string) ||
      `${a.year ?? ""} ${a.make ?? ""} ${a.model ?? ""}`.trim() ||
      `Auction ${auctionId.slice(-8)}`
    );
  };

  return (
    <div
      className="p-6 space-y-6"
      style={{ backgroundColor: "#0C1924", minHeight: "100vh" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/guess-the-hammer"
            className="text-sm mb-2 inline-block"
            style={{ color: "#94A3B8" }}
          >
            &larr; Back to GTH Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-white">
            {getAuctionTitle(data?.auction ?? null)}
          </h1>
          <p className="text-sm mt-1" style={{ color: "#94A3B8" }}>
            GTH Game Detail — Auction ID:{" "}
            <code className="text-xs" style={{ color: "#64748B" }}>
              {auctionId}
            </code>
          </p>
        </div>
      </div>

      {/* Stats row */}
      {!loading && data?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Total Guesses",
              value: String(data.stats.totalGuesses),
            },
            {
              label: "Real Money",
              value: String(data.stats.realMoneyGuesses),
            },
            {
              label: "Prize Pool (90%)",
              value: fmt(data.stats.prizePool),
              accent: true,
            },
            {
              label: "Rake (10%)",
              value: fmt(data.stats.rake),
              accent: true,
            },
          ].map((c) => (
            <div
              key={c.label}
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
                {c.label}
              </p>
              <p
                className="text-xl font-bold mt-1"
                style={{ color: c.accent ? "#F2CA16" : "#fff" }}
              >
                {c.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Manual Grading Panel */}
      {!loading && !data?.stats.isGraded && (
        <div
          className="rounded-lg border p-5"
          style={{
            backgroundColor: "#13202D",
            borderColor: "#F2CA1644",
          }}
        >
          <h2 className="text-base font-semibold text-white mb-1">
            Manual Grade This Game
          </h2>
          <p className="text-xs mb-4" style={{ color: "#64748B" }}>
            If the scraper did not auto-grade (e.g., auction data is missing),
            enter the final hammer price and click Grade.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={finalPriceInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFinalPriceInput(e.target.value)
              }
              placeholder="Final hammer price (e.g. 45000)"
              className="w-56 rounded-md px-3 py-2 text-sm"
              style={{
                backgroundColor: "#1E2A36",
                borderColor: "#2A3A4A",
                color: "#fff",
                border: "1px solid #2A3A4A",
              }}
            />
            <button
              onClick={handleGrade}
              disabled={grading}
              className="px-4 py-2 rounded-md text-sm font-semibold"
              style={{
                backgroundColor: "#F2CA16",
                color: "#0C1924",
                opacity: grading ? 0.6 : 1,
              }}
            >
              {grading ? "Grading\u2026" : "Grade Now"}
            </button>
          </div>
          {gradeError && (
            <p className="text-sm mt-2" style={{ color: "#EF4444" }}>
              {gradeError}
            </p>
          )}
          {gradeSuccess && (
            <p className="text-sm mt-2" style={{ color: "#22C55E" }}>
              {gradeSuccess}
            </p>
          )}
        </div>
      )}

      {/* GTH Config Panel */}
      {showConfig && (
        <div
          className="rounded-lg border p-5"
          style={{ backgroundColor: "#13202D", borderColor: "#2A3A4A" }}
        >
          <h2 className="text-base font-semibold text-white mb-4">
            GTH Configuration for This Auction
          </h2>
          <div className="flex items-center gap-6">
            <label
              className="flex items-center gap-2 text-sm"
              style={{ color: "#94A3B8" }}
            >
              <input
                type="checkbox"
                checked={gthConfig.gthEnabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setGthConfig((c) => ({
                    ...c,
                    gthEnabled: e.target.checked,
                  }))
                }
                className="w-4 h-4"
              />
              GTH Enabled for this auction
            </label>
            <div className="flex items-center gap-2">
              <label className="text-xs" style={{ color: "#64748B" }}>
                Entry Fee ($)
              </label>
              <input
                type="number"
                min={0}
                value={gthConfig.gthEntryFee}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setGthConfig((c) => ({
                    ...c,
                    gthEntryFee: Number(e.target.value),
                  }))
                }
                className="w-24 rounded-md px-2 py-1 text-sm"
                style={{
                  backgroundColor: "#1E2A36",
                  border: "1px solid #2A3A4A",
                  color: "#fff",
                }}
              />
            </div>
            <button
              onClick={saveConfig}
              className="px-3 py-1.5 rounded text-sm font-semibold"
              style={{ backgroundColor: "#F2CA16", color: "#0C1924" }}
            >
              Save Config
            </button>
          </div>
        </div>
      )}

      {/* Guesses Table */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{ backgroundColor: "#13202D", borderColor: "#2A3A4A" }}
      >
        <div
          className="px-5 py-4 border-b"
          style={{ borderColor: "#2A3A4A" }}
        >
          <h2 className="text-base font-semibold text-white">All Guesses</h2>
          <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
            {data?.guesses.length ?? 0} total entries · ranked by penalized
            error (lowest = best)
          </p>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="h-10 rounded animate-pulse"
                style={{ backgroundColor: "#1E2A36" }}
              />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr
                className="border-b"
                style={{ borderColor: "#2A3A4A" }}
              >
                {[
                  "Rank",
                  "Player",
                  "Guess",
                  "Error",
                  "Penalized",
                  "Entry",
                  "Prize",
                  "Mode",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium"
                    style={{ color: "#64748B" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.guesses ?? []).map((g) => (
                <tr
                  key={g._id}
                  className="border-b hover:bg-[#1E2A36] transition-colors"
                  style={{
                    borderColor: "#2A3A4A",
                    backgroundColor:
                      g.rank === 1
                        ? "#F2CA1608"
                        : g.rank === 2
                          ? "#94A3B808"
                          : g.rank === 3
                            ? "#F9731608"
                            : undefined,
                  }}
                >
                  <td className="px-4 py-3">
                    {g.rank ? (
                      <span
                        className="font-bold text-sm"
                        style={{
                          color:
                            g.rank === 1
                              ? "#F2CA16"
                              : g.rank <= 3
                                ? "#94A3B8"
                                : "#64748B",
                        }}
                      >
                        #{g.rank}
                      </span>
                    ) : (
                      <span style={{ color: "#64748B" }}>{"\u2014"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-white font-medium">{g.username}</p>
                      <p className="text-xs" style={{ color: "#64748B" }}>
                        {g.userEmail}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white font-mono">
                    {fmt(g.guessedPrice)}
                  </td>
                  <td
                    className="px-4 py-3 font-mono"
                    style={{ color: "#94A3B8" }}
                  >
                    {g.absoluteError != null ? fmt(g.absoluteError) : "\u2014"}
                  </td>
                  <td
                    className="px-4 py-3 font-mono"
                    style={{
                      color:
                        g.guessedPrice > (g.actualPrice ?? 0) && g.actualPrice
                          ? "#EF4444"
                          : "#94A3B8",
                    }}
                  >
                    {g.penalizedError != null
                      ? fmt(g.penalizedError)
                      : "\u2014"}
                    {g.guessedPrice > (g.actualPrice ?? 0) &&
                      g.actualPrice && (
                        <span
                          className="text-xs ml-1"
                          title="Went over — 2x penalty"
                        >
                          (2x)
                        </span>
                      )}
                  </td>
                  <td className="px-4 py-3" style={{ color: "#94A3B8" }}>
                    {g.entryFee === 0 ? "Free" : fmt(g.entryFee)}
                  </td>
                  <td
                    className="px-4 py-3 font-semibold"
                    style={{
                      color: g.prizePaid > 0 ? "#22C55E" : "#64748B",
                    }}
                  >
                    {g.prizePaid > 0 ? fmt(g.prizePaid) : "\u2014"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: g.isVirtual
                          ? "#94A3B822"
                          : "#F2CA1622",
                        color: g.isVirtual ? "#94A3B8" : "#F2CA16",
                      }}
                    >
                      {g.isVirtual ? "Free" : "Paid"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor:
                          g.status === "paid"
                            ? "#22C55E22"
                            : g.status === "graded"
                              ? "#F2CA1622"
                              : "#94A3B822",
                        color:
                          g.status === "paid"
                            ? "#22C55E"
                            : g.status === "graded"
                              ? "#F2CA16"
                              : "#94A3B8",
                      }}
                    >
                      {g.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {data?.stats.isGraded && (
                      <button
                        onClick={() =>
                          setOverrideModal({
                            open: true,
                            entryId: g._id,
                            username: g.username,
                            currentRank: g.rank,
                            currentPrize: g.prizePaid,
                          })
                        }
                        className="text-xs px-2 py-1 rounded"
                        style={{
                          backgroundColor: "#1E2A36",
                          color: "#94A3B8",
                          border: "1px solid #2A3A4A",
                        }}
                      >
                        Override
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Override Modal */}
      {overrideModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={() => setOverrideModal((m) => ({ ...m, open: false }))}
        >
          <div
            className="rounded-xl p-6 w-full max-w-md space-y-4"
            style={{
              backgroundColor: "#13202D",
              border: "1px solid #2A3A4A",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-white">
              Override Result: {overrideModal.username}
            </h3>
            <p className="text-xs" style={{ color: "#64748B" }}>
              Current: Rank #{overrideModal.currentRank ?? "\u2014"}, Prize{" "}
              {fmt(overrideModal.currentPrize)}
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs" style={{ color: "#64748B" }}>
                  New Rank (leave blank to keep)
                </label>
                <input
                  type="number"
                  min={1}
                  value={overrideRank}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setOverrideRank(e.target.value)
                  }
                  className="w-full mt-1 rounded-md px-3 py-2 text-sm"
                  style={{
                    backgroundColor: "#1E2A36",
                    border: "1px solid #2A3A4A",
                    color: "#fff",
                  }}
                />
              </div>
              <div>
                <label className="text-xs" style={{ color: "#64748B" }}>
                  New Prize Amount (leave blank to keep)
                </label>
                <input
                  type="number"
                  min={0}
                  value={overridePrize}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setOverridePrize(e.target.value)
                  }
                  className="w-full mt-1 rounded-md px-3 py-2 text-sm"
                  style={{
                    backgroundColor: "#1E2A36",
                    border: "1px solid #2A3A4A",
                    color: "#fff",
                  }}
                />
              </div>
              <div>
                <label className="text-xs" style={{ color: "#64748B" }}>
                  Reason (required for audit log)
                </label>
                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setOverrideReason(e.target.value)
                  }
                  placeholder="e.g. Corrected scraper error in final price"
                  className="w-full mt-1 rounded-md px-3 py-2 text-sm"
                  style={{
                    backgroundColor: "#1E2A36",
                    border: "1px solid #2A3A4A",
                    color: "#fff",
                  }}
                />
              </div>
            </div>

            <p
              className="text-xs p-3 rounded"
              style={{ backgroundColor: "#F2CA1611", color: "#F2CA16" }}
            >
              If a new prize amount is set that differs from current, the
              difference will be credited/debited from the player&apos;s wallet
              automatically.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleOverride}
                disabled={!overrideReason.trim()}
                className="px-4 py-2 rounded text-sm font-semibold"
                style={{
                  backgroundColor: overrideReason.trim()
                    ? "#F2CA16"
                    : "#F2CA1644",
                  color: "#0C1924",
                  cursor: overrideReason.trim() ? "pointer" : "not-allowed",
                }}
              >
                Apply Override
              </button>
              <button
                onClick={() =>
                  setOverrideModal((m) => ({ ...m, open: false }))
                }
                className="px-4 py-2 rounded text-sm"
                style={{
                  backgroundColor: "#1E2A36",
                  color: "#94A3B8",
                  border: "1px solid #2A3A4A",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
