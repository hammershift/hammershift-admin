"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/app/ui/components/badge";
import { Button } from "@/app/ui/components/button";
import { Input } from "@/app/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/ui/components/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/ui/components/dialog";

interface EntryTier {
  name: string;
  buyInAmount: number;
  prizeMultiplier: number;
  maxEntries: number;
  currentEntries: number;
}

interface Tournament {
  _id: string;
  name: string;
  status: "draft" | "upcoming" | "active" | "completed" | "cancelled";
  startTime: string;
  endTime: string;
  buyInFee?: number;
  entryTiers?: EntryTier[];
  rakePercent: number;
  calculatedPrizePool: number;
  prizePool?: number;
  users: Array<{ userId: string }>;
  maxUsers?: number;
  auction_ids: string[];
  scoring_version?: string;
  isAutoCreated?: boolean;
  autoCreatedStatus?: string;
  isActive?: boolean;
  haveWinners: boolean;
  cancelledAt?: string;
  createdAt: string;
}

interface TournamentsResponse {
  tournaments: Tournament[];
  total: number;
  page: number;
  totalPages: number;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: "#1E2A36", text: "#94A3B8" },
  upcoming: { bg: "#0891B222", text: "#0891B2" },
  active: { bg: "#22C55E22", text: "#22C55E" },
  completed: { bg: "#F2CA1622", text: "#F2CA16" },
  cancelled: { bg: "#EF444422", text: "#EF4444" },
};

