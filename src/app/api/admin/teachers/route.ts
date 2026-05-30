import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
    getAllTeachers,
    getTeacherMappings,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    addTeacherMapping,
    deleteTeacherMapping
} from '@/lib/db';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user.role !== 'admin' && session.user.name?.toLowerCase() !== 'srsma' && session.user.username?.toLowerCase() !== 'srsma')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const teachers = await getAllTeachers();
        const mappings = await getTeacherMappings();
        return NextResponse.json({
            teachers: teachers.map(t => ({
                id: t.id,
                name: t.name,
                username: t.username,
                password: t.password,
                status: t.status
            })),
            mappings
        });
    } catch (e: any) {
        console.error('Error fetching teacher data:', e);
        return NextResponse.json({ error: e.message || 'Failed to fetch data' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'admin' && session.user.name?.toLowerCase() !== 'srsma' && session.user.username?.toLowerCase() !== 'srsma')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { action } = body;

        if (action === 'addTeacher') {
            const { name, password } = body;
            if (!name || !password) {
                return NextResponse.json({ error: 'Missing name or password' }, { status: 400 });
            }
            await addTeacher(name, password);
            return NextResponse.json({ success: true, message: 'Teacher added successfully' });
        } else if (action === 'addMapping') {
            const { teacherUsername, className, subject } = body;
            if (!teacherUsername || !className || !subject) {
                return NextResponse.json({ error: 'Missing mapping details' }, { status: 400 });
            }
            await addTeacherMapping(teacherUsername, className, subject);
            return NextResponse.json({ success: true, message: 'Mapping added successfully' });
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (e: any) {
        console.error('Error in teacher POST:', e);
        return NextResponse.json({ error: e.message || 'Failed to execute request' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'admin' && session.user.name?.toLowerCase() !== 'srsma' && session.user.username?.toLowerCase() !== 'srsma')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { oldName, newName, password } = body;

        if (!oldName || !newName) {
            return NextResponse.json({ error: 'Missing names' }, { status: 400 });
        }

        const success = await updateTeacher(oldName, newName, password);
        if (!success) {
            return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Teacher updated successfully' });
    } catch (e: any) {
        console.error('Error in teacher PATCH:', e);
        return NextResponse.json({ error: e.message || 'Failed to update teacher' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'admin' && session.user.name?.toLowerCase() !== 'srsma' && session.user.username?.toLowerCase() !== 'srsma')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { action } = body;

        if (action === 'deleteTeacher') {
            const { name } = body;
            if (!name) {
                return NextResponse.json({ error: 'Missing teacher name' }, { status: 400 });
            }
            const success = await deleteTeacher(name);
            if (!success) {
                return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
            }
            return NextResponse.json({ success: true, message: 'Teacher and mappings deleted successfully' });
        } else if (action === 'deleteMapping') {
            const { teacherUsername, className, subject } = body;
            if (!teacherUsername || !className || !subject) {
                return NextResponse.json({ error: 'Missing mapping details' }, { status: 400 });
            }
            await deleteTeacherMapping(teacherUsername, className, subject);
            return NextResponse.json({ success: true, message: 'Mapping deleted successfully' });
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (e: any) {
        console.error('Error in teacher DELETE:', e);
        return NextResponse.json({ error: e.message || 'Failed to delete' }, { status: 500 });
    }
}
