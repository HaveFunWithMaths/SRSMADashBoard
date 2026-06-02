import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserLoginLogs } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user?.role?.toLowerCase() !== 'teacher' && session.user?.role?.toLowerCase() !== 'admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const username = searchParams.get('username');
        if (!username) {
            return NextResponse.json({ error: 'Missing username' }, { status: 400 });
        }

        const fromDate = searchParams.get('from') || undefined;
        const toDate = searchParams.get('to') || undefined;
        const periodParam = searchParams.get('period');
        const activePeriodDays = periodParam ? parseInt(periodParam, 10) : undefined;

        const logs = await getUserLoginLogs(username, fromDate, toDate, activePeriodDays);
        return NextResponse.json({ success: true, logs });
    } catch (error) {
        console.error('Error fetching user login logs:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
