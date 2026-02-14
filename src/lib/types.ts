
export interface StudentRecord {
    name: string;
    marks: number | null; // null indicates "AB" or "ABS" (Absent)
    comments: string | null;
    // Computed fields
    percentage?: number | null;
    rank?: number | null;
}

export interface TopicData {
    topicName: string;
    date: string; // ISO string
    totalMarks: number;
    students: StudentRecord[];
    // Computed fields
    classAverage?: number;
    topperMarks?: number;
}

export interface SubjectData {
    subjectName: string;
    className: string; // e.g., "Class_XI"
    topics: TopicData[];
}

export interface ClassData {
    className: string;
    subjects: SubjectData[];
}

export interface User {
    username: string;
    password?: string; // Only used internally during auth
    role: 'student' | 'teacher' | 'admin';
}
