import { SubjectData, TopicData, StudentRecord, User } from './types';
import { processTopic } from './engine';
import { getAllUsers, getPerformanceDataFromDB } from './db';

/**
 * Maps a DB row to the User type used by auth and the rest of the app.
 */
function mapRowToUser(row: any): User {
    const role = String(row.role || row.Role || '').trim().toLowerCase();
    let mappedRole: 'student' | 'teacher' | 'admin' = 'student';
    if (role === 'student' || role === 'teacher' || role === 'admin') {
        mappedRole = role;
    }

    const resolvedName = String(row.name || '').trim();
    const resolvedUsername = String(row.username || row.roll_no || '').trim();

    if (!resolvedName) {
        console.warn('[mapRowToUser] WARNING: user id=' + row.id + ' has no name. Roll/username=' + resolvedUsername + '. Check DB migration.');
    }

    return {
        name: resolvedName || resolvedUsername,
        username: resolvedUsername,
        password: String(row.password || '').trim(),
        class: row.class ? String(row.class).trim() : undefined,
        role: mappedRole,
        email: row.email ? String(row.email).trim() : null
    };
}

/**
 * Reads users from the PostgreSQL database (primary, for production).
 */
export async function getUsersFromDB(): Promise<User[]> {
    try {
        const rows = await getAllUsers();
        return rows.map(mapRowToUser).filter(u => u.name && u.password);
    } catch (err) {
        console.error('DB getUsersFromDB failed:', err);
        throw new Error('Database connection failed. Please contact the administrator.');
    }
}

/**
 * DB based methods for production replacing synchronous file system reads.
 */
export async function getAllDataFromDB(): Promise<Record<string, SubjectData[]>> {
    try {
        const rows = await getPerformanceDataFromDB();
        const result: Record<string, SubjectData[]> = {};

        // Fetch users to map student name -> roll number (username)
        const users = await getUsersFromDB();
        const studentNameToRollNo = new Map<string, string>();
        for (const u of users) {
            if (u.role === 'student' && u.class) {
                const folderClass = `Class_${u.class}`;
                studentNameToRollNo.set(`${folderClass}|${u.name}`, u.username);
            }
        }

        const topicMap = new Map<string, TopicData>();

        for (const row of rows) {
            const className = row.class_name;
            const subject = row.subject;
            const topicName = row.topic;
            const totalMarks = Number(row.total_marks);
            const testDate = row.test_date instanceof Date ? row.test_date.toISOString() : new Date(row.test_date).toISOString();
            
            const topicKey = JSON.stringify({ className, subject, topicName });
            
            if (!topicMap.has(topicKey)) {
                topicMap.set(topicKey, {
                    topicName,
                    date: testDate,
                    totalMarks,
                    students: []
                });
            }
            
            const topic = topicMap.get(topicKey)!;
            const rollNo = studentNameToRollNo.get(`${className}|${row.student_name}`) || '';
            topic.students.push({
                name: row.student_name,
                rollNo,
                marks: row.marks !== null ? Number(row.marks) : null,
                comments: row.comments
            });
        }

        for (const [key, rawTopic] of topicMap.entries()) {
            const { className, subject: subjectName } = JSON.parse(key);
            
            if (!result[className]) result[className] = [];
            
            let subjectObj = result[className].find(s => s.subjectName === subjectName);
            if (!subjectObj) {
                subjectObj = { subjectName, className, topics: [] };
                result[className].push(subjectObj);
            }
            
            subjectObj.topics.push(processTopic(rawTopic));
        }

        return result;
    } catch (error) {
        console.error('Error fetching data from DB:', error);
        return {};
    }
}

export async function getStudentDataFromDB(studentRollOrName: string) {
    const allData = await getAllDataFromDB();
    const studentPerformance: any[] = [];
    const searchKey = studentRollOrName.toLowerCase().trim();

    Object.values(allData).forEach(subjects => {
        subjects.forEach(subject => {
            subject.topics.forEach(topic => {
                const studentRecord = topic.students.find(s => 
                    (s.rollNo && s.rollNo.toLowerCase().trim() === searchKey) ||
                    (s.name.toLowerCase().trim() === searchKey)
                );
                if (studentRecord && studentRecord.marks !== -1) {
                    studentPerformance.push({
                        ...studentRecord,
                        className: subject.className,
                        subject: subject.subjectName,
                        topic: topic.topicName,
                        date: topic.date,
                        totalMarks: topic.totalMarks,
                        classAverage: topic.classAverage,
                        standardDeviation: topic.standardDeviation,
                        topperMarks: topic.topperMarks,
                        classAveragePercentage: topic.classAveragePercentage,
                        topperPercentage: topic.topperPercentage
                    });
                }
            });
        });
    });

    studentPerformance.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return studentPerformance;
}
