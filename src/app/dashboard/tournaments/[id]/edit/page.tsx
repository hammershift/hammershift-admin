"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/app/ui/components/button";
import { Input } from "@/app/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/ui/components/select";
import { Label } from "@/app/ui/components/label";

interface EntryTier {
  name: string;
  buyInAmount: number;
  prizeMultiplier: number;
  maxEntries: number;
  currentEntries: number;
}

interface TournamentEditForm {
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  rakePercent: number;
  scoring_version: string;
  maxUsers: number;
  banner: string;
  entryTiers: EntryTier[];
}

export default function TournamentEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [form, setForm] = useState<TournamentEditForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/tournaments/${id}`)
      .then((r) => r.json())
      .then((d) => {
        const t = d.tournament;
        setForm({
          name: t.name ?? "",
          description: t.description ?? "",
          startTime: t.startTime
            ? new Date(t.startTime).toISOString().slice(0, 16)
            : "",
          endTime: t.endTime
            ? new Date(t.endTime).toISOString().slice(0, 16)
            : "",
          rakePercent: t.rakePercent ?? 10,
          scoring_version: t.scoring_version ?? "v2",
          maxUsers: t.maxUsers ?? 0,
          banner: t.banner ?? t.bannerImageUrl ?? "",
          entryTiers: t.entryTiers ?? [],
        });
        setLoading(false);
      });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/tournaments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to save");
      } else {
        router.push(`/dashboard/tournaments/${id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const updateTier = (
    index: number,
    field: keyof EntryTier,
    value: string | number
  ) => {
    if (!form) return;
    const tiers = [...form.entryTiers];
    tiers[index] = { ...tiers[index], [field]: value };
    setForm({ ...form, entryTiers: tiers });
  };

  const addTier = () => {
    if (!form) return;
    setForm({
      ...form,
      entryTiers: [
        ...form.entryTiers,
        {
          name: "New Tier",
          buyInAmount: 0,
          prizeMultiplier: 1,
          maxEntries: 100,
          currentEntries: 0,
        },
      ],
    });
  };

  const removeTier = (index: number) => {
    if (!form) return;
    const tiers = [...form.entryTiers];
    tiers.splice(index, 1);
    setForm({ ...form, entryTiers: tiers });
  };

  if (loading) {
    return (
      <div
        className="p-6"
        style={{ backgroundColor: "#0C1924", minHeight: "100vh" }}
      >
        <div
          className="h-8 w-48 rounded animate-pulse"
          style={{ backgroundColor: "#13202D" }}
        />
      </div>
    );
  }

  if (!form) return null;

  return (
    <div
      className="p-6"
      style={{ backgroundColor: "#0C1924", minHeight: "100vh" }}
    >
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Edit Tournament</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div
            className="rounded-lg border p-5 space-y-4"
            style={{ backgroundColor: "#13202D", borderColor: "#2A3A4A" }}
          >
            <h2 className="text-base font-semibold text-white">Basic Info</h2>

            <div>
              <Label
                className="text-xs uppercase tracking-wider"
                style={{ color: "#64748B" }}
              >
                Name
              </Label>
              <Input
                value={form.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, name: e.target.value })}
                required
                className="mt-1"
                style={{
                  backgroundColor: "#1E2A36",
                  borderColor: "#2A3A4A",
                  color: "#fff",
                }}
              />
            </div>

            <div>
              <Label
                className="text-xs uppercase tracking-wider"
                style={{ color: "#64748B" }}
              >
                Description
              </Label>
              <textarea
                value={form.description}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
                className="w-full mt-1 rounded-md px-3 py-2 text-sm resize-none"
                style={{
                  backgroundColor: "#1E2A36",
                  borderColor: "#2A3A4A",
                  color: "#fff",
                  border: "1px solid #2A3A4A",
                }}
              />
            </div>

            <div>
              <Label
                className="text-xs uppercase tracking-wider"
                style={{ color: "#64748B" }}
              >
                Banner Image URL
              </Label>
              <Input
                value={form.banner}
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, banner: e.target.value })}
                placeholder="https://..."
                className="mt-1"
                style={{
                  backgroundColor: "#1E2A36",
                  borderColor: "#2A3A4A",
                  color: "#fff",
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label
                  className="text-xs uppercase tracking-wider"
                  style={{ color: "#64748B" }}
                >
                  Start Date
                </Label>
                <Input
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                    setForm({ ...form, startTime: e.target.value })
                  }
                  className="mt-1"
                  style={{
                    backgroundColor: "#1E2A36",
                    borderColor: "#2A3A4A",
                    color: "#fff",
                  }}
                />
              </div>
              <div>
                <Label
                  className="text-xs uppercase tracking-wider"
                  style={{ color: "#64748B" }}
                >
                  End Date
                </Label>
                <Input
                  type="datetime-local"
                  value={form.endTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                    setForm({ ...form, endTime: e.target.value })
                  }
                  className="mt-1"
                  style={{
                    backgroundColor: "#1E2A36",
                    borderColor: "#2A3A4A",
                    color: "#fff",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Game Config */}
          <div
            className="rounded-lg border p-5 space-y-4"
            style={{ backgroundColor: "#13202D", borderColor: "#2A3A4A" }}
          >
            <h2 className="text-base font-semibold text-white">
              Game Configuration
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label
                  className="text-xs uppercase tracking-wider"
                  style={{ color: "#64748B" }}
                >
                  Rake %
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={form.rakePercent}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                    setForm({ ...form, rakePercent: Number(e.target.value) })
                  }
                  className="mt-1"
                  style={{
                    backgroundColor: "#1E2A36",
                    borderColor: "#2A3A4A",
                    color: "#fff",
                  }}
                />
              </div>
              <div>
                <Label
                  className="text-xs uppercase tracking-wider"
                  style={{ color: "#64748B" }}
                >
                  Scoring Version
                </Label>
                <Select
                  value={form.scoring_version}
                  onValueChange={(v) =>
                    setForm({ ...form, scoring_version: v })
                  }
                >
                  <SelectTrigger
                    className="mt-1"
                    style={{
                      backgroundColor: "#1E2A36",
                      borderColor: "#2A3A4A",
                      color: "#fff",
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    style={{
                      backgroundColor: "#13202D",
                      borderColor: "#2A3A4A",
                    }}
                  >
                    <SelectItem value="v1">V1 (Legacy)</SelectItem>
                    <SelectItem value="v2">V2 (Price is Right)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label
                  className="text-xs uppercase tracking-wider"
                  style={{ color: "#64748B" }}
                >
                  Max Users (0 = unlimited)
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={form.maxUsers}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                    setForm({ ...form, maxUsers: Number(e.target.value) })
                  }
                  className="mt-1"
                  style={{
                    backgroundColor: "#1E2A36",
                    borderColor: "#2A3A4A",
                    color: "#fff",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Entry Tiers */}
          <div
            className="rounded-lg border p-5 space-y-4"
            style={{ backgroundColor: "#13202D", borderColor: "#2A3A4A" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">
                Entry Tiers
              </h2>
              <Button
                className=""
                type="button"
                size="sm"
                onClick={addTier}
                style={{
                  backgroundColor: "#F2CA1622",
                  color: "#F2CA16",
                  border: "1px solid #F2CA1644",
                }}
              >
                + Add Tier
              </Button>
            </div>
            {form.entryTiers.length === 0 && (
              <p className="text-sm" style={{ color: "#64748B" }}>
                No entry tiers configured. Add tiers for tiered buy-ins, or
                leave empty for legacy single buy-in.
              </p>
            )}
            {form.entryTiers.map((tier, i) => (
              <div
                key={i}
                className="rounded-lg p-4 space-y-3"
                style={{
                  backgroundColor: "#1E2A36",
                  border: "1px solid #2A3A4A",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">
                    {tier.name || `Tier ${i + 1}`}
                  </span>
                  <Button
                    className=""
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => removeTier(i)}
                    style={{ borderColor: "#EF444444", color: "#EF4444" }}
                  >
                    Remove
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs" style={{ color: "#64748B" }}>
                      Name
                    </Label>
                    <Input
                      value={tier.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTier(i, "name", e.target.value)}
                      className="mt-1 h-8 text-sm"
                      style={{
                        backgroundColor: "#13202D",
                        borderColor: "#2A3A4A",
                        color: "#fff",
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs" style={{ color: "#64748B" }}>
                      Buy-in ($)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={tier.buyInAmount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                        updateTier(i, "buyInAmount", Number(e.target.value))
                      }
                      className="mt-1 h-8 text-sm"
                      style={{
                        backgroundColor: "#13202D",
                        borderColor: "#2A3A4A",
                        color: "#fff",
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs" style={{ color: "#64748B" }}>
                      Prize Multiplier
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={tier.prizeMultiplier}
                      onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                        updateTier(
                          i,
                          "prizeMultiplier",
                          Number(e.target.value)
                        )
                      }
                      className="mt-1 h-8 text-sm"
                      style={{
                        backgroundColor: "#13202D",
                        borderColor: "#2A3A4A",
                        color: "#fff",
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs" style={{ color: "#64748B" }}>
                      Max Entries
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={tier.maxEntries}
                      onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                        updateTier(i, "maxEntries", Number(e.target.value))
                      }
                      className="mt-1 h-8 text-sm"
                      style={{
                        backgroundColor: "#13202D",
                        borderColor: "#2A3A4A",
                        color: "#fff",
                      }}
                    />
                  </div>
                </div>
                <p className="text-xs" style={{ color: "#64748B" }}>
                  Current entries: {tier.currentEntries} / {tier.maxEntries}
                  {tier.currentEntries >= tier.maxEntries && (
                    <span className="ml-2" style={{ color: "#EF4444" }}>
                      (FULL)
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>

          {error && (
            <p
              className="text-sm rounded p-3"
              style={{ backgroundColor: "#EF444422", color: "#EF4444" }}
            >
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <Button
              className=""
              type="submit"
              disabled={saving}
              style={{ backgroundColor: "#F2CA16", color: "#0C1924" }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </Button>
            <Button
              className=""
              type="button"
              variant="outline"
              onClick={() => router.back()}
              style={{ borderColor: "#2A3A4A", color: "#94A3B8" }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
