
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAllData, getStudentData } from "@/lib/parser";

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
    const username = session.user.name;

    try {
        // 1. Get Class List
        if (type === 'classes') {
            // Should filter based on role? For now return all configured classes found in Data
            const allData = getAllData();
            const classes = Object.keys(allData);
            return NextResponse.json(classes);
        }

        // 2. Get Subjects for a Class
        if (type === 'subjects' && className) {
            const allData = getAllData();
            const subjects = allData[className]?.map(s => s.subjectName) || [];
            return NextResponse.json(subjects);
        }

        // 3. Get Full Performance Data (Parent/Student View)
        if (type === 'performance' && student) {
            // Security Check: Parents can only fetch THEIR child's data
            if (userRole === 'student' && student !== username) {
                return NextResponse.json({ error: 'Forbidden: Access denied to other student data' }, { status: 403 });
            }

            const data = getStudentData(student);
            return NextResponse.json(data);
        }

        // 4. Get Batch Data (Teacher View)
        if (type === 'batch') {
            if (userRole === 'student') {
                return NextResponse.json({ error: 'Forbidden: Students cannot view batch data' }, { status: 403 });
            }

            // Return full class data structure for the specific class/subject
            if (!className) return NextResponse.json({ error: 'Class required' }, { status: 400 });

            const allData = getAllData();
            let result = allData[className] || [];

            if (subject) {
                result = result.filter(s => s.subjectName === subject);
            }

            return NextResponse.json(result);
        }

        return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