export default function TournamentsPage() {
  const [data, setData] = useState<TournamentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: string;
    tournamentId: string;
    tournamentTitle: string;
    onConfirm: () => void;
  }>({
    open: false,
    action: "",
    tournamentId: "",
    tournamentTitle: "",
    onConfirm: () => {},
  });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
      ...(search && { search }),
      ...(statusFilter !== "all" && { status: statusFilter }),
      ...(typeFilter !== "all" && { type: typeFilter }),
    });
    try {
      const res = await fetch(`/api/admin/tournaments?${params}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAction = async (
    action:
      | "activate"
      | "deactivate"
      | "cancel"
      | "compute"
      | "approve"
      | "reject",
    id: string,
    title: string
  ) => {
    const labels: Record<string, string> = {
      activate: "Activate",
      deactivate: "Deactivate",
      cancel: "Cancel (and refund all players)",
      compute: "Manually compute results",
      approve: "Approve auto-created tournament",
      reject: "Reject auto-created tournament",
    };
    setConfirmDialog({
      open: true,
      action: labels[action],
      tournamentId: id,
      tournamentTitle: title,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        try {
          const endpoint =
            action === "activate"
              ? `/api/admin/tournaments/${id}/activate`
              : action === "deactivate"
              ? `/api/admin/tournaments/${id}/activate`
              : action === "cancel"
              ? `/api/admin/tournaments/${id}/cancel-refund`
              : action === "compute"
              ? `/api/admin/tournaments/${id}/compute`
              : action === "approve"
              ? `/api/admin/tournaments/${id}/approve`
              : `/api/admin/tournaments/${id}/reject`;
          await fetch(endpoint, { method: "POST" });
          load();
        } catch (e) {
          console.error("Action failed", e);
        }
      },
    });
  };

  const formatDate = (d: string) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "2-digit",
        })
      : "—";
  const formatUSD = (n: number) => `$${(n ?? 0).toFixed(2)}`;

  const getTierSummary = (t: Tournament) => {
    if (t.entryTiers && t.entryTiers.length > 0) {
      const paid = t.entryTiers.filter((tier) => tier.buyInAmount > 0);
      if (paid.length === 0) return "Free only";
      const amounts = paid.map((tier) => `$${tier.buyInAmount}`).join("/");
      return amounts;
    }
    if (t.buyInFee != null)
      return t.buyInFee === 0 ? "Free" : `$${t.buyInFee}`;
    return "—";
  };

  const getTotalPlayers = (t: Tournament) => {
    if (t.entryTiers && t.entryTiers.length > 0) {
      return t.entryTiers.reduce((s, tier) => s + tier.currentEntries, 0);
    }
    return t.users?.length ?? 0;
  };

  const getPrizePool = (t: Tournament) =>
    t.calculatedPrizePool || t.prizePool || 0;

  // Derive display status from multiple fields
  const getStatus = (t: Tournament): string => {
    if (t.status) return t.status;
    if (t.haveWinners) return "completed";
    if (t.isActive) return "active";
    return "upcoming";
  };

  return (
    <div
      className="p-6 space-y-4"
      style={{ backgroundColor: "#0C1924", minHeight: "100vh" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tournaments</h1>
          <p className="text-sm mt-1" style={{ color: "#94A3B8" }}>
            {data?.total ?? 0} total tournaments
          </p>
        </div>
        <Link href="/dashboard/create-tournament">
          <Button
            className="font-semibold text-sm"
            style={{ backgroundColor: "#F2CA16", color: "#0C1924" }}
          >
            + Create Tournament
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search tournaments..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-64"
          style={{
            backgroundColor: "#13202D",
            borderColor: "#2A3A4A",
            color: "#fff",
          }}
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger
            className="w-36"
            style={{
              backgroundColor: "#13202D",
              borderColor: "#2A3A4A",
              color: "#fff",
            }}
          >
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent
            style={{ backgroundColor: "#13202D", borderColor: "#2A3A4A" }}
          >
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger
            className="w-40"
            style={{
              backgroundColor: "#13202D",
              borderColor: "#2A3A4A",
              color: "#fff",
            }}
          >
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent
            style={{ backgroundColor: "#13202D", borderColor: "#2A3A4A" }}
          >
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="auto">Auto-Created</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Auto-created pending approvals banner */}
      {data?.tournaments?.some(
        (t) => t.isAutoCreated && t.autoCreatedStatus === "pending_review"
      ) && (
        <div
          className="rounded-lg p-4 border flex items-center gap-3"
          style={{
            backgroundColor: "#F2CA1611",
            borderColor: "#F2CA1644",
          }}
        >
          <span style={{ color: "#F2CA16" }}>⚠</span>
          <p className="text-sm" style={{ color: "#F2CA16" }}>
            {
              data!.tournaments.filter(
                (t) =>
                  t.isAutoCreated &&
                  t.autoCreatedStatus === "pending_review"
              ).length
            }{" "}
            auto-created tournament(s) awaiting review. Scroll down to
            review and approve/reject them.
          </p>
        </div>
      )}

      {/* Table */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{ borderColor: "#2A3A4A" }}
      >
        <Table>
          <TableHeader>
            <TableRow
              style={{
                backgroundColor: "#13202D",
                borderColor: "#2A3A4A",
              }}
            >
              <TableHead style={{ color: "#64748B" }}>Tournament</TableHead>
              <TableHead style={{ color: "#64748B" }}>Status</TableHead>
              <TableHead style={{ color: "#64748B" }}>Entry Tiers</TableHead>
              <TableHead style={{ color: "#64748B" }}>Players</TableHead>
              <TableHead style={{ color: "#64748B" }}>Prize Pool</TableHead>
              <TableHead style={{ color: "#64748B" }}>Rake %</TableHead>
              <TableHead style={{ color: "#64748B" }}>Auctions</TableHead>
              <TableHead style={{ color: "#64748B" }}>Start</TableHead>
              <TableHead style={{ color: "#64748B" }}>End</TableHead>
              <TableHead style={{ color: "#64748B" }}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i} style={{ borderColor: "#2A3A4A" }}>
                    {Array.from({ length: 10 }).map((__, j) => (
                      <TableCell key={j}>
                        <div
                          className="h-4 rounded animate-pulse"
                          style={{ backgroundColor: "#1E2A36" }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : (data?.tournaments ?? []).map((t) => {
                  const displayStatus = getStatus(t);
                  const statusStyle =
                    STATUS_COLORS[displayStatus] ?? STATUS_COLORS.draft;
                  const isAutoReview =
                    t.isAutoCreated &&
                    t.autoCreatedStatus === "pending_review";
                  return (
                    <TableRow
                      key={t._id}
                      style={{
                        backgroundColor: isAutoReview
                          ? "#F2CA1608"
                          : undefined,
                        borderColor: "#2A3A4A",
                      }}
                      className="hover:bg-[#1E2A36] transition-colors"
                    >
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {t.name}
                          </p>
                          {t.isAutoCreated && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor:
                                  t.autoCreatedStatus === "pending_review"
                                    ? "#F2CA1622"
                                    : "#94A3B822",
                                color:
                                  t.autoCreatedStatus === "pending_review"
                                    ? "#F2CA16"
                                    : "#94A3B8",
                              }}
                            >
                              {t.autoCreatedStatus === "pending_review"
                                ? "⚠ Auto — Needs Review"
                                : "Auto-Created"}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className="text-xs font-semibold px-2 py-1 rounded-full"
                          style={{
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.text,
                          }}
                        >
                          {displayStatus}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-white">
                          {getTierSummary(t)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-white">
                          {getTotalPlayers(t)}
                          {t.maxUsers ? ` / ${t.maxUsers}` : ""}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="text-sm font-medium"
                          style={{ color: "#F2CA16" }}
                        >
                          {formatUSD(getPrizePool(t))}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-white">
                          {t.rakePercent ?? 10}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-white">
                          {t.auction_ids?.length ?? 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="text-xs"
                          style={{ color: "#94A3B8" }}
                        >
                          {formatDate(t.startTime)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="text-xs"
                          style={{ color: "#94A3B8" }}
                        >
                          {formatDate(t.endTime)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          <Link href={`/dashboard/tournaments/${t._id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              style={{
                                borderColor: "#2A3A4A",
                                color: "#94A3B8",
                              }}
                            >
                              View
                            </Button>
                          </Link>
                          <Link
                            href={`/dashboard/tournaments/${t._id}/edit`}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              style={{
                                borderColor: "#2A3A4A",
                                color: "#94A3B8",
                              }}
                            >
                              Edit
                            </Button>
                          </Link>
                          {isAutoReview && (
                            <>
                              <Button
                                size="sm"
                                className="text-xs h-7"
                                style={{
                                  backgroundColor: "#22C55E22",
                                  color: "#22C55E",
                                }}
                                onClick={() =>
                                  handleAction("approve", t._id, t.name)
                                }
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                className="text-xs h-7"
                                style={{
                                  backgroundColor: "#EF444422",
                                  color: "#EF4444",
                                }}
                                onClick={() =>
                                  handleAction("reject", t._id, t.name)
                                }
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {displayStatus === "upcoming" && !isAutoReview && (
                            <Button
                              size="sm"
                              className="text-xs h-7"
                              style={{
                                backgroundColor: "#22C55E22",
                                color: "#22C55E",
                              }}
                              onClick={() =>
                                handleAction("activate", t._id, t.name)
                              }
                            >
                              Activate
                            </Button>
                          )}
                          {displayStatus === "active" && (
                            <>
                              <Button
                                size="sm"
                                className="text-xs h-7"
                                style={{
                                  backgroundColor: "#F2CA1622",
                                  color: "#F2CA16",
                                }}
                                onClick={() =>
                                  handleAction("compute", t._id, t.name)
                                }
                              >
                                Compute
                              </Button>
                              <Button
                                size="sm"
                                className="text-xs h-7"
                                style={{
                                  backgroundColor: "#EF444422",
                                  color: "#EF4444",
                                }}
                                onClick={() =>
                                  handleAction("cancel", t._id, t.name)
                                }
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{ borderColor: "#2A3A4A", color: "#94A3B8" }}
          >
            Previous
          </Button>
          <span
            className="px-3 py-1 text-sm"
            style={{ color: "#94A3B8" }}
          >
            Page {page} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setPage((p) => Math.min(data.totalPages, p + 1))
            }
            disabled={page >= data.totalPages}
            style={{ borderColor: "#2A3A4A", color: "#94A3B8" }}
          >
            Next
          </Button>
        </div>
      )}

      {/* Confirm Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent
          style={{
            backgroundColor: "#13202D",
            borderColor: "#2A3A4A",
            color: "#fff",
          }}
        >
          <DialogHeader>
            <DialogTitle>Confirm: {confirmDialog.action}</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: "#94A3B8" }}>
            Are you sure you want to{" "}
            <strong style={{ color: "#fff" }}>{confirmDialog.action}</strong>{" "}
            the tournament:
            <br />
            <strong style={{ color: "#F2CA16" }}>
              {confirmDialog.tournamentTitle}
            </strong>
            ?
          </p>
          {confirmDialog.action.includes("Cancel") && (
            <p
              className="text-sm mt-2"
              style={{ color: "#F97316" }}
            >
              ⚠ This will refund all entry fees to participants and cannot
              be undone.
            </p>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog((prev) => ({ ...prev, open: false }))
              }
              style={{ borderColor: "#2A3A4A", color: "#94A3B8" }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDialog.onConfirm}
              style={{ backgroundColor: "#F2CA16", color: "#0C1924" }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
