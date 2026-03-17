// Sri Lankan Curriculum Subjects Data
// Covers Grade 6 to A/L with topics and difficulty weights
// Based on NIE (National Institute of Education) Sri Lanka syllabus

// ============= WEIGHT SYSTEM =============
// Difficulty weights: Higher = More study time needed
// Scale: 1-10 (10 = Most difficult, needs most time)
// Formula: studyTime = baseTime × (0.8 + weight/10 × 0.7)
// Weight 1 = 0.87x base time, Weight 10 = 1.5x base time

export const subjectWeights = {
    // ===== A/L SCIENCE STREAM =====
    'Combined Mathematics': 10,
    'Physics': 9,
    'Chemistry': 8,
    'Biology': 8,
    'Agricultural Science': 7,

    // ===== A/L COMMERCE STREAM =====
    'Business Studies (A/L)': 7,
    'Accounting (A/L)': 8,
    'Economics': 7,
    'Business Statistics': 6,

    // ===== A/L ARTS STREAM =====
    'Political Science': 6,
    'Logic & Scientific Method': 7,
    'Geography (A/L)': 6,
    'History (A/L)': 6,
    'Mass Media & Communication': 5,
    'Sinhala Literature': 6,
    'Tamil Literature': 6,
    'English Literature': 6,
    'Buddhist Civilization': 5,
    'Hindu Civilization': 5,
    'Christian Civilization': 5,
    'Islamic Civilization': 5,
    'Home Economics (A/L)': 5,
    'Pali (A/L)': 6,
    'Sanskrit (A/L)': 6,
    'French (A/L)': 6,
    'German (A/L)': 6,
    'Hindi (A/L)': 6,
    'Japanese (A/L)': 7,
    'Arabic (A/L)': 6,
    'Korean (A/L)': 7,
    'Chinese (A/L)': 7,
    'Russian (A/L)': 6,

    // ===== A/L TECHNOLOGY STREAM =====
    'Engineering Technology': 8,
    'Bio Systems Technology': 7,
    'Science for Technology': 7,
    'Information & Communication Technology': 7,

    // ===== O/L CORE SUBJECTS (Grade 6-11) =====
    'Mathematics': 9,
    'Science': 7,
    'English': 6,
    'Sinhala': 5,
    'Tamil': 5,
    'History': 5,
    'Geography': 5,
    'Civic Education': 4,
    'Health & Physical Education': 3,
    'Religion (Buddhism)': 4,
    'Religion (Hinduism)': 4,
    'Religion (Christianity)': 4,
    'Religion (Islam)': 4,

    // ===== O/L OPTIONAL - CATEGORY 1 =====
    'Business & Accounting Studies': 6,
    'Entrepreneurship Studies': 5,
    'Second Language (Sinhala)': 5,
    'Second Language (Tamil)': 5,
    'Pali': 5,
    'Sanskrit': 5,
    'French': 6,
    'German': 6,
    'Hindi': 5,
    'Japanese': 6,
    'Arabic': 5,
    'Korean': 6,
    'Chinese': 6,
    'Russian': 5,

    // ===== O/L OPTIONAL - CATEGORY 2 =====
    'Eastern Music': 4,
    'Western Music': 4,
    'Carnatic Music': 4,
    'Eastern Dancing': 3,
    'Bharatha Dancing': 3,
    'Art': 3,
    'Drama & Theatre': 4,
    'Appreciation of English Literary Texts': 5,
    'Appreciation of Sinhala Literary Texts': 5,
    'Appreciation of Tamil Literary Texts': 5,
    'Appreciation of Arabic Literary Texts': 5,

    // ===== O/L OPTIONAL - CATEGORY 3 =====
    'ICT': 6,
    'Agriculture & Food Technology': 5,
    'Aquatic Bio Resources Technology': 5,
    'Arts & Crafts': 3,
    'Home Economics': 4,
    'Communication & Media Studies': 5,
    'Design & Construction Technology': 5,
    'Design & Mechanical Technology': 5,
    'Design Electrical & Electronic Technology': 6,
    'Electronic Writing & Shorthand': 4,

    // ===== PRACTICAL & TECHNICAL =====
    'Practical & Technical Skills': 4,

    // ===== GENERAL/INTERNATIONAL =====
    'Computer Science': 7,
    'Literature': 5,
    'Social Studies': 4,
    'Environmental Science': 5
};

