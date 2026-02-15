'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import PerformanceTable from '@/components/PerformanceTable';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';

const SUBJECT_COLORS: Record<string, string> = {
    'Maths': '#1a365d',
    'Physics': '#7c3aed',
    'Chemistry': '#10b981',
    'Total': '#f59e0b',
    'default': '#64748b'
};

export default function TeacherDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [classes, setClasses] = useState<string[]>([]);
    const [subjects, setSubjects] = useState<string[]>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [batchData, setBatchData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
    const [topicDetails, setTopicDetails] = useState<any>(null);
    const [students, setStudents] = useState<string[]>([]);
    const [selectedStudent, setSelectedStudent] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    useEffect(() => {
        fetch('/api/data?type=classes')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setClasses(data);
                    if (data.length > 0) {
                        const defaultClass = data.find(c => c === 'Class_XII') || data[0];
                        setSelectedClass(defaultClass);
                    }
                }
            });
    }, []);

    useEffect(() => {
        if (!selectedClass) return;
        fetch(`/api/data?type=subjects&class=${selectedClass}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const requiredSubjects = ['Maths', 'Physics', 'Chemistry', 'Total'];
                    const merged = Array.from(new Set([...data, ...requiredSubjects]));
                    setSubjects(merged);
                    if (merged.length > 0) setSelectedSubject(merged[0]);
                }
            });
    }, [selectedClass]);

    useEffect(() => {
        if (!selectedClass || !selectedSubject) return;
        setLoading(true);
        fetch(`/api/data?type=batch&class=${selectedClass}&subject=${selectedSubject}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    const subject = data[0];
                    const topics = subject.topics || [];
                    setBatchData(topics);
                    // Extract unique student names from all topics
                    const allStudents = new Set<string>();
                    topics.forEach((t: any) => {
                        t.students?.forEach((s: any) => {
                            if (s.name) allStudents.add(s.name);
                        });
                    });
                    setStudents(Array.from(allStudents).sort());
                } else {
                    setBatchData([]);
                    setStudents([]);
                }
                setSelectedTopic(null);
                setSelectedStudent('');
            })
            .finally(() => setLoading(false));
    }, [selectedClass, selectedSubject]);

    useEffect(() => {
        if (selectedTopic && batchData.length > 0) {
            setTopicDetails(batchData.find(t => t.topicName === selectedTopic) || null);
        } else {
            setTopicDetails(null);
        }
    }, [selectedTopic, batchData]);

    if (status === 'loading') return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: '#64748b' }}>Loading...</div>;
    if (!session) return null;

    const chartData = batchData.map(topic => ({
        topic: topic.topicName,
        'Class Average': topic.classAveragePercentage ?? 0,
        'Topper': topic.topperPercentage ?? 0
    }));

    const tableData = topicDetails ? topicDetails.students.map((s: any) => ({
        date: topicDetails.date,
        topic: topicDetails.topicName,
        subject: selectedSubject,
        totalMarks: topicDetails.totalMarks,
        classAverage: topicDetails.classAverage,
        topperMarks: topicDetails.topperMarks,
        ...s
    })) : [];

    const overallAvg = batchData.length > 0
        ? Math.round(batchData.reduce((a: number, c: any) => a + (c.classAveragePercentage || 0), 0) / batchData.length)
        : 0;

    const subjectColor = SUBJECT_COLORS[selectedSubject] || SUBJECT_COLORS['default'];

    return (
        <>
            <Header />
            <main className="container" style={{ paddingBottom: '3rem', paddingTop: '1rem' }}>

                {/* Page Title */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: 0, fontFamily: 'Outfit, sans-serif' }}>
                        Teacher Dashboard
                    </h2>
                </div>

                {/* Controls */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start' }}>

                        {/* Class Select */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Class</label>
                            <select
                                value={selectedClass}
                                onChange={e => setSelectedClass(e.target.value)}
                                style={{
                                    width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem',
                                    fontSize: '0.9rem', backgroundColor: '#f8fafc', cursor: 'pointer', outline: 'none'
                                }}
                            >
                                {classes.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                            </select>
                        </div>

                        {/* Subject Buttons */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Subject</label>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {subjects.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setSelectedSubject(s)}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            borderRadius: '0.5rem',
                                            fontSize: '0.85rem',
                                            fontWeight: 600,
                                            border: selectedSubject === s ? 'none' : '1px solid #e2e8f0',
                                            backgroundColor: selectedSubject === s ? (SUBJECT_COLORS[s] || '#64748b') : '#fff',
                                            color: selectedSubject === s ? '#fff' : '#475569',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <p style={{ color: '#94a3b8' }}>Loading data...</p>
                    </div>
                ) : batchData.length === 0 ? (
                    /* Empty State */
                    <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>No Data Available</h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                            No performance data found for <strong>{selectedSubject}</strong> in <strong>{selectedClass.replace('_', ' ')}</strong>.
                        </p>
                        <p style={{ color: '#cbd5e1', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                            Add an Excel file at Data/{selectedClass}/{selectedSubject}.xlsx
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Stats Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div className="card" style={{ padding: '1.25rem' }}>
                                <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, marginBottom: '0.25rem' }}>Total Topics</p>
                                <p style={{ fontSize: '2rem', fontWeight: 700, color: '#1e293b' }}>{batchData.length}</p>
                            </div>
                            <div className="card" style={{ padding: '1.25rem' }}>
                                <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, marginBottom: '0.25rem' }}>Overall Class Avg</p>
                                <p style={{ fontSize: '2rem', fontWeight: 700, color: '#7c3aed' }}>{overallAvg}%</p>
                            </div>
                            <div className="card" style={{ padding: '1.25rem' }}>
                                <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, marginBottom: '0.25rem' }}>Students</p>
                                <p style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>{students.length}</p>
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="card" style={{ marginBottom: '1.5rem' }}>
                            <h3 className="card-title">Batch Performance Trend</h3>
                            <div style={{ width: '100%', height: 320 }}>
                                <ResponsiveContainer>
                                    <BarChart data={chartData} onClick={(e) => {
                                        if (e && e.activeLabel) setSelectedTopic(String(e.activeLabel));
                                    }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="topic" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} unit="%" />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '0.85rem' }}
                                            formatter={(value: any, name: any) => [`${value}%`, name]}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '0.85rem' }} />
                                        <Bar dataKey="Class Average" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="Topper" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.75rem', fontStyle: 'italic' }}>
                                Click any bar to view the student breakdown for that topic
                            </p>
                        </div>

                        {/* Student Selector */}
                        <div className="card" style={{ marginBottom: '1.5rem' }}>
                            <h3 className="card-title">View Student Dashboard</h3>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <select
                                    value={selectedStudent}
                                    onChange={e => setSelectedStudent(e.target.value)}
                                    style={{
                                        padding: '0.6rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem',
                                        fontSize: '0.9rem', backgroundColor: '#f8fafc', cursor: 'pointer', outline: 'none', minWidth: '220px'
                                    }}
                                >
                                    <option value="">Select a student...</option>
                                    {students.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <button
                                    className="btn"
                                    disabled={!selectedStudent}
                                    onClick={() => {
                                        if (selectedStudent) {
                                            router.push(`/dashboard?student=${encodeURIComponent(selectedStudent)}`);
                                        }
                                    }}
                                    style={{
                                        opacity: selectedStudent ? 1 : 0.5,
                                        cursor: selectedStudent ? 'pointer' : 'not-allowed',
                                        padding: '0.6rem 1.5rem',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    View Dashboard →
                                </button>
                            </div>
                        </div>

                        {/* Topic Drill-Down */}
                        {topicDetails ? (
                            <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
                                <div style={{ padding: '1.25rem 1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: 0, fontFamily: 'Outfit, sans-serif' }}>
                                            {selectedTopic}
                                        </h3>
                                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                            {new Date(topicDetails.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Total Marks</span>
                                        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{topicDetails.totalMarks}</span>
                                    </div>
                                </div>
                                <div>
                                    <PerformanceTable data={tableData} />
                                </div>
                            </div>
                        ) : (
                            <div className="card" style={{ textAlign: 'center', padding: '2.5rem', borderStyle: 'dashed' }}>
                                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                                    Click a bar in the chart above to see the student leaderboard for that topic.
                                </p>
                            </div>
                        )}
                    </>
                )}
            </main>
        </>
    );
}
