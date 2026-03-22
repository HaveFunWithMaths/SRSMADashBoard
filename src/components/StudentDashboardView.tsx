'use client';

import { useCallback, useEffect, useState } from 'react';
import PerformanceChart from '@/components/PerformanceChart';
import RankTrendChart from '@/components/RankTrendChart';
import PerformanceTable from '@/components/PerformanceTable';
import type { StudentPerformanceRecord } from '@/lib/types';

interface StudentDashboardViewProps {
    studentName: string;
    showBackToTeacher?: boolean;
    onBack?: () => void;
    onTopicClick?: (topic: string, subject: string) => void;
    externalActiveSubject?: string;
    onSubjectChange?: (subject: string) => void;
    editable?: boolean;
    onPerformanceUpdated?: () => Promise<void> | void;
}

export default function StudentDashboardView({
    studentName,
    showBackToTeacher,
    onBack,
    onTopicClick,
    externalActiveSubject,
    onSubjectChange,
    editable = false,
    onPerformanceUpdated
}: StudentDashboardViewProps) {
    const [data, setData] = useState<StudentPerformanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<string[]>([]);
    const [activeSubject, setActiveSubject] = useState<string>('');

    const fetchStudentData = useCallback(async () => {
        if (!studentName) return;
        setLoading(true);
        try {
            const response = await fetch(`/api/data?type=performance&student=${encodeURIComponent(studentName)}`);
            if (!response.ok) throw new Error('Failed to fetch data');

            const jsonData = await response.json();
            const safeData: StudentPerformanceRecord[] = Array.isArray(jsonData) ? jsonData : [];
            setData(safeData);

            const dataSubjects = Array.from(new Set(safeData.map((item) => item.subject))) as string[];
            const requiredSubjects = ['Maths', 'Physics', 'Chemistry', 'Total'];
            const allSubjects = Array.from(new Set([...dataSubjects, ...requiredSubjects]));

            const sortOrder = ['Maths', 'Physics', 'Chemistry', 'Total'];
            const uniqueSubjects = allSubjects.sort((a, b) => {
                const idxA = sortOrder.indexOf(a);
                const idxB = sortOrder.indexOf(b);
                if (idxA === -1 && idxB === -1) return a.localeCompare(b);
                if (idxA === -1) return 1;
                if (idxB === -1) return -1;
                return idxA - idxB;
            });

            setSubjects(uniqueSubjects);

            if (externalActiveSubject && uniqueSubjects.includes(externalActiveSubject)) {
                setActiveSubject(externalActiveSubject);
            } else if (uniqueSubjects.length > 0) {
                setActiveSubject((current) => (current && uniqueSubjects.includes(current) ? current : uniqueSubjects[0]));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [externalActiveSubject, studentName]);

    useEffect(() => {
        fetchStudentData();
    }, [fetchStudentData]);

    useEffect(() => {
        if (externalActiveSubject && subjects.includes(externalActiveSubject)) {
            setActiveSubject(externalActiveSubject);
        }
    }, [externalActiveSubject, subjects]);

    if (loading) return <div className="flex justify-center items-center p-12 text-muted">Loading student data...</div>;

    const handleSubjectClick = (sub: string) => {
        setActiveSubject(sub);
        if (onSubjectChange) onSubjectChange(sub);
    };

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
                            onClick={() => handleSubjectClick(sub)}
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
                        <PerformanceTable
                            data={subjectData}
                            onTopicClick={onTopicClick ? (topic) => onTopicClick(topic, activeSubject) : undefined}
                            editable={editable}
                            studentName={studentName}
                            onRefreshRequested={async () => {
                                await fetchStudentData();
                                await onPerformanceUpdated?.();
                            }}
                        />
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
