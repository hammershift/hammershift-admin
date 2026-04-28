"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FlagIcon from "@mui/icons-material/Flag";
import OutlinedFlagIcon from "@mui/icons-material/OutlinedFlag";

import { Alert, AlertDescription, AlertTitle } from "@/app/ui/components/alert";
import { Badge } from "@/app/ui/components/badge";
import { Button } from "@/app/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/ui/components/dialog";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/ui/components/tabs";

type Filter = "unapproved" | "approved" | "flagged" | "all";

interface UtmRecord {
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  term?: string | null;
  content?: string | null;
}

interface WaitlistEntry {
  _id: string;
  email: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  verifiedAt?: string | null;
  invitedAt?: string | null;
  invitedBatchId?: string | null;
  inviteEmailSentAt?: string | null;
  flaggedAt?: string | null;
  referralCode?: string | null;
  referredByCode?: string | null;
  referralCount?: number;
  hasUser?: boolean;
  utm?: UtmRecord | null;
}

interface ListResponse {
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  data: WaitlistEntry[];
}

interface UserDoc {
  _id?: string;
  email?: string;
  username?: string;
  isInvited?: boolean;
  invitedVia?: string | null;
  createdAt?: string | null;
  [key: string]: unknown;
}

interface DetailResponse {
  entry: WaitlistEntry;
  user: UserDoc | null;
  referrer: WaitlistEntry | null;
  referred: WaitlistEntry[];
}

interface ApproveResponse {
  email: string;
  alreadyApproved: boolean;
  inviteSent: boolean;
  inviteError?: string;
}

interface ApproveBulkResponse {
  batchId: string;
  total: number;
  approved: number;
  alreadyApproved: number;
  notFound: string[];
  inviteErrors: Array<{ email: string; error: string }>;
}

interface FlagResponse {
  email: string;
  flagged: boolean;
  flaggedAt: string | null;
}

interface ResendResponse {
  email: string;
  inviteSent: boolean;
  inviteError?: string;
  inviteEmailSentAt: string | null;
}

interface Toast {
  type: "success" | "error";
  message: string;
}

const BULK_MAX = 200;

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  // en-CA produces YYYY-MM-DD; combined with hour/minute we get "YYYY-MM-DD, HH:mm".
  // Strip the comma so the column matches the requested "YYYY-MM-DD HH:mm" form.
  return dateFormatter.format(d).replace(",", "");
}

