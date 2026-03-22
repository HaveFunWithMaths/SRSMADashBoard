
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { SubjectData, TopicData, StudentRecord, User } from './types';
import { processTopic } from './engine';
import { getAllUsers, getPerformanceDataFromDB } from './db';

// Define base Data directory
const DATA_DIR = path.join(process.cwd(), 'Data');

/**
 * Maps a DB row to the User type used by auth and the rest of the app.
 */
function mapRowToUser(row: any): User {
    const role = String(row.role || row.Role || '').trim().toLowerCase();
    let mappedRole: 'student' | 'teacher' | 'admin' = 'student';
    if (role === 'student' || role === 'teacher' || role === 'admin') {
        mappedRole = role;
    } else {
        // Heuristic fallback
        const u = String(row.username || '').toLowerCase();
        if (u === 'srsma') mappedRole = 'teacher';
        else if (u.includes('admin')) mappedRole = 'admin';
        else if (u.includes('teacher')) mappedRole = 'teacher';
    }

    return {
        username: String(row.username || '').trim(),
        password: String(row.password || '').trim(),
        class: row.class ? String(row.class).trim() : undefined,
        role: mappedRole
    };
}

/**
 * Reads users from the PostgreSQL database (primary, for production).
 */
export async function getUsersFromDB(): Promise<User[]> {
    try {
        const rows = await getAllUsers();
        return rows.map(mapRowToUser).filter(u => u.username && u.password);
    } catch (err) {
        console.error('DB getUsersFromDB failed, falling back to Excel:', err);
        return getUsers();
    }
}

/**
 * Reads users from LoginData.xlsx (synchronous fallback for local dev).
 */
export function getUsers(): User[] {
    const loginFile = path.join(DATA_DIR, 'LoginData.xlsx');
    if (!fs.existsSync(loginFile)) return [];

    const buffer = fs.readFileSync(loginFile);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];

    return jsonData.map(row => ({
        username: String(row.username || row.Username || '').trim(),
        password: String(row.password || row.Password || '').trim(),
        class: row.class ? String(row.class).trim() : undefined,
        role: (() => {
            const r = (row.role || row.Role || '').trim().toLowerCase();
            if (r === 'student' || r === 'teacher' || r === 'admin') return r as 'student' | 'teacher' | 'admin';

            const u = String(row.username || row.Username || '').toLowerCase();
            if (u === 'srsma') return 'teacher';
            if (u.includes('admin')) return 'admin';
            if (u.includes('teacher')) return 'teacher';
            return 'student';
        })()
    })).filter(u => u.username && u.password);
}

/**
 * Parses a date from Excel cell value.
 * Handles Excel serial dates and string dates.
 */
function parseDate(cellValue: any): string {
    if (!cellValue) return new Date().toISOString();

    if (typeof cellValue === 'number') {
        // Excel date serial number (days since 1900-01-01)
        // SheetJS usually handles this if cellDates: true option is used
        // But manual conversion:
        const date = new Date(Math.round((cellValue - 25569) * 86400 * 1000));
        return date.toISOString();
    }

    if (cellValue instanceof Date) {
        return cellValue.toISOString();
    }

    // Try parsing string
    const date = new Date(cellValue);
    if (!isNaN(date.getTime())) {
        return date.toISOString();
    }

    return new Date().toISOString(); // Fallback
}

/**
 * Parses marks from cell value.
 * Handles 'AB', 'ABS' -> null.
 */
function parseMarks(cellValue: any): number | null {
    if (cellValue === null || cellValue === undefined || cellValue === '') return null; // Treat empty as null/absent? Or 0? Plan says null if empty/AB

    const strVal = String(cellValue).trim().toUpperCase();
    if (['AB', 'ABS', '-'].includes(strVal)) return null;

    const num = parseFloat(strVal);
    return isNaN(num) ? null : num;
}

/**
 * Parses a single Excel file mainly for one Topic.
 */
