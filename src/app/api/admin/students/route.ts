import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
    getStudentsByClass,
    studentExists,
    addStudent,
    deleteStudent,
    restoreStudent,
    getMaxRollSequence,
    getRawClassValue,
    permanentDeleteStudent,
    renameStudent
} from '@/lib/db';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'teacher' && session.user.role !== 'admin')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const className = searchParams.get('class');

    if (!className) {
        return NextResponse.json({ error: 'Class parameter required' }, { status: 400 });
    }

    try {
        const students = await getStudentsByClass(className);
        return NextResponse.json(students.map(u => ({
            username: u.username,
            rollNo: u.roll_no || '',
            status: u.status || 'Active'
        })));
    } catch (e) {
        console.error('Error reading students from DB:', e);
        return NextResponse.json({ error: 'Failed to read student data' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'teacher' && session.user.role !== 'admin')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { studentName, className } = body;

        if (!studentName || !className) {
            return NextResponse.json({ error: 'Missing studentName or className' }, { status: 400 });
        }

        // Check if student already exists
        const exists = await studentExists(studentName, className);
        if (exists) {
            return NextResponse.json({ error: 'Student already exists in this class' }, { status: 400 });
        }

        // Determine the raw class value to store
        const rawClassValue = await getRawClassValue(className);

        // Generate Roll No smartly
        const maxSeq = await getMaxRollSequence(className);
        const classPrefix = className.replace(/^Class_/i, '');
        const newRollNo = `${classPrefix}${(maxSeq + 1).toString().padStart(2, '0')}`;

        // Insert into database
        await addStudent(studentName, rawClassValue, newRollNo);

        return NextResponse.json({
            success: true,
            message: `Student created successfully. Roll No: ${newRollNo}. Default password: srsma`
        });
    } catch (e) {
        console.error('Error adding student:', e);
        return NextResponse.json({ error: 'Failed to add student' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'teacher' && session.user.role !== 'admin')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { studentName, className, permanent } = body;

        if (!studentName || !className) {
            return NextResponse.json({ error: 'Missing studentName or className' }, { status: 400 });
        }

        if (permanent) {
            const found = await permanentDeleteStudent(studentName, className);
            if (!found) {
                return NextResponse.json({ error: 'Student not found in this class' }, { status: 404 });
            }
            return NextResponse.json({ success: true, message: 'Student permanently deleted' });
        }

        const found = await deleteStudent(studentName, className);
        if (!found) {
            return NextResponse.json({ error: 'Student not found in this class' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Student marked as deleted' });
    } catch (e) {
        console.error('Error deleting student:', e);
        return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'teacher' && session.user.role !== 'admin')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { studentName, className, action, newName } = body;

        if (!studentName || !className || !action) {
            return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
        }

        if (action === 'rename') {
            if (!newName) return NextResponse.json({ error: 'Missing new name' }, { status: 400 });
            const found = await renameStudent(studentName, newName, className);
            if (!found) {
                return NextResponse.json({ error: 'Student not found' }, { status: 404 });
            }
            return NextResponse.json({ success: true, message: 'Student renamed successfully' });
        } else if (action === 'restore') {
            const found = await restoreStudent(studentName, className);
            if (!found) {
                return NextResponse.json({ error: 'Student not found' }, { status: 404 });
            }
            return NextResponse.json({ success: true, message: 'Student restored successfully' });
        } else {
             return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (e) {
        console.error('Error in student PATCH:', e);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
