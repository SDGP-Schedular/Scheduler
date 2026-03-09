// Grade Definitions and Subject Mapping for Sri Lankan Curriculum
// Maps grades to their applicable subjects

export const grades = [
    { id: 'grade-6', label: 'Grade 6', value: '6' },
    { id: 'grade-7', label: 'Grade 7', value: '7' },
    { id: 'grade-8', label: 'Grade 8', value: '8' },
    { id: 'grade-9', label: 'Grade 9', value: '9' },
    { id: 'grade-10', label: 'Grade 10', value: '10' },
    { id: 'grade-11', label: 'Grade 11 (O/L)', value: '11' },
    { id: 'grade-12', label: 'Grade 12 (A/L)', value: '12' },
    { id: 'grade-13', label: 'Grade 13 (A/L)', value: '13' }
];

// Get subjects available for a specific grade
export const getSubjectsForGrade = (grade, subjectsData) => {
    const subjects = [];

    for (const [subjectName, subjectInfo] of Object.entries(subjectsData)) {
        if (subjectInfo.grades && subjectInfo.grades.includes(`Grade ${grade}`)) {
            subjects.push({
                name: subjectName,
                weight: subjectInfo.weight,
                category: subjectInfo.category,
                topics: subjectInfo.topics || []
            });
        }
    }

    // Sort by category and then by name
    return subjects.sort((a, b) => {
        if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
        }
        return a.name.localeCompare(b.name);
    });
};

// Get topics for a specific subject
export const getTopicsForSubject = (subjectName, subjectsData) => {
    const subject = subjectsData[subjectName];
    return subject?.topics || [];
};
