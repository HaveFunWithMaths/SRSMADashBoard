'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { COLORS } from '@/lib/designTokens';

interface RankTrendChartProps {
    data: any[];
    subject?: string;
}

const SUBJECT_COLORS = COLORS.subjects;

export default function RankTrendChart({ data, subject }: RankTrendChartProps) {
    const subjectColor = SUBJECT_COLORS[subject as keyof typeof SUBJECT_COLORS] || SUBJECT_COLORS['default'];

    // Filter out null ranks or create gap? Recharts handles nulls by creating gaps.
    const chartData = data.map(d => ({
        topic: d.topic,
        rank: d.rank ?? null
    }));

    return (
        <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                        dataKey="topic"
                        tick={{ fontSize: 11, fill: '#64748b', dy: 10, dx: -5 }}
                        tickLine={false}
                        axisLine={{ stroke: '#cbd5e1' }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                    />
                    <YAxis
                        reversed
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={{ stroke: '#cbd5e1' }}
                        domain={[1, 'auto']}
                        allowDecimals={false}
                        label={{ value: 'Better Rank →', angle: -90, position: 'insideLeft', offset: 0, fill: '#94a3b8', fontSize: 12 }}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />

                    <Line
                        type="monotone"
                        dataKey="rank"
                        name="Rank"
                        stroke={subjectColor}
                        strokeWidth={3}
                        dot={{ r: 4, fill: subjectColor, strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                        connectNulls // Connect points if rank is missing? Or leave gap? Plan says "Absent = null". Better to leave gap to show absence. 
                    // Actually, for trend, gaps are better. connectNulls={false} is default.
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
