'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Header from '@/components/Header';
import { useRouter } from 'next/navigation';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';
import { toast } from 'react-hot-toast';

export default function AdminDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'system' | 'analytics'>('analytics');

    // User Analytics state
    const [analyticsStats, setAnalyticsStats] = useState<any>(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [activePeriod, setActivePeriod] = useState<number | undefined>(7);
    const [feedbackList, setFeedbackList] = useState<any[]>([]);
    const [replyingToId, setReplyingToId] = useState<number | null>(null);
    const [replyDraft, setReplyDraft] = useState('');
    const [isSavingReply, setIsSavingReply] = useState(false);
    const [analyticsFilterType, setAnalyticsFilterType] = useState<'days' | 'custom'>('days');
    const [customDateFrom, setCustomDateFrom] = useState('');
    const [customDateTo, setCustomDateTo] = useState('');
    const [feedbackToDelete, setFeedbackToDelete] = useState<number | null>(null);

    // Sorting state for Student Logins Table
    const [sortField, setSortField] = useState<string>('login_time');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // Clickable Student Logins detail modal state
    const [selectedLoginsStudent, setSelectedLoginsStudent] = useState<{ username: string; displayName: string } | null>(null);
    const [studentLoginsDetail, setStudentLoginsDetail] = useState<any[]>([]);
    const [loginsDetailLoading, setLoginsDetailLoading] = useState(false);

    const sortedLogins = useMemo(() => {
        if (!analyticsStats?.lastLogins) return [];
        return [...analyticsStats.lastLogins].sort((a: any, b: any) => {
            let valA: any = a[sortField];
            let valB: any = b[sortField];

            if (sortField === 'name') {
                valA = a.name || a.username || '';
                valB = b.name || b.username || '';
            } else if (sortField === 'login_count') {
                valA = Number(a.login_count || 0);
                valB = Number(b.login_count || 0);
            } else if (sortField === 'login_time') {
                valA = new Date(a.login_time || 0).getTime();
                valB = new Date(b.login_time || 0).getTime();
            } else {
                valA = valA ? String(valA).toLowerCase() : '';
                valB = valB ? String(valB).toLowerCase() : '';
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [analyticsStats?.lastLogins, sortField, sortDirection]);

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const getSortIcon = (field: string) => {
        if (sortField !== field) return <span style={{ color: '#94a3b8', marginLeft: '0.25rem' }}>↕</span>;
        return sortDirection === 'asc' ? 
            <span style={{ color: '#7c3aed', marginLeft: '0.25rem', fontWeight: 'bold' }}>▲</span> : 
            <span style={{ color: '#7c3aed', marginLeft: '0.25rem', fontWeight: 'bold' }}>▼</span>;
    };

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated' && session?.user?.role !== 'admin') {
            router.push('/dashboard');
        }
    }, [status, session, router]);

    const fetchAnalytics = useCallback(async (period?: number, fromDate?: string, toDate?: string) => {
        setAnalyticsLoading(true);
        try {
            const params = new URLSearchParams();
            if (period !== undefined) params.append('period', period.toString());
            if (fromDate) params.append('from', fromDate);
            if (toDate) params.append('to', toDate);

            const url = `/api/analytics/stats?${params.toString()}`;
            const res = await fetch(url);
            const data = await res.json();
            setAnalyticsStats(data);
        } catch (e) {
            console.error(e);
        } finally {
            setAnalyticsLoading(false);
        }
    }, []);

    const fetchFeedback = useCallback(async () => {
        try {
            const res = await fetch('/api/feedback');
            const data = await res.json();
            if (Array.isArray(data)) setFeedbackList(data);
        } catch (e) {
            console.error(e);
        }
    }, []);

    const executeDeleteFeedback = async () => {
        if (!feedbackToDelete) return;
        try {
            const res = await fetch(`/api/feedback?id=${feedbackToDelete}`, { method: 'DELETE' });
            const result = await res.json();
            if (result.success) {
                toast.success('Feedback deleted');
                fetchFeedback();
            } else {
                toast.error(result.error || 'Failed to delete feedback');
            }
        } catch {
            toast.error('Error deleting feedback');
        } finally {
            setFeedbackToDelete(null);
        }
    };

    const handleStudentNameClick = async (username: string, displayName: string) => {
        setSelectedLoginsStudent({ username, displayName });
        setStudentLoginsDetail([]);
        setLoginsDetailLoading(true);

        try {
            const params = new URLSearchParams();
            params.append('username', username);
            if (analyticsFilterType === 'days' && activePeriod !== undefined) {
                params.append('period', activePeriod.toString());
            } else if (analyticsFilterType === 'custom') {
                if (customDateFrom) params.append('from', customDateFrom);
                if (customDateTo) params.append('to', customDateTo);
            }

            const url = `/api/analytics/user-logins?${params.toString()}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.success && Array.isArray(data.logs)) {
                setStudentLoginsDetail(data.logs);
            } else {
                toast.error(data.error || 'Failed to fetch login logs');
            }
        } catch (err) {
            toast.error('Error fetching login logs');
        } finally {
            setLoginsDetailLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'analytics') {
            fetchAnalytics(activePeriod);
            fetchFeedback();
        }
    }, [activeTab, activePeriod, fetchAnalytics, fetchFeedback]);

    if (status === 'loading') return <div>Loading...</div>;
    if (!session) return null;

    return (
        <>
            <Header />
            <main className="container" style={{ paddingBottom: '3rem' }}>
                <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>Admin Panel</h2>

                {/* Tabs selection */}
                <div className="tabs" style={{ marginBottom: '1.5rem' }}>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                    >
                        📊 User Analytics
                    </button>
                    <button
                        onClick={() => setActiveTab('system')}
                        className={`tab-btn ${activeTab === 'system' ? 'active' : ''}`}
                    >
                        ⚙️ System Overview
                    </button>
                </div>

                {/* ── SYSTEM VIEW ── */}
                {activeTab === 'system' && (
                    <div className="dashboard-grid">
                        <div className="card">
                            <h3 className="card-title">System Status</h3>
                            <div className="flex gap-4 items-center">
                                <div className="p-4 bg-green-100 rounded text-green-800">
                                    <span className="block text-2xl font-bold">Online</span>
                                    <span className="text-sm">System Operational</span>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <h3 className="card-title">Data Management</h3>
                            <p className="mb-4 text-sm text-muted">Data is synced automatically from the Excel source files on every request.</p>
                            <button
                                className="btn btn-secondary"
                                onClick={() => window.location.reload()}
                            >
                                Verify Data Sync
                            </button>
                        </div>

                        <div className="card">
                            <h3 className="card-title">User Management</h3>
                            <p className="text-sm text-muted">User accounts are managed via the database. Teachers can manage students from the Class Manager tab.</p>
                        </div>
                    </div>
                )}

                {/* ── ANALYTICS VIEW ── */}
                {activeTab === 'analytics' && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        {/* Global Date Filter */}
                        <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Date Range:</label>
                                <select
                                    value={analyticsFilterType === 'days' ? (activePeriod ?? '') : 'custom'}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val === 'custom') {
                                            setAnalyticsFilterType('custom');
                                        } else {
                                            setAnalyticsFilterType('days');
                                            const v = val === '' ? undefined : Number(val);
                                            setActivePeriod(v);
                                            fetchAnalytics(v, undefined, undefined);
                                        }
                                    }}
                                    style={{ fontSize: '0.85rem', border: '1px solid #e2e8f0', borderRadius: '0.4rem', padding: '0.4rem 0.5rem', outline: 'none', cursor: 'pointer', color: '#334155' }}
                                >
                                    <option value="7">Last 7 days</option>
                                    <option value="30">Last 30 days</option>
                                    <option value="90">Last 90 days</option>
                                    <option value="">All time</option>
                                    <option value="custom">Custom Range</option>
                                </select>
                            </div>

                            {analyticsFilterType === 'custom' && (
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <input
                                        type="date"
                                        value={customDateFrom}
                                        onChange={e => setCustomDateFrom(e.target.value)}
                                        style={{ fontSize: '0.85rem', border: '1px solid #e2e8f0', borderRadius: '0.4rem', padding: '0.35rem 0.5rem', outline: 'none', color: '#334155' }}
                                    />
                                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>to</span>
                                    <input
                                        type="date"
                                        value={customDateTo}
                                        onChange={e => setCustomDateTo(e.target.value)}
                                        style={{ fontSize: '0.85rem', border: '1px solid #e2e8f0', borderRadius: '0.4rem', padding: '0.35rem 0.5rem', outline: 'none', color: '#334155' }}
                                    />
                                    <button
                                        onClick={() => fetchAnalytics(undefined, customDateFrom, customDateTo)}
                                        disabled={!customDateFrom || !customDateTo}
                                        style={{ background: (!customDateFrom || !customDateTo) ? '#94a3b8' : '#10b981', color: '#fff', border: 'none', borderRadius: '0.4rem', padding: '0.45rem 1.25rem', fontSize: '0.85rem', cursor: (!customDateFrom || !customDateTo) ? 'not-allowed' : 'pointer', fontWeight: 600, transition: 'background 0.2s' }}
                                    >
                                        Apply
                                    </button>
                                </div>
                            )}
                        </div>

                        {analyticsLoading ? (
                            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Loading analytics…</div>
                        ) : (
                            <>
                                {/* KPI Cards */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #1a365d' }}>
                                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, marginBottom: '0.25rem' }}>Logins Today</p>
                                        <p style={{ fontSize: '2rem', fontWeight: 700, color: '#1a365d', margin: 0 }}>{analyticsStats?.todayLogins ?? '—'}</p>
                                    </div>
                                    <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #7c3aed' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, margin: 0 }}>Logged in Users in Range</p>
                                        </div>
                                        <p style={{ fontSize: '2rem', fontWeight: 700, color: '#7c3aed', margin: 0 }}>{analyticsStats?.activeUsers ?? '—'}</p>
                                    </div>
                                    <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
                                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, marginBottom: '0.25rem' }}>Total Users</p>
                                        <p style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981', margin: 0 }}>{analyticsStats?.totalUsers ?? '—'}</p>
                                    </div>
                                    <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
                                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, marginBottom: '0.25rem' }}>Mobile Users %</p>
                                        <p style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b', margin: 0 }}>
                                            {analyticsStats?.deviceBreakdown?.length
                                                ? (() => {
                                                    const total = analyticsStats.deviceBreakdown.reduce((a: number, d: any) => a + Number(d.count), 0);
                                                    const mobile = Number(analyticsStats.deviceBreakdown.find((d: any) => d.device_type === 'Mobile')?.count ?? 0);
                                                    return total > 0 ? `${Math.round((mobile / total) * 100)}%` : '0%';
                                                })()
                                                : '—'}
                                        </p>
                                    </div>
                                </div>

                                {/* Charts row */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                    <div className="card">
                                        <h3 className="card-title" style={{ marginBottom: '1rem' }}>Device Breakdown</h3>
                                        {analyticsStats?.deviceBreakdown?.length > 0 ? (
                                            <div style={{ height: 200 }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={analyticsStats.deviceBreakdown.map((d: any) => ({ name: d.device_type, Logins: Number(d.count) }))} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                                                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                                                        <Tooltip contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '0.85rem' }} />
                                                        <Bar dataKey="Logins" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        ) : <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>No data yet</p>}
                                    </div>
                                    <div className="card">
                                        <h3 className="card-title" style={{ marginBottom: '1rem' }}>Browser Distribution</h3>
                                        {analyticsStats?.browserBreakdown?.length > 0 ? (
                                            <div style={{ height: 200 }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={analyticsStats.browserBreakdown.map((d: any) => ({ name: d.browser, Logins: Number(d.count) }))} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                                                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                                                        <Tooltip contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '0.85rem' }} />
                                                        <Bar dataKey="Logins" fill="#10b981" radius={[4, 4, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        ) : <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>No data yet</p>}
                                    </div>
                                </div>

                                {/* Login Trend */}
                                <div className="card" style={{ marginBottom: '1.5rem' }}>
                                    <h3 className="card-title" style={{ marginBottom: '1rem' }}>Login Trend (Last 30 Days)</h3>
                                    {analyticsStats?.loginTrend?.length > 0 ? (
                                        <div style={{ height: 220 }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart
                                                    data={analyticsStats.loginTrend.map((d: any) => ({ date: new Date(d.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' }), Logins: Number(d.count) }))}
                                                    margin={{ top: 10, right: 20, left: 0, bottom: 30 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b', dy: 12 }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} angle={-35} textAnchor="end" />
                                                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} allowDecimals={false} />
                                                    <Tooltip contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '0.85rem' }} />
                                                    <Line type="monotone" dataKey="Logins" stroke="#1a365d" strokeWidth={3} dot={{ r: 4, fill: '#1a365d' }} activeDot={{ r: 6 }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>No login data in the last 30 days</p>}
                                </div>

                                {/* Feedback Section */}
                                <div className="card" style={{ marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                        <h3 className="card-title" style={{ margin: 0 }}>Parent Feedback</h3>
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{feedbackList.length} submission{feedbackList.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    {feedbackList.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', border: '2px dashed #f1f5f9', borderRadius: '0.5rem' }}>No feedback submitted yet.</div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {feedbackList.map((fb: any) => (
                                                <div key={fb.id} style={{ border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.25rem', backgroundColor: '#fafafa' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{fb.parent_name || 'Anonymous'}</span>
                                                                {fb.student_name && (
                                                                    <span style={{ fontSize: '0.8rem', color: '#7c3aed', backgroundColor: '#f3f0ff', padding: '0.15rem 0.5rem', borderRadius: '1rem', fontWeight: 600 }}>
                                                                        👤 {fb.student_name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                                                                {new Date(fb.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => setFeedbackToDelete(fb.id)}
                                                            style={{ padding: '0.3rem 0.6rem', border: '1px solid #fee2e2', borderRadius: '0.4rem', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                                            title="Delete feedback"
                                                        >
                                                            🗑️ Delete
                                                        </button>
                                                    </div>
                                                    <p style={{ margin: '0 0 0.75rem', color: '#334155', fontSize: '0.9rem', lineHeight: 1.6 }}>{fb.message}</p>
                                                    {fb.teacher_reply ? (
                                                        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
                                                            <p style={{ margin: '0 0 0.25rem', fontSize: '0.8rem', fontWeight: 700, color: '#166534' }}>✅ Teacher Reply</p>
                                                            <p style={{ margin: 0, fontSize: '0.88rem', color: '#166534' }}>{fb.teacher_reply}</p>
                                                        </div>
                                                    ) : replyingToId === fb.id ? (
                                                        <div style={{ marginTop: '0.75rem' }}>
                                                            <textarea
                                                                value={replyDraft}
                                                                onChange={e => setReplyDraft(e.target.value)}
                                                                placeholder="Type your reply..."
                                                                rows={3}
                                                                style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #7c3aed', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', fontFamily: 'Inter, sans-serif', resize: 'vertical', boxSizing: 'border-box' }}
                                                            />
                                                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                                                                <button onClick={() => { setReplyingToId(null); setReplyDraft(''); }} style={{ padding: '0.4rem 1rem', border: '1px solid #e2e8f0', borderRadius: '0.4rem', background: '#fff', cursor: 'pointer', color: '#64748b', fontSize: '0.85rem' }}>Cancel</button>
                                                                <button
                                                                    disabled={isSavingReply || !replyDraft.trim()}
                                                                    onClick={async () => {
                                                                        if (!replyDraft.trim()) return;
                                                                        setIsSavingReply(true);
                                                                        try {
                                                                            const res = await fetch('/api/feedback', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: fb.id, reply: replyDraft.trim() }) });
                                                                            const result = await res.json();
                                                                            if (result.success) { toast.success('Reply saved'); setReplyingToId(null); setReplyDraft(''); await fetchFeedback(); }
                                                                            else toast.error('Failed to save reply');
                                                                        } catch { toast.error('Error saving reply'); }
                                                                        finally { setIsSavingReply(false); }
                                                                    }}
                                                                    style={{ padding: '0.4rem 1rem', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '0.4rem', cursor: isSavingReply || !replyDraft.trim() ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 600, opacity: isSavingReply || !replyDraft.trim() ? 0.6 : 1 }}
                                                                >
                                                                    {isSavingReply ? 'Saving…' : 'Send Reply'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => { setReplyingToId(fb.id); setReplyDraft(''); }}
                                                            style={{ marginTop: '0.5rem', padding: '0.35rem 0.85rem', border: '1px solid #e2e8f0', borderRadius: '0.4rem', background: '#fff', color: '#7c3aed', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}
                                                        >
                                                            💬 Reply
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Last Login Table */}
                                <div className="card">
                                    <h3 className="card-title" style={{ marginBottom: '1rem' }}>Student Logins</h3>
                                    {analyticsStats?.lastLogins?.length > 0 ? (
                                        <div style={{ overflowX: 'auto' }}>
                                            <table className="data-table" style={{ width: '100%' }}>
                                                <thead>
                                                    <tr style={{ borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b' }}>
                                                        <th 
                                                            style={{ padding: '0.75rem 1rem', textAlign: 'left', userSelect: 'none' }}
                                                            onClick={() => handleSort('username')}
                                                        >
                                                            Username {getSortIcon('username')}
                                                        </th>
                                                        <th 
                                                            style={{ padding: '0.75rem 1rem', textAlign: 'left', userSelect: 'none' }}
                                                            onClick={() => handleSort('name')}
                                                        >
                                                            Name {getSortIcon('name')}
                                                        </th>
                                                        <th 
                                                            style={{ padding: '0.75rem 1rem', textAlign: 'center', userSelect: 'none' }}
                                                            onClick={() => handleSort('login_count')}
                                                        >
                                                            Logins (Frequency) {getSortIcon('login_count')}
                                                        </th>
                                                        <th 
                                                            style={{ padding: '0.75rem 1rem', textAlign: 'center', userSelect: 'none' }}
                                                            onClick={() => handleSort('device_type')}
                                                        >
                                                            Latest Device {getSortIcon('device_type')}
                                                        </th>
                                                        <th 
                                                            style={{ padding: '0.75rem 1rem', textAlign: 'center', userSelect: 'none' }}
                                                            onClick={() => handleSort('browser')}
                                                        >
                                                            Latest Browser {getSortIcon('browser')}
                                                        </th>
                                                        <th 
                                                            style={{ padding: '0.75rem 1rem', textAlign: 'center', userSelect: 'none' }}
                                                            onClick={() => handleSort('os')}
                                                        >
                                                            Latest OS {getSortIcon('os')}
                                                        </th>
                                                        <th 
                                                            style={{ padding: '0.75rem 1rem', textAlign: 'right', userSelect: 'none' }}
                                                            onClick={() => handleSort('login_time')}
                                                        >
                                                            Last Login Time {getSortIcon('login_time')}
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sortedLogins.map((u: any, idx: number) => (
                                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                                            <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#1e293b', fontSize: '0.88rem' }}>{u.username}</td>
                                                            <td
                                                                style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#7c3aed', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.88rem' }}
                                                                onClick={() => handleStudentNameClick(u.username, u.name || u.username)}
                                                            >
                                                                {u.name || u.username}
                                                            </td>
                                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, color: '#1e293b', fontSize: '0.88rem' }}>
                                                                {Number(u.login_count || 0)}
                                                            </td>
                                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                                                                {u.device_type === 'Mobile' ? '📱' : u.device_type === 'Tablet' ? '📟' : '🖥️'} {u.device_type || '—'}
                                                            </td>
                                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>{u.browser || '—'}</td>
                                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>{u.os || '—'}</td>
                                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#94a3b8', fontSize: '0.82rem' }}>
                                                                {new Date(u.login_time).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', border: '2px dashed #f1f5f9', borderRadius: '0.5rem' }}>
                                            No login records yet. Records appear after users log in.
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </main>

            {/* ── DELETE FEEDBACK MODAL ── */}
            {feedbackToDelete !== null && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ background: '#fff', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div style={{ background: '#fee2e2', color: '#ef4444', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>Delete Feedback</h3>
                        </div>
                        <p style={{ color: '#475569', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                            Are you sure you want to delete this feedback? This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button onClick={() => setFeedbackToDelete(null)} style={{ padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', background: '#fff', color: '#475569', cursor: 'pointer', fontWeight: 500 }}>
                                Cancel
                            </button>
                            <button onClick={executeDeleteFeedback} style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '0.5rem', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── STUDENT DETAILED LOGINS MODAL ── */}
            {selectedLoginsStudent !== null && (
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 3000,
                        backgroundColor: 'rgba(15, 23, 42, 0.55)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '1rem', backdropFilter: 'blur(4px)',
                    }}
                    onClick={e => { if (e.target === e.currentTarget) setSelectedLoginsStudent(null); }}
                >
                    <div style={{
                        background: '#fff', borderRadius: '1.25rem',
                        padding: '2rem', width: '95%', maxWidth: '1100px',
                        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                        animation: 'slideUp 0.25s ease',
                    }}>
                        <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
                        
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#1a365d', fontFamily: 'Outfit, sans-serif' }}>
                                    Login History for {selectedLoginsStudent.displayName}
                                </h3>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                                    Username / Roll: {selectedLoginsStudent.username} &bull; showing all logins in selected date range
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedLoginsStudent(null)}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.25rem', padding: '0.25rem' }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Content */}
                        <div style={{ overflowY: 'auto', flex: 1, marginTop: '1.25rem', marginBottom: '1.5rem' }}>
                            {loginsDetailLoading ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.95rem' }}>
                                    Loading history...
                                </div>
                            ) : studentLoginsDetail.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.95rem', border: '2px dashed #f1f5f9', borderRadius: '0.5rem' }}>
                                    No login records found for this student.
                                </div>
                            ) : (
                                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b', fontSize: '0.85rem' }}>
                                            <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left' }}>Date & Time</th>
                                            <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Device</th>
                                            <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Browser</th>
                                            <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>OS</th>
                                            <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left' }}>User Agent</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {studentLoginsDetail.map((log: any, idx: number) => (
                                            <tr key={log.id || idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc', fontSize: '0.85rem' }}>
                                                <td style={{ padding: '0.65rem 0.85rem', color: '#334155', fontWeight: 500 }}>
                                                    {new Date(log.login_time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </td>
                                                <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', color: '#475569' }}>
                                                    {log.device_type === 'Mobile' ? '📱 Mobile' : log.device_type === 'Tablet' ? '📟 Tablet' : '🖥️ Desktop'}
                                                </td>
                                                <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', color: '#475569' }}>{log.browser || '—'}</td>
                                                <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', color: '#475569' }}>{log.os || '—'}</td>
                                                <td
                                                    style={{ padding: '0.65rem 0.85rem', color: '#64748b', fontSize: '0.78rem', maxWidth: '450px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                                    title={log.user_agent}
                                                >
                                                    {log.user_agent || '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                            <button
                                onClick={() => setSelectedLoginsStudent(null)}
                                style={{ padding: '0.5rem 1.5rem', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '0.4rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
