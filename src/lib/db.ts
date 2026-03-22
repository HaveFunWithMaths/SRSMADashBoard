import { neon } from '@neondatabase/serverless';

/**
 * Get a SQL query function connected to the Neon PostgreSQL database.
 * Uses the DATABASE_URL environment variable.
 */
function getSQL() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is not set. Please configure your Neon database.');
    }
    return neon(databaseUrl);
}

// ---------- Types ----------

export interface DBUser {
    id: number;
    username: string;
    password: string;
    class: string | null;
    role: string;
    roll_no: string | null;
    status: string;
}

// ---------- Schema ----------

export async function initializeDatabase(): Promise<void> {
    const sql = getSQL();
    await sql`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) NOT NULL,
            password VARCHAR(255) NOT NULL DEFAULT 'srsma',
            class VARCHAR(50),
            role VARCHAR(20) NOT NULL DEFAULT 'Student',
            roll_no VARCHAR(50),
            status VARCHAR(20) NOT NULL DEFAULT 'Active',
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(username, class)
        )
    `;
    await sql`
        CREATE TABLE IF NOT EXISTS performance_marks (
            id SERIAL PRIMARY KEY,
            class_name VARCHAR(50) NOT NULL,
            subject VARCHAR(100) NOT NULL,
            topic VARCHAR(255) NOT NULL,
            test_date TIMESTAMP NOT NULL,
            total_marks NUMERIC NOT NULL,
            student_name VARCHAR(255) NOT NULL,
            marks NUMERIC,
            comments TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(class_name, subject, topic, student_name)
        )
    `;
}

// ---------- Performance Queries ----------

export async function savePerformanceData(
    className: string,
    subject: string,
    topicName: string,
    testDate: string,
    totalMarks: number,
    studentName: string,
    marks: number | null,
    comments: string | null
): Promise<void> {
    const sql = getSQL();
    await sql`
        INSERT INTO performance_marks (class_name, subject, topic, test_date, total_marks, student_name, marks, comments)
        VALUES (${className}, ${subject}, ${topicName}, ${testDate}, ${totalMarks}, ${studentName}, ${marks}, ${comments})
        ON CONFLICT (class_name, subject, topic, student_name)
        DO UPDATE SET 
            marks = EXCLUDED.marks,
            comments = EXCLUDED.comments,
            test_date = EXCLUDED.test_date,
            total_marks = EXCLUDED.total_marks
    `;
}

export async function getPerformanceDataFromDB(): Promise<any[]> {
    const sql = getSQL();
    const rows = await sql`SELECT * FROM performance_marks ORDER BY test_date ASC`;
    return rows;
}

export async function updatePerformanceEntry(
    className: string,
    subject: string,
    topicName: string,
    studentName: string,
    marks: number | null,
    comments: string | null
): Promise<boolean> {
    const sql = getSQL();
    const result = await sql`
        UPDATE performance_marks
        SET marks = ${marks},
            comments = ${comments}
        WHERE class_name = ${className}
          AND subject = ${subject}
          AND topic = ${topicName}
          AND student_name = ${studentName}
        RETURNING id
    `;

    return result.length > 0;
}

// ---------- Queries ----------

/** Get all users (for auth / class listing) */
export async function getAllUsers(): Promise<DBUser[]> {
    const sql = getSQL();
    const rows = await sql`SELECT * FROM users ORDER BY id`;
    return rows as DBUser[];
}

/** Get students for a specific class (matching folder-style class name like "Class_12+") */
export async function getStudentsByClass(folderClassName: string): Promise<DBUser[]> {
    const possibleValues = folderToExcelClassValues(folderClassName);
    const sql = getSQL();

    // Use ANY to match against multiple possible class values
    const rows = await sql`
        SELECT * FROM users
        WHERE LOWER(role) = 'student'
          AND class = ANY(${possibleValues})
        ORDER BY roll_no, username
    `;
    return rows as DBUser[];
}

