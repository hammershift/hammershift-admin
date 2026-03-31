"use client";

import React, { useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EntryTier {
  name: string;
  buyInAmount: number;
  prizeMultiplier: number;
  maxEntries: number;
  enabled: boolean;
}

interface AnnouncementBanner {
  id: string;
  text: string;
  color: string;
  dismissable: boolean;
  startDate: string;
  endDate: string;
  active: boolean;
}

interface FeatureFlags {
  tournamentsEnabled: boolean;
  guessTheHammerEnabled: boolean;
  freePlayEnabled: boolean;
  realMoneyEnabled: boolean;
  maintenanceMode: boolean;
  signupsEnabled: boolean;
}

interface Settings {
  rakePercentage: number;
  auctionsPerTournament: number;
  minBuyIn: number;
  maxBuyIn: number;
  entryTiers: EntryTier[];
  payoutStructure: { first: number; second: number; third: number };
  featureFlags: FeatureFlags;
  announcements: AnnouncementBanner[];
  freePlay: { dailyVPAllowance: number; signupBonus: number };
}

type ActiveTab =
  | "platform"
  | "entry-tiers"
  | "payouts"
  | "flags"
  | "announcements"
  | "free-play";

// ---------------------------------------------------------------------------
// Toggle component
// ---------------------------------------------------------------------------

interface ToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  danger?: boolean;
}

