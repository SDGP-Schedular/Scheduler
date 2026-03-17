// Quiz Questions Bank for Sri Lankan Curriculum
// Sample questions across subjects, grades, topics, and difficulty levels

export const questionsBank = [
    // ========== MATHEMATICS ==========
    {
        id: 'math-001',
        subject: 'Mathematics',
        topic: 'Whole Numbers and Place Value',
        grade: '6',
        difficulty: 'Easy',
        question: 'What is the value of the digit 5 in the number 25,678?',
        options: ['5', '50', '500', '5000'],
        correctAnswer: 3,
        explanation: 'The digit 5 is in the thousands place, so its value is 5000.'
    },
    {
        id: 'math-002',
        subject: 'Mathematics',
        topic: 'Fractions and Mixed Numbers',
        grade: '7',
        difficulty: 'Medium',
        question: 'What is 3/4 + 1/2?',
        options: ['1/4', '5/4', '4/6', '7/8'],
        correctAnswer: 1,
        explanation: '3/4 + 1/2 = 3/4 + 2/4 = 5/4'
    },
    {
        id: 'math-003',
        subject: 'Mathematics',
        topic: 'Algebraic Expressions',
        grade: '8',
        difficulty: 'Medium',
        question: 'Simplify: 3x + 5x - 2x',
        options: ['6x', '8x', '10x', '4x'],
        correctAnswer: 0,
        explanation: 'Combine like terms: 3x + 5x - 2x = 6x'
    },
    {
        id: 'math-004',
        subject: 'Mathematics',
        topic: 'Quadratic Equations',
        grade: '10',
        difficulty: 'Hard',
        question: 'Solve for x: x² - 5x + 6 = 0',
        options: ['x = 2 or x = 3', 'x = 1 or x = 6', 'x = -2 or x = -3', 'x = 2 or x = -3'],
        correctAnswer: 0,
        explanation: 'Factor: (x-2)(x-3) = 0, so x = 2 or x = 3'
    },
    {
        id: 'math-005',
        subject: 'Mathematics',
        topic: 'Pythagoras Theorem',
        grade: '9',
        difficulty: 'Medium',
        question: 'A right triangle has legs of length 3 cm and 4 cm. What is the length of the hypotenuse?',
        options: ['5 cm', '6 cm', '7 cm', '8 cm'],
        correctAnswer: 0,
        explanation: 'Using a² + b² = c²: 3² + 4² = 9 + 16 = 25, so c = 5 cm'
    },

    // ========== SCIENCE ==========
    {
        id: 'sci-001',
        subject: 'Science',
        topic: 'States of Matter',
        grade: '6',
        difficulty: 'Easy',
        question: 'Which of the following is NOT a state of matter?',
        options: ['Solid', 'Liquid', 'Energy', 'Gas'],
        correctAnswer: 2,
        explanation: 'Energy is not a state of matter. The three main states are solid, liquid, and gas.'
    },
    {
        id: 'sci-002',
        subject: 'Science',
        topic: 'Photosynthesis',
        grade: '7',
        difficulty: 'Medium',
        question: 'What gas do plants take in during photosynthesis?',
        options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'],
        correctAnswer: 2,
        explanation: 'Plants take in carbon dioxide (CO₂) and release oxygen during photosynthesis.'
    },
    {
        id: 'sci-003',
        subject: 'Science',
        topic: 'Periodic Table',
        grade: '9',
        difficulty: 'Medium',
        question: 'What is the chemical symbol for Gold?',
        options: ['Go', 'Gd', 'Au', 'Ag'],
        correctAnswer: 2,
        explanation: 'Gold\'s chemical symbol is Au, from its Latin name "Aurum".'
    },
    {
        id: 'sci-004',
        subject: 'Science',
        topic: 'Force and Motion',
        grade: '8',
        difficulty: 'Easy',
        question: 'What is the SI unit of force?',
        options: ['Joule', 'Watt', 'Newton', 'Pascal'],
        correctAnswer: 2,
        explanation: 'The SI unit of force is the Newton (N), named after Sir Isaac Newton.'
    },
    {
        id: 'sci-005',
        subject: 'Science',
        topic: 'Human Body Systems',
        grade: '10',
        difficulty: 'Medium',
        question: 'Which organ is responsible for pumping blood throughout the body?',
        options: ['Lungs', 'Heart', 'Liver', 'Kidneys'],
        correctAnswer: 1,
        explanation: 'The heart pumps blood through the circulatory system.'
    },

    // ========== PHYSICS (A/L) ==========
    {
        id: 'phy-001',
        subject: 'Physics',
        topic: 'Mechanics',
        grade: '12',
        difficulty: 'Hard',
        question: 'An object accelerates from rest at 2 m/s². What is its velocity after 5 seconds?',
        options: ['5 m/s', '10 m/s', '15 m/s', '20 m/s'],
        correctAnswer: 1,
        explanation: 'Using v = u + at: v = 0 + (2)(5) = 10 m/s'
    },
    {
        id: 'phy-002',
        subject: 'Physics',
        topic: 'Electrostatics',
        grade: '13',
        difficulty: 'Hard',
        question: 'What is the unit of electrical resistance?',
        options: ['Ampere', 'Volt', 'Ohm', 'Watt'],
        correctAnswer: 2,
        explanation: 'The unit of electrical resistance is the Ohm (Ω).'
    },

    // ========== CHEMISTRY (A/L) ==========
    {
        id: 'chem-001',
        subject: 'Chemistry',
        topic: 'Atomic Structure',
        grade: '12',
        difficulty: 'Medium',
        question: 'What is the atomic number of Carbon?',
        options: ['4', '6', '8', '12'],
        correctAnswer: 1,
        explanation: 'Carbon has 6 protons, so its atomic number is 6.'
    },
    {
        id: 'chem-002',
        subject: 'Chemistry',
        topic: 'Chemical Bonding',
        grade: '13',
        difficulty: 'Hard',
        question: 'What type of bond is formed when electrons are shared between atoms?',
        options: ['Ionic bond', 'Covalent bond', 'Metallic bond', 'Hydrogen bond'],
        correctAnswer: 1,
        explanation: 'Covalent bonds are formed when atoms share electrons.'
    },

    // ========== ENGLISH ==========
    {
        id: 'eng-001',
        subject: 'English',
        topic: 'Parts of Speech - Nouns',
        grade: '6',
        difficulty: 'Easy',
        question: 'Which of the following is a proper noun?',
        options: ['city', 'London', 'country', 'river'],
        correctAnswer: 1,
        explanation: 'London is a proper noun because it is the name of a specific place.'
    },
    {
        id: 'eng-002',
        subject: 'English',
        topic: 'Tenses - Past',
        grade: '7',
        difficulty: 'Easy',
        question: 'Choose the correct past tense: "Yesterday, I ___ to school."',
        options: ['go', 'goes', 'went', 'going'],
        correctAnswer: 2,
        explanation: '"Went" is the past tense of "go".'
    },
    {
        id: 'eng-003',
        subject: 'English',
        topic: 'Active and Passive Voice',
        grade: '9',
        difficulty: 'Medium',
        question: 'Convert to passive voice: "The cat chased the mouse."',
        options: [
            'The mouse is chased by the cat.',
            'The mouse was chased by the cat.',
            'The mouse chases the cat.',
            'The cat is chasing the mouse.'
        ],
        correctAnswer: 1,
        explanation: 'In passive voice: "The mouse was chased by the cat."'
    },
    {
        id: 'eng-004',
        subject: 'English',
        topic: 'Conditionals',
        grade: '10',
        difficulty: 'Hard',
        question: 'Which sentence uses the second conditional correctly?',
        options: [
            'If I have time, I will visit you.',
            'If I had time, I would visit you.',
            'If I have had time, I would have visited you.',
            'If I will have time, I visit you.'
        ],
        correctAnswer: 1,
        explanation: 'Second conditional uses: If + past simple, would + infinitive.'
    },

    // ========== BIOLOGY (A/L) ==========
    {
        id: 'bio-001',
        subject: 'Biology',
        topic: 'Cell Structure',
        grade: '12',
        difficulty: 'Medium',
        question: 'Which organelle is known as the powerhouse of the cell?',
        options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi apparatus'],
        correctAnswer: 1,
        explanation: 'Mitochondria are called the powerhouse because they produce energy (ATP).'
    },
    {
        id: 'bio-002',
        subject: 'Biology',
        topic: 'Genetics',
        grade: '13',
        difficulty: 'Hard',
        question: 'What is the genetic code made up of?',
        options: ['Amino acids', 'Proteins', 'Nucleotides', 'Lipids'],
        correctAnswer: 2,
        explanation: 'The genetic code is made up of nucleotides (A, T, G, C).'
    },

    // ========== COMBINED MATHEMATICS (A/L) ==========
    {
        id: 'cmath-001',
        subject: 'Combined Mathematics',
        topic: 'Differentiation',
        grade: '12',
        difficulty: 'Hard',
        question: 'What is the derivative of x²?',
        options: ['x', '2x', 'x²', '2'],
        correctAnswer: 1,
        explanation: 'Using the power rule: d/dx(x²) = 2x'
    },
    {
        id: 'cmath-002',
        subject: 'Combined Mathematics',
        topic: 'Integration',
        grade: '13',
        difficulty: 'Hard',
        question: 'What is ∫2x dx?',
        options: ['x² + C', '2x² + C', 'x²/2 + C', '2x + C'],
        correctAnswer: 0,
        explanation: '∫2x dx = x² + C, where C is the constant of integration.'
    },
    {
        id: 'cmath-003',
        subject: 'Combined Mathematics',
        topic: 'Differentiation',
        grade: '13',
        difficulty: 'Hard',
        question: 'Find dy/dx if y = 3x³ - 2x² + 5x - 1',
        options: ['9x² - 4x + 5', '9x² - 2x + 5', '3x² - 2x + 5', '9x³ - 4x² + 5x'],
        correctAnswer: 0,
        explanation: 'd/dx(3x³ - 2x² + 5x - 1) = 9x² - 4x + 5'
    },
    {
        id: 'cmath-004',
        subject: 'Combined Mathematics',
        topic: 'Integration',
        grade: '13',
        difficulty: 'Hard',
        question: 'Evaluate ∫(3x² + 2x) dx',
        options: ['x³ + x² + C', '6x + 2 + C', '3x³ + 2x² + C', 'x³/3 + x + C'],
        correctAnswer: 0,
        explanation: '∫(3x² + 2x) dx = x³ + x² + C'
    },
    {
        id: 'cmath-005',
        subject: 'Combined Mathematics',
        topic: 'Vectors',
        grade: '13',
        difficulty: 'Medium',
        question: 'If vector a = (2, 3) and vector b = (1, -1), what is a + b?',
        options: ['(3, 2)', '(1, 4)', '(3, 4)', '(2, 2)'],
        correctAnswer: 0,
        explanation: 'Vector addition: (2, 3) + (1, -1) = (2+1, 3-1) = (3, 2)'
    },
    {
        id: 'cmath-006',
        subject: 'Combined Mathematics',
        topic: 'Vectors',
        grade: '13',
        difficulty: 'Hard',
        question: 'What is the magnitude of vector v = (3, 4)?',
        options: ['5', '7', '12', '25'],
        correctAnswer: 0,
        explanation: '|v| = √(3² + 4²) = √(9 + 16) = √25 = 5'
    },
    {
        id: 'cmath-007',
        subject: 'Combined Mathematics',
        topic: 'Matrices',
        grade: '13',
        difficulty: 'Medium',
        question: 'What is the determinant of [[2, 3], [1, 4]]?',
        options: ['5', '8', '11', '2'],
        correctAnswer: 0,
        explanation: 'det = (2)(4) - (3)(1) = 8 - 3 = 5'
    },
    {
        id: 'cmath-008',
        subject: 'Combined Mathematics',
        topic: 'Differentiation',
        grade: '13',
        difficulty: 'Hard',
        question: 'What is the second derivative of y = x⁴?',
        options: ['4x³', '12x²', '24x', 'x³'],
        correctAnswer: 1,
        explanation: 'First derivative: 4x³, Second derivative: 12x²'
    },
    {
        id: 'cmath-009',
        subject: 'Combined Mathematics',
        topic: 'Integration',
        grade: '13',
        difficulty: 'Hard',
        question: 'Evaluate ∫sin(x) dx',
        options: ['-cos(x) + C', 'cos(x) + C', '-sin(x) + C', 'tan(x) + C'],
        correctAnswer: 0,
        explanation: '∫sin(x) dx = -cos(x) + C'
    },
    {
        id: 'cmath-010',
        subject: 'Combined Mathematics',
        topic: 'Trigonometry',
        grade: '13',
        difficulty: 'Medium',
        question: 'What is sin²θ + cos²θ equal to?',
        options: ['0', '1', '2', 'tan²θ'],
        correctAnswer: 1,
        explanation: 'This is a fundamental trigonometric identity: sin²θ + cos²θ = 1'
    },
    {
        id: 'cmath-011',
        subject: 'Combined Mathematics',
        topic: 'Complex Numbers',
        grade: '13',
        difficulty: 'Hard',
        question: 'What is i² (where i is the imaginary unit)?',
        options: ['1', '-1', 'i', '0'],
        correctAnswer: 1,
        explanation: 'By definition, i² = -1'
    },
    {
        id: 'cmath-012',
        subject: 'Combined Mathematics',
        topic: 'Limits',
        grade: '13',
        difficulty: 'Medium',
        question: 'What is lim(x→0) sin(x)/x?',
        options: ['0', '1', '∞', 'undefined'],
        correctAnswer: 1,
        explanation: 'This is a standard limit: lim(x→0) sin(x)/x = 1'
    },
    {
        id: 'cmath-013',
        subject: 'Combined Mathematics',
        topic: 'Sequences and Series',
        grade: '13',
        difficulty: 'Medium',
        question: 'What is the sum of the first n natural numbers?',
        options: ['n(n+1)/2', 'n²', 'n(n-1)/2', '2n'],
        correctAnswer: 0,
        explanation: 'Sum = 1 + 2 + 3 + ... + n = n(n+1)/2'
    },
    {
        id: 'cmath-014',
        subject: 'Combined Mathematics',
        topic: 'Probability',
        grade: '13',
        difficulty: 'Medium',
        question: 'If a fair coin is tossed twice, what is the probability of getting at least one head?',
        options: ['1/4', '1/2', '3/4', '1'],
        correctAnswer: 2,
        explanation: 'P(at least one head) = 1 - P(no heads) = 1 - 1/4 = 3/4'
    },
    {
        id: 'cmath-015',
        subject: 'Combined Mathematics',
        topic: 'Differentiation',
        grade: '13',
        difficulty: 'Hard',
        question: 'Find dy/dx if y = e^x',
        options: ['e^x', 'xe^(x-1)', '1', 'e'],
        correctAnswer: 0,
        explanation: 'The derivative of e^x is e^x itself'
    },
    {
        id: 'cmath-016',
        subject: 'Combined Mathematics',
        topic: 'Integration',
        grade: '13',
        difficulty: 'Hard',
        question: 'What is ∫e^x dx?',
        options: ['e^x + C', 'xe^x + C', 'e^(x+1) + C', 'e + C'],
        correctAnswer: 0,
        explanation: '∫e^x dx = e^x + C'
    },
    {
        id: 'cmath-017',
        subject: 'Combined Mathematics',
        topic: 'Matrices',
        grade: '13',
        difficulty: 'Hard',
        question: 'What is the identity matrix for 2×2 matrices?',
        options: ['[[1, 0], [0, 1]]', '[[0, 1], [1, 0]]', '[[1, 1], [1, 1]]', '[[2, 0], [0, 2]]'],
        correctAnswer: 0,
        explanation: 'The 2×2 identity matrix is [[1, 0], [0, 1]]'
    },

    // ========== HISTORY ==========
    {
        id: 'hist-001',
        subject: 'History',
        topic: 'Anuradhapura Kingdom',
        grade: '8',
        difficulty: 'Medium',
        question: 'Who was the founder of the Anuradhapura Kingdom?',
        options: ['King Vijaya', 'King Pandukabhaya', 'King Devanampiyatissa', 'King Dutugemunu'],
        correctAnswer: 1,
        explanation: 'King Pandukabhaya founded the city of Anuradhapura.'
    },
    {
        id: 'hist-002',
        subject: 'History',
        topic: 'World War II',
        grade: '11',
        difficulty: 'Medium',
        question: 'In which year did World War II end?',
        options: ['1943', '1944', '1945', '1946'],
        correctAnswer: 2,
        explanation: 'World War II ended in 1945 with the surrender of Japan.'
    },

    // ========== ICT ==========
    {
        id: 'ict-001',
        subject: 'ICT',
        topic: 'Computer Hardware',
        grade: '9',
        difficulty: 'Easy',
        question: 'Which component is considered the brain of the computer?',
        options: ['RAM', 'Hard Drive', 'CPU', 'Monitor'],
        correctAnswer: 2,
        explanation: 'The CPU (Central Processing Unit) is the brain of the computer.'
    },
    {
        id: 'ict-002',
        subject: 'ICT',
        topic: 'HTML Basics',
        grade: '10',
        difficulty: 'Medium',
        question: 'What does HTML stand for?',
        options: [
            'Hyper Text Markup Language',
            'High Tech Modern Language',
            'Home Tool Markup Language',
            'Hyperlinks and Text Markup Language'
        ],
        correctAnswer: 0,
        explanation: 'HTML stands for Hyper Text Markup Language.'
    },

    // ========== GEOGRAPHY ==========
    {
        id: 'geo-001',
        subject: 'Geography',
        topic: 'Rivers of Sri Lanka',
        grade: '7',
        difficulty: 'Easy',
        question: 'What is the longest river in Sri Lanka?',
        options: ['Kelani', 'Mahaweli', 'Kalu', 'Gin'],
        correctAnswer: 1,
        explanation: 'The Mahaweli is the longest river in Sri Lanka at 335 km.'
    },
    {
        id: 'geo-002',
        subject: 'Geography',
        topic: 'Climate Zones',
        grade: '9',
        difficulty: 'Medium',
        question: 'Which climate zone is characterized by hot summers and cold winters?',
        options: ['Tropical', 'Temperate', 'Polar', 'Arid'],
        correctAnswer: 1,
        explanation: 'Temperate zones have distinct seasons with hot summers and cold winters.'
    }
];