export const subjectsData = {
    // ==========================================
    // O/L CORE SUBJECTS (Grade 6-11)
    // ==========================================

    'Mathematics': {
        weight: 9,
        grades: ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'],
        category: 'Core',
        topics: [
            // Number Systems (Grade 6-8)
            'Whole Numbers and Place Value', 'Integers and Operations', 'Fractions and Mixed Numbers',
            'Decimals', 'Percentages', 'Ratio and Proportion', 'Indices and Powers',
            'Square Roots and Cube Roots', 'Surds', 'Logarithms',
            // Algebra (Grade 7-11)
            'Algebraic Expressions', 'Simplification of Expressions', 'Linear Equations in One Variable',
            'Linear Equations in Two Variables', 'Simultaneous Equations', 'Quadratic Equations',
            'Inequalities', 'Polynomials', 'Factorization', 'Algebraic Fractions',
            // Geometry (Grade 6-11)
            'Lines, Rays and Line Segments', 'Angles and Types', 'Triangles and Properties',
            'Congruence of Triangles', 'Similarity of Triangles', 'Quadrilaterals',
            'Circles and Arcs', 'Pythagoras Theorem', 'Coordinate Geometry', 'Transformations',
            'Vectors', 'Loci', 'Constructions',
            // Trigonometry (Grade 9-11)
            'Trigonometric Ratios', 'Heights and Distances', 'Trigonometric Identities',
            'Angle of Elevation and Depression',
            // Statistics & Probability (Grade 8-11)
            'Data Collection and Organization', 'Mean, Median, Mode', 'Range and Quartiles',
            'Standard Deviation', 'Probability', 'Frequency Distributions', 'Histograms and Graphs',
            // Mensuration (Grade 6-11)
            'Perimeter', 'Area of 2D Shapes', 'Surface Area', 'Volume of 3D Shapes',
            'Circumference of Circle', 'Area of Circle', 'Volume of Cylinder, Cone, Sphere',
            // Sets (Grade 10-11)
            'Set Notation', 'Union and Intersection', 'Venn Diagrams', 'Number of Elements'
        ]
    },

    'Science': {
        weight: 7,
        grades: ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'],
        category: 'Core',
        topics: [
            // Physics Topics
            'Measurement and Units', 'Force and Motion', 'Types of Forces', 'Friction',
            'Pressure in Solids and Fluids', 'Work, Energy and Power', 'Simple Machines',
            'Light and Optics', 'Reflection and Refraction', 'Lenses and Mirrors',
            'Sound and Waves', 'Properties of Sound', 'Heat and Temperature',
            'Heat Transfer Methods', 'Electricity Basics', 'Electric Circuits',
            'Magnetism', 'Electromagnets', 'Current Electricity',
            // Chemistry Topics
            'Matter and States', 'Properties of Matter', 'Atoms and Molecules',
            'Elements, Compounds, Mixtures', 'Atomic Structure', 'Periodic Table',
            'Chemical Reactions', 'Types of Reactions', 'Acids, Bases and Salts',
            'pH Scale', 'Metals and Non-Metals', 'Carbon and Its Compounds',
            'Water and Its Properties', 'Air and Atmosphere', 'Polymers Introduction',
            // Biology Topics
            'Classification of Living Things', 'Cells - Structure and Function',
            'Animal and Plant Cells', 'Cell Division', 'Tissues and Organs',
            'Human Body Systems', 'Digestive System', 'Respiratory System',
            'Circulatory System', 'Nervous System', 'Excretory System',
            'Skeletal and Muscular System', 'Reproductive System', 'Plant Structure',
            'Photosynthesis', 'Respiration in Plants', 'Plant Reproduction',
            'Ecology and Ecosystems', 'Food Chains and Webs', 'Health and Diseases',
            'Microorganisms', 'Genetics Introduction', 'Environmental Conservation'
        ]
    },

    'English': {
        weight: 6,
        grades: ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'],
        category: 'Core',
        topics: [
            // Grammar
            'Parts of Speech - Nouns', 'Parts of Speech - Verbs', 'Parts of Speech - Adjectives',
            'Parts of Speech - Adverbs', 'Parts of Speech - Pronouns', 'Prepositions',
            'Conjunctions', 'Articles', 'Tenses - Present', 'Tenses - Past',
            'Tenses - Future', 'Tenses - Perfect', 'Active and Passive Voice',
            'Direct and Indirect Speech', 'Reported Speech', 'Sentence Types',
            'Simple, Compound, Complex Sentences', 'Subject-Verb Agreement',
            'Punctuation', 'Modal Verbs', 'Conditionals', 'Relative Clauses',
            // Writing Skills
            'Paragraph Writing', 'Essay Writing - Descriptive', 'Essay Writing - Narrative',
            'Essay Writing - Argumentative', 'Essay Writing - Expository',
            'Formal Letter Writing', 'Informal Letter Writing', 'Email Writing',
            'Report Writing', 'Summary Writing', 'Note Making', 'Creative Writing',
            // Reading & Comprehension
            'Reading Comprehension', 'Inference and Deduction', 'Vocabulary in Context',
            // Literature
            'Poetry Analysis', 'Short Story Analysis', 'Drama Elements', 'Novel Study',
            // Speaking & Listening
            'Pronunciation', 'Conversation Skills', 'Presentations'
        ]
    },

    'Sinhala': {
        weight: 5,
        grades: ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'],
        category: 'Core',
        topics: [
            'ව්‍යාකරණ - නාම පද (Nouns)', 'ව්‍යාකරණ - ක්‍රියා පද (Verbs)',
            'ව්‍යාකරණ - විශේෂණ (Adjectives)', 'වාක්‍ය රචනය (Sentence Formation)',
            'විරාම ලකුණු (Punctuation)', 'පරිච්ඡේද ලිවීම (Paragraph Writing)',
            'රචනා ලිවීම (Essay Writing)', 'ලිපි ලිවීම (Letter Writing)',
            'නිල ලිපි (Formal Letters)', 'පුද්ගලික ලිපි (Personal Letters)',
            'සාරාංශ ලිවීම (Summary Writing)', 'කවි විවේචනය (Poetry Analysis)',
            'කෙටි කථා අධ්‍යයනය (Short Story Study)', 'නවකතා අධ්‍යයනය (Novel Study)',
            'නාට්‍ය අධ්‍යයනය (Drama Study)', 'ව්‍යංග්‍ය ලේඛන (Creative Writing)',
            'අවබෝධ පරීක්ෂණ (Comprehension)', 'වචන මාලා (Vocabulary)',
            'පුරාණ සිංහල සාහිත්‍ය (Classical Sinhala Literature)'
        ]
    },

    'Tamil': {
        weight: 5,
        grades: ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'],
        category: 'Core',
        topics: [
            'இலக்கணம் - பெயர்ச்சொற்கள் (Nouns)', 'இலக்கணம் - வினைச்சொற்கள் (Verbs)',
            'இலக்கணம் - உரிச்சொற்கள் (Adjectives)', 'வாக்கிய அமைப்பு (Sentence Structure)',
            'நிறுத்தக்குறிகள் (Punctuation)', 'பத்தி எழுதுதல் (Paragraph Writing)',
            'கட்டுரை எழுதுதல் (Essay Writing)', 'கடிதம் எழுதுதல் (Letter Writing)',
            'அலுவல் கடிதங்கள் (Official Letters)', 'தனிப்பட்ட கடிதங்கள் (Personal Letters)',
            'சுருக்கம் எழுதுதல் (Summary Writing)', 'கவிதை பகுப்பாய்வு (Poetry Analysis)',
            'சிறுகதை ஆய்வு (Short Story Study)', 'நாவல் ஆய்வு (Novel Study)',
            'நாடக ஆய்வு (Drama Study)', 'படைப்பாற்றல் எழுத்து (Creative Writing)',
            'வாசிப்புப் புரிதல் (Reading Comprehension)', 'சொற்களஞ்சியம் (Vocabulary)',
            'பழந்தமிழ் இலக்கியம் (Classical Tamil Literature)'
        ]
    },

    'History': {
        weight: 5,
        grades: ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'],
        category: 'Core',
        topics: [
            // Ancient Sri Lanka
            'Prehistoric Sri Lanka', 'The Arrival of Vijaya', 'Anuradhapura Kingdom',
            'Great Kings of Anuradhapura', 'Buddhism in Sri Lanka', 'Hydraulic Civilization',
            'Polonnaruwa Kingdom', 'Kingdom of Dambadeniya', 'Kingdom of Yapahuwa',
            'Kingdom of Kurunegala', 'Kingdom of Gampola', 'Kingdom of Kotte',
            'Kingdom of Kandy', 'Jaffna Kingdom',
            // Colonial Period
            'Portuguese Arrival and Rule', 'Dutch Colonial Period', 'British Colonial Period',
            'Resistance Movements', 'Uva-Wellassa Rebellion', 'Kandyan Convention',
            // Independence Era
            'Sri Lankan Independence Movement', 'D.S. Senanayake Era',
            'Post-Independence Development', 'Modern Sri Lanka',
            // World History
            'Ancient Civilizations - Egypt', 'Ancient Civilizations - Mesopotamia',
            'Ancient Greece', 'Ancient Rome', 'Medieval Europe', 'Renaissance',
            'Industrial Revolution', 'World War I', 'World War II',
            'United Nations', 'Cold War', 'Decolonization in Asia and Africa'
        ]
    },

    'Geography': {
        weight: 5,
        grades: ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'],
        category: 'Core',
        topics: [
            // Physical Geography
            'Earth Structure and Formation', 'Landforms', 'Mountains and Plateaus',
            'Rivers and Valleys', 'Coastal Features', 'Weathering and Erosion',
            'Climate and Weather', 'Atmospheric Pressure', 'Winds and Monsoons',
            'Rainfall Types', 'Climate Zones', 'Natural Disasters',
            // Human Geography
            'Population Distribution', 'Population Growth', 'Migration',
            'Settlements - Rural and Urban', 'Urbanization', 'Human Activities',
            // Sri Lanka Geography
            'Physical Features of Sri Lanka', 'Rivers of Sri Lanka', 'Climate of Sri Lanka',
            'Natural Resources of Sri Lanka', 'Agricultural Regions', 'Industrial Areas',
            'Tourism in Sri Lanka', 'Environmental Issues in Sri Lanka',
            // Map Skills
            'Map Reading', 'Scale and Distance', 'Contour Lines', 'Grid References',
            'Latitude and Longitude', 'Time Zones', 'Topographic Maps',
            // Resources & Environment
            'Natural Resources', 'Renewable and Non-Renewable Resources',
            'Environmental Conservation', 'Sustainable Development'
        ]
    },

    'Civic Education': {
        weight: 4,
        grades: ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'],
        category: 'Core',
        topics: [
            'Rights and Responsibilities', 'Fundamental Rights', 'Duties of a Citizen',
            'Democracy and Governance', 'Constitution of Sri Lanka', 'Parliament',
            'President and Cabinet', 'Judicial System', 'Local Government',
            'Provincial Councils', 'Elections and Voting', 'Political Parties',
            'Rule of Law', 'Human Rights', 'Equality and Justice',
            'National Symbols', 'National Heritage', 'Cultural Diversity',
            'Social Harmony', 'Community Development', 'Civic Participation'
        ]
    },

    'Health & Physical Education': {
        weight: 3,
        grades: ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'],
        category: 'Core',
        topics: [
            'Personal Hygiene', 'Nutrition and Balanced Diet', 'Exercise and Fitness',
            'First Aid Basics', 'Common Diseases', 'Communicable Diseases',
            'Non-Communicable Diseases', 'Mental Health', 'Substance Abuse Prevention',
            'Reproductive Health', 'Physical Fitness Components', 'Athletics',
            'Team Sports - Cricket', 'Team Sports - Football', 'Team Sports - Volleyball',
            'Team Sports - Netball', 'Individual Sports', 'Traditional Games',
            'Safety and Injury Prevention', 'Environmental Health'
        ]
    },

    // ==========================================
    // RELIGION SUBJECTS
    // ==========================================

    'Religion (Buddhism)': {
        weight: 4,
        grades: ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'],
        category: 'Core',
        topics: [
            'Life of the Buddha', 'Four Noble Truths', 'Noble Eightfold Path',
            'Three Characteristics', 'Karma and Rebirth', 'Buddhist Ethics',
            'Meditation Basics', 'Buddhist Festivals', 'Sacred Places',
            'Buddhist Literature', 'Dhammapada', 'Jataka Stories',
            'Famous Buddhist Monks', 'Buddhism in Sri Lanka', 'Buddhist Art and Architecture'
        ]
    },

    'Religion (Hinduism)': {
        weight: 4,
        grades: ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'],
        category: 'Core',
        topics: [
            'Basic Beliefs', 'Hindu Deities', 'Sacred Texts - Vedas',
            'Bhagavad Gita', 'Ramayana', 'Mahabharata', 'Dharma and Karma',
            'Hindu Festivals', 'Temple Worship', 'Rituals and Ceremonies',
            'Hinduism in Sri Lanka', 'Sacred Places', 'Hindu Art and Architecture',
            'Saints and Philosophers', 'Yoga and Meditation'
        ]
    },

    'Religion (Christianity)': {
        weight: 4,
        grades: ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'],
        category: 'Core',
        topics: [
            'Life of Jesus Christ', 'Teachings of Jesus', 'The Bible - Old Testament',
            'The Bible - New Testament', 'Ten Commandments', 'Christian Ethics',
            'Christian Festivals', 'Church and Worship', 'Sacraments',
            'Christianity in Sri Lanka', 'Famous Saints', 'Christian Art and Music',
            'Prayer and Devotion', 'Parables of Jesus', 'Early Church History'
        ]
    },

    'Religion (Islam)': {
        weight: 4,
        grades: ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'],
        category: 'Core',
        topics: [
            'Life of Prophet Muhammad', 'Five Pillars of Islam', 'The Quran',
            'Hadith', 'Islamic Ethics', 'Islamic Law Basics', 'Islamic Festivals',
            'Mosque and Prayer', 'Zakat and Charity', 'Hajj Pilgrimage',
            'Islam in Sri Lanka', 'Famous Islamic Scholars', 'Islamic Art and Architecture',
            'Ramadan and Fasting', 'Islamic History'
        ]
    },

    // ==========================================
    // O/L OPTIONAL - CATEGORY 1 (Languages & Commerce)
    // ==========================================

    'Business & Accounting Studies': {
        weight: 6,
        grades: ['Grade 10', 'Grade 11'],
        category: 'Optional-1',
        topics: [
            'Introduction to Business', 'Types of Business Organizations',
            'Sole Proprietorship', 'Partnership', 'Companies', 'Trade and Commerce',
            'Banking Services', 'Insurance', 'Marketing Basics', 'Advertising',
            'Basic Accounting', 'Double Entry System', 'Journal and Ledger',
            'Trial Balance', 'Final Accounts', 'Business Documents', 'Office Management'
        ]
    },

    'Entrepreneurship Studies': {
        weight: 5,
        grades: ['Grade 10', 'Grade 11'],
        category: 'Optional-1',
        topics: [
            'What is Entrepreneurship', 'Characteristics of Entrepreneurs',
            'Business Ideas', 'Market Research', 'Business Planning',
            'Starting a Business', 'Financial Management', 'Marketing Strategies',
            'Human Resource Management', 'Risk Management', 'Business Ethics',
            'Success Stories', 'Government Support for Entrepreneurs'
        ]
    },

    'Second Language (Sinhala)': {
        weight: 5,
        grades: ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'],
        category: 'Optional-1',
        topics: [
            'Sinhala Alphabet', 'Basic Vocabulary', 'Greetings and Introductions',
            'Numbers and Counting', 'Days and Months', 'Simple Conversations',
            'Basic Grammar', 'Reading Simple Texts', 'Writing Simple Sentences',
            'Sinhala Culture', 'Common Expressions', 'Useful Phrases'
        ]
    },

    'Second Language (Tamil)': {
        weight: 5,
        grades: ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'],
        category: 'Optional-1',
        topics: [
            'Tamil Alphabet', 'Basic Vocabulary', 'Greetings and Introductions',
            'Numbers and Counting', 'Days and Months', 'Simple Conversations',
            'Basic Grammar', 'Reading Simple Texts', 'Writing Simple Sentences',
            'Tamil Culture', 'Common Expressions', 'Useful Phrases'
        ]
    },

    'French': {
        weight: 6,
        grades: ['Grade 10', 'Grade 11'],
        category: 'Optional-1',
        topics: [
            'French Alphabet and Pronunciation', 'Basic Greetings', 'Numbers',
            'Days, Months, Seasons', 'Introduction and Identity', 'Family Members',
            'Articles and Nouns', 'Adjectives', 'Present Tense Verbs', 'Past Tense',
            'Future Tense', 'Basic Conversations', 'Food and Ordering',
            'Directions and Travel', 'French Culture', 'Reading and Writing'
        ]
    },

    'German': {
        weight: 6,
        grades: ['Grade 10', 'Grade 11'],
        category: 'Optional-1',
        topics: [
            'German Alphabet and Pronunciation', 'Basic Greetings', 'Numbers',
            'Days, Months, Seasons', 'Introduction and Identity', 'Family Members',
            'Articles and Nouns', 'Adjectives', 'Present Tense Verbs', 'Past Tense',
            'Basic Conversations', 'Food and Ordering', 'German Culture'
        ]
    },

    'Japanese': {
        weight: 6,
        grades: ['Grade 10', 'Grade 11'],
        category: 'Optional-1',
        topics: [
            'Hiragana', 'Katakana', 'Basic Kanji', 'Numbers and Counting',
            'Greetings', 'Self Introduction', 'Basic Grammar Particles',
            'Verbs - Present and Past', 'Adjectives', 'Daily Expressions',
            'Japanese Culture', 'Basic Conversations', 'Reading Practice'
        ]
    },

    'Korean': {
        weight: 6,
        grades: ['Grade 10', 'Grade 11'],
        category: 'Optional-1',
        topics: [
            'Hangul Alphabet', 'Pronunciation', 'Basic Vocabulary', 'Numbers',
            'Greetings', 'Self Introduction', 'Basic Grammar', 'Present Tense',
            'Past Tense', 'Particles', 'Korean Culture', 'Basic Conversations'
        ]
    },

    'Chinese': {
        weight: 6,
        grades: ['Grade 10', 'Grade 11'],
        category: 'Optional-1',
        topics: [
            'Pinyin and Pronunciation', 'Basic Chinese Characters', 'Tones',
            'Numbers', 'Greetings', 'Self Introduction', 'Basic Grammar',
            'Measure Words', 'Simple Sentences', 'Chinese Culture', 'Daily Expressions'
        ]
    },

    'Arabic': {
        weight: 5,
        grades: ['Grade 10', 'Grade 11'],
        category: 'Optional-1',
        topics: [
            'Arabic Alphabet', 'Pronunciation', 'Basic Vocabulary', 'Numbers',
            'Greetings', 'Self Introduction', 'Basic Grammar', 'Nouns and Verbs',
            'Simple Sentences', 'Arabic Culture', 'Islamic Terminology'
        ]
    },

    'Hindi': {
        weight: 5,
        grades: ['Grade 10', 'Grade 11'],
        category: 'Optional-1',
        topics: [
            'Devanagari Script', 'Pronunciation', 'Basic Vocabulary', 'Numbers',
            'Greetings', 'Self Introduction', 'Basic Grammar', 'Gender of Nouns',
            'Verbs', 'Simple Conversations', 'Indian Culture'
        ]
    },

    // ==========================================
    // O/L OPTIONAL - CATEGORY 2 (Arts & Aesthetics)
    // ==========================================

    'Eastern Music': {
        weight: 4,
        grades: ['Grade 10', 'Grade 11'],
        category: 'Optional-2',
        topics: [
            'Swaras (Notes)', 'Ragas', 'Talas (Rhythms)', 'Alapana',
            'Song Types', 'Musical Instruments', 'Famous Composers',
            'Music Theory', 'Vocal Training', 'Instrumental Practice',
            'Sri Lankan Music Traditions', 'Performance Skills'
        ]
    },

    'Western Music': {
        weight: 4,
        grades: ['Grade 10', 'Grade 11'],
        category: 'Optional-2',
        topics: [
            'Music Notation', 'Scales and Keys', 'Rhythm and Time Signatures',
            'Melody and Harmony', 'Chords', 'Musical Forms', 'History of Western Music',
            'Classical Composers', 'Instruments', 'Vocal Training',
            'Theory and Aural Skills', 'Performance'
        ]
    },

    'Carnatic Music': {
        weight: 4,
        grades: ['Grade 10', 'Grade 11'],
        category: 'Optional-2',
        topics: [
            'Swaras and Srutis', 'Melakartha Ragas', 'Talas',
            'Varnam', 'Kriti', 'Famous Composers - Trinity',
            'Vocal Techniques', 'Instruments', 'Music Theory',
            'Performance Skills', 'Concert Traditions'
        ]
    },

    'Eastern Dancing': {
        weight: 3,
        grades: ['Grade 10', 'Grade 11'],
        category: 'Optional-2',
        topics: [
            'Kandyan Dance', 'Low Country Dance', 'Sabaragamuwa Dance',
            'Dance Costumes', 'Drums and Instruments', 'Basic Movements',
            'Dance Forms', 'Devil Dancing', 'Mask Traditions',
            'History of Sri Lankan Dance', 'Performance'
        ]
    },

    'Bharatha Dancing': {
        weight: 3,
        grades: ['Grade 10', 'Grade 11'],
        category: 'Optional-2',
        topics: [
            'Bharatanatyam Basics', 'Adavus', 'Hastas (Hand Gestures)',
            'Expressions', 'Dance Items - Alarippu', 'Jatiswaram', 'Sabdam',
            'Varnam', 'Padam', 'Tillana', 'Costume and Makeup',
            'Famous Dancers', 'Performance Skills'
        ]
    },

    'Art': {
        weight: 3,
        grades: ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'],
        category: 'Optional-2',
        topics: [
            'Elements of Art', 'Principles of Design', 'Drawing Basics',
            'Sketching', 'Shading Techniques', 'Color Theory', 'Painting',
            'Watercolor', 'Poster Color', 'Collage', 'Sculpture Basics',
            'Sri Lankan Art', 'Traditional Art Forms', 'Art History',
            'Composition', 'Still Life', 'Landscape', 'Portrait'
        ]
    },

    'Drama & Theatre': {
        weight: 4,
        grades: ['Grade 10', 'Grade 11'],
        category: 'Optional-2',
        topics: [
            'History of Drama', 'Elements of Drama', 'Types of Drama',
            'Acting Techniques', 'Voice and Speech', 'Movement and Gesture',
            'Stage Design', 'Lighting and Sound', 'Costume and Makeup',
            'Script Writing', 'Directing Basics', 'Sri Lankan Theatre',
            'Folk Drama', 'Modern Drama', 'Performance'
        ]
    },

    'Appreciation of English Literary Texts': {
        weight: 5,
        grades: ['Grade 10', 'Grade 11'],
        category: 'Optional-2',
        topics: [
            'Poetry Analysis', 'Short Story Analysis', 'Novel Study',
            'Drama Analysis', 'Literary Devices', 'Themes and Motifs',
            'Character Analysis', 'Plot Structure', 'Setting and Atmosphere',
            'Critical Writing', 'Comparative Analysis'
        ]
    },

    // ==========================================
    // O/L OPTIONAL - CATEGORY 3 (Technology & Practical)
    // ==========================================

    'ICT': {
        weight: 6,
        grades: ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11'],
        category: 'Optional-3',
        topics: [
            // Basic Computing
            'Computer Hardware', 'Software Types', 'Operating Systems',
            'File Management', 'Input and Output Devices', 'Storage Devices',
            // Office Applications
            'Word Processing', 'Spreadsheets', 'Presentations', 'Database Basics',
            // Internet & Communication
            'Internet Basics', 'Web Browsers', 'Email', 'Search Techniques',
            'Social Media', 'Cyber Safety', 'Digital Citizenship',
            // Programming
            'Introduction to Programming', 'Flowcharts and Algorithms',
            'Programming Concepts', 'HTML Basics', 'CSS Basics',
            // Networks & Security
            'Computer Networks', 'Network Types', 'Data Security',
            'Backup and Recovery', 'Ethical Issues in ICT'
        ]
    },

    'Agriculture & Food Technology': {
        weight: 5,
        grades: ['Grade 10', 'Grade 11'],
        category: 'Optional-3',
        topics: [
            'Soil Science', 'Plant Nutrition', 'Crop Production',
            'Vegetable Cultivation', 'Fruit Cultivation', 'Floriculture',
            'Pest Management', 'Irrigation', 'Animal Husbandry',
            'Poultry Farming', 'Food Preservation', 'Food Processing',
            'Organic Farming', 'Agricultural Tools', 'Farm Management'
        ]
    },

    'Aquatic Bio Resources Technology': {
        weight: 5,
        grades: ['Grade 10', 'Grade 11'],
        category: 'Optional-3',
        topics: [
            'Aquatic Ecosystems', 'Fish Biology', 'Freshwater Fisheries',
            'Marine Fisheries', 'Aquaculture', 'Fish Farming', 'Prawn Culture',
            'Ornamental Fish', 'Fish Nutrition', 'Water Quality',
            'Fish Diseases', 'Post-Harvest Technology', 'Marketing'
        ]
    },

    'Home Economics': {
        weight: 4,
        grades: ['Grade 10', 'Grade 11'],
        category: 'Optional-3',
        topics: [
            'Nutrition and Diet', 'Food Preparation', 'Meal Planning',
            'Food Hygiene', 'Textile Science', 'Clothing Construction',
            'Garment Care', 'Interior Design', 'Home Management',
            'Child Care', 'Family Resource Management', 'Consumer Education'
        ]
    },

    'Communication & Media Studies': {
        weight: 5,
        grades: ['Grade 10', 'Grade 11'],
        category: 'Optional-3',
        topics: [
            'Introduction to Mass Media', 'Print Media', 'Electronic Media',
            'Digital Media', 'Journalism Basics', 'News Writing',
            'Feature Writing', 'Photography', 'Video Production',
            'Advertising', 'Public Relations', 'Media Ethics',
            'Social Media Communication'
        ]
    },

    'Design & Construction Technology': {
        weight: 5,
        grades: ['Grade 10', 'Grade 11'],
        category: 'Optional-3',
        topics: [
            'Technical Drawing', 'Building Materials', 'Construction Methods',
            'Carpentry', 'Masonry', 'Plumbing', 'Electrical Wiring',
            'Building Planning', 'Safety in Construction', 'Cost Estimation'
        ]
    },

    'Design & Mechanical Technology': {
        weight: 5,
        grades: ['Grade 10', 'Grade 11'],
        category: 'Optional-3',
        topics: [
            'Technical Drawing', 'Metalwork', 'Lathe Operations',
            'Welding', 'Sheet Metal Work', 'Machine Components',
            'Mechanisms', 'Engines', 'Maintenance', 'Safety'
        ]
    },

    'Design Electrical & Electronic Technology': {
        weight: 6,
        grades: ['Grade 10', 'Grade 11'],
        category: 'Optional-3',
        topics: [
            'Electrical Principles', 'Circuit Diagrams', 'Electrical Components',
            'Wiring Installation', 'Electronic Components', 'Digital Electronics',
            'Soldering', 'Testing Equipment', 'Safety Practices',
            'Domestic Appliances', 'Basic Repairs'
        ]
    },

    'Practical & Technical Skills': {
        weight: 4,
        grades: ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'],
        category: 'Core',
        topics: [
            'Tool Identification', 'Workshop Safety', 'Measuring and Marking',
            'Woodwork Basics', 'Metalwork Basics', 'Electrical Basics',
            'Simple Projects', 'Craft Work', 'Problem Solving',
            'Design Process', 'Model Making'
        ]
    },

    // ==========================================
    // A/L PHYSICAL SCIENCE STREAM
    // ==========================================

    'Combined Mathematics': {
        weight: 10,
        grades: ['Grade 12', 'Grade 13'],
        stream: 'Physical Science',
        topics: [
            // Pure Mathematics
            'Real Numbers and Sequences', 'Limits and Continuity', 'Differentiation',
            'Applications of Differentiation', 'Integration', 'Applications of Integration',
            'Differential Equations', 'Complex Numbers', 'Matrices and Determinants',
            'Coordinate Geometry - Straight Lines', 'Coordinate Geometry - Circles',
            'Coordinate Geometry - Conic Sections', 'Trigonometry', 'Functions',
            'Polynomials', 'Binomial Theorem', 'Permutations and Combinations',
            'Mathematical Induction', 'Probability', 'Statistics',
            // Applied Mathematics
            'Forces and Equilibrium', 'Moments', 'Center of Mass',
            'Friction', 'Kinematics', 'Dynamics', 'Work, Energy and Power',
            'Impulse and Momentum', 'Projectiles', 'Circular Motion',
            'Simple Harmonic Motion', 'Relative Motion', 'Statics of Rigid Bodies'
        ]
    },

    'Physics': {
        weight: 9,
        grades: ['Grade 12', 'Grade 13'],
        stream: 'Physical Science',
        topics: [
            'Measurement and Units', 'Mechanics', 'Oscillations',
            'Waves and Wave Motion', 'Thermal Physics', 'Thermodynamics',
            'Electrostatics', 'Current Electricity', 'DC Circuits',
            'Magnetism and Magnetic Fields', 'Electromagnetic Induction',
            'AC Circuits', 'Electronics - Semiconductors', 'Logic Gates',
            'Optics - Geometrical', 'Optics - Physical', 'Atomic Physics',
            'Photoelectric Effect', 'Nuclear Physics', 'Radioactivity',
            'Special Relativity Basics', 'Quantum Mechanics Basics'
        ]
    },

    'Chemistry': {
        weight: 8,
        grades: ['Grade 12', 'Grade 13'],
        stream: 'Physical Science',
        topics: [
            // Physical Chemistry
            'Atomic Structure', 'Periodic Table', 'Chemical Bonding',
            'States of Matter', 'Chemical Thermodynamics', 'Chemical Equilibrium',
            'Ionic Equilibrium', 'Chemical Kinetics', 'Electrochemistry',
            // Inorganic Chemistry
            's-Block Elements', 'p-Block Elements', 'd-Block Elements',
            'Coordination Compounds', 'Metallurgy', 'Qualitative Analysis',
            // Organic Chemistry
            'Basic Concepts', 'Hydrocarbons - Alkanes', 'Alkenes and Alkynes',
            'Aromatic Compounds', 'Alcohols and Phenols', 'Aldehydes and Ketones',
            'Carboxylic Acids', 'Amines', 'Polymers', 'Biomolecules'
        ]
    },

    'Biology': {
        weight: 8,
        grades: ['Grade 12', 'Grade 13'],
        stream: 'Bio Science',
        topics: [
            // Botany
            'Plant Cell Structure', 'Plant Tissues', 'Plant Anatomy',
            'Photosynthesis', 'Plant Respiration', 'Plant Growth',
            'Plant Hormones', 'Plant Reproduction', 'Plant Taxonomy',
            // Zoology
            'Animal Diversity', 'Animal Tissues', 'Digestive System',
            'Respiratory System', 'Circulatory System', 'Excretion',
            'Nervous System', 'Endocrine System', 'Reproductive System',
            'Embryology', 'Animal Behavior',
            // Genetics & Evolution
            'Cell Division', 'Molecular Biology', 'DNA and RNA',
            'Gene Expression', 'Genetics', 'Heredity', 'Evolution',
            'Human Genetics', 'Biotechnology',
            // Ecology
            'Ecosystems', 'Ecological Succession', 'Biodiversity',
            'Environmental Biology', 'Conservation'
        ]
    },

    'Agricultural Science': {
        weight: 7,
        grades: ['Grade 12', 'Grade 13'],
        stream: 'Bio Science',
        topics: [
            'Agricultural Economics', 'Soil Science', 'Plant Nutrition',
            'Crop Production', 'Rice Cultivation', 'Vegetable Production',
            'Fruit Cultivation', 'Plantation Crops', 'Pest Management',
            'Weed Management', 'Irrigation and Water Management',
            'Agricultural Machinery', 'Animal Husbandry', 'Dairy Farming',
            'Poultry Science', 'Farm Management', 'Agricultural Extension',
            'Post-Harvest Technology', 'Agricultural Biotechnology'
        ]
    },

    // ==========================================
    // A/L COMMERCE STREAM
    // ==========================================

    'Business Studies (A/L)': {
        weight: 7,
        grades: ['Grade 12', 'Grade 13'],
        stream: 'Commerce',
        topics: [
            'Nature and Scope of Business', 'Business Environment',
            'Forms of Business Organization', 'Management - Planning',
            'Management - Organizing', 'Management - Leading',
            'Management - Controlling', 'Human Resource Management',
            'Recruitment and Selection', 'Training and Development',
            'Marketing Management', 'Marketing Mix', 'Product Management',
            'Pricing Strategies', 'Promotion', 'Distribution',
            'Financial Management', 'Working Capital', 'International Business',
            'Entrepreneurship', 'Business Ethics', 'E-Commerce'
        ]
    },

    'Accounting (A/L)': {
        weight: 8,
        grades: ['Grade 12', 'Grade 13'],
        stream: 'Commerce',
        topics: [
            // Financial Accounting
            'Accounting Framework', 'Accounting Standards', 'Journal Entries',
            'Ledger Accounts', 'Trial Balance', 'Adjusting Entries',
            'Financial Statements', 'Income Statement', 'Balance Sheet',
            'Cash Flow Statement', 'Bank Reconciliation', 'Depreciation Methods',
            // Partnership Accounts
            'Partnership Fundamentals', 'Profit Distribution', 'Admission of Partner',
            'Retirement of Partner', 'Dissolution',
            // Company Accounts
            'Share Capital', 'Debentures', 'Company Final Accounts',
            // Cost and Management Accounting
            'Cost Concepts', 'Material and Labor Costing', 'Overhead Costing',
            'Process Costing', 'Job Costing', 'Budgeting', 'Standard Costing',
            'Marginal Costing', 'Ratio Analysis', 'Auditing Basics'
        ]
    },

    'Economics': {
        weight: 7,
        grades: ['Grade 12', 'Grade 13'],
        stream: 'Commerce',
        topics: [
            // Microeconomics
            'Basic Economic Concepts', 'Demand Analysis', 'Supply Analysis',
            'Market Equilibrium', 'Elasticity of Demand', 'Elasticity of Supply',
            'Consumer Behavior', 'Utility Theory', 'Indifference Curves',
            'Production Theory', 'Cost Theory', 'Revenue and Profit',
            'Market Structures - Perfect Competition', 'Monopoly', 'Oligopoly',
            'Monopolistic Competition', 'Factor Markets',
            // Macroeconomics
            'National Income', 'Methods of Calculating National Income',
            'Consumption and Saving', 'Investment', 'Multiplier Effect',
            'Aggregate Demand and Supply', 'Money and Banking',
            'Monetary Theory', 'Inflation', 'Unemployment', 'Fiscal Policy',
            'Monetary Policy', 'International Trade', 'Balance of Payments',
            'Exchange Rates', 'Economic Development', 'Sri Lankan Economy'
        ]
    },

    'Business Statistics': {
        weight: 6,
        grades: ['Grade 12', 'Grade 13'],
        stream: 'Commerce',
        topics: [
            'Data Collection', 'Sampling Methods', 'Presentation of Data',
            'Measures of Central Tendency', 'Measures of Dispersion',
            'Correlation', 'Regression Analysis', 'Index Numbers',
            'Time Series Analysis', 'Probability', 'Probability Distributions',
            'Normal Distribution', 'Statistical Inference', 'Hypothesis Testing'
        ]
    },

    // ==========================================
    // A/L ARTS STREAM
    // ==========================================

    'Political Science': {
        weight: 6,
        grades: ['Grade 12', 'Grade 13'],
        stream: 'Arts',
        topics: [
            'Introduction to Political Science', 'Political Concepts',
            'State and Government', 'Sovereignty', 'Democracy',
            'Political Ideologies', 'Liberalism', 'Socialism', 'Marxism',
            'Nationalism', 'Constitution', 'Forms of Government',
            'Political Parties', 'Pressure Groups', 'Electoral Systems',
            'International Relations', 'United Nations', 'Sri Lankan Politics',
            'Public Administration'
        ]
    },

    'Logic & Scientific Method': {
        weight: 7,
        grades: ['Grade 12', 'Grade 13'],
        stream: 'Arts',
        topics: [
            'Introduction to Logic', 'Propositions', 'Types of Propositions',
            'Square of Opposition', 'Immediate Inference', 'Categorical Syllogism',
            'Figures and Moods', 'Validity of Syllogisms', 'Symbolic Logic',
            'Truth Tables', 'Propositional Logic', 'Scientific Method',
            'Hypothesis', 'Observation and Experiment', 'Inductive Reasoning',
            'Fallacies', 'Critical Thinking'
        ]
    },

    'Geography (A/L)': {
        weight: 6,
        grades: ['Grade 12', 'Grade 13'],
        stream: 'Arts',
        topics: [
            // Physical Geography
            'Geomorphology', 'Plate Tectonics', 'Volcanoes and Earthquakes',
            'Weathering and Mass Movement', 'Fluvial Landforms', 'Glacial Landforms',
            'Coastal Landforms', 'Climatology', 'Atmospheric Processes',
            'Weather Systems', 'Climate Change', 'Biogeography',
            // Human Geography
            'Population Geography', 'Migration', 'Settlement Geography',
            'Urban Geography', 'Agricultural Geography', 'Industrial Geography',
            'Resource Geography', 'Environmental Issues', 'Sustainable Development',
            // Practical Geography
            'Map Interpretation', 'Remote Sensing', 'GIS Basics',
            'Field Work', 'Sri Lanka Regional Geography'
        ]
    },

    'History (A/L)': {
        weight: 6,
        grades: ['Grade 12', 'Grade 13'],
        stream: 'Arts',
        topics: [
            // Sri Lankan History
            'Ancient Civilizations of Sri Lanka', 'Hydraulic Civilization',
            'Medieval Sri Lanka', 'Kandyan Kingdom', 'Colonial Impact',
            'Independence Movement', 'Post-Independence Era',
            // Asian History
            'Indian Civilization', 'Chinese Civilization', 'Southeast Asian History',
            'Middle Eastern History', 'Nationalism in Asia',
            // World History
            'European Renaissance', 'French Revolution', 'Industrial Revolution',
            'Imperialism', 'World War I', 'Russian Revolution',
            'World War II', 'Cold War', 'Decolonization',
            'United Nations and International Organizations'
        ]
    },

    'Mass Media & Communication': {
        weight: 5,
        grades: ['Grade 12', 'Grade 13'],
        stream: 'Arts',
        topics: [
            'Introduction to Mass Communication', 'Communication Theory',
            'Print Journalism', 'Broadcast Journalism', 'Digital Media',
            'News Writing', 'Feature Writing', 'Editing',
            'Photojournalism', 'Television Production', 'Radio Broadcasting',
            'Advertising', 'Public Relations', 'Media Law and Ethics',
            'Media Research', 'Social Media', 'Media Management'
        ]
    },

    'Sinhala Literature': {
        weight: 6,
        grades: ['Grade 12', 'Grade 13'],
        stream: 'Arts',
        topics: [
            'Classical Sinhala Poetry', 'Modern Sinhala Poetry', 'Poetry Analysis',
            'Classical Prose', 'Modern Short Stories', 'Novel Study',
            'Drama', 'Literary Criticism', 'Literary Movements',
            'Famous Sinhala Writers', 'Literary Devices', 'Creative Writing'
        ]
    },

    'Tamil Literature': {
        weight: 6,
        grades: ['Grade 12', 'Grade 13'],
        stream: 'Arts',
        topics: [
            'Sangam Literature', 'Medieval Tamil Poetry', 'Modern Tamil Poetry',
            'Classical Prose', 'Modern Short Stories', 'Novel Study',
            'Drama', 'Literary Criticism', 'Literary Movements',
            'Famous Tamil Writers', 'Literary Devices', 'Creative Writing'
        ]
    },

    'English Literature': {
        weight: 6,
        grades: ['Grade 12', 'Grade 13'],
        stream: 'Arts',
        topics: [
            'History of English Literature', 'Poetry - Elizabethan',
            'Poetry - Romantic', 'Poetry - Victorian', 'Modern Poetry',
            'Shakespeare - Drama', 'Short Stories', 'Novel Study',
            'Literary Criticism', 'Literary Theory', 'Essay Writing',
            'Critical Analysis', 'Post-Colonial Literature'
        ]
    },

    'Buddhist Civilization': {
        weight: 5,
        grades: ['Grade 12', 'Grade 13'],
        stream: 'Arts',
        topics: [
            'Life and Teachings of Buddha', 'Buddhist Philosophy',
            'Spread of Buddhism', 'Buddhism in Sri Lanka', 'Buddhist Councils',
            'Buddhist Schools', 'Buddhist Art and Architecture',
            'Buddhist Literature', 'Buddhist Festivals', 'Buddhist Ethics',
            'Meditation Practices', 'Buddhism and Society'
        ]
    },

    'Hindu Civilization': {
        weight: 5,
        grades: ['Grade 12', 'Grade 13'],
        stream: 'Arts',
        topics: [
            'Origins of Hinduism', 'Vedic Period', 'Hindu Philosophy',
            'Major Hindu Scriptures', 'Hindu Deities and Worship',
            'Hindu Festivals and Rituals', 'Hindu Art and Architecture',
            'Temple Culture', 'Hindu Social System', 'Reform Movements',
            'Hinduism in Sri Lanka', 'Modern Hinduism'
        ]
    },

    'Christian Civilization': {
        weight: 5,
        grades: ['Grade 12', 'Grade 13'],
        stream: 'Arts',
        topics: [
            'Life and Teachings of Jesus', 'Early Church History',
            'Spread of Christianity', 'Church Councils', 'Medieval Church',
            'Reformation', 'Catholic and Protestant Traditions',
            'Christian Art and Architecture', 'Christian Ethics',
            'Christianity in Sri Lanka', 'Modern Christian Movements'
        ]
    },

    'Islamic Civilization': {
        weight: 5,
        grades: ['Grade 12', 'Grade 13'],
        stream: 'Arts',
        topics: [
            'Life of Prophet Muhammad', 'Fundamental Beliefs of Islam',
            'Islamic Practices', 'Islamic Law', 'Caliphate Period',
            'Spread of Islam', 'Islamic Art and Architecture',
            'Islamic Philosophy', 'Islamic Science and Learning',
            'Islam in Sri Lanka', 'Modern Islamic World'
        ]
    },

    // ==========================================
    // A/L TECHNOLOGY STREAM
    // ==========================================

    'Engineering Technology': {
        weight: 8,
        grades: ['Grade 12', 'Grade 13'],
        stream: 'Technology',
        topics: [
            'Engineering Mechanics', 'Statics', 'Dynamics',
            'Strength of Materials', 'Properties of Materials',
            'Manufacturing Processes', 'Machine Tools',
            'Welding Technology', 'Electrical Technology',
            'Electronics Basics', 'Civil Engineering Basics',
            'Surveying', 'Building Construction', 'Workshop Technology',
            'Technical Drawing', 'CAD Basics', 'Safety Engineering'
        ]
    },

    'Bio Systems Technology': {
        weight: 7,
        grades: ['Grade 12', 'Grade 13'],
        stream: 'Technology',
        topics: [
            'Introduction to Bio Systems', 'Cell Biology',
            'Biochemistry', 'Microbiology', 'Molecular Biology',
            'Genetic Engineering', 'Tissue Culture', 'Fermentation Technology',
            'Food Technology', 'Environmental Biotechnology',
            'Agricultural Biotechnology', 'Medical Biotechnology',
            'Bioinformatics', 'Bioethics'
        ]
    },

    'Science for Technology': {
        weight: 7,
        grades: ['Grade 12', 'Grade 13'],
        stream: 'Technology',
        topics: [
            // Physics for Technology
            'Mechanics', 'Properties of Matter', 'Heat and Thermodynamics',
            'Waves and Optics', 'Electricity', 'Magnetism', 'Electronics',
            // Chemistry for Technology
            'Atomic Structure', 'Chemical Bonding', 'Organic Chemistry',
            'Industrial Chemistry', 'Polymers',
            // Biology for Technology
            'Cell Biology', 'Microbiology', 'Biotechnology Basics'
        ]
    },

    'Information & Communication Technology': {
        weight: 7,
        grades: ['Grade 12', 'Grade 13'],
        stream: 'Technology',
        topics: [
            'Computer Architecture', 'Operating Systems', 'Data Representation',
            'Programming Fundamentals', 'Object-Oriented Programming',
            'Data Structures', 'Algorithms', 'Database Management',
            'SQL', 'Web Development - HTML/CSS', 'Web Development - JavaScript',
            'Networking Fundamentals', 'Network Protocols',
            'Cybersecurity', 'Software Engineering', 'System Analysis',
            'E-Commerce', 'Multimedia', 'Emerging Technologies'
        ]
    }
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

// Get all subjects for autocomplete
export const getAllSubjects = () => {
    return Object.keys(subjectsData);
};

// Get topics for a subject
export const getTopicsForSubject = (subject) => {
    return subjectsData[subject]?.topics || [];
};

// Get weight for a subject
export const getSubjectWeight = (subject) => {
    return subjectsData[subject]?.weight || subjectWeights[subject] || 5;
};

// Search subjects with fuzzy matching
export const searchSubjects = (query) => {
    if (!query) return getAllSubjects();
    const lowerQuery = query.toLowerCase();
    return getAllSubjects().filter(subject =>
        subject.toLowerCase().includes(lowerQuery)
    );
};

// Calculate study time based on weight AND knowledge level
// Higher weight = more study time, lower knowledge = more study time
export const calculateStudyTime = (subject, baseMinutes = 45, knowledgeLevel = 'intermediate') => {
    const weight = getSubjectWeight(subject);
    // Weight factor: Weight 1 = 0.87x, Weight 10 = 1.5x
    const weightFactor = 0.8 + (weight / 10) * 0.7;
    // Knowledge inverse multiplier: lower knowledge = more time needed
    const knowledgeMultipliers = {
        beginner: 1.5,      // needs 50% more time
        intermediate: 1.0,  // baseline
        advanced: 0.75,     // needs 25% less time
        expert: 0.5         // needs 50% less time
    };
    const knowledgeFactor = knowledgeMultipliers[knowledgeLevel] || 1.0;
    const multiplier = weightFactor * knowledgeFactor;
    return Math.round(baseMinutes * multiplier);
};

// Get subjects by grade
export const getSubjectsByGrade = (grade) => {
    return Object.entries(subjectsData)
        .filter(([_, data]) => data.grades && data.grades.includes(grade))
        .map(([name, _]) => name);
};

// Get subjects by stream (for A/L)
export const getSubjectsByStream = (stream) => {
    return Object.entries(subjectsData)
        .filter(([_, data]) => data.stream === stream)
        .map(([name, _]) => name);
};

// Get subjects by category (for O/L)
export const getSubjectsByCategory = (category) => {
    return Object.entries(subjectsData)
        .filter(([_, data]) => data.category === category)
        .map(([name, _]) => name);
};

// Get all streams
export const getStreams = () => {
    return ['Physical Science', 'Bio Science', 'Commerce', 'Arts', 'Technology'];
};

// Get all categories
export const getCategories = () => {
    return ['Core', 'Optional-1', 'Optional-2', 'Optional-3'];
};

// Get subject info
export const getSubjectInfo = (subject) => {
    const data = subjectsData[subject];
    if (!data) return null;

    return {
        name: subject,
        weight: data.weight,
        grades: data.grades,
        stream: data.stream || null,
        category: data.category || null,
        topicsCount: data.topics?.length || 0,
        studyTimeMultiplier: (0.8 + (data.weight / 10) * 0.7).toFixed(2)
    };
};

export default subjectsData;
