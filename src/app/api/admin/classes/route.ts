import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { editClass, deleteClassFromDB } from '@/lib/db';

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'teacher' && session.user.role !== 'admin')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { oldClassName, newClassName } = body;
        if (!oldClassName || !newClassName) {
            return NextResponse.json({ error: 'Missing class names' }, { status: 400 });
        }
        await editClass(oldClassName, newClassName);
        return NextResponse.json({ success: true, message: 'Class name updated' });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to update class' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'teacher' && session.user.role !== 'admin')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { className } = body;
        if (!className) {
            return NextResponse.json({ error: 'Missing class name' }, { status: 400 });
        }
        await deleteClassFromDB(className);
        return NextResponse.json({ success: true, message: 'Class deleted successfully' });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to delete class' }, { status: 500 });
    }
}