export function parseTopicExcelFile(filePath: string, fallbackTopicName: string): TopicData | null {
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

    if (workbook.SheetNames.length === 0) return null;

    // We assume the first sheet contains the topic data
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // Convert to JSON array of arrays (header: 1 means array of arrays)
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    if (jsonData.length < 3) return null; // Skip if not enough rows

    // Validate Header Row 1 (Index 0)
    // A1=Date, C1=Total Marks
    const row1 = jsonData[0];
    if (row1[0] !== 'Date' || row1[2] !== 'Total Marks') {
        console.warn(`Skipping file ${filePath}: Invalid header Row 1`);
        return null;
    }

    // Extract Metadata
    const dateStr = parseDate(row1[1]);
    const totalMarks = typeof row1[3] === 'number' ? row1[3] : Number(row1[3]) || 0;

    // Row 2 is column names, we verify structure but trust index 0=Name, 1=Marks

    const students: StudentRecord[] = [];

    // Iterate from Row 3 (Index 2)
    for (let i = 2; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0 || !row[0]) continue; // Skip empty rows or missing name

        const name = String(row[0]).trim();
        const marks = parseMarks(row[1]); // Index 1 is Marks
        const comments = row[2] ? String(row[2]).trim() : null; // Index 2 is Comments

        students.push({
            name,
            marks,
            comments
        });
    }

    const rawTopic: TopicData = {
        topicName: sheetName || fallbackTopicName,
        date: dateStr,
        totalMarks,
        students
    };

    // Enrich with calculated metrics
    return processTopic(rawTopic);
}

/**
 * Scans Data directory and returns all data.
 */
export function getAllData(): Record<string, SubjectData[]> {
    if (!fs.existsSync(DATA_DIR)) return {};

    const result: Record<string, SubjectData[]> = {}; // Key: ClassName

    const items = fs.readdirSync(DATA_DIR);

    for (const item of items) {
        const itemPath = path.join(DATA_DIR, item);
        const stats = fs.statSync(itemPath);

        if (stats.isDirectory()) {
            // It's a Class folder (e.g. Class_12+)
            const className = item;
            const classItems = fs.readdirSync(itemPath);
            const classSubjects: SubjectData[] = [];

            for (const subjectFolder of classItems) {
                const subjectFolderPath = path.join(itemPath, subjectFolder);
                const subjectStats = fs.statSync(subjectFolderPath);

                if (subjectStats.isDirectory()) {
                    const subjectName = subjectFolder;
                    const topicFiles = fs.readdirSync(subjectFolderPath);
                    const topics: TopicData[] = [];

                    for (const topicFile of topicFiles) {
                        if (topicFile.endsWith('.xlsx') && !topicFile.startsWith('~$')) {
                            const fallbackTopicName = path.parse(topicFile).name;
                            try {
                                const topicData = parseTopicExcelFile(path.join(subjectFolderPath, topicFile), fallbackTopicName);
                                if (topicData) {
                                    topics.push(topicData);
                                }
                            } catch (e) {
                                console.error(`Error parsing ${topicFile}:`, e);
                            }
                        }
                    }

                    classSubjects.push({
                        subjectName,
                        className,
                        topics
                    });
                }
            }
            result[className] = classSubjects;
        }
    }

    return result;
}

/**
 * Gets data for a specific student across all subjects.
 */
export function getStudentData(studentName: string) {
    const allData = getAllData();
    const studentPerformance: any[] = []; // Simplified view

    // Traverse and filter
    Object.values(allData).forEach(subjects => {
        subjects.forEach(subject => {
            subject.topics.forEach(topic => {
                const studentRecord = topic.students.find(s => s.name === studentName);
                if (studentRecord) {
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

    // Sort by date
    studentPerformance.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return studentPerformance;
}

/**
 * DB based methods for production replacing synchronous file system reads.
 */
export async function getAllDataFromDB(): Promise<Record<string, SubjectData[]>> {
    try {
        const rows = await getPerformanceDataFromDB();
        const result: Record<string, SubjectData[]> = {};

        const topicMap = new Map<string, TopicData>();

        for (const row of rows) {
            const className = row.class_name;
            const subject = row.subject;
            const topicName = row.topic;
            const totalMarks = Number(row.total_marks);
            const testDate = row.test_date instanceof Date ? row.test_date.toISOString() : new Date(row.test_date).toISOString();
            
            const topicKey = `${className}|${subject}|${topicName}`;
            
            if (!topicMap.has(topicKey)) {
                topicMap.set(topicKey, {
                    topicName,
                    date: testDate,
                    totalMarks,
                    students: []
                });
            }
            
            const topic = topicMap.get(topicKey)!;
            topic.students.push({
                name: row.student_name,
                marks: row.marks !== null ? Number(row.marks) : null,
                comments: row.comments
            });
        }

        for (const [key, rawTopic] of topicMap.entries()) {
            const [className, subjectName] = key.split('|');
            
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
        console.error('Error fetching data from DB, falling back to FS:', error);
        return getAllData();
    }
}

export async function getStudentDataFromDB(studentName: string) {
    const allData = await getAllDataFromDB();
    const studentPerformance: any[] = [];

    Object.values(allData).forEach(subjects => {
        subjects.forEach(subject => {
            subject.topics.forEach(topic => {
                const studentRecord = topic.students.find(s => s.name === studentName);
                if (studentRecord) {
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
