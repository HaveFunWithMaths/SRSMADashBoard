import { NextResponse } from 'next/server';
import { initializeDatabase, savePerformanceData } from '@/lib/db';
import { getAllData } from '@/lib/parser';

export async function GET() {
    try {
        await initializeDatabase();
        
        // Use the existing sync parser to read the entire Data/ folder
        const allData = getAllData();

        let count = 0;
        
        for (const [className, subjects] of Object.entries(allData)) {
            for (const subjectData of subjects) {
                const subject = subjectData.subjectName;
                for (const topic of subjectData.topics) {
                    const topicName = topic.topicName;
                    const testDate = topic.date;
                    const totalMarks = topic.totalMarks;
                    for (const student of topic.students) {
                        await savePerformanceData(
                            className,
                            subject,
                            topicName,
                            testDate,
                            totalMarks,
                            student.name,
                            student.marks ?? null,
                            student.comments || null
                        );
                        count++;
                    }
                }
            }
        }
        
        return NextResponse.json({ success: true, count, message: 'Seeded successfully' });
    } catch (e: any) {
        console.error('Seeding error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