/** Check if a student exists in a class */
export async function studentExists(studentName: string, folderClassName: string): Promise<boolean> {
    const possibleValues = folderToExcelClassValues(folderClassName);
    const sql = getSQL();
    const rows = await sql`
        SELECT 1 FROM users
        WHERE username = ${studentName}
          AND class = ANY(${possibleValues})
        LIMIT 1
    `;
    return rows.length > 0;
}

/** Add a new student */
export async function addStudent(
    username: string,
    rawClassValue: string,
    rollNo: string
): Promise<void> {
    const sql = getSQL();
    await sql`
        INSERT INTO users (username, password, class, role, roll_no, status)
        VALUES (${username}, 'srsma', ${rawClassValue}, 'Student', ${rollNo}, 'Active')
    `;
}

/** Soft-delete a student (set status to 'Deleted') */
export async function deleteStudent(studentName: string, folderClassName: string): Promise<boolean> {
    const possibleValues = folderToExcelClassValues(folderClassName);
    const sql = getSQL();
    const result = await sql`
        UPDATE users
        SET status = 'Deleted'
        WHERE username = ${studentName}
          AND class = ANY(${possibleValues})
        RETURNING id
    `;
    return result.length > 0;
}

/** Restore a soft-deleted student */
export async function restoreStudent(studentName: string, folderClassName: string): Promise<boolean> {
    const possibleValues = folderToExcelClassValues(folderClassName);
    const sql = getSQL();
    const result = await sql`
        UPDATE users
        SET status = 'Active'
        WHERE username = ${studentName}
          AND class = ANY(${possibleValues})
        RETURNING id
    `;
    return result.length > 0;
}

/** Get the maximum roll number sequence for a class */
export async function getMaxRollSequence(folderClassName: string): Promise<number> {
    const possibleValues = folderToExcelClassValues(folderClassName);
    const sql = getSQL();
    const rows = await sql`
        SELECT roll_no FROM users
        WHERE class = ANY(${possibleValues})
          AND roll_no IS NOT NULL
    `;

    const classPrefix = folderClassName.replace(/^Class_/i, '');
    let maxSeq = 0;

    for (const row of rows) {
        const roll = String(row.roll_no || '').trim();
        if (roll.startsWith(classPrefix) && roll.length >= classPrefix.length + 2) {
            const seqStr = roll.slice(-2);
            if (/^\d{2}$/.test(seqStr)) {
                const seq = parseInt(seqStr, 10);
                if (seq > maxSeq) maxSeq = seq;
            }
        } else if (roll.length >= 2) {
            const seqStr = roll.slice(-2);
            if (/^\d{2}$/.test(seqStr)) {
                const seq = parseInt(seqStr, 10);
                if (seq > maxSeq) maxSeq = seq;
            }
        }
    }

    return maxSeq;
}

/** Get the raw class value used by existing students in a folder-class */
export async function getRawClassValue(folderClassName: string): Promise<string> {
    const possibleValues = folderToExcelClassValues(folderClassName);
    const sql = getSQL();
    const rows = await sql`
        SELECT class FROM users
        WHERE class = ANY(${possibleValues})
        LIMIT 1
    `;
    if (rows.length > 0 && rows[0].class) {
        return rows[0].class;
    }
    // Fallback: strip "Class_" prefix
    return folderClassName.replace(/^Class_/i, '');
}

/** Get all unique class values from the database (for class dropdown) */
export async function getAllClasses(): Promise<string[]> {
    const sql = getSQL();
    const rows = await sql`
        SELECT DISTINCT class FROM users WHERE class IS NOT NULL
    `;
    return rows.map(r => `Class_${String(r.class).trim()}`);
}

// ---------- Helpers ----------

/**
 * Converts a folder-style className (e.g. "Class_12+", "Class_XII") to
 * the raw value stored in the database (e.g. "12+", "12").
 * Returns an array of possible values to match against.
 */
function folderToExcelClassValues(folderName: string): string[] {
    let raw = folderName.replace(/^Class_/i, '');
    const values: string[] = [raw];
    values.push(raw.toLowerCase(), raw.toUpperCase());
    return [...new Set(values)];
}
