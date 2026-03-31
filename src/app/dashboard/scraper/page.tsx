'use client';

import { useState, useEffect, useCallback } from 'react';

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
  statusBreakdown: Record<string, number>;
}

interface GradingQueueItem {
  auctionId: string;
  title: string;
  closedAt: string | null;
  pendingGuesses: number;
}

interface ErrorLogItem {
  message: string;
  timestamp: string | null;
  level: string;
}

interface PipelineAuction {
  _id: string;
  title: string;
  status: string;
  lastUpdated: string | null;
  currentBid: number;
  gthEnabled: boolean;
  make?: string;
  model?: string;
  year?: number;
}

interface TournamentItem {
  _id: string;
  title: string;
  status: string;
  auctions?: string[];
  startDate?: string;
  endDate?: string;
}

type PipelineFilter = 'recent' | 'stale' | 'active' | 'completed';

const statusColors: Record<string, string> = {
  healthy: '#22C55E',
  degraded: '#F2CA16',
  down: '#EF4444',
};

const auctionStatusColors: Record<string, string> = {
  active: '#22C55E',
  live: '#22C55E',
  open: '#22C55E',
  sold: '#3B82F6',
  completed: '#3B82F6',
  ended: '#3B82F6',
  cancelled: '#EF4444',
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
}

