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
        return NextResponse.json(filtered.map(u => ({
            username: u.username || u.Username,
            rollNo: u['Roll No'] || u.rollNo || u.RollNo || '',
            status: u.Status || 'Active'
        })));
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
        const existingInClass = users.filter(u => matchesClass(u.class, className));
        if (existingInClass.length > 0) {
            rawClassValue = existingInClass[0].class; // Reuse the same format as existing entries
        }

        // Generate Roll No smartly
        let maxSeq = 0;
        const classPrefix = className.replace(/^Class_/i, '');
        for (const u of existingInClass) {
            const roll = String(u['Roll No'] || u.RollNo || u.rollNo || '').trim();
            // User Rule: Last 2 digits are sequence, initial digits are class name
            if (roll.startsWith(classPrefix) && roll.length >= classPrefix.length + 2) {
                const seqStr = roll.slice(-2);
                if (/^\d{2}$/.test(seqStr)) {
                    const seq = parseInt(seqStr, 10);
                    if (seq > maxSeq) maxSeq = seq;
                }
            } else if (roll.length >= 2) {
                // Fallback: just look at the last 2 digits if prefix doesn't strictly match
                const seqStr = roll.slice(-2);
                if (/^\d{2}$/.test(seqStr)) {
                    const seq = parseInt(seqStr, 10);
                    if (seq > maxSeq) maxSeq = seq;
                }
            }
        }
        maxSeq += 1;
        const newRollNo = `${classPrefix}${maxSeq.toString().padStart(2, '0')}`;

        // Append new user
        users.push({
            username: studentName,
            password: 'srsma',
            class: rawClassValue,
            Role: 'Student',
            'Roll No': newRollNo,
            Status: 'Active' // default status
        });

        const newSheet = XLSX.utils.json_to_sheet(users);
        workbook.Sheets[sheetName] = newSheet;
        const newBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        fs.writeFileSync(LOGIN_FILE, newBuffer);

        return NextResponse.json({ success: true, message: `Student created successfully. Roll No: ${newRollNo}. Default password: srsma` });
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

        let found = false;
        for (const u of users) {
             if ((u.username === studentName || u.Username === studentName) && matchesClass(u.class, className)) {
                 u.Status = 'Deleted';
                 found = true;
             }
        }

        if (!found) {
            return NextResponse.json({ error: 'Student not found in this class' }, { status: 404 });
        }

        const newSheet = XLSX.utils.json_to_sheet(users);
        workbook.Sheets[sheetName] = newSheet;
        const newBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        fs.writeFileSync(LOGIN_FILE, newBuffer);

        return NextResponse.json({ success: true, message: 'Student marked as deleted' });
    } catch (e) {
        console.error('Error deleting student:', e);
        return NextResponse.json({ error: 'Failed to write login data' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'teacher' && session.user.role !== 'admin')) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { studentName, className, action } = body;

        if (!studentName || !className || action !== 'restore') {
            return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
        }

        if (!fs.existsSync(LOGIN_FILE)) {
            return NextResponse.json({ error: 'LoginData.xlsx not found' }, { status: 500 });
        }

        const buffer = fs.readFileSync(LOGIN_FILE);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        let users = XLSX.utils.sheet_to_json(sheet) as any[];

        let found = false;
        for (const u of users) {
             if ((u.username === studentName || u.Username === studentName) && matchesClass(u.class, className)) {
                 u.Status = 'Active';
                 found = true;
             }
        }

        if (!found) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        const newSheet = XLSX.utils.json_to_sheet(users);
        workbook.Sheets[sheetName] = newSheet;
        const newBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        fs.writeFileSync(LOGIN_FILE, newBuffer);

        return NextResponse.json({ success: true, message: 'Student restored successfully' });
    } catch (e) {
        console.error('Error restoring student:', e);
        return NextResponse.json({ error: 'Failed to write login data' }, { status: 500 });
    }
}
