"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import TournamentParticipantTable from "@/app/ui/components/TournamentParticipantTable";

interface EntryTier {
  name: string;
  buyInAmount: number;
  prizeMultiplier: number;
  maxEntries: number;
  currentEntries: number;
}

interface TournamentDetail {
  _id: string;
  name: string;
  description?: string;
  status?: string;
  isActive?: boolean;
  startTime?: string;
  endTime?: string;
  prizePool?: number;
  calculatedPrizePool?: number;
  rakePercent?: number;
  scoring_version?: string;
  haveWinners?: boolean;
  auction_ids?: string[];
  users?: Array<{
    userId: string;
    fullName: string;
    username: string;
    role: string;
    delta?: number;
    rank?: number;
    points?: number;
  }>;
  entryTiers?: EntryTier[];
  isAutoCreated?: boolean;
  autoCreatedStatus?: string;
  maxUsers?: number;
}

const STATUS_COLORS: Record<string, string> = {
  upcoming: "#0891B2",
  active: "#22C55E",
  completed: "#F2CA16",
  cancelled: "#EF4444",
  draft: "#94A3B8",
};

export default function TournamentDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/tournaments/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setTournament(d.tournament);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-6" style={{ backgroundColor: "#0C1924", minHeight: "100vh" }}>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
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

  if (!tournament) {
    return (
      <div className="p-6" style={{ backgroundColor: "#0C1924", minHeight: "100vh" }}>
        <p className="text-white">Tournament not found.</p>
        <Link href="/dashboard/tournaments" className="text-sm" style={{ color: "#F2CA16" }}>
          Back to Tournaments
        </Link>
      </div>
    );
  }

  const formatDate = (d?: string | Date) =>
    d
      ? new Date(d).toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "—";

  const formatUSD = (n: number) => `$${(n ?? 0).toFixed(2)}`;
  const statusColor = STATUS_COLORS[tournament.status ?? "draft"] ?? "#94A3B8";

  return (
    <div
      className="p-6 space-y-6"
      style={{ backgroundColor: "#0C1924", minHeight: "100vh" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/tournaments"
            className="text-sm mb-2 inline-block"
            style={{ color: "#94A3B8" }}
          >
            ← Back to Tournaments
          </Link>
          <h1 className="text-2xl font-bold text-white">{tournament.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span
              className="text-xs font-semibold px-2 py-1 rounded-full"
              style={{
                backgroundColor: statusColor + "22",
                color: statusColor,
              }}
            >
              {tournament.status ?? "unknown"}
            </span>
            {tournament.isAutoCreated && (
              <span
                className="text-xs px-2 py-1 rounded-full"
                style={{ backgroundColor: "#F2CA1622", color: "#F2CA16" }}
              >
                Auto-Created
              </span>
            )}
          </div>
        </div>
        <Link href={`/dashboard/tournaments/${id}/edit`}>
          <button
            className="px-4 py-2 rounded-md text-sm font-semibold"
            style={{ backgroundColor: "#F2CA16", color: "#0C1924" }}
          >
            Edit Tournament
          </button>
        </Link>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Prize Pool",
            value: formatUSD(
              tournament.calculatedPrizePool || tournament.prizePool || 0
            ),
            accent: true,
          },
          { label: "Rake %", value: `${tournament.rakePercent ?? 10}%` },
          {
            label: "Players",
            value: String(tournament.users?.length ?? 0),
          },
          {
            label: "Auctions",
            value: String(tournament.auction_ids?.length ?? 0),
          },
          {
            label: "Start Date",
            value: formatDate(tournament.startTime),
          },
          {
            label: "End Date",
            value: formatDate(tournament.endTime),
          },
          {
            label: "Scoring",
            value: tournament.scoring_version ?? "v1",
          },
          {
            label: "Winners?",
            value: tournament.haveWinners ? "Yes" : "No",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-lg p-4 border"
            style={{ backgroundColor: "#13202D", borderColor: "#2A3A4A" }}
          >
            <p
              className="text-xs uppercase tracking-wider"
              style={{ color: "#64748B" }}
            >
              {card.label}
            </p>
            <p
              className="text-lg font-bold mt-1"
              style={{ color: card.accent ? "#F2CA16" : "#fff" }}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Entry Tiers */}
      {tournament.entryTiers && tournament.entryTiers.length > 0 && (
        <div
          className="rounded-lg border p-5"
          style={{ backgroundColor: "#13202D", borderColor: "#2A3A4A" }}
        >
          <h2 className="text-base font-semibold text-white mb-4">
            Entry Tiers
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {tournament.entryTiers.map((tier) => (
              <div
                key={tier.name}
                className="rounded-lg p-3 border"
                style={{
                  backgroundColor: "#1E2A36",
                  borderColor: "#2A3A4A",
                }}
              >
                <p className="text-sm font-semibold text-white">{tier.name}</p>
                <p
                  className="text-lg font-bold mt-1"
                  style={{ color: "#F2CA16" }}
                >
                  {tier.buyInAmount === 0 ? "Free" : `$${tier.buyInAmount}`}
                </p>
                <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>
                  {tier.currentEntries} / {tier.maxEntries} players
                </p>
                <p className="text-xs" style={{ color: "#64748B" }}>
                  {tier.prizeMultiplier}x multiplier
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Participants */}
      <TournamentParticipantTable
        participants={(tournament.users ?? []).map((u) => ({
          ...u,
          _id: u.userId,
        }))}
        tournamentId={id}
      />

      {/* Auction IDs */}
      {tournament.auction_ids && tournament.auction_ids.length > 0 && (
        <div
          className="rounded-lg border p-5"
          style={{ backgroundColor: "#13202D", borderColor: "#2A3A4A" }}
        >
          <h2 className="text-base font-semibold text-white mb-3">
            Auctions in Tournament
          </h2>
          <div className="flex flex-wrap gap-2">
            {tournament.auction_ids.map((aId) => (
              <Link
                key={String(aId)}
                href={`/dashboard/auctions?highlight=${aId}`}
                className="text-xs px-2 py-1 rounded font-mono"
                style={{ backgroundColor: "#1E2A36", color: "#94A3B8" }}
              >
                {String(aId).slice(-8)}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
