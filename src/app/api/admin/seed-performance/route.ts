import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        success: false,
        message: 'Local Excel data seeding is deprecated. Please use the Database and the Admin Dashboard directly.'
    }, { status: 400 });
}
