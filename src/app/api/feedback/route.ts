import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { saveFeedback, getAllFeedback, replyToFeedback, deleteFeedback } from '@/lib/db';

// POST /api/feedback - Submit new feedback (any logged-in user)
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { parentName, studentName, message } = body;

        if (!message || !message.trim()) {
            return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
        }

        await saveFeedback(
            parentName ? String(parentName).trim() : null,
            studentName ? String(studentName).trim() : null,
            String(message).trim()
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving feedback:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// GET /api/feedback - Get all feedback (teacher only)
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user?.role?.toLowerCase() !== 'teacher' && session.user?.role?.toLowerCase() !== 'admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const feedbackList = await getAllFeedback();
        return NextResponse.json(feedbackList);
    } catch (error) {
        console.error('Error fetching feedback:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH /api/feedback - Teacher reply to feedback
export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user?.role?.toLowerCase() !== 'teacher' && session.user?.role?.toLowerCase() !== 'admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { id, reply } = body;

        if (!id || !reply?.trim()) {
            return NextResponse.json({ success: false, error: 'ID and reply are required' }, { status: 400 });
        }

        const success = await replyToFeedback(Number(id), String(reply).trim());
        return NextResponse.json({ success });
    } catch (error) {
        console.error('Error replying to feedback:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/feedback - Delete feedback (teacher only)
export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user?.role?.toLowerCase() !== 'teacher' && session.user?.role?.toLowerCase() !== 'admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
        }

        const success = await deleteFeedback(Number(id));
        return NextResponse.json({ success });
    } catch (error) {
        console.error('Error deleting feedback:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
