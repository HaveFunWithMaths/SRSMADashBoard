export interface StudentRecord {
    name: string;
    rollNo?: string;
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
    classAveragePercentage?: number;
    topperPercentage?: number;
    standardDeviation?: number;
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
    name: string;
    username: string; // Used as roll number / login ID
    password?: string; // Only used internally during auth
    role: 'student' | 'teacher' | 'admin';
    class?: string;
    email?: string | null;
}

export interface StudentPerformanceRecord extends StudentRecord {
    className?: string;
    subject: string;
    topic: string;
    date: string;
    totalMarks: number;
    classAverage: number;
    standardDeviation: number;
    topperMarks: number;
    classAveragePercentage: number;
    topperPercentage: number;
}

// ---------- Teacher Dashboard Types ----------

export interface BatchTopicStudent {
    name: string;
    marks: number | null; // null = absent, -1 = NA
    percentage?: number | null;
    rank?: number | null;
    comments?: string | null;
}

export interface BatchTopic {
    topicName: string;
    date: string;
    totalMarks: number;
    students: BatchTopicStudent[];
    classAverage?: number;
    topperMarks?: number;
    classAveragePercentage?: number;
    topperPercentage?: number;
    standardDeviation?: number;
}

export interface TeacherUser {
    id: number;
    name: string;
    username: string;
    role: string;
    password?: string;
    class?: string | null;
    status?: string;
    email?: string | null;
    rollNo?: string;
}

export interface TeacherMapping {
    id: number;
    teacher_username: string;
    class_name: string;
    subject: string;
}

export interface TeacherPermission {
    class_name: string;
    subject: string;
}

// ---------- Admin Analytics Types ----------

export interface LoginEntry {
    username: string;
    name: string;
    role: string;
    device_type: string;
    browser: string;
    os: string;
    login_time: string;
    login_count: number;
}

export interface DeviceBreakdown {
    device_type: string;
    count: number;
}

export interface BrowserBreakdown {
    browser: string;
    count: number;
}

export interface LoginTrendEntry {
    date: string;
    count: number;
}

export interface NeverLoggedInStudent {
    username: string;
    name: string;
    class: string | null;
}

export interface AnalyticsStats {
    lastLogins: LoginEntry[];
    todayLogins: number;
    activeUsers: number;
    deviceBreakdown: DeviceBreakdown[];
    browserBreakdown: BrowserBreakdown[];
    osBreakdown: { os: string; count: number }[];
    loginTrend: LoginTrendEntry[];
    totalUsers: number;
    neverLoggedIn?: NeverLoggedInStudent[];
}

// ---------- Feedback Types ----------

export interface FeedbackItem {
    id: number;
    parent_name: string | null;
    student_name: string | null;
    message: string;
    teacher_reply: string | null;
    replied_at: string | null;
    created_at: string;
}

// ---------- Notification Types ----------

export interface NotificationItem {
    id: number;
    message: string;
    created_at: string;
    is_read: boolean;
}

// ---------- Upload / Pivot Types ----------

export interface UploadStudent {
    name: string;
    marks: string;
    comments: string;
}

export interface PivotStudentRow {
    name: string;
    totalPercentage: number;
    presentCount: number;
    naCount: number;
    averagePercentage: number;
    testMarks: Record<string, number | string | null>;
}
