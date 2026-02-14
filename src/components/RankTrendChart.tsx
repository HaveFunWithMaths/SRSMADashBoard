'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface RankTrendChartProps {
    data: any[];
}

export default function RankTrendChart({ data }: RankTrendChartProps) {
    // Filter out null ranks or create gap? Recharts handles nulls by creating gaps.
    const chartData = data.map(d => ({
        topic: d.topic,
        rank: d.rank ?? null
    }));

    return (
        <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                        dataKey="topic"
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis
                        reversed
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={{ stroke: '#cbd5e1' }}
                        domain={[1, 'auto']}
                        allowDecimals={false}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />

                    <Line
                        type="monotone"
                        dataKey="rank"
                        name="Rank"
                        stroke="#d4942a"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#d4942a', strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                        connectNulls // Connect points if rank is missing? Or leave gap? Plan says "Absent = null". Better to leave gap to show absence. 
                    // Actually, for trend, gaps are better. connectNulls={false} is default.
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
