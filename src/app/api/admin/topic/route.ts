import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateTopicDetails } from '@/lib/db';

export async function PATCH(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== 'teacher' && session.user.role !== 'admin')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const {
            className,
            oldSubject,
            oldTopicName,
            newSubject,
            newTopicName,
            newTestDate,
            newTotalMarks
        } = body;

        if (!className || !oldSubject || !oldTopicName || !newSubject || !newTopicName || !newTestDate || !newTotalMarks) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const totalMarksNum = Number(newTotalMarks);
        if (isNaN(totalMarksNum) || totalMarksNum <= 0) {
            return NextResponse.json({ error: 'Invalid total marks' }, { status: 400 });
        }

        const updated = await updateTopicDetails(
            String(className),
            String(oldSubject),
            String(oldTopicName),
            String(newSubject),
            String(newTopicName),
            String(newTestDate),
            totalMarksNum
        );

        if (!updated) {
            return NextResponse.json({ error: 'Topic not found or no changes made' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Topic details updated successfully' });
    } catch (error) {
        console.error('Topic update error:', error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
