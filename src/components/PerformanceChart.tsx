'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface PerformanceChartProps {
    data: any[];
    subject?: string;
}

const SUBJECT_COLORS: Record<string, string> = {
    'Maths': '#1a365d',      // Navy
    'Physics': '#7c3aed',    // Violet
    'Chemistry': '#10b981',  // Emerald
    'Total': '#f59e0b',      // Amber
    'default': '#64748b'     // Slate
};

export default function PerformanceChart({ data, subject }: PerformanceChartProps) {
    const subjectColor = SUBJECT_COLORS[subject || 'default'] || SUBJECT_COLORS['default'];

    return (
        <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                        formatter={(value: any, name: any) => [`${value}%`, name]}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />

                    <Line
                        type="monotone"
                        dataKey="percentage"
                        name="Your Score"
                        stroke={subjectColor}
                        strokeWidth={3}
                        dot={{ r: 4, fill: subjectColor, strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="topperPercentage"
                        name="Topper"
                        stroke="#ef4444"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                    />
                    <Line
                        type="monotone"
                        dataKey="classAveragePercentage"
                        name="Class Avg"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
