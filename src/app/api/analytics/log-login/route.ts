import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logUserLogin } from '@/lib/db';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { username, name, role, userAgent } = body;

        // Ensure the logged in user is only logging their own login
        const sessionUsername = session.user.username || session.user.name || '';
        if (!username || username.toLowerCase().trim() !== sessionUsername.toLowerCase().trim()) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        if (!userAgent) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        await logUserLogin(
            String(sessionUsername || username),
            session.user.name || name || null,
            session.user.role || role || null,
            String(userAgent)
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error logging login:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
