'use client';

import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import PerformanceChart from '@/components/PerformanceChart';
import RankTrendChart from '@/components/RankTrendChart';
import PerformanceTable from '@/components/PerformanceTable';
import type { StudentPerformanceRecord } from '@/lib/types';
import { toast } from 'react-hot-toast';
import { Suspense } from 'react';
import { COLORS } from '@/lib/designTokens';
import { sortSubjects } from '@/lib/subjectUtils';

const SUBJECT_COLORS = COLORS.subjects;

function DashboardContent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentParam = searchParams.get('student');
    const subjectParam = searchParams.get('subject');
    const [data, setData] = useState<StudentPerformanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<string[]>([]);
    const [activeSubject, setActiveSubject] = useState<string>('');

    const subjectColor = SUBJECT_COLORS[activeSubject as keyof typeof SUBJECT_COLORS] || SUBJECT_COLORS['default'];

    // Feedback modal state
    const [showFeedback, setShowFeedback] = useState(false);
    const [fbParentName, setFbParentName] = useState('');
    const [fbStudentName, setFbStudentName] = useState('');
    const [fbMessage, setFbMessage] = useState('');
    const [fbSubmitting, setFbSubmitting] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    const handleOpenFeedback = () => {
        if (session?.user?.name && !fbStudentName) {
            setFbStudentName(session.user.name);
        }
        setShowFeedback(true);
    };

    const fetchData = useCallback(async () => {
        try {
            let studentToFetch = session?.user?.name;
            if ((session?.user?.role === 'teacher' || session?.user?.role === 'admin') && studentParam) {
                studentToFetch = studentParam;
            }

            const res = await fetch(`/api/data?type=performance&student=${encodeURIComponent(studentToFetch || '')}`);
            if (!res.ok) throw new Error('Failed to fetch data');
            const jsonData = await res.json();

            const safeData: StudentPerformanceRecord[] = Array.isArray(jsonData) ? jsonData : [];
            setData(safeData);

            const dataSubjects = Array.from(new Set(safeData.map((item) => item.subject))) as string[];
            const className = (safeData.length > 0 && safeData[0].className)
                ? safeData[0].className
                : (session?.user?.class ? String(session.user.class) : 'Class_12+');
            const sortedSubjects = sortSubjects(dataSubjects, className);

            setSubjects(sortedSubjects);

            if (subjectParam && sortedSubjects.includes(subjectParam)) {
                setActiveSubject(subjectParam);
            } else if (sortedSubjects.length > 0) {
                setActiveSubject(sortedSubjects[0]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [session?.user?.name, session?.user?.role, studentParam, subjectParam]);

    useEffect(() => {
        if (status === 'loading') return;

        if (session?.user?.role === 'teacher' || session?.user?.role === 'admin') {
            if (!studentParam) {
                router.push('/teacher');
                return;
            }
        }

        if (session?.user?.name) {
            fetchData();
        }
    }, [fetchData, router, session, status, studentParam]);

    useEffect(() => {
        if (subjectParam && subjects.includes(subjectParam)) {
            setActiveSubject(subjectParam);
        }
    }, [subjectParam, subjects]);

    const handleFeedbackSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fbMessage.trim()) return;
        setFbSubmitting(true);
        try {
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    parentName: fbParentName.trim() || null,
                    studentName: fbStudentName.trim() || null,
                    message: fbMessage.trim(),
                }),
            });
            const result = await res.json();
            if (result.success) {
                toast.success('Thank you! Your feedback has been submitted.');
                setShowFeedback(false);
                setFbParentName('');
                setFbMessage('');
            } else {
                toast.error(result.error || 'Failed to submit feedback');
            }
        } catch {
            toast.error('Error submitting feedback');
        } finally {
            setFbSubmitting(false);
        }
    };

    if (status === 'loading' || loading) {
        return (
            <>
                <Header />
                <main className="container">
                    <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <div className="skeleton" style={{ width: '200px', height: '28px', marginBottom: '0.5rem' }} />
                            <div className="skeleton" style={{ width: '160px', height: '16px' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ width: '80px', height: '36px', borderRadius: '0.5rem' }} />)}
                        </div>
                    </div>
                    <div className="dashboard-grid">
                        <div className="card"><div className="skeleton" style={{ height: '280px', borderRadius: '0.5rem' }} /></div>
                        <div className="card"><div className="skeleton" style={{ height: '280px', borderRadius: '0.5rem' }} /></div>
                    </div>
                    <div className="card" style={{ marginTop: '1.5rem' }}>
                        <div className="skeleton" style={{ height: '200px', borderRadius: '0.5rem' }} />
                    </div>
                </main>
            </>
        );
    }

    if (!session) return null;

    const subjectData = data.filter(d => d.subject === activeSubject);
    const displayedStudentName = ((session.user.role === 'teacher' || session.user.role === 'admin') && studentParam) ? studentParam : session.user.name;

    return (
        <>
            <Header />
            <main className="container">
                {(session.user.role === 'teacher' || session.user.role === 'admin') && (
                    <button onClick={() => router.push('/teacher')} className="back-button">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        <span>Back to Teacher Dashboard</span>
                    </button>
                )}

                <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h2 className="text-xl font-bold" style={{ color: subjectColor }}>Student Performance</h2>
                        <p className="text-sm text-muted">Viewing data for: {displayedStudentName}</p>
                    </div>
                    <div className="tabs" style={{ marginBottom: 0 }}>
                        {subjects.map(sub => {
                            const color = SUBJECT_COLORS[sub as keyof typeof SUBJECT_COLORS] || SUBJECT_COLORS['default'];
                            const isActive = activeSubject === sub;
                            return (
                                <button
                                    key={sub}
                                    className={`tab-btn ${isActive ? 'active' : ''}`}
                                    onClick={() => setActiveSubject(sub)}
                                    style={isActive ? {
                                        backgroundColor: color,
                                        borderColor: color,
                                        color: '#fff',
                                    } : undefined}
                                >
                                    {sub}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div key={activeSubject} className="subject-fade-in">
                {subjectData.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📊</div>
                        <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' }}>No data yet for {activeSubject}</p>
                        <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Results will appear here once your teacher uploads marks for this subject.</p>
                    </div>
                ) : (
                    <>
                        <div className="dashboard-grid">
                            <div className="card">
                                <h3 className="card-title" style={{ color: subjectColor }}>Performance Trend</h3>
                                <PerformanceChart data={subjectData} subject={activeSubject} />
                            </div>
                            <div className="card">
                                <h3 className="card-title" style={{ color: subjectColor }}>Rank Consistency</h3>
                                <RankTrendChart data={subjectData} subject={activeSubject} />
                            </div>
                        </div>

                        <div className="card">
                            <h3 className="card-title text-lg mb-4" style={{ color: subjectColor }}>Detailed Report</h3>
                            <PerformanceTable
                                data={subjectData}
                                editable={session.user.role === 'teacher' || session.user.role === 'admin'}
                                studentName={displayedStudentName || ''}
                                onRefreshRequested={fetchData}
                            />
                        </div>
                    </>
                )}
                </div>
            </main>

            {/* ── Floating Feedback Button ── */}
            <button
                id="feedback-fab"
                onClick={handleOpenFeedback}
                style={{
                    position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000,
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.7rem 1.25rem',
                    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                    color: '#fff', border: 'none', borderRadius: '2rem',
                    fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.9rem',
                    cursor: 'pointer', boxShadow: '0 4px 20px rgba(124, 58, 237, 0.45)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 28px rgba(124, 58, 237, 0.55)';
                }}
                onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(124, 58, 237, 0.45)';
                }}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Feedback
            </button>

            {/* ── Feedback Modal ── */}
            {showFeedback && (
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 2000,
                        background: 'rgba(15, 23, 42, 0.55)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '1rem', backdropFilter: 'blur(4px)',
                    }}
                    onClick={e => { if (e.target === e.currentTarget) setShowFeedback(false); }}
                >
                    <div style={{
                        background: '#fff', borderRadius: '1.25rem',
                        padding: '2rem', width: '100%', maxWidth: '480px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                        animation: 'slideUp 0.25s ease',
                    }}>
                        <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                        </svg>
                                    </div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', fontFamily: 'Outfit, sans-serif' }}>Share Feedback</h3>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
                                    Please share your feedback on the app. Any feedback related to teaching or logistics can be communicated directly to teachers.
                                </p>
                            </div>
                            <button onClick={() => setShowFeedback(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.25rem', flexShrink: 0, marginLeft: '1rem' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleFeedbackSubmit}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                                    Your Name (Parent / Guardian)
                                </label>
                                <input
                                    type="text"
                                    value={fbParentName}
                                    onChange={e => setFbParentName(e.target.value)}
                                    placeholder="e.g. Sitaram"
                                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '0.6rem', fontSize: '0.9rem', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}
                                    onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                                    onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                                    Student Name
                                </label>
                                <input
                                    type="text"
                                    value={fbStudentName}
                                    onChange={e => setFbStudentName(e.target.value)}
                                    placeholder="Student name"
                                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '0.6rem', fontSize: '0.9rem', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}
                                    onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                                    onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                                />
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                                    Your Feedback <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <textarea
                                    value={fbMessage}
                                    onChange={e => setFbMessage(e.target.value)}
                                    placeholder="Write your feedback here..."
                                    required
                                    rows={4}
                                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '0.6rem', fontSize: '0.9rem', outline: 'none', fontFamily: 'Inter, sans-serif', resize: 'vertical', minHeight: '100px', boxSizing: 'border-box' }}
                                    onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                                    onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowFeedback(false)}
                                    style={{ padding: '0.65rem 1.25rem', border: '1.5px solid #e2e8f0', borderRadius: '0.6rem', background: '#fff', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={fbSubmitting || !fbMessage.trim()}
                                    style={{
                                        padding: '0.65rem 1.5rem',
                                        background: fbSubmitting || !fbMessage.trim() ? '#c4b5fd' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                                        color: '#fff', border: 'none', borderRadius: '0.6rem',
                                        fontWeight: 700, fontSize: '0.9rem',
                                        cursor: fbSubmitting || !fbMessage.trim() ? 'not-allowed' : 'pointer',
                                        fontFamily: 'Outfit, sans-serif',
                                    }}
                                >
                                    {fbSubmitting ? 'Submitting…' : 'Submit Feedback'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

export default function Dashboard() {
    return (
        <Suspense fallback={
            <>
                <Header />
                <main className="container">
                    <div className="dashboard-grid">
                        <div className="card"><div className="skeleton" style={{ height: '280px', borderRadius: '0.5rem' }} /></div>
                        <div className="card"><div className="skeleton" style={{ height: '280px', borderRadius: '0.5rem' }} /></div>
                    </div>
                </main>
            </>
        }>
            <DashboardContent />
        </Suspense>
    );
}
