import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updatePerformanceEntry } from '@/lib/db';

export async function PATCH(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'teacher') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const {
            className,
            subject,
            topicName,
            studentName,
            marks,
            comments
        } = body;

        const marksValue =
            marks === null || marks === undefined || marks === '' || Number.isNaN(Number(marks))
                ? null
                : Number(marks);
        const commentsValue =
            typeof comments === 'string' && comments.trim().length > 0
                ? comments.trim()
                : null;

        if (!className || !subject || !topicName || !studentName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const updated = await updatePerformanceEntry(
            String(className),
            String(subject),
            String(topicName),
            String(studentName),
            marksValue,
            commentsValue
        );

        if (!updated) {
            return NextResponse.json({ error: 'Performance record not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Performance updated successfully' });
    } catch (error) {
        console.error('Performance update error:', error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
