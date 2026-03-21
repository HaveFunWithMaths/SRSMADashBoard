import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { savePerformanceData } from '@/lib/db';

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'teacher') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { className, subject, topicName, date, totalMarks, students } = body;

        if (!className || !subject || !topicName || !date || typeof totalMarks !== 'number' || !Array.isArray(students)) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        // Save into PostgreSQL database since filesystem is ephemeral in Vercel.
        for (const student of students) {
            const marksValue = (student.marks === null || student.marks === undefined || student.marks === '' || Number.isNaN(Number(student.marks))) 
                ? null 
                : Number(student.marks);
                
            await savePerformanceData(
                className,
                subject,
                topicName,
                date,
                totalMarks,
                student.name,
                marksValue,
                student.comments || null
            );
        }

        return NextResponse.json({ success: true, message: 'Marks uploaded successfully to Database' });

    } catch (error: any) {
        console.error('Upload Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
