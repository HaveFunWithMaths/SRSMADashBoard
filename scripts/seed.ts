/**
 * Seed Script: Migrates LoginData.xlsx → Neon PostgreSQL
 * 
 * Run with: npx tsx scripts/seed.ts
 * 
 * Requires DATABASE_URL to be set in .env.local
 */

import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { neon } from '@neondatabase/serverless';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set. Please run "npx vercel env pull .env.local" first.');
    process.exit(1);
}

const sql = neon(DATABASE_URL);

async function seed() {
    console.log('🚀 Starting database seed...\n');

    // 1. Create table
    console.log('📋 Creating users table...');
    await sql`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) NOT NULL,
            password VARCHAR(255) NOT NULL DEFAULT 'srsma',
            class VARCHAR(50),
            role VARCHAR(20) NOT NULL DEFAULT 'Student',
            roll_no VARCHAR(50),
            status VARCHAR(20) NOT NULL DEFAULT 'Active',
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(username, class)
        )
    `;
    console.log('   ✅ Table created (or already exists).\n');

    // 2. Read LoginData.xlsx
    const loginFile = path.join(__dirname, '..', 'Data', 'LoginData.xlsx');
    if (!fs.existsSync(loginFile)) {
        console.error(`❌ LoginData.xlsx not found at: ${loginFile}`);
        process.exit(1);
    }

    console.log('📖 Reading LoginData.xlsx...');
    const buffer = fs.readFileSync(loginFile);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const users = XLSX.utils.sheet_to_json(sheet) as any[];

    console.log(`   Found ${users.length} users.\n`);

    // 3. Insert users
    console.log('💾 Inserting users into database...');
    let inserted = 0;
    let skipped = 0;

    for (const user of users) {
        const username = String(user.username || user.Username || '').trim();
        const password = String(user.password || user.Password || 'srsma').trim();
        const userClass = user.class != null ? String(user.class).trim() : null;
        const role = String(user.Role || user.role || 'Student').trim();
        const rollNo = String(user['Roll No'] || user.rollNo || user.RollNo || '').trim() || null;
        const status = String(user.Status || 'Active').trim();

        if (!username) {
            console.log(`   ⚠️  Skipping row with empty username`);
            skipped++;
            continue;
        }

        try {
            await sql`
                INSERT INTO users (username, password, class, role, roll_no, status)
                VALUES (${username}, ${password}, ${userClass}, ${role}, ${rollNo}, ${status})
                ON CONFLICT (username, class) DO UPDATE SET
                    password = EXCLUDED.password,
                    role = EXCLUDED.role,
                    roll_no = EXCLUDED.roll_no,
                    status = EXCLUDED.status
            `;
            inserted++;
            console.log(`   ✅ ${username} (${role}, class: ${userClass || 'N/A'})`);
        } catch (err: any) {
            console.error(`   ❌ Failed to insert ${username}: ${err.message}`);
            skipped++;
        }
    }

    console.log(`\n🎉 Seed complete! Inserted/updated: ${inserted}, Skipped: ${skipped}`);

    // 4. Verify
    const count = await sql`SELECT COUNT(*) as count FROM users`;
    console.log(`📊 Total users in database: ${count[0].count}`);
}

seed().catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
