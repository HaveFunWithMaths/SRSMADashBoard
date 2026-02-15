'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import PerformanceTable from '@/components/PerformanceTable';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

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
                    setSubjects(data);
                    if (data.length > 0) setSelectedSubject(data[0]);
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
                    setBatchData(subject.topics || []);
                } else {
                    setBatchData([]);
                }
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

    if (status === 'loading') return <div>Loading...</div>;
    if (!session) return null;

    const chartData = batchData.map(topic => ({
        topic: topic.topicName,
        classAverage: topic.classAverage,
        topperMarks: topic.topperMarks
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

    return (
        <>
            <Header />
            <main className="container">
                <h2 className="text-xl font-bold mb-4">Teacher Dashboard</h2>

                <div className="card mb-4">
                    <div className="flex gap-4 items-center flex-wrap">
                        <div>
                            <label className="block text-sm font-bold mb-1">Class</label>
                            <select
                                className="p-2 border rounded"
                                value={selectedClass}
                                onChange={e => setSelectedClass(e.target.value)}
                            >
                                {classes.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">Subject</label>
                            <select
                                className="p-2 border rounded"
                                value={selectedSubject}
                                onChange={e => setSelectedSubject(e.target.value)}
                            >
                                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Student Selector */}
                    <div className="mt-4 pt-4 border-t">
                        <label className="block text-sm font-bold mb-1">View Student Dashboard</label>
                        <div className="flex gap-2 max-w-md">
                            <select
                                className="p-2 border rounded flex-grow"
                                onChange={(e) => {
                                    if (e.target.value) {
                                        router.push(`/dashboard?student=${e.target.value}`);
                                    }
                                }}
                                defaultValue=""
                            >
                                <option value="" disabled>Select a student to view details...</option>
                                {Array.from(new Set(batchData.flatMap(t => t.students?.map((s: any) => s.name) || []))).sort().map((s: any) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="card mb-4">
                    <h3 className="card-title">Batch Performance Analysis</h3>
                    <div style={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer>
                            <LineChart data={chartData} onClick={(e) => {
                                if (e && e.activeLabel) setSelectedTopic(String(e.activeLabel));
                            }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="topic" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="classAverage" stroke="#f59e0b" name="Class Average" />
                                <Line type="monotone" dataKey="topperMarks" stroke="#10b981" name="Topper Marks" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-sm text-muted mt-2 text-center">Click on a data point to view student details.</p>
                </div>

                {topicDetails ? (
                    <div className="card">
                        <h3 className="card-title">Topic Detail: {selectedTopic}</h3>
                        <PerformanceTable data={tableData} />
                    </div>
                ) : (
                    <div className="text-center text-muted p-4">Select a topic from the graph to view details.</div>
                )}
            </main>
        </>
    );
}
