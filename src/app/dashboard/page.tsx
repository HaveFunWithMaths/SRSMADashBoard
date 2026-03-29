'use client';

import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import PerformanceChart from '@/components/PerformanceChart';
import RankTrendChart from '@/components/RankTrendChart';
import PerformanceTable from '@/components/PerformanceTable';
import type { StudentPerformanceRecord } from '@/lib/types';

import { Suspense } from 'react';

function DashboardContent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const studentParam = searchParams.get('student');
    const subjectParam = searchParams.get('subject');
    // ... existing logic up to return ...
    const [data, setData] = useState<StudentPerformanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<string[]>([]);
    const [activeSubject, setActiveSubject] = useState<string>('');

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    const fetchData = useCallback(async () => {
        try {
            // Determine which student to fetch: param if teacher, otherwise self
            let studentToFetch = session?.user?.name;
            if (session?.user?.role === 'teacher' && studentParam) {
                studentToFetch = studentParam;
            }

            const res = await fetch(`/api/data?type=performance&student=${encodeURIComponent(studentToFetch || '')}`);
            if (!res.ok) throw new Error('Failed to fetch data');
            const jsonData = await res.json();

            const safeData: StudentPerformanceRecord[] = Array.isArray(jsonData) ? jsonData : [];
            setData(safeData);

            // Extract subjects and inject Chemistry/Total even if no data
            const dataSubjects = Array.from(new Set(safeData.map((item) => item.subject))) as string[];
            const requiredSubjects = ['Maths', 'Physics', 'Chemistry', 'Total'];
            const uniqueSubjects = Array.from(new Set([...dataSubjects, ...requiredSubjects]));
            
            const sortOrder = ['Maths', 'Physics', 'Chemistry', 'Total'];
            const sortedSubjects = uniqueSubjects.sort((a, b) => {
                const idxA = sortOrder.indexOf(a);
                const idxB = sortOrder.indexOf(b);
                if (idxA === -1 && idxB === -1) return a.localeCompare(b);
                if (idxA === -1) return 1;
                if (idxB === -1) return -1;
                return idxA - idxB;
            });
            
            setSubjects(sortedSubjects);

            if (subjectParam && uniqueSubjects.includes(subjectParam)) {
                setActiveSubject(subjectParam);
            } else if (uniqueSubjects.length > 0) {
                setActiveSubject(uniqueSubjects[0]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [session?.user?.name, session?.user?.role, studentParam, subjectParam]);

    useEffect(() => {
        if (status === 'loading') return;

        if (session?.user?.role === 'teacher') {
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

    if (status === 'loading' || loading) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    if (!session) return null;

    // Filter data by active subject
    const subjectData = data.filter(d => d.subject === activeSubject);
    const displayedStudentName = (session.user.role === 'teacher' && studentParam) ? studentParam : session.user.name;

    return (
        <>
            <Header />
            <main className="container">
                {session.user.role === 'teacher' && (
                    <button
                        onClick={() => router.push('/teacher')}
                        className="back-button"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        <span>Back to Teacher Dashboard</span>
                    </button>
                )}

                <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h2 className="text-xl font-bold text-primary">Student Performance</h2>
                        <p className="text-sm text-muted">Viewing data for: {displayedStudentName}</p>
                    </div>
                    {/* Subject Tabs */}
                    <div className="tabs" style={{ marginBottom: 0 }}>
                        {subjects.map(sub => (
                            <button
                                key={sub}
                                className={`tab-btn ${activeSubject === sub ? 'active' : ''}`}
                                onClick={() => setActiveSubject(sub)}
                            >
                                {sub}
                            </button>
                        ))}
                    </div>
                </div>

                {subjectData.length === 0 ? (
                    <div className="card text-center p-8">No data available for this subject.</div>
                ) : (
                    <>
                        <div className="dashboard-grid">
                            <div className="card">
                                <h3 className="card-title">Performance Trend</h3>
                                <PerformanceChart data={subjectData} subject={activeSubject} />
                            </div>
                            <div className="card">
                                <h3 className="card-title">Rank Consistency</h3>
                                <RankTrendChart data={subjectData} />
                            </div>
                        </div>

                        <div className="card">
                            <h3 className="card-title text-lg mb-4">Detailed Report</h3>
                            <PerformanceTable
                                data={subjectData}
                                editable={session.user.role === 'teacher'}
                                studentName={displayedStudentName || ''}
                                onRefreshRequested={fetchData}
                            />
                        </div>
                    </>
                )}
            </main>
        </>
    );
}

export default function Dashboard() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DashboardContent />
        </Suspense>
    );
}