// Utility functions for filtering questions
export const getQuestionsByFilters = ({ grade, subject, topic, difficulty, count = 10 }) => {
    let filtered = [...questionsBank];

    // Apply filters
    if (grade) {
        filtered = filtered.filter(q => q.grade === grade);
    }
    if (subject) {
        filtered = filtered.filter(q => q.subject === subject);
    }
    if (topic) {
        filtered = filtered.filter(q => q.topic === topic);
    }
    if (difficulty && difficulty !== 'Mixed') {
        filtered = filtered.filter(q => q.difficulty === difficulty);
    }

    // Shuffle the filtered questions
    const shuffled = filtered.sort(() => Math.random() - 0.5);

    // Return requested count (or all if less available)
    return shuffled.slice(0, Math.min(count, shuffled.length));
};

export const shuffleOptions = (question) => {
    // Create a copy of the question
    const shuffledQuestion = { ...question };

    // Create array of option indexes
    const indexes = [0, 1, 2, 3];

    // Shuffle indexes
    for (let i = indexes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
    }

    // Reorder options and update correct answer
    const newOptions = indexes.map(i => question.options[i]);
    const newCorrectAnswer = indexes.indexOf(question.correctAnswer);

    shuffledQuestion.options = newOptions;
    shuffledQuestion.correctAnswer = newCorrectAnswer;

    return shuffledQuestion;
};
