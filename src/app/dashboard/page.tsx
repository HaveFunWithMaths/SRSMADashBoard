'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import PerformanceChart from '@/components/PerformanceChart';
import RankTrendChart from '@/components/RankTrendChart';
import PerformanceTable from '@/components/PerformanceTable';

export default function Dashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<string[]>([]);
    const [activeSubject, setActiveSubject] = useState<string>('');

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    useEffect(() => {
        if (session?.user?.name) {
            fetchData();
        }
    }, [session]);

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/data?type=performance&student=${session?.user?.name}`);
            if (!res.ok) throw new Error('Failed to fetch data');
            const jsonData = await res.json();

            setData(jsonData);

            // Extract subjects
            const uniqueSubjects = Array.from(new Set(jsonData.map((d: any) => d.subject))) as string[];
            setSubjects(uniqueSubjects);

            if (uniqueSubjects.length > 0) {
                setActiveSubject(uniqueSubjects[0]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (status === 'loading' || loading) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    if (!session) return null;

    // Filter data by active subject
    const subjectData = data.filter(d => d.subject === activeSubject);

    return (
        <>
            <Header />
            <main className="container">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-primary">Student Performance</h2>
                        <p className="text-sm text-muted">Welcome back, {session.user.name}</p>
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
                                <PerformanceChart data={subjectData} />
                            </div>
                            <div className="card">
                                <h3 className="card-title">Rank Consistency</h3>
                                <RankTrendChart data={subjectData} />
                            </div>
                        </div>

                        <div className="card">
                            <h3 className="card-title text-lg mb-4">Detailed Report</h3>
                            <PerformanceTable data={subjectData} />
                        </div>
                    </>
                )}
            </main>
        </>
    );
}
