import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const DATA_DIR = path.join(process.cwd(), 'Data');
const LOGIN_FILE = path.join(DATA_DIR, 'LoginData.xlsx');

/**
 * Converts a folder-style className (e.g. "Class_12+", "Class_XII") to
 * the raw value stored in LoginData.xlsx (e.g. "12+", 12).
 * Returns an array of possible values to match against (string AND number variants).
 */
function folderToExcelClassValues(folderName: string): string[] {
    // Strip the "Class_" prefix
    let raw = folderName.replace(/^Class_/i, '');
    const values: string[] = [raw];

    // Also add lowercased / uppercased variants
    values.push(raw.toLowerCase(), raw.toUpperCase());

    // Roman numeral mapping
    const romanToNum: Record<string, string> = {
        'VIII': '8', 'IX': '9', 'X': '10', 'XI': '11', 'XII': '12',
        'viii': '8', 'ix': '9', 'x': '10', 'xi': '11', 'xii': '12',
    };
    // Number to Roman mapping (reverse)
    const numToRoman: Record<string, string> = {
        '8': 'VIII', '9': 'IX', '10': 'X', '11': 'XI', '12': 'XII',
    };

    if (romanToNum[raw]) {
        values.push(romanToNum[raw]);
    }
    if (numToRoman[raw]) {
        values.push(numToRoman[raw]);
    }

    return [...new Set(values)];
}

function matchesClass(userClass: any, folderName: string): boolean {
    const possibleValues = folderToExcelClassValues(folderName);
    const userVal = String(userClass).trim();
    return possibleValues.includes(userVal);
}

function isStudentRole(user: any): boolean {
    const role = String(user.Role || user.role || '').trim().toLowerCase();
    return role === 'student';
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'teacher' && session.user.role !== 'admin')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const className = searchParams.get('class');

    if (!fs.existsSync(LOGIN_FILE)) return NextResponse.json([]);

    try {
        const buffer = fs.readFileSync(LOGIN_FILE);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const users = XLSX.utils.sheet_to_json(sheet) as any[];

        if (!className) return NextResponse.json(users);

        const filtered = users.filter(u => matchesClass(u.class, className) && isStudentRole(u));
        return NextResponse.json(filtered.map(u => u.username || u.Username));
    } catch (e) {
        console.error('Error reading LoginData:', e);
        return NextResponse.json({ error: 'Failed to read login data' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'teacher' && session.user.role !== 'admin')) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { studentName, className } = body;

        if (!studentName || !className) {
            return NextResponse.json({ error: 'Missing studentName or className' }, { status: 400 });
        }

        if (!fs.existsSync(LOGIN_FILE)) {
            return NextResponse.json({ error: 'LoginData.xlsx not found' }, { status: 500 });
        }

        const buffer = fs.readFileSync(LOGIN_FILE);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const users = XLSX.utils.sheet_to_json(sheet) as any[];

        // Check if user already exists in this class
        const exists = users.find(u =>
            (u.username === studentName || u.Username === studentName) &&
            matchesClass(u.class, className)
        );
        if (exists) {
            return NextResponse.json({ error: 'Student already exists in this class' }, { status: 400 });
        }

        // Derive the raw class value to store — use the convention from existing students in that class
        let rawClassValue: string | number = className.replace(/^Class_/i, '');
        const existingInClass = users.find(u => matchesClass(u.class, className));
        if (existingInClass) {
            rawClassValue = existingInClass.class; // Reuse the same format as existing entries
        }

        // Append new user
        users.push({
            username: studentName,
            password: 'srsma',
            class: rawClassValue,
            Role: 'Student'
        });

        const newSheet = XLSX.utils.json_to_sheet(users);
        workbook.Sheets[sheetName] = newSheet;
        const newBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        fs.writeFileSync(LOGIN_FILE, newBuffer);

        return NextResponse.json({ success: true, message: 'Student created successfully. Default password is: srsma' });
    } catch (e) {
        console.error('Error adding student:', e);
        return NextResponse.json({ error: 'Failed to write login data' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'teacher' && session.user.role !== 'admin')) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { studentName, className } = body;

        if (!studentName || !className) {
            return NextResponse.json({ error: 'Missing studentName or className' }, { status: 400 });
        }

        if (!fs.existsSync(LOGIN_FILE)) {
            return NextResponse.json({ error: 'LoginData.xlsx not found' }, { status: 500 });
        }

        const buffer = fs.readFileSync(LOGIN_FILE);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        let users = XLSX.utils.sheet_to_json(sheet) as any[];

        const initialLength = users.length;
        users = users.filter(u => !(
            (u.username === studentName || u.Username === studentName) &&
            matchesClass(u.class, className)
        ));

        if (users.length === initialLength) {
            return NextResponse.json({ error: 'Student not found in this class' }, { status: 404 });
        }

        const newSheet = XLSX.utils.json_to_sheet(users);
        workbook.Sheets[sheetName] = newSheet;
        const newBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        fs.writeFileSync(LOGIN_FILE, newBuffer);

        return NextResponse.json({ success: true, message: 'Student deleted successfully' });
    } catch (e) {
        console.error('Error deleting student:', e);
        return NextResponse.json({ error: 'Failed to write login data' }, { status: 500 });
    }
}
