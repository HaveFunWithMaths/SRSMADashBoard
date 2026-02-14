'use client';

interface PerformanceTableProps {
    data: any[];
}

export default function PerformanceTable({ data }: PerformanceTableProps) {
    // Sort by Marks Descending? User said "Default sorted by Marks (Descending)".
    // But props data is likely chronologically sorted for charts.
    // We should clone and sort for table.
    const sortedData = [...data].sort((a, b) => {
        // Handle null marks (Absent) to be at bottom
        if (a.marks === null) return 1;
        if (b.marks === null) return -1;
        return b.marks - a.marks;
    });

    const getHeatmapClass = (percentage: number | null) => {
        if (percentage === null) return '';
        if (percentage >= 85) return 'heatmap-high';
        if (percentage >= 60) return 'heatmap-mid';
        return 'heatmap-low';
    };

    return (
        <div className="table-container">
            <table className="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Topic</th>
                        <th>Marks</th>
                        <th>%</th>
                        <th>Rank</th>
                        <th>Class Avg</th>
                        <th>Topper</th>
                        <th>Remarks</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((row, idx) => (
                        <tr key={idx}>
                            <td>{new Date(row.date).toLocaleDateString()}</td>
                            <td style={{ fontWeight: 500, color: '#1a365d' }}>{row.topic}</td>
                            <td>
                                {row.marks === null ? <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Absent</span> : row.marks}
                                <span style={{ color: '#94a3b8', fontSize: '0.8em' }}> / {row.totalMarks}</span>
                            </td>
                            <td className={getHeatmapClass(row.percentage)}>
                                {row.percentage === null ? '-' : `${row.percentage}%`}
                            </td>
                            <td>{row.rank === null ? '-' : `#${row.rank}`}</td>
                            <td>{row.classAverage}%</td>
                            <td>{row.topperMarks}</td>
                            <td style={{ maxWidth: '250px', color: '#64748b', fontSize: '0.85rem' }}>
                                {row.comments || '-'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
