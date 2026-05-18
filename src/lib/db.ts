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
    name: string;
    password: string;
    class: string | null;
    role: string;
    username: string | null;
    status: string;
    email: string | null;
}

// ---------- Schema ----------

export async function initializeDatabase(): Promise<void> {
    const sql = getSQL();
    await sql`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            password VARCHAR(255) NOT NULL DEFAULT 'srsma',
            class VARCHAR(50),
            role VARCHAR(20) NOT NULL DEFAULT 'Student',
            username VARCHAR(50),
            status VARCHAR(20) NOT NULL DEFAULT 'Active',
            email VARCHAR(255),
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(name, class)
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

    await sql`
        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `;

    await sql`
        CREATE TABLE IF NOT EXISTS user_login_logs (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) NOT NULL,
            name VARCHAR(255),
            role VARCHAR(50),
            user_agent TEXT,
            device_type VARCHAR(50),
            browser VARCHAR(100),
            os VARCHAR(100),
            login_time TIMESTAMP DEFAULT NOW()
        )
    `;

    await sql`
        CREATE TABLE IF NOT EXISTS feedback (
            id SERIAL PRIMARY KEY,
            parent_name VARCHAR(255),
            student_name VARCHAR(255),
            message TEXT NOT NULL,
            teacher_reply TEXT,
            replied_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
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

export async function updateTopicDetails(
    className: string,
    oldSubject: string,
    oldTopicName: string,
    newSubject: string,
    newTopicName: string,
    newTestDate: string,
    newTotalMarks: number
): Promise<boolean> {
    const sql = getSQL();
    const result = await sql`
        UPDATE performance_marks
        SET subject = ${newSubject},
            topic = ${newTopicName},
            test_date = ${newTestDate},
            total_marks = ${newTotalMarks}
        WHERE class_name = ${className}
          AND subject = ${oldSubject}
          AND topic = ${oldTopicName}
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
        ORDER BY username, name
    `;
    return rows as DBUser[];
}

/** Check if a student exists in a class */
export async function studentExists(studentName: string, folderClassName: string): Promise<boolean> {
    const possibleValues = folderToExcelClassValues(folderClassName);
    const sql = getSQL();
    const rows = await sql`
        SELECT 1 FROM users
        WHERE name = ${studentName}
          AND class = ANY(${possibleValues})
        LIMIT 1
    `;
    return rows.length > 0;
}

/** Add a new student */
export async function addStudent(
    username: string,
    rawClassValue: string,
    rollNo: string,
    password: string,
    email: string | null = null
): Promise<void> {
    const sql = getSQL();
    await sql`
        INSERT INTO users (name, password, class, role, username, status, email)
        VALUES (${username}, ${password}, ${rawClassValue}, 'Student', ${rollNo}, 'Active', ${email})
    `;
}

/** Update student details across all tables */
export async function updateStudentDetails(oldUsername: string, newUsername: string, folderClassName: string, password?: string, email?: string | null): Promise<boolean> {
    const possibleValues = folderToExcelClassValues(folderClassName);
    const sql = getSQL();
    
    // We only use COALESCE for name (it should always be provided).
    // For password and email, we use the value directly so that empty strings
    // can overwrite existing values (allowing the teacher to clear them).
    const pwVal = password !== undefined ? password : null;
    const emailVal = email !== undefined ? email : null;

    const result = await sql`
        UPDATE users
        SET name     = COALESCE(${newUsername}::text, name),
            password = CASE WHEN ${pwVal}::text IS NOT NULL THEN ${pwVal}::text ELSE password END,
            email    = CASE WHEN ${emailVal}::text IS NOT NULL THEN ${emailVal}::text ELSE email END
        WHERE name = ${oldUsername}
          AND class = ANY(${possibleValues})
        RETURNING id
    `;
    if (result.length === 0) return false;

    await sql`
        UPDATE performance_marks
        SET student_name = ${newUsername}
        WHERE student_name = ${oldUsername}
    `;

    try {
        await sql`
            UPDATE notifications
            SET username = ${newUsername}
            WHERE username = ${oldUsername}
        `;
    } catch (e) {
        // Ignore if notifications table hasn't been created yet
    }

    return true;
}

/** Soft-delete a student (set status to 'Deleted') */
export async function deleteStudent(studentName: string, folderClassName: string): Promise<boolean> {
    const possibleValues = folderToExcelClassValues(folderClassName);
    const sql = getSQL();
    const result = await sql`
        UPDATE users
        SET status = 'Deleted'
        WHERE name = ${studentName}
          AND class = ANY(${possibleValues})
        RETURNING id
    `;
    return result.length > 0;
}

/** Permanently delete a student */
export async function permanentDeleteStudent(studentName: string, folderClassName: string): Promise<boolean> {
    const possibleValues = folderToExcelClassValues(folderClassName);
    const sql = getSQL();
    const result = await sql`
        DELETE FROM users
        WHERE name = ${studentName}
          AND class = ANY(${possibleValues})
        RETURNING id
    `;
    return result.length > 0;
}
export async function restoreStudent(studentName: string, folderClassName: string): Promise<boolean> {
    const possibleValues = folderToExcelClassValues(folderClassName);
    const sql = getSQL();
    const result = await sql`
        UPDATE users
        SET status = 'Active'
        WHERE name = ${studentName}
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
        SELECT username FROM users
        WHERE class = ANY(${possibleValues})
          AND username IS NOT NULL
    `;

    const classPrefix = folderClassName.replace(/^Class_/i, '');
    let maxSeq = 0;

    for (const row of rows) {
        const roll = String(row.username || '').trim();
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

// ---------- Notifications ----------

export async function addNotification(username: string, message: string): Promise<void> {
    const sql = getSQL();
    try {
        await sql`
            INSERT INTO notifications (username, message)
            VALUES (${username}, ${message})
        `;
    } catch (e: any) {
        if (e.message && e.message.includes('relation "notifications" does not exist')) {
            await initializeDatabase();
            await sql`
                INSERT INTO notifications (username, message)
                VALUES (${username}, ${message})
            `;
        } else {
            throw e;
        }
    }
}

export async function editClass(oldClassName: string, newClassName: string): Promise<void> {
    const sql = getSQL();
    const oldClassRawArray = folderToExcelClassValues(oldClassName);
    const newClassRaw = newClassName.replace(/^Class_/i, '');

    await sql`
        UPDATE users 
        SET class = ${newClassRaw} 
        WHERE class = ANY(${oldClassRawArray})
    `;

    await sql`
        UPDATE performance_marks 
        SET class_name = ${newClassName} 
        WHERE class_name = ${oldClassName}
    `;
}

export async function deleteClassFromDB(className: string): Promise<void> {
    const sql = getSQL();
    const classRawArray = folderToExcelClassValues(className);

    await sql`
        DELETE FROM users 
        WHERE class = ANY(${classRawArray})
    `;

    await sql`
        DELETE FROM performance_marks 
        WHERE class_name = ${className}
    `;
}

export async function getUnreadNotifications(username: string): Promise<any[]> {
    const sql = getSQL();
    const rows = await sql`
        SELECT * FROM notifications
        WHERE username = ${username} AND is_read = FALSE
        ORDER BY created_at DESC
    `;
    return rows;
}

export async function markNotificationsAsRead(username: string): Promise<void> {
    const sql = getSQL();
    await sql`
        UPDATE notifications
        SET is_read = TRUE
        WHERE username = ${username} AND is_read = FALSE
    `;
}

export async function markNotificationAsReadById(id: number, username: string): Promise<void> {
    const sql = getSQL();
    await sql`
        UPDATE notifications
        SET is_read = TRUE
        WHERE id = ${id} AND username = ${username}
    `;
}

// ---------- Analytics ----------

/** Parse userAgent string into device, browser, os */
function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
    const uaLower = ua.toLowerCase();

    // Device
    let device = 'Desktop';
    if (/mobile|android.*mobile|iphone|ipod|blackberry|windows phone/i.test(ua)) {
        device = 'Mobile';
    } else if (/tablet|ipad|android(?!.*mobile)/i.test(ua)) {
        device = 'Tablet';
    }

    // Browser
    let browser = 'Other';
    if (/edg\//i.test(ua)) browser = 'Edge';
    else if (/opr\//i.test(ua)) browser = 'Opera';
    else if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) browser = 'Chrome';
    else if (/firefox\//i.test(ua)) browser = 'Firefox';
    else if (/safari\//i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
    else if (/msie|trident/i.test(ua)) browser = 'IE';

    // OS
    let os = 'Other';
    if (/windows nt/i.test(ua)) os = 'Windows';
    else if (/mac os x/i.test(ua) && !/iphone|ipad/i.test(ua)) os = 'macOS';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
    else if (/linux/i.test(ua)) os = 'Linux';

    return { device, browser, os };
}

export async function logUserLogin(
    username: string,
    name: string | null,
    role: string | null,
    userAgent: string
): Promise<void> {
    const sql = getSQL();
    const { device, browser, os } = parseUserAgent(userAgent);

    if (!name || !role) {
        try {
            const userRows = await sql`SELECT name, role FROM users WHERE username = ${username} LIMIT 1`;
            if (userRows.length > 0) {
                if (!name) name = userRows[0].name;
                if (!role) role = userRows[0].role;
            }
        } catch (e) {
            console.error('Error fetching user details for login log:', e);
        }
    }

    try {
        await sql`
            INSERT INTO user_login_logs (username, name, role, user_agent, device_type, browser, os)
            VALUES (${username}, ${name}, ${role}, ${userAgent}, ${device}, ${browser}, ${os})
        `;
    } catch (e: any) {
        if (e.message?.includes('relation "user_login_logs" does not exist')) {
            await initializeDatabase();
            await sql`
                INSERT INTO user_login_logs (username, name, role, user_agent, device_type, browser, os)
                VALUES (${username}, ${name}, ${role}, ${userAgent}, ${device}, ${browser}, ${os})
            `;
        }
    }
}

export async function getLoginStats(activePeriodDays?: number, fromDate?: string, toDate?: string): Promise<any> {
    const sql = getSQL();
    try {
        const useRange = !!(fromDate && toDate);
        const useDays = !!(!useRange && activePeriodDays);

        // Last login per user
        const lastLogins = await sql`
            SELECT DISTINCT ON (username) username, name, role, device_type, browser, os, login_time
            FROM user_login_logs
            WHERE LOWER(role) = 'student'
              AND (
                (${useRange}::boolean = false AND ${useDays}::boolean = false) OR
                (${useRange}::boolean = true AND login_time >= ${fromDate || null}::TIMESTAMP AND login_time < ${toDate || null}::TIMESTAMP + INTERVAL '1 day') OR
                (${useDays}::boolean = true AND login_time >= NOW() - (${activePeriodDays || 0} || ' days')::INTERVAL)
              )
            ORDER BY username, login_time DESC
        `;

        // Total logins today
        const todayLogins = await sql`
            SELECT COUNT(*) as count FROM user_login_logs
            WHERE login_time >= NOW() - INTERVAL '1 day'
        `;

        // Active users in selected period
        const periodSql = await sql`
            SELECT COUNT(DISTINCT username) as count FROM user_login_logs
            WHERE (
                (${useRange}::boolean = false AND ${useDays}::boolean = false) OR
                (${useRange}::boolean = true AND login_time >= ${fromDate || null}::TIMESTAMP AND login_time < ${toDate || null}::TIMESTAMP + INTERVAL '1 day') OR
                (${useDays}::boolean = true AND login_time >= NOW() - (${activePeriodDays || 0} || ' days')::INTERVAL)
            )
        `;

        // Device breakdown
        const deviceBreakdown = await sql`
            SELECT device_type, COUNT(*) as count
            FROM user_login_logs
            WHERE (
                (${useRange}::boolean = false AND ${useDays}::boolean = false) OR
                (${useRange}::boolean = true AND login_time >= ${fromDate || null}::TIMESTAMP AND login_time < ${toDate || null}::TIMESTAMP + INTERVAL '1 day') OR
                (${useDays}::boolean = true AND login_time >= NOW() - (${activePeriodDays || 0} || ' days')::INTERVAL)
            )
            GROUP BY device_type
            ORDER BY count DESC
        `;

        // Browser breakdown
        const browserBreakdown = await sql`
            SELECT browser, COUNT(*) as count
            FROM user_login_logs
            WHERE (
                (${useRange}::boolean = false AND ${useDays}::boolean = false) OR
                (${useRange}::boolean = true AND login_time >= ${fromDate || null}::TIMESTAMP AND login_time < ${toDate || null}::TIMESTAMP + INTERVAL '1 day') OR
                (${useDays}::boolean = true AND login_time >= NOW() - (${activePeriodDays || 0} || ' days')::INTERVAL)
            )
            GROUP BY browser
            ORDER BY count DESC
        `;

        // OS breakdown
        const osBreakdown = await sql`
            SELECT os, COUNT(*) as count
            FROM user_login_logs
            WHERE (
                (${useRange}::boolean = false AND ${useDays}::boolean = false) OR
                (${useRange}::boolean = true AND login_time >= ${fromDate || null}::TIMESTAMP AND login_time < ${toDate || null}::TIMESTAMP + INTERVAL '1 day') OR
                (${useDays}::boolean = true AND login_time >= NOW() - (${activePeriodDays || 0} || ' days')::INTERVAL)
            )
            GROUP BY os
            ORDER BY count DESC
        `;

        // Login trend
        const loginTrend = await sql`
            SELECT DATE(login_time) as date, COUNT(*) as count
            FROM user_login_logs
            WHERE (
                (${useRange}::boolean = false AND ${useDays}::boolean = false AND login_time >= NOW() - INTERVAL '30 days') OR
                (${useRange}::boolean = true AND login_time >= ${fromDate || null}::TIMESTAMP AND login_time < ${toDate || null}::TIMESTAMP + INTERVAL '1 day') OR
                (${useDays}::boolean = true AND login_time >= NOW() - (${activePeriodDays || 0} || ' days')::INTERVAL)
            )
            GROUP BY DATE(login_time)
            ORDER BY date ASC
        `;

        // Total users
        const totalUsers = await sql`SELECT COUNT(*) as count FROM users WHERE status != 'Deleted'`;

        return {
            lastLogins,
            todayLogins: Number(todayLogins[0]?.count ?? 0),
            activeUsers: Number(periodSql[0]?.count ?? 0),
            deviceBreakdown,
            browserBreakdown,
            osBreakdown,
            loginTrend,
            totalUsers: Number(totalUsers[0]?.count ?? 0),
        };
    } catch (e: any) {
        if (e.message?.includes('relation "user_login_logs" does not exist')) {
            await initializeDatabase();
            return { lastLogins: [], todayLogins: 0, activeUsers: 0, deviceBreakdown: [], browserBreakdown: [], osBreakdown: [], loginTrend: [], totalUsers: 0 };
        }
        throw e;
    }
}

// ---------- Feedback ----------

export async function saveFeedback(
    parentName: string | null,
    studentName: string | null,
    message: string
): Promise<void> {
    const sql = getSQL();
    try {
        await sql`
            INSERT INTO feedback (parent_name, student_name, message)
            VALUES (${parentName}, ${studentName}, ${message})
        `;
    } catch (e: any) {
        if (e.message?.includes('relation "feedback" does not exist')) {
            await initializeDatabase();
            await sql`
                INSERT INTO feedback (parent_name, student_name, message)
                VALUES (${parentName}, ${studentName}, ${message})
            `;
        } else throw e;
    }
}

export async function getAllFeedback(): Promise<any[]> {
    const sql = getSQL();
    try {
        const rows = await sql`SELECT * FROM feedback ORDER BY created_at DESC`;
        return rows;
    } catch (e: any) {
        if (e.message?.includes('relation "feedback" does not exist')) {
            await initializeDatabase();
            return [];
        }
        throw e;
    }
}

export async function replyToFeedback(id: number, reply: string): Promise<boolean> {
    const sql = getSQL();
    const result = await sql`
        UPDATE feedback
        SET teacher_reply = ${reply}, replied_at = NOW()
        WHERE id = ${id}
        RETURNING id
    `;
    return result.length > 0;
}

export async function deleteFeedback(id: number): Promise<boolean> {
    const sql = getSQL();
    const result = await sql`
        DELETE FROM feedback
        WHERE id = ${id}
        RETURNING id
    `;
    return result.length > 0;
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
