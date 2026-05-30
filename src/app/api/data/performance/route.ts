import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updatePerformanceEntry, addNotification, isTeacherMapped, getStudentRollNo } from '@/lib/db';

export async function PATCH(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== 'teacher' && session.user.role !== 'admin')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const isRegularTeacher = session.user.role === 'teacher' && session.user.name?.toLowerCase() !== 'srsma';

        // Support bulk updates
        if (body.isBulk && Array.isArray(body.updates)) {
            const { className, subject, topicName, updates } = body;
            if (!className || !subject || !topicName) {
                return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
            }

            if (isRegularTeacher) {
                const hasPermission = await isTeacherMapped(session.user.username || '', String(className), String(subject));
                if (!hasPermission) {
                    return NextResponse.json({ error: 'Forbidden: You do not have permission to edit this subject.' }, { status: 403 });
                }
            }

            for (const update of updates) {
                const { studentName, marks, comments } = update;
                if (!studentName) continue;
                const marksValue =
                    marks === null || marks === undefined || marks === '' || Number.isNaN(Number(marks))
                        ? null
                        : Number(marks);
                const commentsValue =
                    typeof comments === 'string' && comments.trim().length > 0
                        ? comments.trim()
                        : null;

                await updatePerformanceEntry(
                    String(className),
                    String(subject),
                    String(topicName),
                    String(studentName),
                    marksValue,
                    commentsValue
                );

                if (marksValue !== null) {
                    const rollNo = await getStudentRollNo(String(studentName), String(className));
                    if (rollNo) {
                        await addNotification(rollNo, `Your marks for ${subject} - ${topicName} have been updated to ${marksValue}.`);
                    }
                }
            }
            return NextResponse.json({ success: true, message: 'All performance entries updated successfully' });
        }

        const {
            className,
            subject,
            topicName,
            studentName,
            marks,
            comments
        } = body;

        if (!className || !subject || !topicName || !studentName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (isRegularTeacher) {
            const hasPermission = await isTeacherMapped(session.user.username || '', String(className), String(subject));
            if (!hasPermission) {
                return NextResponse.json({ error: 'Forbidden: You do not have permission to edit this subject.' }, { status: 403 });
            }
        }

        const marksValue =
            marks === null || marks === undefined || marks === '' || Number.isNaN(Number(marks))
                ? null
                : Number(marks);
        const commentsValue =
            typeof comments === 'string' && comments.trim().length > 0
                ? comments.trim()
                : null;

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

        if (marksValue !== null) {
            const rollNo = await getStudentRollNo(String(studentName), String(className));
            if (rollNo) {
                await addNotification(rollNo, `Your marks for ${subject} - ${topicName} have been updated to ${marksValue}.`);
            }
        }

        return NextResponse.json({ success: true, message: 'Performance updated successfully' });
    } catch (error) {
        console.error('Performance update error:', error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
