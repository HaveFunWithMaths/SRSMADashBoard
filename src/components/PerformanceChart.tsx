'use client';

import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { COLORS } from '@/lib/designTokens';

interface PerformanceChartProps {
    data: any[];
    subject?: string;
}

const SUBJECT_COLORS = COLORS.subjects;

export default function PerformanceChart({ data, subject }: PerformanceChartProps) {
    const subjectColor = SUBJECT_COLORS[subject as keyof typeof SUBJECT_COLORS] || SUBJECT_COLORS['default'];
    const maxTopicLength = Math.max(...data.map(d => d.topic ? d.topic.length : 0), 10);
    const xAxisHeight = Math.min(Math.max(60, maxTopicLength * 4), 120);

    return (
        <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
                <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 40 }}>
                    <defs>
                        <linearGradient id={`colorScore_${subject}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={subjectColor} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={subjectColor} stopOpacity={0.05} />
                        </linearGradient>
                    </defs>
                    
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                        dataKey="topic"
                        tick={{ fontSize: 11, fill: '#64748b', dy: 20, dx: -5 }}
                        tickLine={false}
                        axisLine={{ stroke: '#cbd5e1' }}
                        angle={-45}
                        textAnchor="end"
                        height={xAxisHeight}
                    />
                    <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={{ stroke: '#cbd5e1' }}
                        unit="%"
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '0.8rem', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
                        formatter={(value: any, name: any) => [`${value}%`, name]}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />

                   
                    <Area
                        type="monotone"
                        dataKey="percentage"
                        name="Your Score"
                        stroke={subjectColor}
                        strokeWidth={3}
                        fillOpacity={1}
                        fill={`url(#colorScore_${subject})`}
                        activeDot={{ r: 6, strokeWidth: 0, fill: subjectColor }}
                        dot={{ r: 4, fill: subjectColor, strokeWidth: 2 }}
                    />
                    
                    <Line
                        type="monotone"
                        dataKey="topperPercentage"
                        name="Topper"
                        stroke={COLORS.success}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ r: 4, fill: COLORS.success, strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="classAveragePercentage"
                        name="Class Average"
                        stroke={COLORS.textMuted || '#94a3b8'}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ r: 4, fill: COLORS.textMuted || '#94a3b8', strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
