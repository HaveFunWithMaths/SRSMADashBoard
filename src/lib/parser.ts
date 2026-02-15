
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { SubjectData, TopicData, StudentRecord, User } from './types';
import { processTopic } from './engine';

// Define base Data directory
const DATA_DIR = path.join(process.cwd(), 'Data');

/**
 * Reads users from LoginData.xlsx
 */
export function getUsers(): User[] {
    const loginFile = path.join(DATA_DIR, 'LoginData.xlsx');
    if (!fs.existsSync(loginFile)) return [];

    const buffer = fs.readFileSync(loginFile);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    // Header: A1=username, B1=password
    const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];

    return jsonData.map(row => ({
        username: String(row.username || row.Username || '').trim(), // Handle loose casing
        password: String(row.password || row.Password || '').trim(),
        role: (() => {
            const r = (row.role || row.Role || '').trim().toLowerCase();
            if (r) return r as 'student' | 'teacher' | 'admin';

            // Heuristic fallback
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
 * Parses a single Excel file mainly for one Subject.
 */
export function parseExcelFile(filePath: string, className: string, subjectName: string): SubjectData {
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

    const topics: TopicData[] = [];

    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        // Convert to JSON array of arrays (header: 1 means array of arrays)
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        if (jsonData.length < 3) return; // Skip if not enough rows

        // Validate Header Row 1 (Index 0)
        // A1=Date, C1=Total Marks
        const row1 = jsonData[0];
        if (row1[0] !== 'Date' || row1[2] !== 'Total Marks') {
            console.warn(`Skipping sheet ${sheetName}: Invalid header Row 1`);
            return;
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
            topicName: sheetName,
            date: dateStr,
            totalMarks,
            students
        };

        // Enrich with calculated metrics
        topics.push(processTopic(rawTopic));
    });

    return {
        subjectName,
        className,
        topics
    };
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
            // It's a Class folder (e.g. Class_XI)
            const className = item;
            const classFiles = fs.readdirSync(itemPath);
            const classSubjects: SubjectData[] = [];

            for (const file of classFiles) {
                if (file.endsWith('.xlsx') && !file.startsWith('~$')) {
                    const subjectName = path.parse(file).name;
                    try {
                        const subjectData = parseExcelFile(path.join(itemPath, file), className, subjectName);
                        classSubjects.push(subjectData);
                    } catch (e) {
                        console.error(`Error parsing ${file}:`, e);
                    }
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
                        subject: subject.subjectName,
                        topic: topic.topicName,
                        date: topic.date,
                        totalMarks: topic.totalMarks,
                        classAverage: topic.classAverage,
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
