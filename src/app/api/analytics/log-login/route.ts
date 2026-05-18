import { NextRequest, NextResponse } from 'next/server';
import { logUserLogin } from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { username, name, role, userAgent } = body;

        if (!username || !userAgent) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        await logUserLogin(
            String(username),
            name ? String(name) : null,
            role ? String(role) : null,
            String(userAgent)
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error logging login:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
