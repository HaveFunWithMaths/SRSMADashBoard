import { StudentRecord, TopicData } from './types';

/**
 * Calculates percentage based on marks and totalMarks.
 * Returns null if marks is null (Absent).
 * Rounds to 1 decimal place.
 */
export function calculatePercentage(marks: number | null, totalMarks: number): number | null {
    if (marks === null || totalMarks === 0) return null;
    const percentage = (marks / totalMarks) * 100;
    return Math.round(percentage * 10) / 10;
}

/**
 * Calculates ranks for a list of students based on marks.
 * Uses standard competition ranking (1224) for ties.
 * Absent students (marks=null) get rank=null.
 * Returns a new array of students with rank populated.
 */
export function calculateRanks(students: StudentRecord[]): StudentRecord[] {
    // Filter out students with null marks for ranking
    const validStudents = students.filter(s => s.marks !== null);

    // Sort by marks descending
    validStudents.sort((a, b) => (b.marks as number) - (a.marks as number));

    const rankedStudents = [...students];

    // Create a map of name -> rank
    const rankMap = new Map<string, number>();

    let currentRank = 1;
    for (let i = 0; i < validStudents.length; i++) {
        const student = validStudents[i];
        // If tie with previous student, use same rank
        if (i > 0 && student.marks === validStudents[i - 1].marks) {
            rankMap.set(student.name, rankMap.get(validStudents[i - 1].name)!);
        } else {
            rankMap.set(student.name, i + 1); // Rank is 1-based index in sorted array (standard competition)
        }
    }

    // Apply ranks to original list (preserving order? No, likely just map values)
    // Actually, let's return a new list with ranks set
    return rankedStudents.map(s => {
        if (s.marks === null) {
            return { ...s, rank: null };
        }
        return { ...s, rank: rankMap.get(s.name) ?? null };
    });
}

/**
 * Calculates class average marks.
 * Excludes absent students.
 */
export function calculateClassAverage(students: StudentRecord[]): number {
    const validMarks = students
        .map(s => s.marks)
        .filter((m): m is number => m !== null);

    if (validMarks.length === 0) return 0;

    const sum = validMarks.reduce((a, b) => a + b, 0);
    const avg = sum / validMarks.length;
    return Math.round(avg * 10) / 10;
}

/**
 * Gets the highest marks in the topic.
 */
export function getTopperMarks(students: StudentRecord[]): number {
    const validMarks = students
        .map(s => s.marks)
        .filter((m): m is number => m !== null);

    if (validMarks.length === 0) return 0;
    return Math.max(...validMarks);
}

/**
 * Enriches a topic with calculated metrics.
 */
export function processTopic(topic: TopicData): TopicData {
    const enrichedStudents: StudentRecord[] = topic.students.map(s => ({
        ...s,
        percentage: calculatePercentage(s.marks, topic.totalMarks) ?? null
    }));

    const rankedStudents = calculateRanks(enrichedStudents);

    return {
        ...topic,
        students: rankedStudents,
        classAverage: calculateClassAverage(enrichedStudents),
        topperMarks: getTopperMarks(enrichedStudents)
    };
}
