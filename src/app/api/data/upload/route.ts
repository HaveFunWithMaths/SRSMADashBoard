import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { savePerformanceData, addNotification, isTeacherMapped, getStudentRollNo } from '@/lib/db';

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== 'teacher' && session.user.role !== 'admin')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { className, subject, topicName, date, totalMarks, students } = body;

        if (!className || !subject || !topicName || !date || typeof totalMarks !== 'number' || totalMarks <= 0 || !Array.isArray(students)) {
            return NextResponse.json({ error: 'Invalid payload: totalMarks must be a positive number' }, { status: 400 });
        }

        const isRegularTeacher = session.user.role === 'teacher' && session.user.name?.toLowerCase() !== 'srsma';
        if (isRegularTeacher) {
            const hasPermission = await isTeacherMapped(session.user.username || '', String(className), String(subject));
            if (!hasPermission) {
                return NextResponse.json({ error: 'Forbidden: You do not have permission to upload marks for this subject.' }, { status: 403 });
            }
        }

        // Save into PostgreSQL database since filesystem is ephemeral in Vercel.
        for (const student of students) {
            const rawMarks = String(student.marks ?? '').trim().toUpperCase();
            const marksValue = (rawMarks === 'NA')
                ? -1
                : (student.marks === null || student.marks === undefined || student.marks === '' || Number.isNaN(Number(student.marks))) 
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

            if (marksValue !== null && marksValue !== -1) {
                const rollNo = await getStudentRollNo(student.name, className);
                if (rollNo) {
                    await addNotification(rollNo, `New marks uploaded for ${subject} - ${topicName}: ${marksValue}/${totalMarks}`);
                }
            }
        }

        return NextResponse.json({ success: true, message: 'Marks uploaded successfully to Database' });

    } catch (error: any) {
        console.error('Upload Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
