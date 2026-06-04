'use client';

import { useCallback, useEffect, useState } from 'react';
import PerformanceChart from '@/components/PerformanceChart';
import RankTrendChart from '@/components/RankTrendChart';
import PerformanceTable from '@/components/PerformanceTable';
import type { StudentPerformanceRecord } from '@/lib/types';
import { COLORS } from '@/lib/designTokens';
import { sortSubjects } from '@/lib/subjectUtils';

const SUBJECT_COLORS = COLORS.subjects;

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

    const subjectColor = SUBJECT_COLORS[activeSubject as keyof typeof SUBJECT_COLORS] || SUBJECT_COLORS['default'];

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
            const className = (safeData.length > 0 && safeData[0].className) ? safeData[0].className : 'Class_12+';
            const uniqueSubjects = sortSubjects(dataSubjects, className);

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

    if (loading) return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <div>
                    <div className="skeleton" style={{ width: '200px', height: '24px', marginBottom: '0.5rem' }} />
                    <div className="skeleton" style={{ width: '150px', height: '16px' }} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ width: '80px', height: '34px', borderRadius: '0.5rem' }} />)}
                </div>
            </div>
            <div className="dashboard-grid">
                <div className="card"><div className="skeleton" style={{ height: '240px', borderRadius: '0.5rem' }} /></div>
                <div className="card"><div className="skeleton" style={{ height: '240px', borderRadius: '0.5rem' }} /></div>
            </div>
        </div>
    );

    const handleSubjectClick = (sub: string) => {
        setActiveSubject(sub);
        if (onSubjectChange) onSubjectChange(sub);
    };

    const subjectData = data.filter(d => d.subject === activeSubject);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <div>
                    <h2 className="text-xl font-bold" style={{ color: subjectColor }}>Student Performance</h2>
                    <p className="text-sm text-muted">Viewing data for: {studentName}</p>
                </div>

                {/* Subject Tabs */}
                <div className="tabs" style={{ marginBottom: 0 }}>
                    {subjects.map(sub => {
                        const color = SUBJECT_COLORS[sub as keyof typeof SUBJECT_COLORS] || SUBJECT_COLORS['default'];
                        const isActive = activeSubject === sub;
                        return (
                            <button
                                key={sub}
                                className={`tab-btn ${isActive ? 'active' : ''}`}
                                onClick={() => handleSubjectClick(sub)}
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
                    <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Results will appear here once marks are uploaded for this subject.</p>
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
            </div>

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
