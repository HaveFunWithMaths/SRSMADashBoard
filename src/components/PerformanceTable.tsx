'use client';

import { useEffect, useState } from 'react';
import type { StudentPerformanceRecord } from '@/lib/types';

interface PerformanceTableProps {
    data: StudentPerformanceRecord[];
    onTopicClick?: (topic: string) => void;
    editable?: boolean;
    studentName?: string;
    onRefreshRequested?: () => Promise<void> | void;
}

export default function PerformanceTable({
    data,
    onTopicClick,
    editable = false,
    studentName,
    onRefreshRequested
}: PerformanceTableProps) {
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [draftMarks, setDraftMarks] = useState('');
    const [draftComments, setDraftComments] = useState('');
    const [savingKey, setSavingKey] = useState<string | null>(null);

    // Sort by Marks Descending? User said "Default sorted by Marks (Descending)".
    // But props data is likely chronologically sorted for charts.
    // We should clone and sort for table.
    const sortedData = [...data].sort((a, b) => {
        // Handle null marks (Absent) to be at bottom
        if (a.marks === null) return 1;
        if (b.marks === null) return -1;
        return b.marks - a.marks;
    });

    useEffect(() => {
        setEditingKey(null);
        setDraftMarks('');
        setDraftComments('');
        setSavingKey(null);
    }, [data, studentName]);

    const getHeatmapClass = (row: StudentPerformanceRecord) => {
        if (row.marks === null || row.classAverage === undefined || row.standardDeviation === undefined) {
            return '';
        }
        const mean = row.classAverage;
        const sd = row.standardDeviation;
        if (row.marks > mean + sd) return 'heatmap-high';
        if (row.marks < mean - sd) return 'heatmap-low';
        return 'heatmap-mid';
    };

    const getRowKey = (row: StudentPerformanceRecord) => `${row.className ?? ''}::${row.subject ?? ''}::${row.topic ?? ''}::${row.date ?? ''}`;

    const startEditing = (row: StudentPerformanceRecord) => {
        setEditingKey(getRowKey(row));
        setDraftMarks(row.marks === null ? '' : String(row.marks));
        setDraftComments(row.comments ?? '');
    };

    const cancelEditing = () => {
        setEditingKey(null);
        setDraftMarks('');
        setDraftComments('');
    };

    const saveRow = async (row: StudentPerformanceRecord) => {
        if (!studentName || !row.className) {
            alert('Missing student or class information for this row.');
            return;
        }

        const trimmedMarks = draftMarks.trim();
        const parsedMarks = trimmedMarks === '' ? null : Number(trimmedMarks);

        if (trimmedMarks !== '') {
            if (parsedMarks === null || Number.isNaN(parsedMarks) || parsedMarks < 0) {
                alert('Enter a valid marks value or leave it blank for absent.');
                return;
            }

            if (typeof row.totalMarks === 'number' && parsedMarks > row.totalMarks) {
                alert(`Marks cannot be greater than total marks (${row.totalMarks}).`);
                return;
            }
        }

        const rowKey = getRowKey(row);
        setSavingKey(rowKey);

        try {
            const response = await fetch('/api/data/performance', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    className: row.className,
                    subject: row.subject,
                    topicName: row.topic,
                    studentName,
                    marks: parsedMarks,
                    comments: draftComments
                })
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to update performance');
            }

            cancelEditing();
            await onRefreshRequested?.();
        } catch (error) {
            console.error(error);
            const message = error instanceof Error ? error.message : 'Failed to update performance';
            alert(message);
        } finally {
            setSavingKey(null);
        }
    };

    return (
        <div>
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        {/* thead remains untouched */}
                        <tr>
                            <th>Date</th>
                            <th>Topic</th>
                            <th>Marks</th>
                            <th>%</th>
                            <th>Rank</th>
                            <th>Class Avg</th>
                            <th>Topper</th>
                            <th>Remarks</th>
                            {editable && <th>Action</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map((row, idx) => {
                            const rowKey = getRowKey(row);
                            const isEditing = editable && editingKey === rowKey;
                            const isSaving = savingKey === rowKey;

                            return (
                                <tr key={rowKey || idx}>
                                    <td>
                                        {(() => {
                                            const d = new Date(row.date);
                                            return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getFullYear()).slice(-2)}`;
                                        })()}
                                    </td>
                                    <td
                                        style={{
                                            fontWeight: 500,
                                            color: '#1a365d',
                                            cursor: onTopicClick ? 'pointer' : 'default',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem',
                                            paddingTop: '0.9rem' // match vertical alignment
                                        }}
                                        onClick={() => onTopicClick?.(row.topic)}
                                        title={onTopicClick ? 'View Subject Analysis for this Topic' : undefined}
                                        onMouseOver={e => { if (onTopicClick) e.currentTarget.style.color = '#d4942a'; }}
                                        onMouseOut={e => { if (onTopicClick) e.currentTarget.style.color = '#1a365d'; }}
                                    >
                                        {row.topic}
                                        {onTopicClick && (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, marginTop: '2px' }}>
                                                <path d="M7 17l9.2-9.2M17 17V7H7" />
                                            </svg>
                                        )}
                                    </td>
                                    <td>
                                        {isEditing ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    value={draftMarks}
                                                    onChange={(event) => setDraftMarks(event.target.value)}
                                                    disabled={isSaving}
                                                    placeholder="AB"
                                                    style={{
                                                        width: '90px',
                                                        padding: '0.35rem 0.45rem',
                                                        border: '1px solid #cbd5e1',
                                                        borderRadius: '0.35rem'
                                                    }}
                                                />
                                                <span style={{ color: '#94a3b8', fontSize: '0.8em' }}>/ {row.totalMarks}</span>
                                            </div>
                                        ) : (
                                            <>
                                                {row.marks === null ? <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Absent</span> : row.marks}
                                                <span style={{ color: '#94a3b8', fontSize: '0.8em' }}> / {row.totalMarks}</span>
                                            </>
                                        )}
                                    </td>
                                    <td className={getHeatmapClass(row)}>
                                        {row.percentage === null ? '-' : `${row.percentage}%`}
                                    </td>
                                    <td>{row.rank === null ? '-' : `#${row.rank}`}</td>
                                    <td>{row.classAverage}%</td>
                                    <td>{row.topperMarks}</td>
                                    <td style={{ maxWidth: '250px', color: '#64748b', fontSize: '0.85rem' }}>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={draftComments}
                                                onChange={(event) => setDraftComments(event.target.value)}
                                                disabled={isSaving}
                                                placeholder="Add remarks"
                                                style={{
                                                    width: '100%',
                                                    minWidth: '180px',
                                                    padding: '0.35rem 0.45rem',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '0.35rem'
                                                }}
                                            />
                                        ) : (
                                            row.comments || '-'
                                        )}
                                    </td>
                                    {editable && (
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            {isEditing ? (
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => saveRow(row)}
                                                        disabled={isSaving}
                                                        style={{
                                                            padding: '0.35rem 0.75rem',
                                                            border: 'none',
                                                            borderRadius: '0.35rem',
                                                            backgroundColor: '#10b981',
                                                            color: '#fff',
                                                            cursor: isSaving ? 'not-allowed' : 'pointer',
                                                            opacity: isSaving ? 0.7 : 1
                                                        }}
                                                    >
                                                        {isSaving ? 'Saving...' : 'Save'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={cancelEditing}
                                                        disabled={isSaving}
                                                        style={{
                                                            padding: '0.35rem 0.75rem',
                                                            border: '1px solid #cbd5e1',
                                                            borderRadius: '0.35rem',
                                                            backgroundColor: '#fff',
                                                            color: '#475569',
                                                            cursor: isSaving ? 'not-allowed' : 'pointer'
                                                        }}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => startEditing(row)}
                                                    style={{
                                                        padding: '0.35rem 0.75rem',
                                                        border: '1px solid #cbd5e1',
                                                        borderRadius: '0.35rem',
                                                        backgroundColor: '#fff',
                                                        color: '#475569',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', fontSize: '0.85rem', color: '#64748b', flexWrap: 'wrap', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="heatmap-high" style={{ display: 'inline-block', width: '16px', height: '16px', borderRadius: '4px' }}></span>
                    <span>Exceeds Expectations</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="heatmap-mid" style={{ display: 'inline-block', width: '16px', height: '16px', borderRadius: '4px' }}></span>
                    <span>Meets Expectation</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="heatmap-low" style={{ display: 'inline-block', width: '16px', height: '16px', borderRadius: '4px' }}></span>
                    <span>Needs Improvement</span>
                </div>
            </div>
        </div>
    );
}
