'use client';

import { useEffect, useState, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import type { StudentPerformanceRecord } from '@/lib/types';

const FlashyIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px', flexShrink: 0 }}>
        <style>{`
            @keyframes pulse-glow {
                0% { transform: scale(0.8); filter: drop-shadow(0 0 2px #eab308); opacity: 0.5; }
                50% { transform: scale(1.3); filter: drop-shadow(0 0 8px #eab308) drop-shadow(0 0 15px #eab308); opacity: 1; }
                100% { transform: scale(0.8); filter: drop-shadow(0 0 2px #eab308); opacity: 0.5; }
            }
            .glow-star {
                transform-origin: center;
                animation: pulse-glow 0.8s ease-in-out infinite;
                fill: #eab308;
            }
        `}</style>
        <path className="glow-star" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
);

function FlashHandler({ onFlash }: { onFlash: (topic: string) => void }) {
    const searchParams = useSearchParams();
    const flashTopic = searchParams?.get('flashTopic');
    
    useEffect(() => {
        if (flashTopic) {
            onFlash(flashTopic);
        }
    }, [flashTopic, onFlash]);

    return null;
}

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

    // Sorting state
    const [sortField, setSortField] = useState<string>('percentage');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // Bulk Edit state
    const [isBulkEditing, setIsBulkEditing] = useState(false);
    const [bulkDraft, setBulkDraft] = useState<Record<string, { marks: string; comments: string }>>({});
    const [isSavingBulk, setIsSavingBulk] = useState(false);

    const getRowKey = (row: StudentPerformanceRecord) => `${row.className ?? ''}::${row.subject ?? ''}::${row.topic ?? ''}::${row.date ?? ''}`;

    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => {
            let valA: any = a[sortField as keyof StudentPerformanceRecord];
            let valB: any = b[sortField as keyof StudentPerformanceRecord];

            if (sortField === 'date') {
                const timeA = new Date(a.date).getTime();
                const timeB = new Date(b.date).getTime();
                return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
            }

            if (sortField === 'marks') {
                const numA = (a.marks === null || a.marks === undefined) ? -999999 : a.marks;
                const numB = (b.marks === null || b.marks === undefined) ? -999999 : b.marks;
                return sortDirection === 'asc' ? numA - numB : numB - numA;
            }

            if (sortField === 'percentage') {
                const numA = (a.percentage === null || a.percentage === undefined) ? -999999 : a.percentage;
                const numB = (b.percentage === null || b.percentage === undefined) ? -999999 : b.percentage;
                return sortDirection === 'asc' ? numA - numB : numB - numA;
            }

            if (sortField === 'rank') {
                const rankA = (a.rank === null || a.rank === undefined) ? 999999 : a.rank;
                const rankB = (b.rank === null || b.rank === undefined) ? 999999 : b.rank;
                return sortDirection === 'asc' ? rankA - rankB : rankB - rankA;
            }

            if (sortField === 'classAveragePercentage') {
                const avgA = a.classAveragePercentage ?? 0;
                const avgB = b.classAveragePercentage ?? 0;
                return sortDirection === 'asc' ? avgA - avgB : avgB - avgA;
            }

            if (sortField === 'topperPercentage') {
                const topA = a.topperPercentage ?? a.topperMarks ?? 0;
                const topB = b.topperPercentage ?? b.topperMarks ?? 0;
                return sortDirection === 'asc' ? topA - topB : topB - topA;
            }

            if (sortField === 'comments') {
                valA = a.comments || '';
                valB = b.comments || '';
            }

            if (sortField === 'topic') {
                valA = a.topic || '';
                valB = b.topic || '';
            }

            const strA = String(valA).toLowerCase();
            const strB = String(valB).toLowerCase();
            if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
            if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sortField, sortDirection]);

    useEffect(() => {
        setEditingKey(null);
        setDraftMarks('');
        setDraftComments('');
        setSavingKey(null);
        setIsBulkEditing(false);
        setBulkDraft({});
        setIsSavingBulk(false);
    }, [data, studentName]);

    const [flashingTopic, setFlashingTopic] = useState<string | null>(null);

    const handleFlash = useCallback((topic: string) => {
        setFlashingTopic(null);
        setTimeout(() => {
            setFlashingTopic(topic);
            const el = document.getElementById(`row-${topic}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 50);
        setTimeout(() => setFlashingTopic(null), 3000);
    }, []);

    useEffect(() => {
        const handler = (e: any) => {
            if (e.detail && e.detail.topic) {
                handleFlash(e.detail.topic);
            }
        };
        window.addEventListener('scrollToRow', handler);
        return () => window.removeEventListener('scrollToRow', handler);
    }, [handleFlash]);

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

    const startEditing = (row: StudentPerformanceRecord) => {
        setEditingKey(getRowKey(row));
        setDraftMarks(row.marks === -1 ? 'NA' : row.marks === null ? '' : String(row.marks));
        setDraftComments(row.comments ?? '');
    };

    const cancelEditing = () => {
        setEditingKey(null);
        setDraftMarks('');
        setDraftComments('');
    };

    const startBulkEditing = () => {
        const draft: Record<string, { marks: string; comments: string }> = {};
        sortedData.forEach(row => {
            const rowKey = getRowKey(row);
            draft[rowKey] = {
                marks: row.marks === -1 ? 'NA' : row.marks === null ? '' : String(row.marks),
                comments: row.comments ?? ''
            };
        });
        setBulkDraft(draft);
        setIsBulkEditing(true);
    };

    const cancelBulkEditing = () => {
        setIsBulkEditing(false);
        setBulkDraft({});
    };

    const saveBulk = async () => {
        if (!studentName || sortedData.length === 0) {
            alert('Missing student information.');
            return;
        }

        const className = sortedData[0].className;
        const subject = sortedData[0].subject;
        const updates: Array<{ topicName: string; marks: number | null | string; comments: string }> = [];

        for (const row of sortedData) {
            const rowKey = getRowKey(row);
            const draft = bulkDraft[rowKey];
            if (!draft) continue;

            const trimmedMarks = draft.marks.trim().toUpperCase();
            const parsedMarks = trimmedMarks === '' ? null : (trimmedMarks === 'NA' ? -1 : Number(trimmedMarks));

            if (trimmedMarks !== '' && trimmedMarks !== 'NA') {
                if (parsedMarks === null || Number.isNaN(parsedMarks) || parsedMarks < 0) {
                    alert(`Row "${row.topic}": Enter a valid marks value, NA, or leave it blank for absent.`);
                    return;
                }

                if (typeof row.totalMarks === 'number' && parsedMarks > row.totalMarks) {
                    alert(`Row "${row.topic}": Marks cannot be greater than total marks (${row.totalMarks}).`);
                    return;
                }
            }

            updates.push({
                topicName: row.topic,
                marks: parsedMarks,
                comments: draft.comments.trim()
            });
        }

        setIsSavingBulk(true);

        try {
            const response = await fetch('/api/data/performance', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    isBulkStudent: true,
                    className,
                    subject,
                    studentName,
                    updates
                })
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to bulk update performance');
            }

            setIsBulkEditing(false);
            setBulkDraft({});
            await onRefreshRequested?.();
        } catch (error) {
            console.error(error);
            const message = error instanceof Error ? error.message : 'Failed to bulk update performance';
            alert(message);
        } finally {
            setIsSavingBulk(false);
        }
    };

    const saveRow = async (row: StudentPerformanceRecord) => {
        if (!studentName || !row.className) {
            alert('Missing student or class information for this row.');
            return;
        }

        const trimmedMarks = draftMarks.trim().toUpperCase();
        const parsedMarks = trimmedMarks === '' ? null : (trimmedMarks === 'NA' ? -1 : Number(draftMarks.trim()));

        if (trimmedMarks !== '' && trimmedMarks !== 'NA') {
            if (parsedMarks === null || Number.isNaN(parsedMarks) || parsedMarks < 0) {
                alert('Enter a valid marks value, NA, or leave it blank for absent.');
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

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const getSortIcon = (field: string) => {
        if (sortField !== field) return <span style={{ color: '#94a3b8', marginLeft: '0.25rem', userSelect: 'none', cursor: 'pointer' }}>↕</span>;
        return sortDirection === 'asc' ? 
            <span style={{ color: '#7c3aed', marginLeft: '0.25rem', fontWeight: 'bold', userSelect: 'none', cursor: 'pointer' }}>▲</span> : 
            <span style={{ color: '#7c3aed', marginLeft: '0.25rem', fontWeight: 'bold', userSelect: 'none', cursor: 'pointer' }}>▼</span>;
    };

    return (
        <div>
            <Suspense fallback={null}>
                <FlashHandler onFlash={handleFlash} />
            </Suspense>

            {editable && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem', gap: '0.75rem' }}>
                    {isBulkEditing ? (
                        <>
                            <button
                                type="button"
                                onClick={saveBulk}
                                disabled={isSavingBulk}
                                style={{
                                    padding: '0.5rem 1.25rem',
                                    backgroundColor: '#10b981',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    cursor: isSavingBulk ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
                                }}
                            >
                                {isSavingBulk ? 'Saving...' : 'Save All'}
                            </button>
                            <button
                                type="button"
                                onClick={cancelBulkEditing}
                                disabled={isSavingBulk}
                                style={{
                                    padding: '0.5rem 1.25rem',
                                    backgroundColor: '#fff',
                                    color: '#475569',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '0.5rem',
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    cursor: isSavingBulk ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={startBulkEditing}
                            style={{
                                padding: '0.5rem 1.25rem',
                                backgroundColor: '#f1f5f9',
                                color: '#475569',
                                border: '1px solid #cbd5e1',
                                borderRadius: '0.5rem',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Bulk Edit
                        </button>
                    )}
                </div>
            )}

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('date')} style={{ cursor: 'pointer', userSelect: 'none' }}>Date {getSortIcon('date')}</th>
                            <th onClick={() => handleSort('topic')} style={{ cursor: 'pointer', userSelect: 'none' }}>Topic {getSortIcon('topic')}</th>
                            <th onClick={() => handleSort('marks')} style={{ cursor: 'pointer', userSelect: 'none' }}>Marks {getSortIcon('marks')}</th>
                            <th onClick={() => handleSort('percentage')} style={{ cursor: 'pointer', userSelect: 'none' }}>% {getSortIcon('percentage')}</th>
                            <th onClick={() => handleSort('rank')} style={{ cursor: 'pointer', userSelect: 'none' }}>Rank {getSortIcon('rank')}</th>
                            <th onClick={() => handleSort('classAveragePercentage')} style={{ cursor: 'pointer', userSelect: 'none' }}>Class Avg {getSortIcon('classAveragePercentage')}</th>
                            <th onClick={() => handleSort('topperPercentage')} style={{ cursor: 'pointer', userSelect: 'none' }}>Topper {getSortIcon('topperPercentage')}</th>
                            <th onClick={() => handleSort('comments')} style={{ cursor: 'pointer', userSelect: 'none' }}>Remarks {getSortIcon('comments')}</th>
                            {editable && <th>Action</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map((row, idx) => {
                            const rowKey = getRowKey(row);
                            const isEditing = editable && editingKey === rowKey;
                            const isSaving = savingKey === rowKey;

                            return (
                                <tr 
                                    key={rowKey || idx}
                                    id={`row-${row.topic}`}
                                    className={flashingTopic === row.topic ? 'flash-highlight' : ''}
                                    style={{
                                        transition: 'background-color 1s ease'
                                    }}
                                >
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
                                            paddingTop: '0.9rem'
                                        }}
                                        onClick={() => onTopicClick?.(row.topic)}
                                        title={onTopicClick ? 'View Subject Analysis for this Topic' : undefined}
                                        onMouseOver={e => { if (onTopicClick) e.currentTarget.style.color = '#d4942a'; }}
                                        onMouseOut={e => { if (onTopicClick) e.currentTarget.style.color = '#1a365d'; }}
                                    >
                                        {flashingTopic === row.topic && <FlashyIcon />}
                                        {row.topic}
                                        {onTopicClick && (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, marginTop: '2px' }}>
                                                <path d="M7 17l9.2-9.2M17 17V7H7" />
                                            </svg>
                                        )}
                                    </td>
                                    <td>
                                        {isEditing || isBulkEditing ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <input
                                                    type="text"
                                                    value={isBulkEditing ? (bulkDraft[rowKey]?.marks ?? '') : draftMarks}
                                                    onChange={(event) => {
                                                        if (isBulkEditing) {
                                                            setBulkDraft(prev => ({
                                                                ...prev,
                                                                [rowKey]: { ...prev[rowKey], marks: event.target.value }
                                                            }));
                                                        } else {
                                                            setDraftMarks(event.target.value);
                                                        }
                                                    }}
                                                    disabled={isSaving || isSavingBulk}
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
                                    <td>{row.classAveragePercentage}%</td>
                                    <td>{row.topperPercentage !== undefined && row.topperPercentage !== null ? `${row.topperPercentage}%` : (row.topperMarks ?? '-')}</td>
                                    <td style={{ maxWidth: '250px', color: '#64748b', fontSize: '0.85rem' }}>
                                        {isEditing || isBulkEditing ? (
                                            <input
                                                type="text"
                                                value={isBulkEditing ? (bulkDraft[rowKey]?.comments ?? '') : draftComments}
                                                onChange={(event) => {
                                                    if (isBulkEditing) {
                                                        setBulkDraft(prev => ({
                                                            ...prev,
                                                            [rowKey]: { ...prev[rowKey], comments: event.target.value }
                                                        }));
                                                    } else {
                                                        setDraftComments(event.target.value);
                                                    }
                                                }}
                                                disabled={isSaving || isSavingBulk}
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
                                            {isBulkEditing ? (
                                                <span style={{ color: '#cbd5e1' }}>-</span>
                                            ) : isEditing ? (
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
