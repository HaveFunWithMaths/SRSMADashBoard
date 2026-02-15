'use client';

import { useEffect, useState } from 'react';
import PerformanceChart from '@/components/PerformanceChart';
import RankTrendChart from '@/components/RankTrendChart';
import PerformanceTable from '@/components/PerformanceTable';

interface StudentDashboardViewProps {
    studentName: string;
    showBackToTeacher?: boolean;
    onBack?: () => void;
}

export default function StudentDashboardView({ studentName, showBackToTeacher, onBack }: StudentDashboardViewProps) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<string[]>([]);
    const [activeSubject, setActiveSubject] = useState<string>('');

    useEffect(() => {
        if (!studentName) return;
        setLoading(true);
        fetch(`/api/data?type=performance&student=${encodeURIComponent(studentName)}`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch data');
                return res.json();
            })
            .then(jsonData => {
                // Ensure jsonData is an array
                const safeData = Array.isArray(jsonData) ? jsonData : [];
                setData(safeData);

                // Extract subjects
                const dataSubjects = Array.from(new Set(safeData.map((d: any) => d.subject))) as string[];
                const requiredSubjects = ['Maths', 'Physics', 'Chemistry', 'Total'];
                const uniqueSubjects = Array.from(new Set([...dataSubjects, ...requiredSubjects]));
                setSubjects(uniqueSubjects);

                if (uniqueSubjects.length > 0) {
                    setActiveSubject(uniqueSubjects[0]);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [studentName]);

    if (loading) return <div className="flex justify-center items-center p-12 text-muted">Loading student data...</div>;

    const subjectData = data.filter(d => d.subject === activeSubject);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <div>
                    <h2 className="text-xl font-bold text-primary">Student Performance</h2>
                    <p className="text-sm text-muted">Viewing data for: {studentName}</p>
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
                <div className="card text-center p-8">No data available for {activeSubject}.</div>
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
                        <PerformanceTable data={subjectData} />
                    </div>
                </>
            )}

            {showBackToTeacher && (
                <button
                    onClick={onBack}
                    className="back-button"
                    style={{ marginTop: '1rem' }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    <span>Back to Teacher Dashboard</span>
                </button>
            )}
        </div>
    );
}
