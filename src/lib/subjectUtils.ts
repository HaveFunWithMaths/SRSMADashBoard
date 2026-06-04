/**
 * Shared subject utilities — single source of truth for subject ordering & requirements.
 */

const CLASS_11_12_PATTERN = /^Class_(11|12|12\+)$/i;

/**
 * Returns the canonical required subjects for a given class.
 * Class 11, 12, 12+ → Maths, Physics, Chemistry, Combined
 * All other classes  → Maths, Physics, Chemistry, Biology
 */
export function getRequiredSubjects(className: string): string[] {
    const is11Or12 = CLASS_11_12_PATTERN.test(className);
    return is11Or12
        ? ['Maths', 'Physics', 'Chemistry', 'Combined']
        : ['Maths', 'Physics', 'Chemistry', 'Biology'];
}

/**
 * Checks whether a class is Class 11, 12, or 12+.
 * Accepts both raw "Class_12+" and normalised "12+" forms.
 */
export function is11Or12Class(className: string): boolean {
    if (CLASS_11_12_PATTERN.test(className)) return true;
    return ['11', '12', '12+'].includes(className.replace(/^Class_/i, ''));
}

/**
 * Merges and sorts subjects so that required subjects appear first
 * (in canonical order), followed by any extras alphabetically.
 */
export function sortSubjects(dataSubjects: string[], className: string): string[] {
    const required = getRequiredSubjects(className);
    const merged = Array.from(new Set([...dataSubjects, ...required]));

    return merged.sort((a, b) => {
        const idxA = required.indexOf(a);
        const idxB = required.indexOf(b);
        if (idxA === -1 && idxB === -1) return a.localeCompare(b);
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
    });
}
