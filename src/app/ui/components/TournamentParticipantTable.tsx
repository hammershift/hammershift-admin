"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/ui/components/table";
import { Input } from "@/app/ui/components/input";

interface Participant {
  _id?: string;
  user?: string | { username?: string; email?: string };
  userId?: string;
  username?: string;
  fullName?: string;
  role?: string;
  buyInAmount?: number;
  amount?: number;
  tier?: string;
  points?: number;
  rank?: number;
  delta?: number;
  createdAt?: string;
  status?: string;
}

interface TournamentParticipantTableProps {
  participants: Participant[];
  tournamentId: string;
}

export default function TournamentParticipantTable({
  participants,
  tournamentId,
}: TournamentParticipantTableProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"rank" | "points" | "date">("rank");

  const filtered = participants.filter((p) => {
    const name =
      p.username || p.fullName || (typeof p.user === "string" ? p.user : p.user?.username) || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "rank") return (a.rank ?? 999) - (b.rank ?? 999);
    if (sortBy === "points") return (b.points ?? 0) - (a.points ?? 0);
    return (
      new Date(b.createdAt ?? 0).getTime() -
      new Date(a.createdAt ?? 0).getTime()
    );
  });

  const getName = (p: Participant) =>
    p.username || p.fullName || (typeof p.user === "string" ? p.user : p.user?.username) || "—";

  return (
    <div
      className="rounded-lg border"
      style={{ backgroundColor: "#13202D", borderColor: "#2A3A4A" }}
    >
      <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: "#2A3A4A" }}>
        <div>
          <h2 className="text-base font-semibold text-white">
            Participants ({participants.length})
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search players..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="w-48 h-8 text-sm"
            style={{
              backgroundColor: "#1E2A36",
              borderColor: "#2A3A4A",
              color: "#fff",
            }}
          />
          <div className="flex gap-1">
            {(["rank", "points", "date"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className="text-xs px-2 py-1 rounded"
                style={{
                  backgroundColor: sortBy === s ? "#F2CA1622" : "#1E2A36",
                  color: sortBy === s ? "#F2CA16" : "#94A3B8",
                }}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="p-5 text-center text-sm" style={{ color: "#64748B" }}>
          No participants found
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow style={{ backgroundColor: "#0C1924", borderColor: "#2A3A4A" }}>
              <TableHead style={{ color: "#64748B" }}>#</TableHead>
              <TableHead style={{ color: "#64748B" }}>Player</TableHead>
              <TableHead style={{ color: "#64748B" }}>Role</TableHead>
              <TableHead style={{ color: "#64748B" }}>Points</TableHead>
              <TableHead style={{ color: "#64748B" }}>Delta</TableHead>
              <TableHead style={{ color: "#64748B" }}>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((p, idx) => (
              <TableRow
                key={p._id ?? idx}
                style={{ borderColor: "#2A3A4A" }}
                className="hover:bg-[#1E2A36] transition-colors"
              >
                <TableCell>
                  <span className="text-sm text-white">{p.rank ?? idx + 1}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium text-white">
                    {getName(p)}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor:
                        p.role === "AGENT" ? "#0891B222" : "#22C55E22",
                      color: p.role === "AGENT" ? "#0891B2" : "#22C55E",
                    }}
                  >
                    {p.role ?? "USER"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm" style={{ color: "#F2CA16" }}>
                    {p.points ?? 0}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className="text-sm"
                    style={{
                      color:
                        (p.delta ?? 0) > 0
                          ? "#22C55E"
                          : (p.delta ?? 0) < 0
                          ? "#EF4444"
                          : "#94A3B8",
                    }}
                  >
                    {(p.delta ?? 0) > 0 ? "+" : ""}
                    {p.delta ?? 0}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs" style={{ color: "#94A3B8" }}>
                    {p.status ?? "active"}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