export default function WaitlistClient() {
  const [filter, setFilter] = useState<Filter>("unapproved");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const listCtrlRef = useRef<AbortController | null>(null);
  const detailCtrlRef = useRef<AbortController | null>(null);

  // Debounce the search input.
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [q]);

  // Reset page on filter / pageSize change.
  useEffect(() => {
    setPage(1);
  }, [filter, pageSize]);

  const showToast = useCallback((next: Toast) => {
    setToast(next);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const loadList = useCallback(async () => {
    listCtrlRef.current?.abort();
    const ctrl = new AbortController();
    listCtrlRef.current = ctrl;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        filter,
        page: String(page),
        pageSize: String(pageSize),
      });
      if (debouncedQ) params.set("q", debouncedQ);
      const res = await fetch(`/api/waitlist?${params.toString()}`, {
        cache: "no-store",
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt || "list failed"}`);
      }
      const json = (await res.json()) as ListResponse;
      setData(json);
    } catch (e: unknown) {
      if ((e as Error).name === "AbortError") return;
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      if (listCtrlRef.current === ctrl) setLoading(false);
    }
  }, [filter, page, pageSize, debouncedQ]);

  useEffect(() => {
    loadList();
    return () => listCtrlRef.current?.abort();
  }, [loadList]);

  const loadDetail = useCallback(async (id: string) => {
    detailCtrlRef.current?.abort();
    const ctrl = new AbortController();
    detailCtrlRef.current = ctrl;
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    try {
      const res = await fetch(`/api/waitlist/${id}`, {
        cache: "no-store",
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt || "detail failed"}`);
      }
      const json = (await res.json()) as DetailResponse;
      setDetail(json);
    } catch (e: unknown) {
      if ((e as Error).name === "AbortError") return;
      const msg = e instanceof Error ? e.message : String(e);
      setDetailError(msg);
    } finally {
      if (detailCtrlRef.current === ctrl) setDetailLoading(false);
    }
  }, []);

  const openDetail = (id: string) => {
    setDetailId(id);
    loadDetail(id);
  };

  const closeDetail = () => {
    setDetailId(null);
    setDetail(null);
    setDetailError(null);
  };

  const rows = data?.data ?? [];
  const allOnPageSelected =
    rows.length > 0 && rows.every((r) => selected.has(r.email));

  const toggleRow = (email: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const togglePage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        rows.forEach((r) => next.delete(r.email));
      } else {
        rows.forEach((r) => next.add(r.email));
      }
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const approveSingle = async (email: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/waitlist/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json().catch(() => ({}))) as
        | ApproveResponse
        | { error?: string };
      if (!res.ok) {
        const errMsg =
          (json as { error?: string }).error || `HTTP ${res.status}`;
        showToast({ type: "error", message: `Approve failed: ${errMsg}` });
      } else {
        const ok = json as ApproveResponse;
        if (ok.inviteSent) {
          showToast({
            type: "success",
            message: ok.alreadyApproved
              ? `Re-sent invite to ${email}`
              : `Approved ${email}`,
          });
        } else {
          showToast({
            type: "error",
            message: `Approve: ${ok.inviteError || "invite failed"}`,
          });
        }
        await loadList();
        if (detailId) await loadDetail(detailId);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast({ type: "error", message: `Approve error: ${msg}` });
    } finally {
      setBusy(false);
    }
  };

  const approveBulk = async () => {
    const emails = Array.from(selected);
    if (emails.length === 0 || emails.length > BULK_MAX) return;
    setBusy(true);
    try {
      const res = await fetch("/api/waitlist/approve-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      const json = (await res.json().catch(() => ({}))) as
        | ApproveBulkResponse
        | { error?: string };
      if (!res.ok) {
        const errMsg =
          (json as { error?: string }).error || `HTTP ${res.status}`;
        showToast({ type: "error", message: `Bulk approve failed: ${errMsg}` });
      } else {
        const ok = json as ApproveBulkResponse;
        const summary = `Bulk: ${ok.approved}/${ok.total} approved, ${ok.alreadyApproved} already, ${ok.notFound.length} not found`;
        if (ok.inviteErrors.length > 0) {
          showToast({
            type: "error",
            message: `${summary} — ${ok.inviteErrors.length} invite error(s)`,
          });
        } else {
          showToast({ type: "success", message: summary });
        }
        clearSelection();
        await loadList();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast({ type: "error", message: `Bulk approve error: ${msg}` });
    } finally {
      setBusy(false);
    }
  };

  const toggleFlag = async (email: string, flagged: boolean) => {
    setBusy(true);
    try {
      const res = await fetch("/api/waitlist/flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, flagged }),
      });
      const json = (await res.json().catch(() => ({}))) as
        | FlagResponse
        | { error?: string };
      if (!res.ok) {
        const errMsg =
          (json as { error?: string }).error || `HTTP ${res.status}`;
        showToast({ type: "error", message: `Flag failed: ${errMsg}` });
      } else {
        showToast({
          type: "success",
          message: flagged ? `Flagged ${email}` : `Unflagged ${email}`,
        });
        await loadList();
        if (detailId) await loadDetail(detailId);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast({ type: "error", message: `Flag error: ${msg}` });
    } finally {
      setBusy(false);
    }
  };

  const resend = async (email: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/waitlist/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json().catch(() => ({}))) as
        | ResendResponse
        | { error?: string };
      if (!res.ok) {
        const errMsg =
          (json as { error?: string }).error || `HTTP ${res.status}`;
        showToast({ type: "error", message: `Resend failed: ${errMsg}` });
      } else {
        const ok = json as ResendResponse;
        if (ok.inviteSent) {
          showToast({ type: "success", message: `Re-sent invite to ${email}` });
        } else {
          showToast({
            type: "error",
            message: `Resend: ${ok.inviteError || "invite failed"}`,
          });
        }
        await loadList();
        if (detailId) await loadDetail(detailId);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast({ type: "error", message: `Resend error: ${msg}` });
    } finally {
      setBusy(false);
    }
  };

  const subtitle = useMemo(() => {
    if (!data) return "Loading…";
    if (filter === "unapproved") {
      return `${data.count} unapproved entr${data.count === 1 ? "y" : "ies"}`;
    }
    return `${data.count} entr${data.count === 1 ? "y" : "ies"}`;
  }, [data, filter]);

  const bulkDisabled =
    busy || selected.size === 0 || selected.size > BULK_MAX;

  return (
    <div
      className="p-6 space-y-4"
      style={{ backgroundColor: "#0C1924", minHeight: "100vh" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Waitlist Moderation
          </h1>
          <p className="text-sm mt-1" style={{ color: "#94A3B8" }}>
            {subtitle}
          </p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Alert
          variant={toast.type === "error" ? "destructive" : "default"}
          className="border"
          style={{
            backgroundColor: toast.type === "error" ? "#EF444411" : "#22C55E11",
            borderColor: toast.type === "error" ? "#EF444466" : "#22C55E66",
            color: toast.type === "error" ? "#FCA5A5" : "#86EFAC",
          }}
        >
          <AlertTitle>
            {toast.type === "error" ? "Error" : "Success"}
          </AlertTitle>
          <AlertDescription>{toast.message}</AlertDescription>
        </Alert>
      )}

      {/* Tabs + search */}
      <Tabs
        value={filter}
        onValueChange={(v: string) => setFilter(v as Filter)}
        className="space-y-4"
      >
        <div className="flex flex-wrap items-center gap-3">
          <TabsList
            style={{ backgroundColor: "#13202D", borderColor: "#2A3A4A" }}
          >
            <TabsTrigger value="unapproved">Unapproved</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="flagged">Flagged</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
          <Input
            placeholder="Search by email…"
            value={q}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setQ(e.target.value)
            }
            className="w-72"
            style={{
              backgroundColor: "#13202D",
              borderColor: "#2A3A4A",
              color: "#fff",
            }}
          />
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs" style={{ color: "#94A3B8" }}>
              Page size
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(v: string) => setPageSize(Number(v))}
            >
              <SelectTrigger
                className="w-24"
                style={{
                  backgroundColor: "#13202D",
                  borderColor: "#2A3A4A",
                  color: "#fff",
                }}
              >
                <SelectValue placeholder="Page size" />
              </SelectTrigger>
              <SelectContent
                style={{ backgroundColor: "#13202D", borderColor: "#2A3A4A" }}
              >
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value={filter} className="mt-0 space-y-4">

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div
          className="flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3"
          style={{
            backgroundColor: "#13202D",
            borderColor: "#2A3A4A",
          }}
        >
          <span className="text-sm text-white">
            {selected.size} selected
            {selected.size > BULK_MAX && (
              <span className="ml-2" style={{ color: "#EF4444" }}>
                (max {BULK_MAX} per batch)
              </span>
            )}
          </span>
          <Button
            size="sm"
            disabled={bulkDisabled}
            onClick={approveBulk}
            style={{
              backgroundColor: bulkDisabled ? "#1E2A36" : "#F2CA16",
              color: bulkDisabled ? "#64748B" : "#0C1924",
            }}
          >
            Approve {selected.size} selected
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={clearSelection}
            disabled={busy}
            style={{ borderColor: "#2A3A4A", color: "#94A3B8" }}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Failed to load waitlist</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{ borderColor: "#2A3A4A" }}
      >
        <Table>
          <TableHeader>
            <TableRow
              style={{ backgroundColor: "#13202D", borderColor: "#2A3A4A" }}
            >
              <TableHead style={{ color: "#64748B", width: 36 }}>
                <input
                  type="checkbox"
                  aria-label="Select all on page"
                  checked={allOnPageSelected}
                  onChange={togglePage}
                  disabled={rows.length === 0}
                />
              </TableHead>
              <TableHead style={{ color: "#64748B" }}>Email</TableHead>
              <TableHead style={{ color: "#64748B" }}>Created</TableHead>
              <TableHead style={{ color: "#64748B" }}>Verified</TableHead>
              <TableHead style={{ color: "#64748B" }}>Invited</TableHead>
              <TableHead style={{ color: "#64748B" }}>Source</TableHead>
              <TableHead style={{ color: "#64748B" }}>Flagged</TableHead>
              <TableHead style={{ color: "#64748B" }}>Refs</TableHead>
              <TableHead style={{ color: "#64748B" }}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i} style={{ borderColor: "#2A3A4A" }}>
                  {Array.from({ length: 9 }).map((__, j) => (
                    <TableCell key={j}>
                      <div
                        className="h-4 rounded animate-pulse"
                        style={{ backgroundColor: "#1E2A36" }}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow style={{ borderColor: "#2A3A4A" }}>
                <TableCell colSpan={9}>
                  <div
                    className="text-sm py-6 text-center"
                    style={{ color: "#94A3B8" }}
                  >
                    No entries.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((entry) => {
                const isFlagged = !!entry.flaggedAt;
                const isInvited = !!entry.invitedAt;
                const isVerified = !!entry.verifiedAt;
                const isSelected = selected.has(entry.email);
                return (
                  <TableRow
                    key={entry._id}
                    style={{ borderColor: "#2A3A4A" }}
                    className="hover:bg-[#1E2A36] transition-colors"
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`Select ${entry.email}`}
                        checked={isSelected}
                        onChange={() => toggleRow(entry.email)}
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => openDetail(entry._id)}
                        className="font-mono text-sm text-left hover:underline"
                        style={{ color: "#F2CA16" }}
                      >
                        {entry.email}
                      </button>
                    </TableCell>
                    <TableCell>
                      <span
                        className="font-mono text-xs"
                        style={{ color: "#94A3B8" }}
                      >
                        {formatDateTime(entry.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className="font-mono text-xs"
                        style={{
                          color: isVerified ? "#86EFAC" : "#64748B",
                        }}
                      >
                        {isVerified
                          ? formatDateTime(entry.verifiedAt)
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className="font-mono text-xs"
                        style={{
                          color: isInvited ? "#86EFAC" : "#64748B",
                        }}
                      >
                        {isInvited
                          ? formatDateTime(entry.invitedAt)
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {entry.utm?.source ? (
                        <Badge
                          className="text-xs"
                          variant="outline"
                          style={{
                            borderColor: "#2A3A4A",
                            color: "#94A3B8",
                          }}
                        >
                          {entry.utm.source}
                        </Badge>
                      ) : (
                        <span className="text-xs" style={{ color: "#64748B" }}>
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isFlagged ? (
                        <Badge
                          className="text-xs"
                          variant="outline"
                          style={{
                            backgroundColor: "#F59E0B22",
                            borderColor: "#F59E0B66",
                            color: "#FCD34D",
                          }}
                        >
                          Flagged
                        </Badge>
                      ) : (
                        <Badge
                          className="text-xs"
                          variant="outline"
                          style={{
                            borderColor: "#2A3A4A",
                            color: "#64748B",
                          }}
                        >
                          —
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-white">
                        {entry.referralCount ?? 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {!isInvited ? (
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() => approveSingle(entry.email)}
                            className="text-xs h-7"
                            style={{
                              backgroundColor: "#22C55E22",
                              color: "#22C55E",
                            }}
                          >
                            Approve
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() => resend(entry.email)}
                            variant="outline"
                            className="text-xs h-7"
                            style={{
                              borderColor: "#2A3A4A",
                              color: "#94A3B8",
                            }}
                          >
                            Resend
                          </Button>
                        )}
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => toggleFlag(entry.email, !isFlagged)}
                          variant="outline"
                          className="text-xs h-7"
                          style={{
                            borderColor: isFlagged ? "#F59E0B66" : "#2A3A4A",
                            color: isFlagged ? "#FCD34D" : "#94A3B8",
                          }}
                        >
                          {isFlagged ? (
                            <>
                              <FlagIcon style={{ fontSize: 14 }} /> Unflag
                            </>
                          ) : (
                            <>
                              <OutlinedFlagIcon style={{ fontSize: 14 }} /> Flag
                            </>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {data && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm" style={{ color: "#94A3B8" }}>
            Page {data.page} of {Math.max(1, data.totalPages)}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              style={{ borderColor: "#2A3A4A", color: "#94A3B8" }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPage((p) => Math.min(Math.max(1, data.totalPages), p + 1))
              }
              disabled={page >= Math.max(1, data.totalPages) || loading}
              style={{ borderColor: "#2A3A4A", color: "#94A3B8" }}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog
        open={!!detailId}
        onOpenChange={(open: boolean) => {
          if (!open) closeDetail();
        }}
      >
        <DialogContent
          className="max-w-3xl max-h-[85vh] overflow-y-auto"
          style={{
            backgroundColor: "#13202D",
            borderColor: "#2A3A4A",
            color: "#fff",
          }}
        >
          <DialogHeader>
            <DialogTitle>Waitlist Entry</DialogTitle>
          </DialogHeader>

          {detailLoading && (
            <p className="text-sm" style={{ color: "#94A3B8" }}>
              Loading…
            </p>
          )}
          {detailError && (
            <Alert variant="destructive">
              <AlertTitle>Failed to load detail</AlertTitle>
              <AlertDescription>{detailError}</AlertDescription>
            </Alert>
          )}

          {detail && (
            <div className="space-y-4 text-sm">
              <DetailSection title="Entry">
                <DetailRow label="Email">
                  <span className="font-mono">{detail.entry.email}</span>
                </DetailRow>
                <DetailRow label="Created">
                  <span className="font-mono">
                    {formatDateTime(detail.entry.createdAt)}
                  </span>
                </DetailRow>
                <DetailRow label="Verified">
                  <span className="font-mono">
                    {formatDateTime(detail.entry.verifiedAt)}
                  </span>
                </DetailRow>
                <DetailRow label="Invited">
                  <span className="font-mono">
                    {formatDateTime(detail.entry.invitedAt)}
                  </span>
                </DetailRow>
                <DetailRow label="Invite email sent">
                  <span className="font-mono">
                    {formatDateTime(detail.entry.inviteEmailSentAt)}
                  </span>
                </DetailRow>
                <DetailRow label="Flagged">
                  <span className="font-mono">
                    {detail.entry.flaggedAt
                      ? formatDateTime(detail.entry.flaggedAt)
                      : "—"}
                  </span>
                </DetailRow>
                <DetailRow label="Referral code">
                  <span className="font-mono">
                    {detail.entry.referralCode || "—"}
                  </span>
                </DetailRow>
                <DetailRow label="Referred by">
                  <span className="font-mono">
                    {detail.entry.referredByCode || "—"}
                  </span>
                </DetailRow>
                <DetailRow label="UTM source">
                  <span className="font-mono">
                    {detail.entry.utm?.source || "—"}
                  </span>
                </DetailRow>
                <DetailRow label="UTM medium">
                  <span className="font-mono">
                    {detail.entry.utm?.medium || "—"}
                  </span>
                </DetailRow>
                <DetailRow label="UTM campaign">
                  <span className="font-mono">
                    {detail.entry.utm?.campaign || "—"}
                  </span>
                </DetailRow>
              </DetailSection>

              <DetailSection title="Matching user">
                {detail.user ? (
                  <>
                    <DetailRow label="Username">
                      <span>{detail.user.username || "—"}</span>
                    </DetailRow>
                    <DetailRow label="Email">
                      <span className="font-mono">
                        {detail.user.email || "—"}
                      </span>
                    </DetailRow>
                    <DetailRow label="Invited via">
                      <span>{detail.user.invitedVia || "—"}</span>
                    </DetailRow>
                  </>
                ) : (
                  <p style={{ color: "#94A3B8" }}>No matching user.</p>
                )}
              </DetailSection>

              <DetailSection title="Referrer">
                {detail.referrer ? (
                  <DetailRow label="Email">
                    <span className="font-mono">{detail.referrer.email}</span>
                  </DetailRow>
                ) : (
                  <p style={{ color: "#94A3B8" }}>No referrer.</p>
                )}
              </DetailSection>

              <DetailSection
                title={`Referred (${detail.referred.length})`}
              >
                {detail.referred.length === 0 ? (
                  <p style={{ color: "#94A3B8" }}>None.</p>
                ) : (
                  <ul className="space-y-1">
                    {detail.referred.map((r) => (
                      <li
                        key={r._id}
                        className="flex justify-between font-mono text-xs"
                      >
                        <span>{r.email}</span>
                        <span style={{ color: "#94A3B8" }}>
                          {formatDateTime(r.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </DetailSection>
            </div>
          )}

          <DialogFooter className="gap-2">
            {detail && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    toggleFlag(detail.entry.email, !detail.entry.flaggedAt)
                  }
                  style={{
                    borderColor: detail.entry.flaggedAt
                      ? "#F59E0B66"
                      : "#2A3A4A",
                    color: detail.entry.flaggedAt ? "#FCD34D" : "#94A3B8",
                  }}
                >
                  {detail.entry.flaggedAt ? "Unflag" : "Flag"}
                </Button>
                {detail.entry.invitedAt ? (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => resend(detail.entry.email)}
                    style={{
                      backgroundColor: "#F2CA16",
                      color: "#0C1924",
                    }}
                  >
                    Resend invite
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => approveSingle(detail.entry.email)}
                    style={{
                      backgroundColor: "#22C55E",
                      color: "#0C1924",
                    }}
                  >
                    Approve
                  </Button>
                )}
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={closeDetail}
              style={{ borderColor: "#2A3A4A", color: "#94A3B8" }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-md border p-3"
      style={{ borderColor: "#2A3A4A", backgroundColor: "#0C1924" }}
    >
      <h3
        className="text-xs uppercase tracking-wider mb-2"
        style={{ color: "#64748B" }}
      >
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span style={{ color: "#94A3B8" }}>{label}</span>
      <span className="text-right break-all">{children}</span>
    </div>
  );
}