const Toggle: React.FC<ToggleProps> = ({
  value,
  onChange,
  label,
  description,
  danger,
}) => {
  const activeColor = danger ? "#EF4444" : "#F2CA16";
  const inactiveColor = "#2A3A4A";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px",
        background: "#1E2A36",
        borderRadius: 8,
        border: "1px solid #2A3A4A",
      }}
    >
      <div style={{ flex: 1, marginRight: 16 }}>
        <div
          style={{
            color: "#F1F5F9",
            fontWeight: 600,
            fontSize: 14,
            marginBottom: description ? 4 : 0,
          }}
        >
          {label}
        </div>
        {description && (
          <div style={{ color: "#94A3B8", fontSize: 12 }}>{description}</div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        style={{
          width: 48,
          height: 26,
          borderRadius: 13,
          border: "none",
          cursor: "pointer",
          position: "relative",
          background: value ? activeColor : inactiveColor,
          transition: "background 0.2s",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            display: "block",
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#fff",
            position: "absolute",
            top: 3,
            left: value ? 25 : 3,
            transition: "left 0.2s",
          }}
        />
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Default factories
// ---------------------------------------------------------------------------

const defaultSettings: Settings = {
  rakePercentage: 10,
  auctionsPerTournament: 5,
  minBuyIn: 5,
  maxBuyIn: 500,
  entryTiers: [
    {
      name: "Bronze",
      buyInAmount: 5,
      prizeMultiplier: 2,
      maxEntries: 100,
      enabled: true,
    },
    {
      name: "Silver",
      buyInAmount: 25,
      prizeMultiplier: 3,
      maxEntries: 50,
      enabled: true,
    },
    {
      name: "Gold",
      buyInAmount: 100,
      prizeMultiplier: 5,
      maxEntries: 20,
      enabled: true,
    },
  ],
  payoutStructure: { first: 60, second: 25, third: 15 },
  featureFlags: {
    tournamentsEnabled: true,
    guessTheHammerEnabled: true,
    freePlayEnabled: true,
    realMoneyEnabled: false,
    maintenanceMode: false,
    signupsEnabled: true,
  },
  announcements: [],
  freePlay: { dailyVPAllowance: 1000, signupBonus: 500 },
};

const defaultNewBanner: Omit<AnnouncementBanner, "id"> = {
  text: "",
  color: "#F2CA16",
  dismissable: true,
  startDate: "",
  endDate: "",
  active: true,
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const card: React.CSSProperties = {
  background: "#13202D",
  borderRadius: 12,
  border: "1px solid #2A3A4A",
  padding: 24,
  marginBottom: 16,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #2A3A4A",
  background: "#1E2A36",
  color: "#F1F5F9",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#94A3B8",
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const primaryBtn: React.CSSProperties = {
  padding: "10px 24px",
  borderRadius: 8,
  border: "none",
  background: "#F2CA16",
  color: "#0C1924",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

const dangerBtn: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: 6,
  border: "1px solid #EF4444",
  background: "transparent",
  color: "#EF4444",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("platform");
  const [newBanner, setNewBanner] =
    useState<Omit<AnnouncementBanner, "id">>(defaultNewBanner);

  // -----------------------------------------------------------------------
  // Data
  // -----------------------------------------------------------------------

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error(err);
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const save = async (partial?: Partial<Settings>) => {
    if (!settings) return;
    try {
      setSaving(true);
      setError(null);
      setSaved(false);
      const body = partial ? { ...settings, ...partial } : settings;
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      const data = await res.json();
      setSettings(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------------------------------------------------
  // Feature flag helpers
  // -----------------------------------------------------------------------

  const toggleFlag = (flag: keyof FeatureFlags, value: boolean) => {
    if (!settings) return;
    const updated: Settings = {
      ...settings,
      featureFlags: { ...settings.featureFlags, [flag]: value },
    };
    setSettings(updated);
    save(updated);
  };

  // -----------------------------------------------------------------------
  // Entry tier helpers
  // -----------------------------------------------------------------------

  const updateTier = (
    i: number,
    field: keyof EntryTier,
    value: string | number | boolean
  ) => {
    if (!settings) return;
    const tiers = [...settings.entryTiers];
    tiers[i] = { ...tiers[i], [field]: value };
    setSettings({ ...settings, entryTiers: tiers });
  };

  const addTier = () => {
    if (!settings) return;
    setSettings({
      ...settings,
      entryTiers: [
        ...settings.entryTiers,
        {
          name: "New Tier",
          buyInAmount: 10,
          prizeMultiplier: 2,
          maxEntries: 50,
          enabled: true,
        },
      ],
    });
  };

  const removeTier = (i: number) => {
    if (!settings) return;
    const tiers = [...settings.entryTiers];
    tiers.splice(i, 1);
    setSettings({ ...settings, entryTiers: tiers });
  };

  // -----------------------------------------------------------------------
  // Announcement helpers
  // -----------------------------------------------------------------------

  const addBanner = () => {
    if (!settings || !newBanner.text.trim()) return;
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now());
    setSettings({
      ...settings,
      announcements: [...settings.announcements, { ...newBanner, id }],
    });
    setNewBanner(defaultNewBanner);
  };

  const removeBanner = (id: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      announcements: settings.announcements.filter((b) => b.id !== id),
    });
  };

  const toggleBanner = (id: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      announcements: settings.announcements.map((b) =>
        b.id === id ? { ...b, active: !b.active } : b
      ),
    });
  };

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  if (loading || !settings) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0C1924",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94A3B8",
          fontSize: 16,
        }}
      >
        Loading settings...
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Payout validation
  // -----------------------------------------------------------------------

  const payoutTotal =
    settings.payoutStructure.first +
    settings.payoutStructure.second +
    settings.payoutStructure.third;
  const payoutValid = payoutTotal === 100;

  // -----------------------------------------------------------------------
  // Tab config
  // -----------------------------------------------------------------------

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: "platform", label: "Platform Config" },
    { key: "entry-tiers", label: "Entry Tiers" },
    { key: "payouts", label: "Payout Structure" },
    { key: "flags", label: "Feature Flags" },
    { key: "announcements", label: "Announcements" },
    { key: "free-play", label: "Free Play" },
  ];

  // -----------------------------------------------------------------------
  // Save button
  // -----------------------------------------------------------------------

  const SaveButton = () => (
    <button
      onClick={() => save()}
      disabled={saving}
      style={{
        ...primaryBtn,
        opacity: saving ? 0.6 : 1,
      }}
    >
      {saving ? "Saving..." : saved ? "Saved!" : "Save All Changes"}
    </button>
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div style={{ minHeight: "100vh", background: "#0C1924", padding: 32 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              color: "#F1F5F9",
              fontSize: 28,
              fontWeight: 700,
              margin: 0,
            }}
          >
            Platform Settings
          </h1>
          <p style={{ color: "#94A3B8", fontSize: 14, marginTop: 4 }}>
            Configure platform behavior, entry tiers, payouts, feature flags,
            and announcements.
          </p>
        </div>
        <SaveButton />
      </div>

      {/* Maintenance warning */}
      {settings.featureFlags.maintenanceMode && (
        <div
          style={{
            background: "#EF444420",
            border: "1px solid #EF4444",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 18 }}>!</span>
          <span style={{ color: "#FCA5A5", fontSize: 14, fontWeight: 600 }}>
            Maintenance mode is active. The platform is currently unavailable to
            users.
          </span>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div
          style={{
            background: "#EF444420",
            border: "1px solid #EF4444",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 20,
            color: "#FCA5A5",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {/* Saved banner */}
      {saved && (
        <div
          style={{
            background: "#22C55E20",
            border: "1px solid #22C55E",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 20,
            color: "#86EFAC",
            fontSize: 14,
          }}
        >
          Settings saved successfully.
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              border:
                activeTab === t.key ? "none" : "1px solid #2A3A4A",
              background: activeTab === t.key ? "#F2CA16" : "transparent",
              color: activeTab === t.key ? "#0C1924" : "#94A3B8",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ================================================================= */}
      {/* TAB: Platform Config                                               */}
      {/* ================================================================= */}
      {activeTab === "platform" && (
        <div style={card}>
          <h2
            style={{
              color: "#F1F5F9",
              fontSize: 18,
              fontWeight: 700,
              margin: "0 0 20px",
            }}
          >
            Platform Configuration
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
            }}
          >
            {/* Rake % */}
            <div>
              <label style={labelStyle}>Rake Percentage</label>
              <input
                type="number"
                min={0}
                max={100}
                value={settings.rakePercentage}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSettings({
                    ...settings,
                    rakePercentage: Number(e.target.value),
                  })
                }
                style={inputStyle}
              />
            </div>
            {/* Auctions per tournament */}
            <div>
              <label style={labelStyle}>Auctions Per Tournament</label>
              <input
                type="number"
                min={1}
                value={settings.auctionsPerTournament}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSettings({
                    ...settings,
                    auctionsPerTournament: Number(e.target.value),
                  })
                }
                style={inputStyle}
              />
            </div>
            {/* Min buy-in */}
            <div>
              <label style={labelStyle}>Minimum Buy-In ($)</label>
              <input
                type="number"
                min={0}
                value={settings.minBuyIn}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSettings({
                    ...settings,
                    minBuyIn: Number(e.target.value),
                  })
                }
                style={inputStyle}
              />
            </div>
            {/* Max buy-in */}
            <div>
              <label style={labelStyle}>Maximum Buy-In ($)</label>
              <input
                type="number"
                min={0}
                value={settings.maxBuyIn}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSettings({
                    ...settings,
                    maxBuyIn: Number(e.target.value),
                  })
                }
                style={inputStyle}
              />
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB: Entry Tiers                                                   */}
      {/* ================================================================= */}
      {activeTab === "entry-tiers" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                color: "#F1F5F9",
                fontSize: 18,
                fontWeight: 700,
                margin: 0,
              }}
            >
              Entry Tiers
            </h2>
            <button onClick={addTier} style={primaryBtn}>
              + Add Tier
            </button>
          </div>
          {settings.entryTiers.map((tier, i) => (
            <div key={i} style={{ ...card, position: "relative" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <h3
                  style={{
                    color: "#F1F5F9",
                    fontSize: 16,
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  {tier.name || "Unnamed Tier"}
                </h3>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <Toggle
                    value={tier.enabled}
                    onChange={(v: boolean) => updateTier(i, "enabled", v)}
                    label="Enabled"
                  />
                  <button onClick={() => removeTier(i)} style={dangerBtn}>
                    Remove
                  </button>
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr",
                  gap: 16,
                }}
              >
                <div>
                  <label style={labelStyle}>Name</label>
                  <input
                    type="text"
                    value={tier.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateTier(i, "name", e.target.value)
                    }
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Buy-In ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={tier.buyInAmount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateTier(i, "buyInAmount", Number(e.target.value))
                    }
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Prize Multiplier</label>
                  <input
                    type="number"
                    min={1}
                    step={0.1}
                    value={tier.prizeMultiplier}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateTier(i, "prizeMultiplier", Number(e.target.value))
                    }
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Max Entries</label>
                  <input
                    type="number"
                    min={1}
                    value={tier.maxEntries}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateTier(i, "maxEntries", Number(e.target.value))
                    }
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB: Payout Structure                                              */}
      {/* ================================================================= */}
      {activeTab === "payouts" && (
        <div style={card}>
          <h2
            style={{
              color: "#F1F5F9",
              fontSize: 18,
              fontWeight: 700,
              margin: "0 0 20px",
            }}
          >
            Payout Structure
          </h2>

          {/* Validation banner */}
          <div
            style={{
              background: payoutValid ? "#22C55E20" : "#EF444420",
              border: `1px solid ${payoutValid ? "#22C55E" : "#EF4444"}`,
              borderRadius: 8,
              padding: "12px 16px",
              marginBottom: 20,
              color: payoutValid ? "#86EFAC" : "#FCA5A5",
              fontSize: 13,
            }}
          >
            {payoutValid
              ? `Payout distribution is valid (${payoutTotal}%). Example: $1000 pool = $${settings.payoutStructure.first * 10} / $${settings.payoutStructure.second * 10} / $${settings.payoutStructure.third * 10}`
              : `Payouts must sum to 100%. Current total: ${payoutTotal}%`}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 20,
            }}
          >
            <div>
              <label style={labelStyle}>1st Place (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={settings.payoutStructure.first}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSettings({
                    ...settings,
                    payoutStructure: {
                      ...settings.payoutStructure,
                      first: Number(e.target.value),
                    },
                  })
                }
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>2nd Place (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={settings.payoutStructure.second}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSettings({
                    ...settings,
                    payoutStructure: {
                      ...settings.payoutStructure,
                      second: Number(e.target.value),
                    },
                  })
                }
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>3rd Place (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={settings.payoutStructure.third}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSettings({
                    ...settings,
                    payoutStructure: {
                      ...settings.payoutStructure,
                      third: Number(e.target.value),
                    },
                  })
                }
                style={inputStyle}
              />
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB: Feature Flags                                                 */}
      {/* ================================================================= */}
      {activeTab === "flags" && (
        <div style={card}>
          <h2
            style={{
              color: "#F1F5F9",
              fontSize: 18,
              fontWeight: 700,
              margin: "0 0 20px",
            }}
          >
            Feature Flags
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Toggle
              value={settings.featureFlags.tournamentsEnabled}
              onChange={(v: boolean) => toggleFlag("tournamentsEnabled", v)}
              label="Tournaments"
              description="Enable tournament functionality across the platform."
            />
            <Toggle
              value={settings.featureFlags.guessTheHammerEnabled}
              onChange={(v: boolean) => toggleFlag("guessTheHammerEnabled", v)}
              label="Guess the Hammer"
              description="Enable the Guess the Hammer game mode."
            />
            <Toggle
              value={settings.featureFlags.freePlayEnabled}
              onChange={(v: boolean) => toggleFlag("freePlayEnabled", v)}
              label="Free Play"
              description="Allow users to play with virtual points."
            />
            <Toggle
              value={settings.featureFlags.signupsEnabled}
              onChange={(v: boolean) => toggleFlag("signupsEnabled", v)}
              label="User Signups"
              description="Allow new user registrations."
            />
            <Toggle
              value={settings.featureFlags.realMoneyEnabled}
              onChange={(v: boolean) => toggleFlag("realMoneyEnabled", v)}
              label="Real Money"
              description="Enable real-money transactions. Use with caution."
              danger
            />
            <Toggle
              value={settings.featureFlags.maintenanceMode}
              onChange={(v: boolean) => toggleFlag("maintenanceMode", v)}
              label="Maintenance Mode"
              description="Takes the entire platform offline for users."
              danger
            />
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB: Announcements                                                 */}
      {/* ================================================================= */}
      {activeTab === "announcements" && (
        <div>
          {/* Existing banners */}
          {settings.announcements.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h2
                style={{
                  color: "#F1F5F9",
                  fontSize: 18,
                  fontWeight: 700,
                  margin: "0 0 16px",
                }}
              >
                Active Banners
              </h2>
              {settings.announcements.map((b) => (
                <div
                  key={b.id}
                  style={{
                    ...card,
                    borderLeft: `4px solid ${b.color}`,
                    opacity: b.active ? 1 : 0.5,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          color: "#F1F5F9",
                          fontSize: 14,
                          margin: "0 0 6px",
                        }}
                      >
                        {b.text}
                      </p>
                      <div
                        style={{
                          color: "#94A3B8",
                          fontSize: 12,
                          display: "flex",
                          gap: 16,
                        }}
                      >
                        {b.startDate && <span>From: {b.startDate}</span>}
                        {b.endDate && <span>Until: {b.endDate}</span>}
                        <span>
                          {b.dismissable ? "Dismissable" : "Persistent"}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => toggleBanner(b.id)}
                        style={{
                          ...dangerBtn,
                          borderColor: b.active ? "#F2CA16" : "#22C55E",
                          color: b.active ? "#F2CA16" : "#22C55E",
                        }}
                      >
                        {b.active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => removeBanner(b.id)}
                        style={dangerBtn}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* New banner form */}
          <div style={card}>
            <h2
              style={{
                color: "#F1F5F9",
                fontSize: 18,
                fontWeight: 700,
                margin: "0 0 20px",
              }}
            >
              Create Announcement
            </h2>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Banner Text</label>
              <input
                type="text"
                value={newBanner.text}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewBanner({ ...newBanner, text: e.target.value })
                }
                placeholder="Enter announcement text..."
                style={inputStyle}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 16,
                marginBottom: 16,
              }}
            >
              <div>
                <label style={labelStyle}>Color</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="color"
                    value={newBanner.color}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewBanner({ ...newBanner, color: e.target.value })
                    }
                    style={{
                      width: 40,
                      height: 40,
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                      background: "transparent",
                    }}
                  />
                  <input
                    type="text"
                    value={newBanner.color}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewBanner({ ...newBanner, color: e.target.value })
                    }
                    style={{ ...inputStyle, flex: 1 }}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Start Date</label>
                <input
                  type="date"
                  value={newBanner.startDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewBanner({ ...newBanner, startDate: e.target.value })
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>End Date</label>
                <input
                  type="date"
                  value={newBanner.endDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewBanner({ ...newBanner, endDate: e.target.value })
                  }
                  style={inputStyle}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 20,
              }}
            >
              <Toggle
                value={newBanner.dismissable}
                onChange={(v: boolean) =>
                  setNewBanner({ ...newBanner, dismissable: v })
                }
                label="Dismissable"
                description="Users can close this banner."
              />
            </div>

            {/* Live preview */}
            {newBanner.text.trim() && (
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Preview</label>
                <div
                  style={{
                    background: `${newBanner.color}20`,
                    border: `1px solid ${newBanner.color}`,
                    borderRadius: 8,
                    padding: "12px 16px",
                    color: newBanner.color,
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {newBanner.text}
                </div>
              </div>
            )}

            <button
              onClick={addBanner}
              disabled={!newBanner.text.trim()}
              style={{
                ...primaryBtn,
                opacity: newBanner.text.trim() ? 1 : 0.5,
              }}
            >
              Add Banner
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB: Free Play                                                     */}
      {/* ================================================================= */}
      {activeTab === "free-play" && (
        <div style={card}>
          <h2
            style={{
              color: "#F1F5F9",
              fontSize: 18,
              fontWeight: 700,
              margin: "0 0 20px",
            }}
          >
            Free Play Settings
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
            }}
          >
            <div>
              <label style={labelStyle}>Daily VP Allowance</label>
              <input
                type="number"
                min={0}
                value={settings.freePlay.dailyVPAllowance}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSettings({
                    ...settings,
                    freePlay: {
                      ...settings.freePlay,
                      dailyVPAllowance: Number(e.target.value),
                    },
                  })
                }
                style={inputStyle}
              />
              <p style={{ color: "#64748B", fontSize: 12, marginTop: 6 }}>
                Virtual points granted to each user daily.
              </p>
            </div>
            <div>
              <label style={labelStyle}>Signup Bonus (VP)</label>
              <input
                type="number"
                min={0}
                value={settings.freePlay.signupBonus}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSettings({
                    ...settings,
                    freePlay: {
                      ...settings.freePlay,
                      signupBonus: Number(e.target.value),
                    },
                  })
                }
                style={inputStyle}
              />
              <p style={{ color: "#64748B", fontSize: 12, marginTop: 6 }}>
                One-time VP bonus for new user registrations.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom save */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: 24,
        }}
      >
        <SaveButton />
      </div>
    </div>
  );
};

export default SettingsPage;
