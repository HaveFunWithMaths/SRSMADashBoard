'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import StudentDashboardView from '@/components/StudentDashboardView';
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
    const [students, setStudents] = useState<any[]>([]);
    const [selectedStudent, setSelectedStudent] = useState('');
    const [activeTab, setActiveTab] = useState<'analysis' | 'students' | 'manage' | 'upload'>('analysis');
    const [viewMode, setViewMode] = useState<'table' | 'graph'>('graph');

    const [newStudentName, setNewStudentName] = useState('');
    const [isAddingStudent, setIsAddingStudent] = useState(false);

    // Upload Tab State
    const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);
    const [uploadTopicName, setUploadTopicName] = useState('');
    const [uploadTotalMarks, setUploadTotalMarks] = useState('');
    const [uploadStudents, setUploadStudents] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    // Cutoff State
    const [showCutoffModal, setShowCutoffModal] = useState(false);
    const [customHighCutoff, setCustomHighCutoff] = useState<number | null>(null);
    const [customLowCutoff, setCustomLowCutoff] = useState<number | null>(null);

    const refreshBatchData = async () => {
        if (!selectedClass || !selectedSubject) return;

        setLoading(true);
        try {
            const response = await fetch(`/api/data?type=batch&class=${encodeURIComponent(selectedClass)}&subject=${encodeURIComponent(selectedSubject)}`);
            const data = await response.json();

            let currentTopics: any[] = [];
            const currentAllStudents = new Set<string>();

            if (Array.isArray(data) && data.length > 0) {
                const subject = data[0];
                currentTopics = subject.topics || [];
                setBatchData(currentTopics);

                currentTopics.forEach((topic: any) => {
                    topic.students?.forEach((student: any) => {
                        if (student.name) currentAllStudents.add(student.name);
                    });
                });
            } else {
                setBatchData([]);
            }

            setSelectedTopic((prev) => {
                if (prev && currentTopics.some((topic: any) => topic.topicName === prev)) return prev;
                return null;
            });

            setSelectedStudent((prev) => {
                if (prev && currentAllStudents.has(prev)) return prev;
                return '';
            });
        } catch (error) {
            console.error(error);
            setBatchData([]);
        } finally {
            setLoading(false);
        }
    };

    const refreshStudents = async () => {
        if (!selectedClass) return;

        try {
            const response = await fetch(`/api/admin/students?class=${encodeURIComponent(selectedClass)}`);
            const data = await response.json();

            if (Array.isArray(data)) {
                const sortedStudents = data.sort((a, b) => String(a.rollNo || a.username).localeCompare(String(b.rollNo || b.username)));
                setStudents(sortedStudents);

                const newUploadStudents = sortedStudents
                    .filter((student) => student.status !== 'Deleted')
                    .map((student) => ({ name: student.username, marks: '', comments: '' }));
                setUploadStudents(newUploadStudents);
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
    }, [status, router]);

    useEffect(() => {
        fetch('/api/data?type=classes')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const order = ['Class_12+', 'Class_12', 'Class_11', 'Class_10', 'Class_9', 'Class_8'];
                    const sortedClasses = data.sort((a, b) => {
                        const idxA = order.indexOf(a);
                        const idxB = order.indexOf(b);
                        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                        if (idxA !== -1) return -1;
                        if (idxB !== -1) return 1;
                        return String(b).localeCompare(String(a));
                    });
                    setClasses(sortedClasses);
                    if (sortedClasses.length > 0) {
                        const defaultClass = sortedClasses.find((c: string) => c === 'Class_12+') || sortedClasses[0];
                        setSelectedClass(defaultClass);
                    }
                }
            });
    }, []);

    useEffect(() => {
        if (!selectedClass) return;
        fetch(`/api/data?type=subjects&class=${encodeURIComponent(selectedClass)}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const requiredSubjects = ['Maths', 'Physics', 'Chemistry', 'Total'];
                    const merged = Array.from(new Set([...data, ...requiredSubjects]));
                    
                    const sortOrder = ['Maths', 'Physics', 'Chemistry', 'Total'];
                    const sortedSubjects = merged.sort((a, b) => {
                        const idxA = sortOrder.indexOf(a);
                        const idxB = sortOrder.indexOf(b);
                        if (idxA === -1 && idxB === -1) return a.localeCompare(b);
                        if (idxA === -1) return 1;
                        if (idxB === -1) return -1;
                        return idxA - idxB;
                    });
                    
                    setSubjects(sortedSubjects);
                    if (sortedSubjects.length > 0) setSelectedSubject(sortedSubjects[0]);
                }
            });
    }, [selectedClass]);

    useEffect(() => {
        if (!selectedClass || !selectedSubject) return;
        refreshBatchData();
    }, [selectedClass, selectedSubject]);

    useEffect(() => {
        if (selectedTopic && batchData.length > 0) {
            setTopicDetails(batchData.find(t => t.topicName === selectedTopic) || null);
        } else {
            setTopicDetails(null);
        }
        // Reset custom cutoffs when topic changes
        setCustomHighCutoff(null);
        setCustomLowCutoff(null);
    }, [selectedTopic, batchData]);

    useEffect(() => {
        setCustomHighCutoff(null);
        setCustomLowCutoff(null);
    }, [activeTab]);

    useEffect(() => {
        if (selectedClass) {
            refreshStudents();
        }
    }, [selectedClass]);

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStudentName.trim() || !selectedClass) return;
        
        setIsAddingStudent(true);
        try {
            const res = await fetch('/api/admin/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentName: newStudentName.trim(), className: selectedClass })
            });
            const result = await res.json();
            if (result.success) {
                await refreshStudents();
                setNewStudentName('');
                alert(result.message || 'Student added successfully!');
            } else {
                alert(result.error || 'Failed to add student');
            }
        } catch (error) {
            console.error(error);
            alert('Error adding student');
        } finally {
            setIsAddingStudent(false);
        }
    };

    const handleDeleteStudent = async (studentName: string) => {
        if (!window.confirm(`Are you sure you want to remove ${studentName} from ${selectedClass.replace('_', ' ')}?`)) return;
        try {
            const res = await fetch('/api/admin/students', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentName, className: selectedClass })
            });
            const result = await res.json();
            if (result.success) {
                await refreshStudents();
            } else {
                alert(result.error || 'Failed to delete student');
            }
        } catch (error) {
            console.error(error);
            alert('Error deleting student');
        }
    };

    const handleRestoreStudent = async (studentName: string) => {
        try {
            const res = await fetch('/api/admin/students', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentName, className: selectedClass, action: 'restore' })
            });
            const result = await res.json();
            if (result.success) {
                await refreshStudents();
            } else {
                alert(result.error || 'Failed to restore student');
            }
        } catch (error) {
            console.error(error);
            alert('Error restoring student');
        }
    };

    const handleUploadMarks = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClass || !selectedSubject || !uploadTopicName || !uploadTotalMarks) return;
        
        setIsUploading(true);
        try {
            const payload = {
                className: selectedClass,
                subject: selectedSubject,
                topicName: uploadTopicName,
                date: uploadDate,
                totalMarks: Number(uploadTotalMarks),
                students: uploadStudents
            };

            const res = await fetch('/api/data/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (result.success) {
                alert('Marks uploaded successfully!');
                setUploadTopicName('');
                setUploadTotalMarks('');
                setUploadStudents(prev => prev.map(s => ({ ...s, marks: '', comments: '' })));
                await refreshBatchData();
            } else {
                alert(result.error || 'Failed to upload marks');
            }
        } catch (error) {
            console.error(error);
            alert('Error uploading marks');
        } finally {
            setIsUploading(false);
        }
    };

    // Calculate dynamic cutoffs based on marks array
    const calculateCutoffs = (marksArray: (number | null)[]) => {
        const validMarks = marksArray.filter((m): m is number => m !== null && typeof m === 'number');
        if (validMarks.length === 0) return { mean: 0, sd: 0, high: 0, low: 0 };
        const mean = validMarks.reduce((a, b) => a + b, 0) / validMarks.length;
        const variance = validMarks.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / validMarks.length;
        const sd = Math.sqrt(variance);
        return { 
            mean, 
            sd, 
            high: customHighCutoff !== null ? customHighCutoff : mean + sd, 
            low: customLowCutoff !== null ? customLowCutoff : mean - sd 
        };
    };

    const getColorForMark = (mark: number | null, highCutoff: number, lowCutoff: number) => {
        if (mark === null) return { bg: '#fee2e2', text: '#991b1b' }; // Default for absent? Actually absent is '-'
        if (mark > highCutoff) return { bg: '#dcfce7', text: '#166534' }; // Green
        if (mark < lowCutoff) return { bg: '#fee2e2', text: '#991b1b' }; // Red
        return { bg: '#fef9c3', text: '#854d0e' }; // Yellow
    };

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

    const tableMarksArray = tableData.map((s: any) => s.marks);
    const { high: highCutoff, low: lowCutoff } = calculateCutoffs(tableMarksArray);

    const uploadMarksArray = uploadStudents.filter(s => s.marks !== '').map(s => Number(s.marks)).filter(m => !isNaN(m));
    const { high: uploadHighCutoff, low: uploadLowCutoff } = calculateCutoffs(uploadMarksArray);

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

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                    <button
                        onClick={() => setActiveTab('analysis')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderTop: 'none',
                            borderLeft: 'none',
                            borderRight: 'none',
                            borderBottom: activeTab === 'analysis' ? '2px solid #7c3aed' : '2px solid transparent',
                            color: activeTab === 'analysis' ? '#7c3aed' : '#64748b',
                            fontWeight: activeTab === 'analysis' ? 600 : 500,
                            fontSize: '0.95rem',
                            background: 'transparent',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            outline: 'none'
                        }}
                    >
                        Subject Analysis
                    </button>
                    <button
                        onClick={() => setActiveTab('students')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderTop: 'none',
                            borderLeft: 'none',
                            borderRight: 'none',
                            borderBottom: activeTab === 'students' ? '2px solid #7c3aed' : '2px solid transparent',
                            color: activeTab === 'students' ? '#7c3aed' : '#64748b',
                            fontWeight: activeTab === 'students' ? 600 : 500,
                            fontSize: '0.95rem',
                            background: 'transparent',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            marginLeft: '1rem',
                            outline: 'none'
                        }}
                    >
                        Student Dashboard
                    </button>
                        <button
                        onClick={() => setActiveTab('manage')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderTop: 'none',
                            borderLeft: 'none',
                            borderRight: 'none',
                            borderBottom: activeTab === 'manage' ? '2px solid #7c3aed' : '2px solid transparent',
                            color: activeTab === 'manage' ? '#7c3aed' : '#64748b',
                            fontWeight: activeTab === 'manage' ? 600 : 500,
                            fontSize: '0.95rem',
                            background: 'transparent',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            marginLeft: '1rem',
                            outline: 'none'
                        }}
                    >
                        Class Manager
                    </button>
                    <button
                        onClick={() => setActiveTab('upload')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderTop: 'none',
                            borderLeft: 'none',
                            borderRight: 'none',
                            borderBottom: activeTab === 'upload' ? '2px solid #7c3aed' : '2px solid transparent',
                            color: activeTab === 'upload' ? '#7c3aed' : '#64748b',
                            fontWeight: activeTab === 'upload' ? 600 : 500,
                            fontSize: '0.95rem',
                            background: 'transparent',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            marginLeft: '1rem',
                            outline: 'none'
                        }}
                    >
                        Upload Marks
                    </button>
                </div>

                {/* Controls - Common to both or just Analysis? Keeping common for now as student list depends on it currently */}
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
                        {activeTab !== 'manage' && (
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
                        )}
                    </div>
                </div>

                {activeTab === 'analysis' && (
                    loading ? (
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
                                    <p style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>{students.filter(s => s.status !== 'Deleted').length}</p>
                                </div>
                            </div>

                            {/* Batch Performance Trend - Table or Graph */}
                            <div className="card" style={{ marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 className="card-title" style={{ margin: 0 }}>Batch Performance Trend</h3>
                                    <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '0.5rem' }}>
                                        <button
                                            onClick={() => setViewMode('table')}
                                            style={{
                                                padding: '0.35rem 0.75rem',
                                                borderRadius: '0.35rem',
                                                border: 'none',
                                                backgroundColor: viewMode === 'table' ? '#fff' : 'transparent',
                                                color: viewMode === 'table' ? '#0f172a' : '#64748b',
                                                fontWeight: viewMode === 'table' ? 600 : 500,
                                                fontSize: '0.8rem',
                                                boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Table
                                        </button>
                                        <button
                                            onClick={() => setViewMode('graph')}
                                            style={{
                                                padding: '0.35rem 0.75rem',
                                                borderRadius: '0.35rem',
                                                border: 'none',
                                                backgroundColor: viewMode === 'graph' ? '#fff' : 'transparent',
                                                color: viewMode === 'graph' ? '#0f172a' : '#64748b',
                                                fontWeight: viewMode === 'graph' ? 600 : 500,
                                                fontSize: '0.8rem',
                                                boxShadow: viewMode === 'graph' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Graph
                                        </button>
                                    </div>
                                </div>

                                {viewMode === 'table' ? (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table className="data-table" style={{ width: '100%' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#64748b', fontWeight: 600 }}>Topic</th>
                                                    <th style={{ textAlign: 'center', padding: '0.75rem 1rem', color: '#64748b', fontWeight: 600 }}>Class Average</th>
                                                    <th style={{ textAlign: 'center', padding: '0.75rem 1rem', color: '#64748b', fontWeight: 600 }}>Topper</th>
                                                    <th style={{ textAlign: 'right', padding: '0.75rem 1rem', color: '#64748b', fontWeight: 600 }}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {batchData.map((topic, index) => (
                                                    <tr
                                                        key={index}
                                                        style={{
                                                            backgroundColor: index % 2 === 0 ? '#fff' : '#f8fafc',
                                                            borderBottom: '1px solid #f1f5f9'
                                                        }}
                                                    >
                                                        <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#334155' }}>{topic.topicName}</td>
                                                        <td style={{ textAlign: 'center', padding: '0.75rem 1rem' }}>
                                                            <span style={{
                                                                display: 'inline-block',
                                                                padding: '0.2rem 0.5rem',
                                                                borderRadius: '0.25rem',
                                                                backgroundColor: '#ede9fe',
                                                                color: '#7c3aed',
                                                                fontWeight: 600
                                                            }}>
                                                                {topic.classAveragePercentage}%
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'center', padding: '0.75rem 1rem', color: '#10b981', fontWeight: 600 }}>{topic.topperPercentage}%</td>
                                                        <td style={{ textAlign: 'right', padding: '0.75rem 1rem' }}>
                                                            <button
                                                                onClick={() => setSelectedTopic(topic.topicName)}
                                                                style={{
                                                                    border: '1px solid #e2e8f0',
                                                                    background: '#fff',
                                                                    cursor: 'pointer',
                                                                    padding: '0.25rem 0.5rem',
                                                                    borderRadius: '0.25rem',
                                                                    color: '#64748b',
                                                                    fontSize: '0.8rem'
                                                                }}
                                                            >
                                                                View Details
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ width: '100%', height: 320 }} key={viewMode}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }} onClick={(e) => {
                                                    if (e && e.activeLabel) setSelectedTopic(String(e.activeLabel));
                                                }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                    <XAxis dataKey="topic" tick={{ fontSize: 11, fill: '#64748b', dy: 10, dx: -5 }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} angle={-45} textAnchor="end" height={80} />
                                                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} unit="%" />
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '0.85rem' }}
                                                        formatter={(value: any, name: any) => [`${value}%`, name]}
                                                    />
                                                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '0.85rem' }} />
                                                    <Line type="monotone" dataKey="Class Average" stroke="#7c3aed" strokeWidth={3} dot={{ r: 4, fill: '#7c3aed' }} activeDot={{ r: 6 }} />
                                                    <Line type="monotone" dataKey="Topper" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.75rem', fontStyle: 'italic' }}>
                                            Click any point to view the student breakdown for that topic
                                        </p>
                                    </>
                                )}
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
                                                {(() => {
                                                    const d = new Date(topicDetails.date);
                                                    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getFullYear()).slice(-2)}`;
                                                })()}
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '2rem' }}>
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Class Avg</span>
                                                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#7c3aed' }}>{topicDetails.classAveragePercentage ?? topicDetails.classAverage}%</span>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Total Marks</span>
                                                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>{topicDetails.totalMarks}</span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setCustomHighCutoff(highCutoff !== null ? Number(highCutoff.toFixed(2)) : null);
                                                    setCustomLowCutoff(lowCutoff !== null ? Number(lowCutoff.toFixed(2)) : null);
                                                    setShowCutoffModal(!showCutoffModal);
                                                }}
                                                style={{
                                                    backgroundColor: showCutoffModal ? '#7c3aed' : '#f1f5f9', 
                                                    border: '1px solid #cbd5e1', padding: '0.5rem 1rem',
                                                    borderRadius: '0.5rem', cursor: 'pointer', 
                                                    color: showCutoffModal ? '#fff' : '#475569', 
                                                    fontSize: '0.85rem', fontWeight: 600,
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {showCutoffModal ? 'Hide Cutoffs' : 'Set Cutoffs'}
                                            </button>
                                        </div>
                                    </div>

                                    {showCutoffModal && (
                                        <div style={{ padding: '1.25rem 1.5rem', backgroundColor: '#fcfcfc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '2rem', alignItems: 'center' }}>
                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', fontWeight: 600, color: '#166534' }}>Green (Greater than)</label>
                                                    <input 
                                                        type="number" step="0.01" value={customHighCutoff ?? Number(highCutoff.toFixed(2))}
                                                        onChange={e => setCustomHighCutoff(e.target.value ? Number(e.target.value) : null)}
                                                        style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem', fontSize: '0.9rem' }}
                                                    />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', fontWeight: 600, color: '#991b1b' }}>Red (Less than)</label>
                                                    <input 
                                                        type="number" step="0.01" value={customLowCutoff ?? Number(lowCutoff.toFixed(2))}
                                                        onChange={e => setCustomLowCutoff(e.target.value ? Number(e.target.value) : null)}
                                                        style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem', fontSize: '0.9rem' }}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <button 
                                                    onClick={() => { setCustomHighCutoff(null); setCustomLowCutoff(null); }}
                                                    style={{ padding: '0.4rem 1rem', border: '1px solid #e2e8f0', borderRadius: '0.25rem', backgroundColor: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
                                                >
                                                    Reset
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <table className="data-table" style={{ width: '100%' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', backgroundColor: '#fff' }}>
                                                    <th style={{ padding: '0.75rem', textAlign: 'center', width: '60px' }}>Rank</th>
                                                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Name</th>
                                                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>Marks</th>
                                                    <th style={{ padding: '0.75rem', textAlign: 'center' }}>%</th>
                                                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Remarks</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {tableData.sort((a: any, b: any) => (a.rank || 999) - (b.rank || 999)).map((student: any, idx: number) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                                        <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', color: '#7c3aed' }}>#{student.rank}</td>
                                                        <td 
                                                            style={{ padding: '0.75rem', fontWeight: 500, color: '#7c3aed', cursor: 'pointer', textDecoration: 'underline' }}
                                                            onClick={() => {
                                                                setSelectedStudent(student.name);
                                                                setActiveTab('students');
                                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                                            }}
                                                            title="View Student Dashboard"
                                                        >
                                                            {student.name}
                                                        </td>
                                                        <td style={{ padding: '0.75rem', textAlign: 'center', color: '#64748b' }}>
                                                            {student.marks ?? '-'} <span style={{ fontSize: '0.8em', opacity: 0.7 }}>/ {student.totalMarks}</span>
                                                        </td>
                                                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                            {student.marks !== null ? (
                                                                <span style={{
                                                                    display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '1rem',
                                                                    backgroundColor: getColorForMark(student.marks, highCutoff, lowCutoff).bg,
                                                                    color: getColorForMark(student.marks, highCutoff, lowCutoff).text,
                                                                    fontWeight: 600, fontSize: '0.8rem'
                                                                }}>
                                                                    {student.percentage ? `${student.percentage}%` : '-'}
                                                                </span>
                                                            ) : '-'}
                                                        </td>
                                                        <td style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.85rem' }}>{student.comments || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="card" style={{ textAlign: 'center', padding: '2.5rem', borderStyle: 'dashed' }}>
                                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                                        Select a topic from the table or graph above to see details.
                                    </p>
                                </div>
                            )}
                        </>
                    )
                )}

                {activeTab === 'students' && (
                    <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                        <h3 className="card-title" style={{ marginBottom: '1rem' }}>Student Dashboard</h3>

                        {/* Student Selector */}
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: selectedStudent ? '1.5rem' : 0 }}>
                            <select
                                value={selectedStudent}
                                onChange={e => setSelectedStudent(e.target.value)}
                                style={{
                                    padding: '0.6rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem',
                                    fontSize: '0.9rem', backgroundColor: '#f8fafc', cursor: 'pointer', outline: 'none', minWidth: '220px'
                                }}
                            >
                                <option value="">Select a student...</option>
                                {students.filter(s => s.status !== 'Deleted').map(s => <option key={s.username} value={s.username}>{s.username}</option>)}
                            </select>
                        </div>

                        {selectedStudent ? (
                            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                                <StudentDashboardView 
                                    studentName={selectedStudent} 
                                    externalActiveSubject={selectedSubject}
                                    onSubjectChange={setSelectedSubject}
                                    editable
                                    onPerformanceUpdated={refreshBatchData}
                                    onTopicClick={(topic, subject) => {
                                        if (subject && subjects.includes(subject)) {
                                            setSelectedSubject(subject);
                                        }
                                        setSelectedTopic(topic);
                                        setActiveTab('analysis');
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                />
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', border: '2px dashed #f1f5f9', borderRadius: '0.5rem', marginTop: '1rem' }}>
                                <p>Select a student to view their detailed performance report.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'manage' && (
                    <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                        <h3 className="card-title" style={{ marginBottom: '1rem' }}>Manage Class: {selectedClass.replace('_', ' ')}</h3>
                        
                        <form onSubmit={handleAddStudent} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Add New Student Name</label>
                                <input
                                    type="text"
                                    value={newStudentName}
                                    onChange={e => setNewStudentName(e.target.value)}
                                    placeholder="Enter student name..."
                                    style={{
                                        width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem',
                                        fontSize: '0.9rem', outline: 'none'
                                    }}
                                    required
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={isAddingStudent || !newStudentName.trim()}
                                style={{
                                    padding: '0.6rem 1.5rem', backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: '0.5rem',
                                    fontWeight: 600, cursor: isAddingStudent || !newStudentName.trim() ? 'not-allowed' : 'pointer', opacity: isAddingStudent || !newStudentName.trim() ? 0.7 : 1,
                                    height: '42px'
                                }}
                            >
                                {isAddingStudent ? 'Adding...' : 'Add Student'}
                            </button>
                        </form>

                        <div>
                            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#334155', marginBottom: '1rem' }}>Enrolled Students</h4>
                            {students.filter(s => s.status !== 'Deleted').length > 0 ? (
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="data-table" style={{ width: '100%', backgroundColor: '#fff' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b' }}>
                                                <th style={{ padding: '0.75rem 1rem' }}>Roll Number</th>
                                                <th style={{ padding: '0.75rem 1rem' }}>Name</th>
                                                <th style={{ padding: '0.75rem 1rem', width: '80px', textAlign: 'center' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {students.filter(s => s.status !== 'Deleted').map((student, idx) => (
                                                <tr key={student.username} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 !== 0 ? '#f8fafc' : '#ffffff' }}>
                                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{student.rollNo || '-'}</td>
                                                    <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>{student.username}</td>
                                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                                        <button 
                                                            onClick={() => handleDeleteStudent(student.username)}
                                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', outline: 'none' }}
                                                            title="Delete Student"
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p style={{ color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>No students enrolled in this class yet.</p>
                            )}
                        </div>

                        {students.some(s => s.status === 'Deleted') && (
                            <div style={{ marginTop: '2rem' }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#ef4444', marginBottom: '1rem' }}>Deleted Students</h4>
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="data-table" style={{ width: '100%', backgroundColor: '#fef2f2' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid #fca5a5', color: '#b91c1c' }}>
                                                <th style={{ padding: '0.75rem 1rem' }}>Roll Number</th>
                                                <th style={{ padding: '0.75rem 1rem' }}>Name</th>
                                                <th style={{ padding: '0.75rem 1rem', width: '80px', textAlign: 'center' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {students.filter(s => s.status === 'Deleted').map((student, idx) => (
                                                <tr key={student.username} style={{ borderBottom: '1px solid #fecaca' }}>
                                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#991b1b', textDecoration: 'line-through' }}>{student.rollNo || '-'}</td>
                                                    <td style={{ padding: '0.75rem 1rem', color: '#991b1b', textDecoration: 'line-through' }}>{student.username}</td>
                                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                                        <button 
                                                            onClick={() => handleRestoreStudent(student.username)}
                                                            style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', outline: 'none' }}
                                                            title="Restore Student"
                                                        >
                                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h10a5 5 0 015 5v2M3 10l6 6m-6-6l6-6"/></svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'upload' && (
                    <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 className="card-title" style={{ margin: 0 }}>Upload Marks: {selectedClass.replace('_', ' ')} - {selectedSubject}</h3>
                            <button
                                onClick={() => {
                                    setCustomHighCutoff(uploadHighCutoff !== null ? Number(uploadHighCutoff.toFixed(2)) : null);
                                    setCustomLowCutoff(uploadLowCutoff !== null ? Number(uploadLowCutoff.toFixed(2)) : null);
                                    setShowCutoffModal(!showCutoffModal);
                                    
                                    // Sort Table by Marks descending
                                    if (!showCutoffModal) {
                                        setUploadStudents(prev => [...prev].sort((a,b) => {
                                            const m1 = Number(a.marks);
                                            const m2 = Number(b.marks);
                                            if ((isNaN(m1) || a.marks === '') && (isNaN(m2) || b.marks === '')) return 0;
                                            if (isNaN(m1) || a.marks === '') return 1;
                                            if (isNaN(m2) || b.marks === '') return -1;
                                            return m2 - m1;
                                        }));
                                    }
                                }}
                                style={{
                                    backgroundColor: showCutoffModal ? '#7c3aed' : '#f1f5f9', 
                                    border: '1px solid #cbd5e1', padding: '0.5rem 1rem',
                                    borderRadius: '0.5rem', cursor: 'pointer', 
                                    color: showCutoffModal ? '#fff' : '#475569', 
                                    fontSize: '0.85rem', fontWeight: 600,
                                    transition: 'all 0.2s'
                                }}
                            >
                                {showCutoffModal ? 'Hide Cutoffs' : 'Set Cutoffs'}
                            </button>
                        </div>

                        {showCutoffModal && (
                            <div style={{ padding: '1.25rem 1.5rem', backgroundColor: '#fcfcfc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', gap: '2rem', alignItems: 'center' }}>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', fontWeight: 600, color: '#166534' }}>Green (Greater than)</label>
                                        <input 
                                            type="number" step="0.01" value={customHighCutoff ?? Number(uploadHighCutoff.toFixed(2))}
                                            onChange={e => setCustomHighCutoff(e.target.value ? Number(e.target.value) : null)}
                                            style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem', fontSize: '0.9rem' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', fontWeight: 600, color: '#991b1b' }}>Red (Less than)</label>
                                        <input 
                                            type="number" step="0.01" value={customLowCutoff ?? Number(uploadLowCutoff.toFixed(2))}
                                            onChange={e => setCustomLowCutoff(e.target.value ? Number(e.target.value) : null)}
                                            style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem', fontSize: '0.9rem' }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <button 
                                        onClick={() => { setCustomHighCutoff(null); setCustomLowCutoff(null); }}
                                        style={{ padding: '0.4rem 1rem', border: '1px solid #e2e8f0', borderRadius: '0.25rem', backgroundColor: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        <form onSubmit={handleUploadMarks}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Topic Name</label>
                                    <input 
                                        type="text" 
                                        value={uploadTopicName} 
                                        onChange={e => setUploadTopicName(e.target.value)}
                                        placeholder="e.g. Chapter 1 Test"
                                        required
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', outline: 'none' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Date</label>
                                    <input 
                                        type="date" 
                                        value={uploadDate} 
                                        onChange={e => setUploadDate(e.target.value)}
                                        required
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', outline: 'none' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Marks</label>
                                    <input 
                                        type="number" 
                                        min="0.1"
                                        step="0.1"
                                        value={uploadTotalMarks} 
                                        onChange={e => setUploadTotalMarks(e.target.value)}
                                        required
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', outline: 'none' }}
                                    />
                                </div>
                            </div>

                            <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
                                <table className="data-table" style={{ width: '100%' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', backgroundColor: '#f8fafc' }}>
                                            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Student Name</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Marks (Leave blank if AB)</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Remarks (Optional)</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'center' }}>Color Preview</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {uploadStudents.map((student, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                <td style={{ padding: '0.75rem', fontWeight: 500, color: '#334155' }}>
                                                    {student.name}
                                                </td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    <input 
                                                        type="number" 
                                                        step="0.1"
                                                        value={student.marks}
                                                        onChange={e => {
                                                            const newStudents = [...uploadStudents];
                                                            newStudents[idx].marks = e.target.value;
                                                            setUploadStudents(newStudents);
                                                        }}
                                                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    <input 
                                                        type="text" 
                                                        value={student.comments}
                                                        onChange={e => {
                                                            const newStudents = [...uploadStudents];
                                                            newStudents[idx].comments = e.target.value;
                                                            setUploadStudents(newStudents);
                                                        }}
                                                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                    {student.marks !== '' && !isNaN(Number(student.marks)) ? (
                                                        <span style={{
                                                            display: 'inline-block', width: '2rem', height: '2rem', borderRadius: '50%',
                                                            backgroundColor: getColorForMark(Number(student.marks), uploadHighCutoff, uploadLowCutoff).bg,
                                                            border: `2px solid ${getColorForMark(Number(student.marks), uploadHighCutoff, uploadLowCutoff).text}`
                                                        }}></span>
                                                    ) : (
                                                        <span style={{ color: '#94a3b8' }}>AB</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                                <button
                                    type="submit"
                                    disabled={isUploading}
                                    style={{
                                        padding: '0.75rem 2rem', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '0.5rem',
                                        fontWeight: 600, cursor: isUploading ? 'not-allowed' : 'pointer', opacity: isUploading ? 0.7 : 1,
                                        fontSize: '1rem'
                                    }}
                                >
                                    {isUploading ? 'Uploading...' : 'Save Data'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </main>
        </>
    );
}
