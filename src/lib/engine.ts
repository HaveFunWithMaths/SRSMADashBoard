import { StudentRecord, TopicData } from './types';

/**
 * Calculates percentage based on marks and totalMarks.
 * Returns null if marks is null (Absent).
 * Rounds to 1 decimal place.
 */
export function calculatePercentage(marks: number | null, totalMarks: number): number | null {
    if (marks === null || marks === -1 || totalMarks === 0) return null;
    const percentage = (marks / totalMarks) * 100;
    return Math.round(percentage * 10) / 10;
}

/**
 * Calculates ranks for a list of students based on marks.
 * Uses standard competition ranking (1224) for ties.
 * Absent students (marks=null) or NA students (marks=-1) get rank=null.
 * Returns a new array of students with rank populated.
 */
export function calculateRanks(students: StudentRecord[]): StudentRecord[] {
    // Filter out students with null or -1 marks for ranking
    const validStudents = students.filter(s => s.marks !== null && s.marks !== -1);

    // Sort by marks descending
    validStudents.sort((a, b) => (b.marks as number) - (a.marks as number));

    const rankedStudents = [...students];

    // Create a map of rollNo (or name if rollNo missing) -> rank
    const rankMap = new Map<string, number>();

    for (let i = 0; i < validStudents.length; i++) {
        const student = validStudents[i];
        const key = student.rollNo || student.name;
        // If tie with previous student, use same rank
        if (i > 0 && student.marks === validStudents[i - 1].marks) {
            const prevKey = validStudents[i - 1].rollNo || validStudents[i - 1].name;
            rankMap.set(key, rankMap.get(prevKey)!);
        } else {
            rankMap.set(key, i + 1); // Rank is 1-based index in sorted array (standard competition)
        }
    }

    // Apply ranks to original list
    return rankedStudents.map(s => {
        if (s.marks === null || s.marks === -1) {
            return { ...s, rank: null };
        }
        const key = s.rollNo || s.name;
        return { ...s, rank: rankMap.get(key) ?? null };
    });
}

/**
 * Calculates class average marks.
 * Excludes absent and NA students.
 */
export function calculateClassAverage(students: StudentRecord[]): number {
    const validMarks = students
        .map(s => s.marks)
        .filter((m): m is number => m !== null && m !== -1);

    if (validMarks.length === 0) return 0;

    const sum = validMarks.reduce((a, b) => a + b, 0);
    const avg = sum / validMarks.length;
    return Math.round(avg * 10) / 10;
}

/**
 * Gets the highest marks in the topic.
 * Excludes absent and NA students.
 */
export function getTopperMarks(students: StudentRecord[]): number {
    const validMarks = students
        .map(s => s.marks)
        .filter((m): m is number => m !== null && m !== -1);

    if (validMarks.length === 0) return 0;
    return Math.max(...validMarks);
}

/**
 * Calculates standard deviation for a list of valid marks.
 * Excludes absent and NA students.
 */
export function calculateStandardDeviation(students: StudentRecord[], mean: number): number {
    const validMarks = students
        .map(s => s.marks)
        .filter((m): m is number => m !== null && m !== -1);

    if (validMarks.length === 0) return 0;
    
    const variance = validMarks.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / validMarks.length;
    return Math.round(Math.sqrt(variance) * 10) / 10;
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

    const classAverage = calculateClassAverage(enrichedStudents);
    const standardDeviation = calculateStandardDeviation(enrichedStudents, classAverage);
    const topperMarks = getTopperMarks(enrichedStudents);

    return {
        ...topic,
        students: rankedStudents,
        classAverage,
        standardDeviation,
        topperMarks,
        classAveragePercentage: calculatePercentage(classAverage, topic.totalMarks) ?? 0,
        topperPercentage: calculatePercentage(topperMarks, topic.totalMarks) ?? 0
    };
}
