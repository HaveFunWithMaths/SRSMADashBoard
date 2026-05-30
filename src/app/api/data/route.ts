import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAllDataFromDB, getStudentDataFromDB, getUsersFromDB } from "@/lib/parser";
import { getAllClasses, getMappingsForTeacher } from "@/lib/db";

/**
 * Maps a raw Excel class value (e.g. "12+", 12, "XII") to a folder-style name (e.g. "Class_12+", "Class_XII").
 */
function excelClassToFolderName(rawClass: any): string {
    const val = String(rawClass).trim();
    return `Class_${val}`;
}

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const className = searchParams.get('class');
    const subject = searchParams.get('subject');
    const student = searchParams.get('student');

    // Role-based Access Control
    const userRole = session.user.role;
    // session.user.name is always set to the student's real name (e.g. "Ravi Kumar").
    // session.user.username is the roll number (login ID, e.g. "2601").
    const sessionName = session.user.name || '';

    try {
        // 1. Get Class List
        if (type === 'classes') {
            const allData = await getAllDataFromDB();
            const folderClasses = Object.keys(allData);

            // Derive classes from database
            let loginClasses: string[] = [];
            try {
                loginClasses = await getAllClasses();
            } catch (err) {
                console.error('DB class lookup failed:', err);
            }

            // Merge both sources, deduplicate
            let merged = [...new Set([...folderClasses, ...loginClasses])];

            // If user is a regular teacher, restrict to classes they teach
            const isRegularTeacher = session.user.role === 'teacher' && session.user.name?.toLowerCase() !== 'srsma';
            if (isRegularTeacher) {
                const mappings = await getMappingsForTeacher(session.user.username || '');
                const teacherClasses = new Set(mappings.map(m => m.class_name));
                merged = merged.filter(c => teacherClasses.has(c));
            }

            return NextResponse.json(merged);
        }

        // 2. Get Subjects for a Class
        if (type === 'subjects' && className) {
            const allData = await getAllDataFromDB();
            const subjects = allData[className]?.map(s => s.subjectName) || [];
            return NextResponse.json(subjects);
        }

        // 3. Get Full Performance Data (Parent/Student View)
        if (type === 'performance' && student) {
            // Security Check: Students can only fetch their own data.
            // We compare against the session's real name; also handle the case
            // where the student param is their roll number instead of their name.
            const sessionUsername = session.user.username || '';
            const isOwnData =
                student.toLowerCase().trim() === sessionName.toLowerCase().trim() ||
                (sessionUsername && student.toLowerCase().trim() === sessionUsername.toLowerCase().trim());

            if (userRole === 'student' && !isOwnData) {
                return NextResponse.json({ error: 'Forbidden: Access denied to other student data' }, { status: 403 });
            }

            // Always look up by the real student name for performance data.
            // If the student param is the roll number, resolve it to the real name first.
            let studentNameToFetch = student;
            if (sessionUsername && student.toLowerCase().trim() === sessionUsername.toLowerCase().trim()) {
                // Student passed their roll number — use the real name from the session instead.
                studentNameToFetch = sessionName;
            }

            const data = await getStudentDataFromDB(studentNameToFetch);
            return NextResponse.json(data);
        }

        // 4. Get Batch Data (Teacher View)
        if (type === 'batch') {
            if (userRole === 'student') {
                return NextResponse.json({ error: 'Forbidden: Students cannot view batch data' }, { status: 403 });
            }

            // Return full class data structure for the specific class/subject
            if (!className) return NextResponse.json({ error: 'Class required' }, { status: 400 });

            const allData = await getAllDataFromDB();
            let result = allData[className] || [];

            if (subject) {
                result = result.filter(s => s.subjectName === subject);
            }

            return NextResponse.json(result);
        }

        // 5. Get Teacher Permissions
        if (type === 'teacher-permissions') {
            const isRegularTeacher = session.user.role === 'teacher' && session.user.name?.toLowerCase() !== 'srsma';
            if (!isRegularTeacher) {
                return NextResponse.json({ isAdmin: true, permissions: [] });
            }
            const mappings = await getMappingsForTeacher(session.user.username || '');
            return NextResponse.json({ isAdmin: false, permissions: mappings });
        }

        return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
