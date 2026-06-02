'use client';

import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import StudentDashboardView from '@/components/StudentDashboardView';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';
import { toast } from 'react-hot-toast';
import { COLORS } from '@/lib/designTokens';
import { BookOpen, TrendingUp, Users, Edit2, Download, UploadCloud, FileSpreadsheet, ChevronUp, ChevronDown } from 'lucide-react';
import * as xlsx from 'xlsx';
import FullScreenChart from '@/components/FullScreenChart';

const SUBJECT_COLORS = COLORS.subjects;

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
    const [activeTab, setActiveTab] = useState<'analysis' | 'students' | 'manage' | 'upload' | 'analytics' | 'manage-teachers'>('analysis');
    const [viewMode, setViewMode] = useState<'table' | 'graph'>('graph');
    const [showPerformanceMatrix, setShowPerformanceMatrix] = useState(true);

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

    // Edit Student Marks in Subject Analysis
    const [editingStudentRow, setEditingStudentRow] = useState<string | null>(null);
    const [draftStudentMarks, setDraftStudentMarks] = useState('');
    const [draftStudentComments, setDraftStudentComments] = useState('');
    const [isSavingMark, setIsSavingMark] = useState(false);

    // Edit Topic Details
    const [isEditingTopicDetails, setIsEditingTopicDetails] = useState(false);
    const [editTopicName, setEditTopicName] = useState('');
    const [editTopicDate, setEditTopicDate] = useState('');
    const [editTopicTotalMarks, setEditTopicTotalMarks] = useState('');
    const [editTopicSubject, setEditTopicSubject] = useState('');
    const [isSavingTopicDetails, setIsSavingTopicDetails] = useState(false);


    // Password masking state
    const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(new Set());

    // Bulk Edit states
    const [isBulkEditing, setIsBulkEditing] = useState(false);
    const [bulkDraft, setBulkDraft] = useState<Record<string, { marks: string; comments: string }>>({});
    const [isSavingBulk, setIsSavingBulk] = useState(false);

    // Add Class Modal state
    const [showAddClassModal, setShowAddClassModal] = useState(false);
    const [newClassNameModalInput, setNewClassNameModalInput] = useState('');

    // Teacher check
    const isRegularTeacher = session?.user?.role !== 'admin' &&
                            session?.user?.name?.toLowerCase() !== 'srsma' &&
                            session?.user?.username?.toLowerCase() !== 'srsma';

    // Teacher Mappings & Accounts Admin state
    const [teachersList, setTeachersList] = useState<any[]>([]);
    const [teacherMappings, setTeacherMappings] = useState<any[]>([]);
    const [newTeacherName, setNewTeacherName] = useState('');
    const [newTeacherPassword, setNewTeacherPassword] = useState('');
    const [editingTeacherNameId, setEditingTeacherNameId] = useState<number | null>(null);
    const [editedTeacherNameVal, setEditedTeacherNameVal] = useState('');
    const [editedTeacherPasswordVal, setEditedTeacherPasswordVal] = useState('');
    const [isAddingTeacherAction, setIsAddingTeacherAction] = useState(false);
    const [selectedTeacherClasses, setSelectedTeacherClasses] = useState<Record<string, string>>({});
    const [selectedTeacherSubjects, setSelectedTeacherSubjects] = useState<Record<string, string>>({});
    const [selectedTeacherSubjectsMulti, setSelectedTeacherSubjectsMulti] = useState<Record<string, string[]>>({});
    const [mappingToDelete, setMappingToDelete] = useState<{ teacherUsername: string; className: string; subject: string } | null>(null);
    const [teacherPermissions, setTeacherPermissions] = useState<any[]>([]);

    const handleSaveTopicDetails = async () => {
        if (!selectedClass || !selectedSubject || !selectedTopic || !topicDetails) return;
        if (!isSubjectEditable) {
            toast.error('You do not have permission to edit topic details for this subject');
            return;
        }
        setIsSavingTopicDetails(true);
        try {
            const res = await fetch('/api/admin/topic', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    className: selectedClass,
                    oldSubject: selectedSubject,
                    oldTopicName: selectedTopic,
                    newSubject: editTopicSubject,
                    newTopicName: editTopicName,
                    newTestDate: editTopicDate,
                    newTotalMarks: editTopicTotalMarks
                })
            });
            const result = await res.json();
            if (result.success) {
                toast.success('Topic details updated');
                setIsEditingTopicDetails(false);
                if (selectedSubject !== editTopicSubject) {
                    setSelectedSubject(editTopicSubject);
                } else {
                    await refreshBatchData();
                }
                setSelectedTopic(editTopicName);
            } else {
                toast.error(result.error || 'Failed to update topic details');
            }
        } catch (error) {
            toast.error('Error updating topic details');
        } finally {
            setIsSavingTopicDetails(false);
        }
    };

    // Class Management
    const [newClassNameInput, setNewClassNameInput] = useState('');
    const [editingClass, setEditingClass] = useState<string | null>(null);
    const [editedClassName, setEditedClassName] = useState('');
    const [isManagingClassAction, setIsManagingClassAction] = useState(false);

    // Student Management
    const [editingStudentName, setEditingStudentName] = useState<string | null>(null);
    const [editedStudentNameValue, setEditedStudentNameValue] = useState('');
    const [editedStudentEmailValue, setEditedStudentEmailValue] = useState('');
    const [editedStudentPasswordValue, setEditedStudentPasswordValue] = useState('');
    const [isManagingStudentAction, setIsManagingStudentAction] = useState(false);

    const refreshBatchData = useCallback(async () => {
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
    }, [selectedClass, selectedSubject]);

    const refreshStudents = useCallback(async () => {
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
    }, [selectedClass]);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
        if (session && session.user?.role === 'student') router.push('/dashboard');
    }, [status, session, router]);

    useEffect(() => {
        if (isRegularTeacher && (activeTab === 'manage' || activeTab === 'analytics' || activeTab === 'manage-teachers')) {
            setActiveTab('analysis');
        }
    }, [activeTab, isRegularTeacher]);

    // Load teacher permissions on mount (or if user changes)
    const fetchTeacherPermissions = useCallback(async () => {
        if (isRegularTeacher) {
            try {
                const res = await fetch('/api/data?type=teacher-permissions');
                const data = await res.json();
                if (data && Array.isArray(data.permissions)) {
                    setTeacherPermissions(data.permissions);
                }
            } catch (err) {
                console.error('Error fetching teacher permissions:', err);
            }
        }
    }, [isRegularTeacher]);

    const fetchTeachersAndMappings = useCallback(async () => {
        if (!isRegularTeacher) {
            try {
                const res = await fetch('/api/admin/teachers');
                if (!res.ok) {
                    const data = await res.json();
                    toast.error(`Failed to load teachers: ${data.error || 'Server error'}`);
                    return;
                }
                const data = await res.json();
                if (data) {
                    if (Array.isArray(data.teachers)) setTeachersList(data.teachers);
                    if (Array.isArray(data.mappings)) setTeacherMappings(data.mappings);
                }
            } catch (err) {
                toast.error('Network error loading teachers');
            }
        }
    }, [isRegularTeacher]);

    useEffect(() => {
        fetchTeacherPermissions();
    }, [fetchTeacherPermissions]);

    useEffect(() => {
        fetchTeachersAndMappings();
    }, [fetchTeachersAndMappings]);

    const handleAddNewTeacher = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTeacherName.trim() || !newTeacherPassword.trim()) return;
        setIsAddingTeacherAction(true);
        try {
            const res = await fetch('/api/admin/teachers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'addTeacher', name: newTeacherName.trim(), password: newTeacherPassword.trim() })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Teacher added successfully');
                setNewTeacherName('');
                setNewTeacherPassword('');
                await fetchTeachersAndMappings();
            } else {
                toast.error(data.error || 'Failed to add teacher');
            }
        } catch (err) {
            toast.error('Error adding teacher');
        } finally {
            setIsAddingTeacherAction(false);
        }
    };

    const handleSaveTeacherEdit = async (teacher: any) => {
        if (!editedTeacherNameVal.trim()) return;
        try {
            const res = await fetch('/api/admin/teachers', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldName: teacher.name, newName: editedTeacherNameVal.trim(), password: editedTeacherPasswordVal })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Teacher details updated');
                setEditingTeacherNameId(null);
                await fetchTeachersAndMappings();
            } else {
                toast.error(data.error || 'Failed to update teacher');
            }
        } catch (err) {
            toast.error('Error updating teacher');
        }
    };

    const handleDeleteTeacher = async (name: string) => {
        if (!window.confirm(`Are you sure you want to delete teacher ${name} and all their mappings?`)) return;
        try {
            const res = await fetch('/api/admin/teachers', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'deleteTeacher', name })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Teacher deleted successfully');
                await fetchTeachersAndMappings();
            } else {
                toast.error(data.error || 'Failed to delete teacher');
            }
        } catch (err) {
            toast.error('Error deleting teacher');
        }
    };

    const getDynamicSubjectsForClass = (clsName: string) => {
        if (!clsName) return [];
        const is11Or12 = ['Class_11', 'Class_12', 'Class_12+'].includes(clsName);
        if (is11Or12) {
            return ['Maths', 'Physics', 'Chemistry'];
        }
        return ['Maths', 'Physics', 'Chemistry', 'Biology'];
    };

    const handleAddMultiMapping = async (teacherUsername: string) => {
        const cls = selectedTeacherClasses[teacherUsername];
        const subs = selectedTeacherSubjectsMulti[teacherUsername] || [];
        if (!cls || subs.length === 0) return;

        let successCount = 0;
        let failCount = 0;
        let lastError = '';

        for (const sub of subs) {
            try {
                const res = await fetch('/api/admin/teachers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'addMapping', teacherUsername, className: cls, subject: sub })
                });
                const data = await res.json();
                if (data.success) {
                    successCount++;
                } else {
                    failCount++;
                    lastError = data.error || 'Failed to add mapping';
                }
            } catch (err) {
                failCount++;
                lastError = 'Network error adding mapping';
            }
        }

        if (successCount > 0) {
            toast.success(`Successfully added ${successCount} mapping(s)`);
            setSelectedTeacherClasses(prev => ({ ...prev, [teacherUsername]: '' }));
            setSelectedTeacherSubjectsMulti(prev => ({ ...prev, [teacherUsername]: [] }));
            await fetchTeachersAndMappings();
        }
        if (failCount > 0) {
            toast.error(`Failed to add ${failCount} mapping(s): ${lastError}`);
        }
    };

    const handleDeleteMapping = (teacherUsername: string, className: string, subject: string) => {
        setMappingToDelete({ teacherUsername, className, subject });
    };

    const confirmDeleteMapping = async () => {
        if (!mappingToDelete) return;
        const { teacherUsername, className, subject } = mappingToDelete;
        try {
            const res = await fetch('/api/admin/teachers', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'deleteMapping', teacherUsername, className, subject })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Mapping removed successfully');
                await fetchTeachersAndMappings();
            } else {
                toast.error(data.error || 'Failed to remove mapping');
            }
        } catch (err) {
            toast.error('Error removing mapping');
        } finally {
            setMappingToDelete(null);
        }
    };

    const fetchClasses = async () => {
        try {
            const res = await fetch('/api/data?type=classes');
            const data = await res.json();
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
                if (sortedClasses.length > 0 && !selectedClass) {
                    const defaultClass = sortedClasses.find((c: string) => c === 'Class_12+') || sortedClasses[0];
                    setSelectedClass(defaultClass);
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        if (!selectedClass) return;
        setSelectedSubject('');
        fetch(`/api/data?type=subjects&class=${encodeURIComponent(selectedClass)}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const is11Or12 = ['Class_11', 'Class_12', 'Class_12+'].includes(selectedClass);
                    const requiredSubjects = is11Or12
                        ? ['Maths', 'Physics', 'Chemistry', 'Combined']
                        : ['Maths', 'Physics', 'Chemistry', 'Biology'];
                    const merged = Array.from(new Set([...data, ...requiredSubjects]));

                    const sortOrder = requiredSubjects;
                    const sortedSubjects = merged.sort((a, b) => {
                        const idxA = sortOrder.indexOf(a);
                        const idxB = sortOrder.indexOf(b);
                        if (idxA === -1 && idxB === -1) return a.localeCompare(b);
                        if (idxA === -1) return 1;
                        if (idxB === -1) return -1;
                        return idxA - idxB;
                    });

                    setSubjects(sortedSubjects);
                    if (sortedSubjects.length > 0) {
                        let defaultSub = sortedSubjects[0];
                        if (isRegularTeacher && teacherPermissions.length > 0) {
                            const taughtSub = sortedSubjects.find(sub =>
                                teacherPermissions.some((p: any) =>
                                    p.class_name.toLowerCase() === selectedClass.toLowerCase() &&
                                    p.subject.toLowerCase() === sub.toLowerCase()
                                )
                            );
                            if (taughtSub) {
                                defaultSub = taughtSub;
                            }
                        }
                        setSelectedSubject(defaultSub);
                    }
                }
            });
    }, [selectedClass, isRegularTeacher, teacherPermissions]);

    useEffect(() => {
        if (!selectedClass || !selectedSubject) return;
        refreshBatchData();
    }, [selectedClass, selectedSubject, refreshBatchData]);

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
    }, [selectedClass, refreshStudents]);



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
                toast.success(result.message || 'Student added successfully!');
            } else {
                toast.error(result.error || 'Failed to add student');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error adding student');
        } finally {
            setIsAddingStudent(false);
        }
    };

    const handleDeleteStudent = async (studentName: string) => {
        if (!window.confirm(`Are you sure you want to remove ${studentName} from ${selectedClass.replace(/_/g, ' ')}?`)) return;
        try {
            const res = await fetch('/api/admin/students', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentName, className: selectedClass })
            });
            const result = await res.json();
            if (result.success) {
                await refreshStudents();
                toast.success(`Removed ${studentName}.`);
            } else {
                toast.error(result.error || 'Failed to delete student');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error deleting student');
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
                toast.success(`Restored ${studentName}.`);
            } else {
                toast.error(result.error || 'Failed to restore student');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error restoring student');
        }
    };

    const handleUploadMarks = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClass || !selectedSubject || !uploadTopicName || !uploadTotalMarks) return;
        if (!isSubjectEditable) {
            toast.error('You do not have permission to upload marks for this subject');
            return;
        }

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
                toast.success('Marks uploaded successfully!');
                setUploadTopicName('');
                setUploadTotalMarks('');
                setUploadStudents(prev => prev.map(s => ({ ...s, marks: '', comments: '' })));
                await refreshBatchData();
            } else {
                toast.error(result.error || 'Failed to upload marks');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error uploading marks');
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

    const isSubjectEditable = useMemo(() => {
        if (!isRegularTeacher) return true;
        if (!selectedClass || !selectedSubject) return false;

        // Combined is editable by default if the teacher is teaching any subject in Class 11, 12, or 12+
        if (selectedSubject.toLowerCase() === 'combined' && ['class_11', 'class_12', 'class_12+'].includes(selectedClass.toLowerCase())) {
            return teacherPermissions.some(
                (p: any) => p.class_name.toLowerCase() === selectedClass.toLowerCase()
            );
        }

        return teacherPermissions.some(
            (p: any) => p.class_name.toLowerCase() === selectedClass.toLowerCase() &&
                       p.subject.toLowerCase() === selectedSubject.toLowerCase()
        );
    }, [isRegularTeacher, selectedClass, selectedSubject, teacherPermissions]);

    // BUG-01 FIX: useMemo must be called BEFORE any early returns (React Rules of Hooks).
    const pivotTableData = useMemo(() => {
        if (!batchData || batchData.length === 0) return [];
        const studentMap: Record<string, any> = {};

        batchData.forEach(topic => {
            topic.students?.forEach((s: any) => {
                if (!studentMap[s.name]) {
                    studentMap[s.name] = { name: s.name, totalPercentage: 0, presentCount: 0, naCount: 0, testMarks: {} };
                }
                let p = null;
                if (s.marks !== null) {
                    if (s.marks === -1) {
                        p = 'NA';
                        studentMap[s.name].naCount += 1;
                    } else {
                        p = s.percentage !== undefined ? s.percentage : Math.round((s.marks / topic.totalMarks) * 100);
                        studentMap[s.name].totalPercentage += p;
                        studentMap[s.name].presentCount += 1;
                    }
                }
                studentMap[s.name].testMarks[topic.topicName] = p;
            });
        });

        Object.values(studentMap).forEach(student => {
            if (student.presentCount > 0) {
                student.averagePercentage = student.totalPercentage / student.presentCount;
            } else if (student.naCount > 0) {
                student.averagePercentage = -2; // Special flag for all-NA
            } else {
                student.averagePercentage = -1; // So they go to the bottom
            }
        });

        return Object.values(studentMap).sort((a, b) => b.averagePercentage - a.averagePercentage);
    }, [batchData]);

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

    const handleDownloadTopic = (topic: any) => {
        try {
            const d = new Date(topic.date);
            const wsData = [
                ["Date", d.toLocaleDateString(), "Total Marks", topic.totalMarks],
                ["Name", "Marks", "Comments"],
                ...(topic.students || []).map((s: any) => [s.name, s.marks !== null ? s.marks : 'AB', s.comments || ''])
            ];
            const ws = xlsx.utils.aoa_to_sheet(wsData);
            const wb = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(wb, ws, "Marks");
            xlsx.writeFile(wb, `${selectedClass}_${selectedSubject}_${topic.topicName.replace(/\//g, '-')}.xlsx`);
        } catch (e) { toast.error("Failed to download"); }
    };

    const handleDownloadTemplate = () => {
        if (!selectedClass || !selectedSubject) return;
        try {
            const wsData = [
                ["Date", uploadDate, "Total Marks", uploadTotalMarks || "100"],
                ["Name", "Marks", "Comments"],
                ...students.filter(s => s.status !== 'Deleted').map(s => [s.username, "", ""])
            ];
            const ws = xlsx.utils.aoa_to_sheet(wsData);
            const wb = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(wb, ws, "Marks");
            xlsx.writeFile(wb, `${selectedClass}_${selectedSubject}_Template.xlsx`);
        } catch (e) { toast.error("Failed to download"); }
    };

    const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Auto-populate topic name from the file name (without extension)
        const fileName = file.name;
        const topicNameFromFileName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
        setUploadTopicName(topicNameFromFileName);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = xlsx.read(bstr, { type: 'binary', cellDates: true });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data: any[] = xlsx.utils.sheet_to_json(ws, { header: 1 });
                const row1 = data[0];
                if (row1 && row1[0] === 'Date' && row1[2] === 'Total Marks') {
                    if (row1[1]) {
                        const dateObj = new Date(row1[1]);
                        if (!isNaN(dateObj.getTime())) setUploadDate(dateObj.toISOString().split('T')[0]);
                    }
                    if (row1[3] !== undefined) setUploadTotalMarks(String(row1[3]));
                }
                const studentsData = data.slice(2).map(r => ({ name: r[0], marks: r[1] !== undefined && String(r[1]).toUpperCase() !== 'AB' ? String(r[1]) : '', comments: r[2] || '' })).filter(s => s.name);
                setUploadStudents(prev => {
                    const next = [...prev];
                    studentsData.forEach(s => {
                        const idx = next.findIndex(ps => ps.name === s.name);
                        if (idx !== -1) next[idx] = { ...next[idx], marks: s.marks, comments: s.comments };
                        else next.push({ name: s.name, marks: s.marks, comments: s.comments });
                    });
                    return next;
                });
                toast.success('Excel loaded! You can now verify and save.');
                e.target.value = '';
            } catch (err) { toast.error('Failed to parse Excel'); }
        };
        reader.readAsBinaryString(file);
    };

    const handleSaveStudentMark = async (studentName: string) => {
        if (!selectedClass || !selectedSubject || !selectedTopic || !topicDetails) return;
        if (!isSubjectEditable) {
            toast.error('You do not have permission to edit marks for this subject');
            return;
        }
        const trimmed = draftStudentMarks.trim().toUpperCase();
        const parsedMarks = (trimmed === '' || trimmed === 'AB')
            ? null
            : (trimmed === 'NA' ? -1 : Number(draftStudentMarks.trim()));

        if (trimmed !== '' && trimmed !== 'AB' && trimmed !== 'NA' && (parsedMarks === null || isNaN(parsedMarks) || parsedMarks < 0 || parsedMarks > topicDetails.totalMarks)) {
            toast.error(`Enter valid marks between 0 and ${topicDetails.totalMarks} or NA`);
            return;
        }

        setIsSavingMark(true);
        try {
            const res = await fetch('/api/data/performance', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    className: selectedClass,
                    subject: selectedSubject,
                    topicName: selectedTopic,
                    studentName,
                    marks: parsedMarks,
                    comments: draftStudentComments
                })
            });
            const result = await res.json();
            if (result.success) {
                toast.success('Marks updated');
                setEditingStudentRow(null);
                await refreshBatchData();
            } else {
                toast.error(result.error || 'Failed to update marks');
            }
        } catch (error) {
            toast.error('Error updating marks');
        } finally {
            setIsSavingMark(false);
        }
    };

    const handleStartBulkEdit = () => {
        const initialDraft: Record<string, { marks: string; comments: string }> = {};
        tableData.forEach((s: any) => {
            initialDraft[s.name] = {
                marks: s.marks === -1 ? 'NA' : s.marks !== null ? String(s.marks) : '',
                comments: s.comments || ''
            };
        });
        setBulkDraft(initialDraft);
        setIsBulkEditing(true);
    };

    const handleSaveBulkMarks = async () => {
        if (!selectedClass || !selectedSubject || !selectedTopic || !topicDetails) return;
        if (!isSubjectEditable) {
            toast.error('You do not have permission to edit marks for this subject');
            return;
        }

        // Validation
        for (const [studentName, draft] of Object.entries(bulkDraft)) {
            const m = draft.marks.trim().toUpperCase();
            if (m !== '' && m !== 'AB' && m !== 'NA') {
                const num = Number(draft.marks.trim());
                if (isNaN(num) || num < 0 || num > topicDetails.totalMarks) {
                    toast.error(`Enter valid marks between 0 and ${topicDetails.totalMarks} or NA for ${studentName}`);
                    return;
                }
            }
        }

        setIsSavingBulk(true);
        try {
            const updates = Object.entries(bulkDraft).map(([studentName, draft]) => {
                const m = draft.marks.trim().toUpperCase();
                const marksValue = (m === '' || m === 'AB') 
                    ? null 
                    : (m === 'NA' ? -1 : Number(draft.marks.trim()));
                return {
                    studentName,
                    marks: marksValue,
                    comments: draft.comments.trim() || null
                };
            });

            const res = await fetch('/api/data/performance', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    isBulk: true,
                    className: selectedClass,
                    subject: selectedSubject,
                    topicName: selectedTopic,
                    updates
                })
            });

            const result = await res.json();
            if (result.success) {
                toast.success('All marks updated successfully');
                setIsBulkEditing(false);
                await refreshBatchData();
            } else {
                toast.error(result.error || 'Failed to update marks');
            }
        } catch (error) {
            toast.error('Error updating marks');
        } finally {
            setIsSavingBulk(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: 'marks' | 'remarks', index: number) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const nextInput = document.getElementById(`${field}-${index + 1}`);
            if (nextInput) {
                (nextInput as HTMLInputElement).focus();
                (nextInput as HTMLInputElement).select();
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            if (e.shiftKey) {
                if (field === 'remarks') {
                    const prevInput = document.getElementById(`marks-${index}`);
                    if (prevInput) {
                        (prevInput as HTMLInputElement).focus();
                        (prevInput as HTMLInputElement).select();
                    }
                } else {
                    const prevInput = document.getElementById(`remarks-${index - 1}`);
                    if (prevInput) {
                        (prevInput as HTMLInputElement).focus();
                        (prevInput as HTMLInputElement).select();
                    }
                }
            } else {
                if (field === 'marks') {
                    const nextInput = document.getElementById(`remarks-${index}`);
                    if (nextInput) {
                        (nextInput as HTMLInputElement).focus();
                        (nextInput as HTMLInputElement).select();
                    }
                } else {
                    const nextInput = document.getElementById(`marks-${index + 1}`);
                    if (nextInput) {
                        (nextInput as HTMLInputElement).focus();
                        (nextInput as HTMLInputElement).select();
                    }
                }
            }
        }
    };

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
                <div className="tabs">
                    <button onClick={() => setActiveTab('analysis')} className={`tab-btn ${activeTab === 'analysis' ? 'active' : ''}`}>📈 Subject Analysis</button>
                    <button onClick={() => setActiveTab('students')} className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}>🎓 Student Dashboard</button>
                    {!isRegularTeacher && (
                        <button onClick={() => setActiveTab('manage')} className={`tab-btn ${activeTab === 'manage' ? 'active' : ''}`}>👥 Class Manager</button>
                    )}
                    <button onClick={() => setActiveTab('upload')} className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}>📤 Upload Marks</button>
                    {!isRegularTeacher && (
                        <button onClick={() => setActiveTab('manage-teachers')} className={`tab-btn ${activeTab === 'manage-teachers' ? 'active' : ''}`}>👥 Manage Teachers</button>
                    )}
                </div>

                {/* Controls */}
                {activeTab !== 'manage-teachers' && (
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
                                    {classes.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
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
                                                    backgroundColor: selectedSubject === s ? (SUBJECT_COLORS[s as keyof typeof SUBJECT_COLORS] || SUBJECT_COLORS.default) : '#fff',
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
                )}

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
                                No performance data found for <strong>{selectedSubject}</strong> in <strong>{selectedClass.replace(/_/g, ' ')}</strong>.
                            </p>
                            <p style={{ color: '#cbd5e1', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                                Please upload an Excel file using the Upload Marks tab.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Stats Row */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #1a365d' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Total Topics</p>
                                        <BookOpen size={18} color="#1a365d" />
                                    </div>
                                    <p style={{ fontSize: '2rem', fontWeight: 700, color: '#1a365d' }}>{batchData.length}</p>
                                </div>
                                <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #d4942a' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Overall Class Avg</p>
                                        <TrendingUp size={18} color="#d4942a" />
                                    </div>
                                    <p style={{ fontSize: '2rem', fontWeight: 700, color: '#d4942a' }}>{overallAvg}%</p>
                                </div>
                                <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Students</p>
                                        <Users size={18} color="#10b981" />
                                    </div>
                                    <p style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>{students.filter(s => s.status !== 'Deleted').length}</p>
                                </div>
                            </div>

                            {/* Student Performance Matrix */}
                            <div className="card" style={{ marginBottom: '1.5rem', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showPerformanceMatrix ? '1rem' : 0 }}>
                                    <h3 className="card-title" style={{ margin: 0 }}>Student Performance Overview</h3>
                                    <button
                                        onClick={() => setShowPerformanceMatrix(!showPerformanceMatrix)}
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                                    >
                                        {showPerformanceMatrix ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </button>
                                </div>
                                {showPerformanceMatrix && (
                                    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '400px', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
                                        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', position: 'relative' }}>
                                            <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8fafc', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                                <tr>
                                                    <th style={{ position: 'sticky', left: 0, zIndex: 11, backgroundColor: '#f8fafc', textAlign: 'left', padding: '0.75rem 1rem', color: '#64748b', fontWeight: 600, borderBottom: '2px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}>Student Name</th>
                                                    {batchData.map((topic, index) => (
                                                        <th key={index} style={{ textAlign: 'center', padding: '0.75rem 1rem', color: '#64748b', fontWeight: 600, minWidth: '80px', borderBottom: '2px solid #e2e8f0' }}>
                                                            {topic.topicName} (%)
                                                        </th>
                                                    ))}
                                                    <th style={{ textAlign: 'center', padding: '0.75rem 1rem', color: '#64748b', fontWeight: 600, minWidth: '90px', borderBottom: '2px solid #e2e8f0' }}>Avg (%)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pivotTableData.map((student, idx) => (
                                                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                                        <td style={{ position: 'sticky', left: 0, zIndex: 5, backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc', padding: '0.75rem 1rem', fontWeight: 500, color: '#334155', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #f1f5f9' }}>{student.name}</td>
                                                        {batchData.map((topic, tIdx) => {
                                                            const mark = student.testMarks[topic.topicName];
                                                            return (
                                                                <td key={tIdx} style={{ textAlign: 'center', padding: '0.75rem 1rem', color: mark !== null && mark !== undefined ? '#334155' : '#cbd5e1', borderBottom: '1px solid #f1f5f9' }}>
                                                                    {mark !== null && mark !== undefined ? (mark === 'NA' ? 'NA' : `${mark}%`) : 'AB'}
                                                                </td>
                                                            );
                                                        })}
                                                        <td style={{ textAlign: 'center', padding: '0.75rem 1rem', fontWeight: 600, color: '#1a365d', borderBottom: '1px solid #f1f5f9' }}>
                                                            {student.averagePercentage === -2 ? 'NA' : student.averagePercentage === -1 ? 'AB' : `${Number(student.averagePercentage).toFixed(1)}%`}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
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
                                                                backgroundColor: '#fef3c7',
                                                                color: '#d4942a',
                                                                fontWeight: 600
                                                            }}>
                                                                {topic.classAveragePercentage}%
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'center', padding: '0.75rem 1rem', color: '#10b981', fontWeight: 600 }}>{topic.topperPercentage}%</td>
                                                        <td style={{ textAlign: 'right', padding: '0.75rem 1rem' }}>
                                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                                <button
                                                                    onClick={() => handleDownloadTopic(topic)}
                                                                    title="Download Excel"
                                                                    style={{ border: 'none', background: 'transparent', color: '#10b981', cursor: 'pointer', padding: '0.25rem' }}
                                                                >
                                                                    <Download size={16} />
                                                                </button>
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
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ width: '100%', height: 320 }} key={viewMode}>
                                            <FullScreenChart height={320}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={chartData} margin={{ top: 15, right: 20, left: 0, bottom: 40 }} onClick={(e) => {
                                                        if (e && e.activeLabel) setSelectedTopic(String(e.activeLabel));
                                                    }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                        <XAxis dataKey="topic" tick={{ fontSize: 11, fill: '#64748b', dy: 20, dx: -5 }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} angle={-45} textAnchor="end" height={Math.min(Math.max(60, Math.max(...chartData.map(d => d.topic ? d.topic.length : 0), 10) * 4), 120)} />
                                                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} unit="%" />
                                                        <Tooltip
                                                            contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '0.85rem' }}
                                                            formatter={(value: any, name: any) => [`${value}%`, name]}
                                                        />
                                                        <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '0.85rem' }} />
                                                        <Line type="monotone" dataKey="Class Average" stroke="#d4942a" strokeWidth={3} dot={{ r: 4, fill: '#d4942a' }} activeDot={{ r: 6 }} />
                                                        <Line type="monotone" dataKey="Topper" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </FullScreenChart>
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
                                        {isEditingTopicDetails ? (
                                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Topic Name</label>
                                                    <input type="text" value={editTopicName} onChange={e => setEditTopicName(e.target.value)} style={{ padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem', outline: 'none' }} />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Date</label>
                                                    <input type="date" value={editTopicDate} onChange={e => setEditTopicDate(e.target.value)} style={{ padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem', outline: 'none' }} />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Total Marks</label>
                                                    <input type="number" value={editTopicTotalMarks} onChange={e => setEditTopicTotalMarks(e.target.value)} style={{ padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem', outline: 'none', width: '80px' }} />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Subject</label>
                                                    <select value={editTopicSubject} onChange={e => setEditTopicSubject(e.target.value)} style={{ padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem', outline: 'none' }}>
                                                        {subjects.filter(s => s !== 'Combined').map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.2rem' }}>
                                                    <button onClick={handleSaveTopicDetails} disabled={isSavingTopicDetails} style={{ padding: '0.4rem 0.8rem', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>Save</button>
                                                    <button onClick={() => setIsEditingTopicDetails(false)} disabled={isSavingTopicDetails} style={{ padding: '0.4rem 0.8rem', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>Cancel</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: 0, fontFamily: 'Outfit, sans-serif' }}>
                                                            {selectedTopic}
                                                        </h3>
                                                        {isSubjectEditable && (
                                                            <button onClick={() => {
                                                                setEditTopicName(selectedTopic || '');
                                                                setEditTopicDate(topicDetails.date ? new Date(topicDetails.date).toISOString().split('T')[0] : '');
                                                                setEditTopicTotalMarks(String(topicDetails.totalMarks));
                                                                setEditTopicSubject(selectedSubject);
                                                                setIsEditingTopicDetails(true);
                                                            }} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Edit Test Details">
                                                                <Edit2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
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
                                                        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#7c3aed' }}>{topicDetails.classAveragePercentage ?? 0}%</span>
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
                                                    {isSubjectEditable && (
                                                        isBulkEditing ? (
                                                            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '0.5rem' }}>
                                                                <button
                                                                    onClick={handleSaveBulkMarks}
                                                                    disabled={isSavingBulk}
                                                                    style={{
                                                                        backgroundColor: '#10b981',
                                                                        border: 'none', padding: '0.5rem 1rem',
                                                                        borderRadius: '0.5rem', cursor: 'pointer',
                                                                        color: '#fff',
                                                                        fontSize: '0.85rem', fontWeight: 600,
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                >
                                                                    {isSavingBulk ? 'Saving...' : 'Save'}
                                                                </button>
                                                                <button
                                                                    onClick={() => setIsBulkEditing(false)}
                                                                    disabled={isSavingBulk}
                                                                    style={{
                                                                        backgroundColor: '#ef4444',
                                                                        border: 'none', padding: '0.5rem 1rem',
                                                                        borderRadius: '0.5rem', cursor: 'pointer',
                                                                        color: '#fff',
                                                                        fontSize: '0.85rem', fontWeight: 600,
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={handleStartBulkEdit}
                                                                style={{
                                                                    backgroundColor: '#f1f5f9',
                                                                    border: '1px solid #cbd5e1', padding: '0.5rem 1rem',
                                                                    borderRadius: '0.5rem', cursor: 'pointer',
                                                                    color: '#475569',
                                                                    fontSize: '0.85rem', fontWeight: 600,
                                                                    transition: 'all 0.2s',
                                                                    marginLeft: '0.5rem'
                                                                }}
                                                            >
                                                                Bulk Edit
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            </>
                                        )}
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
                                                    <th style={{ padding: '0.75rem', textAlign: 'center', width: '80px' }}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {tableData.sort((a: any, b: any) => (a.rank || 999) - (b.rank || 999)).map((student: any, idx: number) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                                        <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', color: '#7c3aed' }}>{student.rank !== null ? `#${student.rank}` : '-'}</td>
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
                                                            {isBulkEditing ? (
                                                                <input
                                                                    id={`marks-${idx}`}
                                                                    type="text"
                                                                    value={bulkDraft[student.name]?.marks ?? ''}
                                                                    onChange={e => setBulkDraft(prev => ({
                                                                        ...prev,
                                                                        [student.name]: {
                                                                            ...prev[student.name],
                                                                            marks: e.target.value
                                                                        }
                                                                    }))}
                                                                    onKeyDown={e => handleKeyDown(e, 'marks', idx)}
                                                                    style={{ width: '60px', padding: '0.25rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem', textAlign: 'center' }}
                                                                    placeholder="AB"
                                                                />
                                                            ) : editingStudentRow === student.name ? (
                                                                <input type="text" value={draftStudentMarks} onChange={e => setDraftStudentMarks(e.target.value)} style={{ width: '50px', padding: '0.25rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }} disabled={isSavingMark} placeholder="AB" />
                                                            ) : (
                                                                student.marks === -1 ? (
                                                                    <span style={{ fontWeight: 600, color: '#64748b' }}>NA</span>
                                                                ) : (
                                                                    <>{student.marks ?? '-'} <span style={{ fontSize: '0.8em', opacity: 0.7 }}>/ {student.totalMarks}</span></>
                                                                )
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                            {student.marks !== null && student.marks !== -1 ? (
                                                                <span style={{
                                                                    display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '1rem',
                                                                    backgroundColor: getColorForMark(student.marks, highCutoff, lowCutoff).bg,
                                                                    color: getColorForMark(student.marks, highCutoff, lowCutoff).text,
                                                                    fontWeight: 600, fontSize: '0.8rem'
                                                                }}>
                                                                    {student.percentage ? `${student.percentage}%` : '-'}
                                                                </span>
                                                            ) : student.marks === -1 ? (
                                                                <span style={{ color: '#94a3b8' }}>NA</span>
                                                            ) : '-'}
                                                        </td>
                                                        <td style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.85rem' }}>
                                                            {isBulkEditing ? (
                                                                <input
                                                                    id={`remarks-${idx}`}
                                                                    type="text"
                                                                    value={bulkDraft[student.name]?.comments ?? ''}
                                                                    onChange={e => setBulkDraft(prev => ({
                                                                        ...prev,
                                                                        [student.name]: {
                                                                            ...prev[student.name],
                                                                            comments: e.target.value
                                                                        }
                                                                    }))}
                                                                    onKeyDown={e => handleKeyDown(e, 'remarks', idx)}
                                                                    style={{ width: '100%', padding: '0.25rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }}
                                                                    placeholder="Remarks"
                                                                />
                                                            ) : editingStudentRow === student.name ? (
                                                                <input type="text" value={draftStudentComments} onChange={e => setDraftStudentComments(e.target.value)} style={{ width: '100%', padding: '0.25rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }} disabled={isSavingMark} placeholder="Remarks" />
                                                            ) : (
                                                                student.comments || '-'
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                            {isBulkEditing ? (
                                                                <span style={{ color: '#cbd5e1' }}>-</span>
                                                            ) : editingStudentRow === student.name ? (
                                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                                    <button onClick={() => handleSaveStudentMark(student.name)} disabled={isSavingMark} style={{ color: '#10b981', border: 'none', background: 'transparent', cursor: 'pointer' }} title="Save"><UploadCloud size={16} /></button>
                                                                    <button onClick={() => setEditingStudentRow(null)} disabled={isSavingMark} style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer' }} title="Cancel">✕</button>
                                                                </div>
                                                            ) : isSubjectEditable ? (
                                                                <button onClick={() => { setEditingStudentRow(student.name); setDraftStudentMarks(student.marks === -1 ? 'NA' : student.marks !== null ? String(student.marks) : ''); setDraftStudentComments(student.comments || ''); }} style={{ color: '#64748b', border: 'none', background: 'transparent', cursor: 'pointer' }} title="Edit Marks"><Edit2 size={16} /></button>
                                                            ) : (
                                                                <span style={{ color: '#cbd5e1' }}>-</span>
                                                            )}
                                                        </td>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 className="card-title" style={{ margin: 0 }}>Manage Students for: {selectedClass ? selectedClass.replace(/_/g, ' ') : 'None'}</h3>
                            <button
                                onClick={() => setShowAddClassModal(true)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    backgroundColor: '#7c3aed',
                                    border: 'none',
                                    color: '#fff',
                                    borderRadius: '0.5rem',
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                }}
                            >
                                + Add Class
                            </button>
                        </div>

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
                                                <th style={{ padding: '0.75rem 1rem' }}>Email</th>
                                                <th style={{ padding: '0.75rem 1rem' }}>Password</th>
                                                <th style={{ padding: '0.75rem 1rem', width: '80px', textAlign: 'center' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {students.filter(s => s.status !== 'Deleted').map((student, idx) => (
                                                <tr key={student.username} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 !== 0 ? '#f8fafc' : '#ffffff' }}>
                                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{student.rollNo || '-'}</td>
                                                    <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                                                        {editingStudentName === student.username ? (
                                                            <input
                                                                type="text"
                                                                value={editedStudentNameValue}
                                                                onChange={e => setEditedStudentNameValue(e.target.value)}
                                                                placeholder="Name"
                                                                style={{ padding: '0.4rem', borderRadius: '0.3rem', border: '1px solid #cbd5e1', width: '100%', outline: 'none' }}
                                                            />
                                                        ) : (
                                                            student.username
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                                                        {editingStudentName === student.username ? (
                                                            <input
                                                                type="text"
                                                                value={editedStudentEmailValue}
                                                                onChange={e => setEditedStudentEmailValue(e.target.value)}
                                                                placeholder="Email"
                                                                style={{ padding: '0.4rem', borderRadius: '0.3rem', border: '1px solid #cbd5e1', width: '100%', outline: 'none' }}
                                                            />
                                                        ) : (
                                                            student.email || '-'
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                                                        {editingStudentName === student.username ? (
                                                            <input
                                                                type="text"
                                                                value={editedStudentPasswordValue}
                                                                onChange={e => setEditedStudentPasswordValue(e.target.value)}
                                                                placeholder="Password"
                                                                style={{ padding: '0.4rem', borderRadius: '0.3rem', border: '1px solid #cbd5e1', width: '100%', outline: 'none' }}
                                                            />
                                                        ) : (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <span style={{ fontFamily: 'monospace', letterSpacing: '0.1em', color: revealedPasswords.has(student.username) ? '#334155' : '#94a3b8' }}>
                                                                    {revealedPasswords.has(student.username) ? (student.password || '—') : '••••••'}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setRevealedPasswords(prev => {
                                                                        const next = new Set(prev);
                                                                        if (next.has(student.username)) next.delete(student.username);
                                                                        else next.add(student.username);
                                                                        return next;
                                                                    })}
                                                                    title={revealedPasswords.has(student.username) ? 'Hide password' : 'Show password'}
                                                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.15rem', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                                                                >
                                                                    {revealedPasswords.has(student.username) ? (
                                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
                                                                        </svg>
                                                                    ) : (
                                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                                                                        </svg>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                                        {editingStudentName === student.username ? (
                                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                                <button
                                                                    onClick={async () => {
                                                                        if (!editedStudentNameValue.trim()) {
                                                                            setEditingStudentName(null);
                                                                            return;
                                                                        }
                                                                        // BUG-14 FIX: save even if only password or email changed
                                                                        const nameChanged = editedStudentNameValue.trim() !== student.username;
                                                                        const passwordChanged = editedStudentPasswordValue !== (student.password || '');
                                                                        const emailChanged = editedStudentEmailValue !== (student.email || '');
                                                                        if (!nameChanged && !passwordChanged && !emailChanged) {
                                                                            setEditingStudentName(null);
                                                                            return;
                                                                        }
                                                                        setIsManagingStudentAction(true);
                                                                        try {
                                                                            const res = await fetch('/api/admin/students', {
                                                                                method: 'PATCH',
                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                body: JSON.stringify({ action: 'update', studentName: student.username, newName: editedStudentNameValue.trim(), password: editedStudentPasswordValue, email: editedStudentEmailValue, className: selectedClass })
                                                                            });
                                                                            const json = await res.json();
                                                                            if (json.success) {
                                                                                toast.success('Student details updated successfully');
                                                                                setEditingStudentName(null);
                                                                                await refreshStudents();
                                                                            } else {
                                                                                toast.error(json.error || 'Failed to update student');
                                                                            }
                                                                        } catch (err) {
                                                                            toast.error('Error updating student');
                                                                        }
                                                                        setIsManagingStudentAction(false);
                                                                    }}
                                                                    disabled={isManagingStudentAction}
                                                                    style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', outline: 'none' }}
                                                                    title="Save"
                                                                >
                                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingStudentName(null)}
                                                                    disabled={isManagingStudentAction}
                                                                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', outline: 'none' }}
                                                                    title="Cancel"
                                                                >
                                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingStudentName(student.username);
                                                                        setEditedStudentNameValue(student.username);
                                                                        setEditedStudentEmailValue(student.email || '');
                                                                        setEditedStudentPasswordValue(student.password || '');
                                                                    }}
                                                                    style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', outline: 'none' }}
                                                                    title="Edit Student Name"
                                                                >
                                                                    <Edit2 size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteStudent(student.username)}
                                                                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', outline: 'none' }}
                                                                    title="Delete Student"
                                                                >
                                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" /></svg>
                                                                </button>
                                                            </div>
                                                        )}
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
                                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                            <button
                                                                onClick={() => handleRestoreStudent(student.username)}
                                                                style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', outline: 'none' }}
                                                                title="Restore Student"
                                                            >
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h10a5 5 0 015 5v2M3 10l6 6m-6-6l6-6" /></svg>
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (!window.confirm(`Are you sure you want to PERMANENTLY delete ${student.username}? This cannot be undone.`)) return;
                                                                    try {
                                                                        const res = await fetch('/api/admin/students', {
                                                                            method: 'DELETE',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({ studentName: student.username, className: selectedClass, permanent: true })
                                                                        });
                                                                        const result = await res.json();
                                                                        if (result.success) {
                                                                            await refreshStudents();
                                                                            toast.success(`Permanently deleted ${student.username}.`);
                                                                        } else {
                                                                            toast.error(result.error || 'Failed to delete student');
                                                                        }
                                                                    } catch (error) {
                                                                        console.error(error);
                                                                        toast.error('Error permanently deleting student');
                                                                    }
                                                                }}
                                                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', outline: 'none' }}
                                                                title="Permanently Delete Student"
                                                            >
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" /></svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        <hr style={{ border: 'none', borderTop: '2px solid #e2e8f0', margin: '2rem 0' }} />

                        <div id='manage-classes-section' style={{ marginBottom: '2rem' }}>
                            <h3 className="card-title" style={{ marginBottom: '1rem' }}>Manage Classes</h3>

                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.5rem', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Add New Class Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., 11_A"
                                        value={newClassNameInput}
                                        onChange={e => setNewClassNameInput(e.target.value)}
                                        style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none' }}
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        if (newClassNameInput.trim()) {
                                            const formattedClass = newClassNameInput.trim().toUpperCase().startsWith('CLASS_') ? newClassNameInput.trim() : `Class_${newClassNameInput.trim()}`;
                                            if (!classes.includes(formattedClass)) {
                                                setClasses([...classes, formattedClass]);
                                                setSelectedClass(formattedClass);
                                                setNewClassNameInput('');
                                                toast.success('Class added locally! Add a student to save it permanently.');
                                            } else {
                                                toast.error('Class already exists');
                                            }
                                        }
                                    }}
                                    disabled={!newClassNameInput.trim()}
                                    style={{ padding: '0.6rem 1.5rem', backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: !newClassNameInput.trim() ? 'not-allowed' : 'pointer', opacity: !newClassNameInput.trim() ? 0.7 : 1, height: '42px' }}
                                >
                                    + Add Class
                                </button>
                            </div>

                            <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                                <table className="data-table" style={{ width: '100%', backgroundColor: '#fff' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b' }}>
                                            <th style={{ padding: '0.75rem 1rem' }}>Class Name</th>
                                            <th style={{ padding: '0.75rem 1rem', width: '150px', textAlign: 'center' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {classes.map((cls, idx) => (
                                            <tr key={cls} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 !== 0 ? '#f8fafc' : '#ffffff' }}>
                                                <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>
                                                    {editingClass === cls ? (
                                                        <input
                                                            type="text"
                                                            value={editedClassName}
                                                            onChange={e => setEditedClassName(e.target.value)}
                                                            style={{ padding: '0.4rem', borderRadius: '0.3rem', border: '1px solid #cbd5e1', width: '100%', outline: 'none' }}
                                                        />
                                                    ) : (
                                                        cls.replace('Class_', '')
                                                    )}
                                                </td>
                                                <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                                    {editingClass === cls ? (
                                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                            <button
                                                                onClick={async () => {
                                                                    if (!editedClassName.trim() || editedClassName === cls.replace('Class_', '')) {
                                                                        setEditingClass(null);
                                                                        return;
                                                                    }
                                                                    const newFormatted = editedClassName.toUpperCase().startsWith('CLASS_') ? editedClassName : `Class_${editedClassName}`;
                                                                    setIsManagingClassAction(true);
                                                                    try {
                                                                        const res = await fetch('/api/admin/classes', {
                                                                            method: 'PATCH',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({ oldClassName: cls, newClassName: newFormatted })
                                                                        });
                                                                        const json = await res.json();
                                                                        if (json.success) {
                                                                            toast.success('Class renamed successfully');
                                                                            setEditingClass(null);
                                                                            if (selectedClass === cls) setSelectedClass(newFormatted);
                                                                            await fetchClasses();
                                                                        } else {
                                                                            toast.error(json.error || 'Failed to rename class');
                                                                        }
                                                                    } catch (err) {
                                                                        toast.error('Error renaming class');
                                                                    }
                                                                    setIsManagingClassAction(false);
                                                                }}
                                                                disabled={isManagingClassAction}
                                                                style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', outline: 'none' }}
                                                                title="Save"
                                                            >
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingClass(null)}
                                                                disabled={isManagingClassAction}
                                                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', outline: 'none' }}
                                                                title="Cancel"
                                                            >
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingClass(cls);
                                                                    setEditedClassName(cls.replace('Class_', ''));
                                                                }}
                                                                style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', outline: 'none' }}
                                                                title="Edit Class Name"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (!window.confirm(`Are you sure you want to PERMANENTLY delete class "${cls.replace('Class_', '')}" and ALL its data?`)) return;
                                                                    setIsManagingClassAction(true);
                                                                    try {
                                                                        const res = await fetch('/api/admin/classes', {
                                                                            method: 'DELETE',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({ className: cls })
                                                                        });
                                                                        const json = await res.json();
                                                                        if (json.success) {
                                                                            toast.success('Class deleted successfully');
                                                                            if (selectedClass === cls) setSelectedClass('');
                                                                            await fetchClasses();
                                                                        } else {
                                                                            toast.error(json.error || 'Failed to delete class');
                                                                        }
                                                                    } catch (err) {
                                                                        toast.error('Error deleting class');
                                                                    }
                                                                    setIsManagingClassAction(false);
                                                                }}
                                                                disabled={isManagingClassAction}
                                                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', outline: 'none' }}
                                                                title="Delete Class"
                                                            >
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" /></svg>
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                )}
                {activeTab === 'upload' && (
                    <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                        {!isSubjectEditable && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '1rem 1.5rem',
                                backgroundColor: '#fffbeb',
                                border: '1px solid #fef3c7',
                                borderRadius: '0.5rem',
                                color: '#b45309',
                                marginBottom: '1.5rem',
                                fontSize: '0.9rem',
                                fontWeight: 500
                            }}>
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                    <line x1="12" y1="9" x2="12" y2="13"></line>
                                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                </svg>
                                <span>
                                    You are viewing this subject in <strong>read-only mode</strong> because you are not assigned as the teacher for <strong>{selectedSubject}</strong> in <strong>{selectedClass.replace(/_/g, ' ')}</strong>.
                                </span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <h3 className="card-title" style={{ margin: 0 }}>Upload Marks: {selectedClass.replace(/_/g, ' ')} - {selectedSubject}</h3>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {isSubjectEditable && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={handleDownloadTemplate}
                                            style={{
                                                backgroundColor: '#fff', border: '1px solid #cbd5e1', padding: '0.4rem 0.8rem',
                                                borderRadius: '0.5rem', cursor: 'pointer', color: '#475569', fontSize: '0.85rem', fontWeight: 600,
                                                display: 'flex', alignItems: 'center', gap: '0.4rem'
                                            }}
                                        >
                                            <FileSpreadsheet size={16} /> Sample Template
                                        </button>
                                        <label style={{
                                            backgroundColor: '#7c3aed', border: 'none', padding: '0.4rem 0.8rem',
                                            borderRadius: '0.5rem', cursor: 'pointer', color: '#fff', fontSize: '0.85rem', fontWeight: 600,
                                            display: 'flex', alignItems: 'center', gap: '0.4rem'
                                        }}>
                                            <UploadCloud size={16} /> Upload Excel
                                            <input type="file" accept=".xlsx, .xls" onChange={handleExcelUpload} style={{ display: 'none' }} />
                                        </label>
                                    </>
                                )}
                                <button
                                    onClick={() => {
                                        setCustomHighCutoff(uploadHighCutoff !== null ? Number(uploadHighCutoff.toFixed(2)) : null);
                                        setCustomLowCutoff(uploadLowCutoff !== null ? Number(uploadLowCutoff.toFixed(2)) : null);
                                        setShowCutoffModal(!showCutoffModal);

                                        // Sort Table by Marks descending
                                        if (!showCutoffModal) {
                                            setUploadStudents(prev => [...prev].sort((a, b) => {
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
                                        disabled={!isSubjectEditable}
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
                                        disabled={!isSubjectEditable}
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
                                        disabled={!isSubjectEditable}
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
                                                        type="text"
                                                        value={student.marks}
                                                        disabled={!isSubjectEditable}
                                                        onChange={e => {
                                                            const newStudents = [...uploadStudents];
                                                            newStudents[idx].marks = e.target.value;
                                                            setUploadStudents(newStudents);
                                                        }}
                                                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }}
                                                        placeholder="AB"
                                                    />
                                                </td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    <input
                                                        type="text"
                                                        value={student.comments}
                                                        disabled={!isSubjectEditable}
                                                        onChange={e => {
                                                            const newStudents = [...uploadStudents];
                                                            newStudents[idx].comments = e.target.value;
                                                            setUploadStudents(newStudents);
                                                        }}
                                                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                    {student.marks !== '' && !isNaN(Number(student.marks)) && Number(student.marks) !== -1 ? (
                                                        <span style={{
                                                            display: 'inline-block', width: '2rem', height: '2rem', borderRadius: '50%',
                                                            backgroundColor: getColorForMark(Number(student.marks), uploadHighCutoff, uploadLowCutoff).bg,
                                                            border: `2px solid ${getColorForMark(Number(student.marks), uploadHighCutoff, uploadLowCutoff).text}`
                                                        }}></span>
                                                    ) : (
                                                        <span style={{ color: '#94a3b8' }}>{String(student.marks || '').toUpperCase() === 'NA' ? 'NA' : 'AB'}</span>
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
                                    disabled={isUploading || !isSubjectEditable}
                                    style={{
                                        padding: '0.75rem 2rem', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '0.5rem',
                                        fontWeight: 600, cursor: (isUploading || !isSubjectEditable) ? 'not-allowed' : 'pointer', opacity: (isUploading || !isSubjectEditable) ? 0.6 : 1,
                                        fontSize: '1rem'
                                    }}
                                >
                                    {isUploading ? 'Uploading...' : 'Save Data'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {activeTab === 'manage-teachers' && (
                    <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                        {/* Section 1: Teacher Mappings (Mapping) */}
                        <div style={{ marginBottom: '2.5rem' }}>
                            <h3 className="card-title" style={{ marginBottom: '1.25rem' }}>Teacher Mappings</h3>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
                                Assign class and subject combinations to teachers. Teachers can only edit/upload data for their assigned subjects (though they can view all subjects of a class they teach).
                            </p>
                            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
                                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Teacher</th>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Assigned Mappings</th>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', width: '380px' }}>Assign New Mapping</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teachersList.map((teacher, idx) => {
                                            const teacherMaps = teacherMappings
                                                .filter(m => m.teacher_username.toLowerCase() === teacher.name.toLowerCase())
                                                .filter(m => m.subject !== 'Combined');
                                            return (
                                                <tr key={teacher.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#334155' }}>
                                                        {teacher.name}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem' }}>
                                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                            {teacherMaps.length === 0 ? (
                                                                <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No mappings assigned</span>
                                                            ) : (
                                                                teacherMaps.map(m => (
                                                                    <span
                                                                        key={m.id}
                                                                        style={{
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: '0.35rem',
                                                                            padding: '0.2rem 0.6rem',
                                                                            backgroundColor: '#f3f0ff',
                                                                            color: '#7c3aed',
                                                                            borderRadius: '0.5rem',
                                                                            fontSize: '0.8rem',
                                                                            fontWeight: 600
                                                                        }}
                                                                    >
                                                                        {m.class_name.replace('Class_', '')} - {m.subject}
                                                                        <button
                                                                            onClick={() => handleDeleteMapping(m.teacher_username, m.class_name, m.subject)}
                                                                            style={{
                                                                                background: 'transparent',
                                                                                border: 'none',
                                                                                color: '#94a3b8',
                                                                                cursor: 'pointer',
                                                                                fontSize: '0.9rem',
                                                                                padding: '0 0 0 0.2rem',
                                                                                fontWeight: 700,
                                                                                display: 'flex',
                                                                                alignItems: 'center'
                                                                            }}
                                                                            title="Delete Mapping"
                                                                        >
                                                                            ×
                                                                        </button>
                                                                    </span>
                                                                ))
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                                <select
                                                                    value={selectedTeacherClasses[teacher.name] || ''}
                                                                    onChange={e => {
                                                                        const newClass = e.target.value;
                                                                        setSelectedTeacherClasses(prev => ({ ...prev, [teacher.name]: newClass }));
                                                                        setSelectedTeacherSubjectsMulti(prev => ({ ...prev, [teacher.name]: [] }));
                                                                    }}
                                                                    style={{
                                                                        padding: '0.4rem 0.5rem',
                                                                        border: '1px solid #cbd5e1',
                                                                        borderRadius: '0.375rem',
                                                                        fontSize: '0.85rem',
                                                                        outline: 'none',
                                                                        backgroundColor: '#fff',
                                                                        flex: 1
                                                                    }}
                                                                >
                                                                    <option value="">Select Class</option>
                                                                    {classes.map(c => <option key={c} value={c}>{c.replace('Class_', '')}</option>)}
                                                                </select>
                                                                <button
                                                                    onClick={() => handleAddMultiMapping(teacher.name)}
                                                                    disabled={!selectedTeacherClasses[teacher.name] || !(selectedTeacherSubjectsMulti[teacher.name]?.length)}
                                                                    style={{
                                                                        padding: '0.4rem 0.8rem',
                                                                        backgroundColor: '#7c3aed',
                                                                        color: '#fff',
                                                                        border: 'none',
                                                                        borderRadius: '0.375rem',
                                                                        fontWeight: 600,
                                                                        fontSize: '0.85rem',
                                                                        cursor: 'pointer',
                                                                        opacity: (!selectedTeacherClasses[teacher.name] || !(selectedTeacherSubjectsMulti[teacher.name]?.length)) ? 0.6 : 1,
                                                                        transition: 'opacity 0.2s'
                                                                    }}
                                                                >
                                                                    + Add
                                                                </button>
                                                            </div>
                                                            
                                                            {selectedTeacherClasses[teacher.name] && (
                                                                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                                                    {getDynamicSubjectsForClass(selectedTeacherClasses[teacher.name]).map(s => {
                                                                        const isSelected = selectedTeacherSubjectsMulti[teacher.name]?.includes(s);
                                                                        return (
                                                                            <button
                                                                                key={s}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setSelectedTeacherSubjectsMulti(prev => {
                                                                                        const current = prev[teacher.name] || [];
                                                                                        const next = current.includes(s)
                                                                                            ? current.filter(item => item !== s)
                                                                                            : [...current, s];
                                                                                        return { ...prev, [teacher.name]: next };
                                                                                    });
                                                                                }}
                                                                                style={{
                                                                                    padding: '0.25rem 0.5rem',
                                                                                    borderRadius: '0.375rem',
                                                                                    fontSize: '0.78rem',
                                                                                    fontWeight: 600,
                                                                                    border: isSelected ? 'none' : '1px solid #cbd5e1',
                                                                                    backgroundColor: isSelected ? '#7c3aed' : '#fff',
                                                                                    color: isSelected ? '#fff' : '#475569',
                                                                                    cursor: 'pointer',
                                                                                    transition: 'all 0.15s'
                                                                                }}
                                                                            >
                                                                                {s}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <hr style={{ border: 'none', borderTop: '2px solid #e2e8f0', margin: '2rem 0' }} />

                        {/* Section 2: Teacher Data */}
                        <div>
                            <h3 className="card-title" style={{ marginBottom: '1.25rem' }}>Teacher Accounts</h3>
                            
                            <form onSubmit={handleAddNewTeacher} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '2rem', padding: '1.25rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Add New Teacher Name</label>
                                    <input
                                        type="text"
                                        value={newTeacherName}
                                        onChange={e => setNewTeacherName(e.target.value)}
                                        placeholder="Teacher name..."
                                        style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.9rem', outline: 'none' }}
                                        required
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Temporary Password</label>
                                    <input
                                        type="text"
                                        value={newTeacherPassword}
                                        onChange={e => setNewTeacherPassword(e.target.value)}
                                        placeholder="Password..."
                                        style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.9rem', outline: 'none' }}
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isAddingTeacherAction || !newTeacherName.trim() || !newTeacherPassword.trim()}
                                    style={{
                                        padding: '0.55rem 1.5rem', backgroundColor: '#7c3aed', color: '#fff', border: 'none', borderRadius: '0.375rem',
                                        fontWeight: 600, cursor: (isAddingTeacherAction || !newTeacherName.trim() || !newTeacherPassword.trim()) ? 'not-allowed' : 'pointer', opacity: (isAddingTeacherAction || !newTeacherName.trim() || !newTeacherPassword.trim()) ? 0.7 : 1,
                                        height: '38px'
                                    }}
                                >
                                    {isAddingTeacherAction ? 'Adding...' : 'Add Teacher'}
                                </button>
                            </form>

                            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
                                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Teacher Name</th>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Password</th>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'center', width: '150px' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teachersList.map((teacher, idx) => (
                                            <tr key={teacher.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                                <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>
                                                    {editingTeacherNameId === teacher.id ? (
                                                        <input
                                                            type="text"
                                                            value={editedTeacherNameVal}
                                                            onChange={e => setEditedTeacherNameVal(e.target.value)}
                                                            style={{ padding: '0.4rem', borderRadius: '0.3rem', border: '1px solid #cbd5e1', width: '100%', outline: 'none' }}
                                                        />
                                                    ) : (
                                                        teacher.name
                                                    )}
                                                </td>
                                                <td style={{ padding: '0.75rem 1rem' }}>
                                                    {editingTeacherNameId === teacher.id ? (
                                                        <input
                                                            type="text"
                                                            value={editedTeacherPasswordVal}
                                                            onChange={e => setEditedTeacherPasswordVal(e.target.value)}
                                                            style={{ padding: '0.4rem', borderRadius: '0.3rem', border: '1px solid #cbd5e1', width: '100%', outline: 'none' }}
                                                        />
                                                    ) : (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <span style={{ fontFamily: 'monospace', letterSpacing: '0.1em', color: revealedPasswords.has(teacher.name) ? '#334155' : '#94a3b8' }}>
                                                                {revealedPasswords.has(teacher.name) ? (teacher.password || '—') : '••••••'}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setRevealedPasswords(prev => {
                                                                    const next = new Set(prev);
                                                                    if (next.has(teacher.name)) next.delete(teacher.name);
                                                                    else next.add(teacher.name);
                                                                    return next;
                                                                })}
                                                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.15rem', display: 'flex', alignItems: 'center' }}
                                                            >
                                                                {revealedPasswords.has(teacher.name) ? 'Hide' : 'Show'}
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                                    {editingTeacherNameId === teacher.id ? (
                                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                            <button
                                                                onClick={() => handleSaveTeacherEdit(teacher)}
                                                                style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer' }}
                                                                title="Save"
                                                            >
                                                                ✓
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingTeacherNameId(null)}
                                                                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                                                                title="Cancel"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingTeacherNameId(teacher.id);
                                                                    setEditedTeacherNameVal(teacher.name);
                                                                    setEditedTeacherPasswordVal(teacher.password);
                                                                }}
                                                                style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer' }}
                                                                title="Edit Teacher"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteTeacher(teacher.name)}
                                                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                                                title="Delete Teacher"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}



                {/* ── DELETE MAPPING CONFIRMATION MODAL ── */}
                {mappingToDelete !== null && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                        <div style={{ background: '#fff', padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div style={{ background: '#fee2e2', color: '#ef4444', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16"></path></svg>
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b', fontFamily: 'Outfit, sans-serif' }}>Remove Mapping</h3>
                            </div>
                            <p style={{ color: '#475569', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                                Are you sure you want to remove the mapping <strong>{mappingToDelete.className.replace('Class_', '')} - {mappingToDelete.subject}</strong> for <strong>{mappingToDelete.teacherUsername}</strong>?
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                <button onClick={() => setMappingToDelete(null)} style={{ padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', background: '#fff', color: '#475569', cursor: 'pointer', fontWeight: 500 }}>
                                    Cancel
                                </button>
                                <button onClick={confirmDeleteMapping} style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '0.5rem', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Class Modal */}
                {showAddClassModal && (
                    <div
                        style={{
                            position: 'fixed', inset: 0, zIndex: 3000,
                            backgroundColor: 'rgba(15, 23, 42, 0.55)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '1rem', backdropFilter: 'blur(4px)',
                        }}
                        onClick={e => { if (e.target === e.currentTarget) setShowAddClassModal(false); }}
                    >
                        <div style={{
                            background: '#fff', borderRadius: '1rem',
                            padding: '2rem', width: '100%', maxWidth: '400px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                        }}>
                            <h3 style={{ margin: '0 0 1rem', fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', fontFamily: 'Outfit, sans-serif' }}>Add New Class</h3>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Class Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 11_A"
                                    value={newClassNameModalInput}
                                    onChange={e => setNewClassNameModalInput(e.target.value)}
                                    style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '0.6rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => { setShowAddClassModal(false); setNewClassNameModalInput(''); }}
                                    style={{ padding: '0.65rem 1.25rem', border: '1.5px solid #e2e8f0', borderRadius: '0.6rem', background: '#fff', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (newClassNameModalInput.trim()) {
                                            const formattedClass = newClassNameModalInput.trim().toUpperCase().startsWith('CLASS_') ? newClassNameModalInput.trim() : `Class_${newClassNameModalInput.trim()}`;
                                            if (!classes.includes(formattedClass)) {
                                                setClasses([...classes, formattedClass]);
                                                setSelectedClass(formattedClass);
                                                setNewClassNameModalInput('');
                                                setShowAddClassModal(false);
                                                toast.success('Class added locally! Add a student to save it permanently.');
                                            } else {
                                                toast.error('Class already exists');
                                            }
                                        }
                                    }}
                                    disabled={!newClassNameModalInput.trim()}
                                    style={{
                                        padding: '0.65rem 1.5rem',
                                        background: !newClassNameModalInput.trim() ? '#c4b5fd' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                                        color: '#fff', border: 'none', borderRadius: '0.6rem',
                                        fontWeight: 700, fontSize: '0.9rem',
                                        cursor: !newClassNameModalInput.trim() ? 'not-allowed' : 'pointer',
                                        fontFamily: 'Outfit, sans-serif'
                                    }}
                                >
                                    Add Class
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
