'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface HealthData {
  status: string;
  score: number;
  lastScrapeTime: string | null;
  message: string;
}

interface StatsData {
  processedLast24h: number;
  staleAuctions: number;
  ungradedGth: number;
}

const statusColors: Record<string, string> = {
  healthy: '#22C55E',
  degraded: '#F2CA16',
  down: '#EF4444',
};

export default function ScraperStatusWidget() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/scraper/status')
      .then((r) => r.json())
      .then((data) => {
        setHealth(data.health || null);
        setStats(data.stats || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const dotColor = health ? statusColors[health.status] || '#EF4444' : '#94A3B8';

  return (
    <div
      style={{
        background: '#13202D',
        border: '1px solid #2A3A4A',
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>Scraper Status</span>
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: dotColor,
            boxShadow: `0 0 8px ${dotColor}`,
          }}
        />
      </div>

      {loading ? (
        <div style={{ color: '#94A3B8', fontSize: 13 }}>Loading...</div>
      ) : (
        <>
          <div style={{ color: dotColor, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
            {health?.status?.toUpperCase() || 'UNKNOWN'}
          </div>
          <div style={{ color: '#94A3B8', fontSize: 13, marginBottom: 12 }}>
            {health?.message || 'Unable to fetch status'}
          </div>

          {stats && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 13 }}>
              <span style={{ color: '#94A3B8' }}>24h: <strong style={{ color: '#fff' }}>{stats.processedLast24h}</strong></span>
              <span style={{ color: stats.staleAuctions > 0 ? '#EF4444' : '#94A3B8' }}>
                Stale: <strong>{stats.staleAuctions}</strong>
              </span>
              <span style={{ color: stats.ungradedGth > 0 ? '#F2CA16' : '#94A3B8' }}>
                GTH Queue: <strong>{stats.ungradedGth}</strong>
              </span>
            </div>
          )}

          <Link
            href="/dashboard/scraper"
            style={{ color: '#F2CA16', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
          >
            View Monitor →
          </Link>
        </>
      )}
    </div>
  );
}
