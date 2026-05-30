import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getLoginStats } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user?.role?.toLowerCase() !== 'teacher' && session.user?.role?.toLowerCase() !== 'admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const periodParam = searchParams.get('period');
        const activePeriodDays = periodParam ? parseInt(periodParam, 10) : undefined;
        const fromDate = searchParams.get('from');
        const toDate = searchParams.get('to');

        const stats = await getLoginStats(activePeriodDays, fromDate || undefined, toDate || undefined);
        return NextResponse.json(stats);
    } catch (error) {
        console.error('Error fetching analytics stats:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