export default function ScraperMonitorPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [gradingQueue, setGradingQueue] = useState<GradingQueueItem[]>([]);
  const [recentErrors, setRecentErrors] = useState<ErrorLogItem[]>([]);
  const [pipeline, setPipeline] = useState<PipelineAuction[]>([]);
  const [pipelineFilter, setPipelineFilter] = useState<PipelineFilter>('recent');
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/scraper/status');
      const data = await res.json();
      setHealth(data.health || null);
      setStats(data.stats || null);
      setGradingQueue(data.gradingQueue || []);
      setRecentErrors(data.recentErrors || []);
    } catch (err) {
      console.error('Failed to load scraper status:', err);
    }
  }, []);

  const loadPipeline = useCallback(async (filter: PipelineFilter) => {
    try {
      const res = await fetch(`/api/admin/scraper/pipeline?filter=${filter}`);
      const data = await res.json();
      setPipeline(data.auctions || []);
    } catch (err) {
      console.error('Failed to load pipeline:', err);
    }
  }, []);

  const loadTournaments = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tournaments');
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.tournaments || [];
      setTournaments(items.filter((t: TournamentItem) => ['active', 'upcoming', 'live'].includes(t.status)));
    } catch {
      setTournaments([]);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadStatus(), loadPipeline('recent'), loadTournaments()]);
      setLoading(false);
    };
    init();

    const interval = setInterval(() => {
      loadStatus();
      loadPipeline(pipelineFilter);
    }, 60000);

    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (filter: PipelineFilter) => {
    setPipelineFilter(filter);
    loadPipeline(filter);
  };

  const dotColor = health ? statusColors[health.status] || '#EF4444' : '#94A3B8';

  const cardStyle: React.CSSProperties = {
    background: '#13202D',
    border: '1px solid #2A3A4A',
    borderRadius: 12,
    padding: 20,
  };

  const thStyle: React.CSSProperties = {
    padding: '12px 16px',
    textAlign: 'left',
    color: '#94A3B8',
    fontWeight: 600,
    fontSize: 13,
    borderBottom: '1px solid #2A3A4A',
  };

  const tdStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderBottom: '1px solid #2A3A4A',
    color: '#fff',
    fontSize: 14,
  };

  if (loading) {
    return (
      <div style={{ padding: 32, color: '#94A3B8', fontSize: 16 }}>Loading scraper monitor...</div>
    );
  }

  return (
    <div style={{ padding: 32, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, margin: 0 }}>
            Scraper Health Monitor
          </h1>
          <p style={{ color: '#94A3B8', fontSize: 13, margin: '4px 0 0' }}>
            Auto-refreshes every 60s
          </p>
        </div>
        <button
          onClick={() => { loadStatus(); loadPipeline(pipelineFilter); }}
          style={{
            background: '#F2CA16',
            color: '#0C1924',
            fontWeight: 600,
            border: 'none',
            borderRadius: 8,
            padding: '10px 20px',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Refresh
        </button>
      </div>

      {/* Health Status Card */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: dotColor,
              boxShadow: `0 0 20px ${dotColor}40`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', opacity: 0.3 }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <span style={{ color: dotColor, fontWeight: 700, fontSize: 20 }}>
                {health?.status?.toUpperCase() || 'UNKNOWN'}
              </span>
              <span
                style={{
                  background: `${dotColor}20`,
                  color: dotColor,
                  padding: '2px 10px',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Score: {health?.score ?? 0}
              </span>
            </div>
            <div style={{ color: '#94A3B8', fontSize: 14 }}>{health?.message}</div>
          </div>
          <div style={{ textAlign: 'right', color: '#94A3B8', fontSize: 13 }}>
            <div>Last scrape</div>
            <div style={{ color: '#fff', fontWeight: 600 }}>
              {health?.lastScrapeTime ? timeAgo(health.lastScrapeTime) : 'Never'}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={cardStyle}>
          <div style={{ color: '#94A3B8', fontSize: 13, marginBottom: 8 }}>Processed (24h)</div>
          <div style={{ color: '#fff', fontSize: 28, fontWeight: 700 }}>{stats?.processedLast24h ?? 0}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: '#94A3B8', fontSize: 13, marginBottom: 8 }}>Stale Auctions</div>
          <div style={{ color: (stats?.staleAuctions ?? 0) > 0 ? '#EF4444' : '#fff', fontSize: 28, fontWeight: 700 }}>
            {stats?.staleAuctions ?? 0}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: '#94A3B8', fontSize: 13, marginBottom: 8 }}>Ungraded GTH</div>
          <div style={{ color: (stats?.ungradedGth ?? 0) > 0 ? '#F2CA16' : '#fff', fontSize: 28, fontWeight: 700 }}>
            {stats?.ungradedGth ?? 0}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: '#94A3B8', fontSize: 13, marginBottom: 8 }}>Status Breakdown</div>
          <div style={{ fontSize: 13 }}>
            {stats?.statusBreakdown ? (
              Object.entries(stats.statusBreakdown).map(([s, count]) => (
                <div key={s} style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', marginBottom: 2 }}>
                  <span style={{ color: '#94A3B8' }}>{s}</span>
                  <span style={{ fontWeight: 600 }}>{count}</span>
                </div>
              ))
            ) : (
              <span style={{ color: '#94A3B8' }}>No data</span>
            )}
          </div>
        </div>
      </div>

      {/* GTH Grading Queue */}
      {gradingQueue.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 24 }}>
          <h2 style={{ color: '#F2CA16', fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>
            GTH Grading Queue ({gradingQueue.length})
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Auction</th>
                <th style={thStyle}>Closed At</th>
                <th style={thStyle}>Pending Guesses</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {gradingQueue.map((item) => (
                <tr key={item.auctionId}>
                  <td style={tdStyle}>{item.title}</td>
                  <td style={tdStyle}>{item.closedAt ? timeAgo(item.closedAt) : 'N/A'}</td>
                  <td style={{ ...tdStyle, color: '#F2CA16', fontWeight: 600 }}>{item.pendingGuesses}</td>
                  <td style={tdStyle}>
                    <a
                      href={`/dashboard/guess-the-hammer/${item.auctionId}?action=grade`}
                      style={{
                        background: '#F2CA16',
                        color: '#0C1924',
                        fontWeight: 600,
                        border: 'none',
                        borderRadius: 6,
                        padding: '6px 14px',
                        textDecoration: 'none',
                        fontSize: 13,
                      }}
                    >
                      Grade Now
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Auto Tournament Monitor */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>
          Active Tournaments
        </h2>
        {tournaments.length === 0 ? (
          <div style={{ color: '#94A3B8', fontSize: 14 }}>No active tournaments</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Auctions</th>
                <th style={thStyle}>Start Date</th>
                <th style={thStyle}>End Date</th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map((t) => (
                <tr key={t._id}>
                  <td style={tdStyle}>{t.title}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        background: t.status === 'active' ? '#22C55E20' : '#F2CA1620',
                        color: t.status === 'active' ? '#22C55E' : '#F2CA16',
                        padding: '2px 10px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td style={tdStyle}>{t.auctions?.length ?? 0}</td>
                  <td style={tdStyle}>{t.startDate ? new Date(t.startDate).toLocaleDateString() : 'N/A'}</td>
                  <td style={tdStyle}>{t.endDate ? new Date(t.endDate).toLocaleDateString() : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Auction Pipeline */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>
            Auction Pipeline
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['recent', 'stale', 'active', 'completed'] as PipelineFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                style={{
                  background: pipelineFilter === f ? '#F2CA16' : '#1E2A36',
                  color: pipelineFilter === f ? '#0C1924' : '#94A3B8',
                  border: '1px solid #2A3A4A',
                  borderRadius: 6,
                  padding: '6px 14px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                {f === 'recent' ? 'Recent (24h)' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {pipeline.length === 0 ? (
          <div style={{ color: '#94A3B8', fontSize: 14, padding: 20, textAlign: 'center' }}>
            No auctions match this filter
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Auction</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Last Updated</th>
                <th style={thStyle}>Current Bid</th>
                <th style={thStyle}>GTH</th>
              </tr>
            </thead>
            <tbody>
              {pipeline.map((a) => (
                <tr key={a._id}>
                  <td style={tdStyle}>{a.title || `${a.year || ''} ${a.make || ''} ${a.model || ''}`.trim() || 'Untitled'}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        background: `${auctionStatusColors[a.status] || '#94A3B8'}20`,
                        color: auctionStatusColors[a.status] || '#94A3B8',
                        padding: '2px 10px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td style={tdStyle}>{timeAgo(a.lastUpdated)}</td>
                  <td style={tdStyle}>{formatCurrency(a.currentBid)}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        color: a.gthEnabled ? '#22C55E' : '#94A3B8',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {a.gthEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Error Logs */}
      {recentErrors.length > 0 && (
        <div style={{ ...cardStyle }}>
          <h2 style={{ color: '#EF4444', fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>
            Recent Errors ({recentErrors.length})
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Time</th>
                <th style={thStyle}>Level</th>
                <th style={thStyle}>Message</th>
              </tr>
            </thead>
            <tbody>
              {recentErrors.map((err, i) => (
                <tr key={i} style={{ background: '#EF444410' }}>
                  <td style={{ ...tdStyle, fontSize: 13, whiteSpace: 'nowrap' }}>
                    {err.timestamp ? timeAgo(err.timestamp) : 'N/A'}
                  </td>
                  <td style={{ ...tdStyle, color: '#EF4444', fontWeight: 600, fontSize: 13 }}>
                    {err.level?.toUpperCase() || 'ERROR'}
                  </td>
                  <td style={{ ...tdStyle, fontSize: 13 }}>{err.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
