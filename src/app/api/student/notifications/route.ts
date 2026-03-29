import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUnreadNotifications, markNotificationsAsRead } from '@/lib/db';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'student') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const notifications = await getUnreadNotifications(session.user.name!);
        return NextResponse.json(notifications);
    } catch (e) {
        console.error('Error fetching notifications:', e);
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'student') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await markNotificationsAsRead(session.user.name!);
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Error updating notifications:', e);
        return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
    }
}
