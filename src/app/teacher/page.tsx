'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import PerformanceTable from '@/components/PerformanceTable';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

// Subject Color Map (Consistent with Chart)
const SUBJECT_COLORS: Record<string, string> = {
    'Maths': '#1a365d',      // Navy
    'Physics': '#7c3aed',    // Violet
    'Chemistry': '#10b981',  // Emerald
    'Total': '#f59e0b',      // Amber
    'default': '#64748b'     // Slate
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

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    useEffect(() => {
        fetch('/api/data?type=classes')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setClasses(data);
                    if (data.length > 0) setSelectedClass(data[0]);
                }
            });
    }, []);

    useEffect(() => {
        if (!selectedClass) return;
        fetch(`/api/data?type=subjects&class=${selectedClass}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    // Inject missing subjects if they're not there (User Request)
                    const requiredSubjects = ['Maths', 'Physics', 'Chemistry', 'Total'];
                    const mergedSubjects = Array.from(new Set([...data, ...requiredSubjects]));
                    setSubjects(mergedSubjects);

                    if (mergedSubjects.length > 0) setSelectedSubject(mergedSubjects[0]);
                }
            });
    }, [selectedClass]);

    useEffect(() => {
        if (!selectedClass || !selectedSubject) return;

        setLoading(true);
        // If Subject is "Total" or "Chemistry" and we know we might not have data for them file-structure wise yet,
        // the API might return empty. That's fine, we handle empty state.
        fetch(`/api/data?type=batch&class=${selectedClass}&subject=${selectedSubject}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    const subject = data[0];
                    setBatchData(subject.topics || []);
                } else {
                    setBatchData([]);
                }
                setSelectedTopic(null); // Reset selection
            })
            .finally(() => setLoading(false));
    }, [selectedClass, selectedSubject]);

    useEffect(() => {
        if (selectedTopic && batchData.length > 0) {
            const details = batchData.find(t => t.topicName === selectedTopic);
            setTopicDetails(details);
        } else {
            setTopicDetails(null);
        }
    }, [selectedTopic, batchData]);

    if (status === 'loading') return <div className="flex bg-slate-50 min-h-screen items-center justify-center text-slate-500">Loading...</div>;
    if (!session) return null;

    // Chart Data Preparation (Normalized to 100% scale if possible? Teacher view requested comparison.)
    // Plan: Plot Avg % vs Topper %
    const chartData = batchData.map(topic => ({
        topic: topic.topicName,
        classAveragePercentage: topic.classAveragePercentage ?? 0,
        topperPercentage: topic.topperPercentage ?? 0
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

    const subjectColor = SUBJECT_COLORS[selectedSubject || 'default'] || SUBJECT_COLORS['default'];

    return (
        <>
            <Header />
            <main className="container pb-12">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">Teacher Dashboard</h2>
                    <div className="flex gap-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">{selectedClass}</span>
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">{selectedSubject}</span>
                    </div>
                </div>

                {/* Controls Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select Class</label>
                            <div className="relative">
                                <select
                                    className="block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-slate-50 border"
                                    value={selectedClass}
                                    onChange={e => setSelectedClass(e.target.value)}
                                >
                                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select Subject</label>
                            <div className="flex flex-wrap gap-2">
                                {subjects.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setSelectedSubject(s)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${selectedSubject === s
                                                ? 'shadow-md scale-105 text-white'
                                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                            }`}
                                        style={{
                                            backgroundColor: selectedSubject === s ? (SUBJECT_COLORS[s] || SUBJECT_COLORS['default']) : undefined
                                        }}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-end justify-end">
                            <button
                                className="text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                                onClick={() => window.location.reload()}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Sync Data
                            </button>
                        </div>
                    </div>
                </div>

                {/* Empty State Handling */}
                {batchData.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                        <div className="mx-auto h-24 w-24 text-slate-200 mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">No Data Available</h3>
                        <p className="mt-1 text-slate-500">There is no performance data recorded for {selectedSubject} in {selectedClass} yet.</p>
                        <div className="mt-6">
                            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-slate-100 text-slate-800">
                                Check source files in Data Folder
                            </span>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Stats Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <p className="text-sm font-medium text-slate-500">Total Exams Evaluated</p>
                                <p className="text-3xl font-bold text-slate-800 mt-2">{batchData.length}</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <p className="text-sm font-medium text-slate-500">Class Average (Overall)</p>
                                <p className="text-3xl font-bold text-indigo-600 mt-2">
                                    {batchData.length > 0
                                        ? Math.round(batchData.reduce((acc, curr) => acc + (curr.classAveragePercentage || 0), 0) / batchData.length) + '%'
                                        : '-'}
                                </p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <p className="text-sm font-medium text-slate-500">Best Performer</p>
                                <p className="text-xl font-bold text-emerald-600 mt-2 truncate">
                                    {/* Simple check for highest score ever? or just topper of last exam? Let's show last exam topper marks */}
                                    {batchData.length > 0 ? (batchData[batchData.length - 1].topperMarks + ' / ' + batchData[batchData.length - 1].totalMarks) : '-'}
                                    <span className="text-xs text-slate-400 font-normal block">Last Exam Spec</span>
                                </p>
                            </div>
                        </div>

                        {/* Batch Analysis Chart */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                            <h3 className="text-lg font-bold text-slate-700 mb-6">Batch Performance Trend</h3>
                            <div style={{ width: '100%', height: 350 }}>
                                <ResponsiveContainer>
                                    <LineChart data={chartData} onClick={(e) => {
                                        if (e && e.activeLabel) setSelectedTopic(String(e.activeLabel));
                                    }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis
                                            dataKey="topic"
                                            tick={{ fontSize: 12, fill: '#64748b' }}
                                            tickLine={false}
                                            axisLine={{ stroke: '#cbd5e1' }}
                                        />
                                        <YAxis
                                            domain={[0, 100]}
                                            tick={{ fontSize: 12, fill: '#64748b' }}
                                            tickLine={false}
                                            axisLine={{ stroke: '#cbd5e1' }}
                                            unit="%"
                                        />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                            formatter={(value: any, name: any) => [`${value}%`, name === 'classAveragePercentage' ? 'Class Avg' : 'Topper']}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                        <Line
                                            type="monotone"
                                            dataKey="classAveragePercentage"
                                            name="Class Average"
                                            stroke="#8b5cf6"
                                            strokeWidth={3}
                                            dot={{ r: 4, strokeWidth: 0, fill: '#8b5cf6' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="topperPercentage"
                                            name="Topper Performance"
                                            stroke="#10b981"
                                            strokeWidth={3}
                                            dot={{ r: 4, strokeWidth: 0, fill: '#10b981' }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="text-center text-sm text-slate-400 mt-4 italic">
                                Click on any data point to view detailed student breakdown for that topic.
                            </p>
                        </div>

                        {/* Drill Down Table */}
                        <div id="topic-detail" className={`transition-all duration-500 ease-in-out ${selectedTopic ? 'opacity-100' : 'opacity-50 blur-sm'}`}>
                            {topicDetails ? (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800">Exam Details: {selectedTopic}</h3>
                                            <p className="text-sm text-slate-500">{new Date(topicDetails.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-xs text-slate-400 uppercase">Total Marks</span>
                                            <span className="text-xl font-bold text-slate-800">{topicDetails.totalMarks}</span>
                                        </div>
                                    </div>
                                    <div className="p-0">
                                        <PerformanceTable data={tableData} />
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                                    <p className="text-slate-400">Select an exam metric from the graph above to view the student leaderboard.</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>
        </>
    );
}
