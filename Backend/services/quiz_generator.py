"""
Quiz Generator Service
Uses Google Gemini API to generate quiz questions dynamically
With retry logic, structured JSON output, and backup quiz bank for reliability
"""

import os
import json
import re
import time
import random
import ast
import google.generativeai as genai
from typing import List, Dict, Optional


class QuizGenerator:
    """Service for generating quiz questions using Google Gemini API."""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the Quiz Generator.
        
        Args:
            api_key: Google Gemini API key. If None, reads from environment.
        """
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        # Configure Gemini API
        genai.configure(api_key=self.api_key)
        
        # Model priority list — fastest models first
        self.model_names = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash']
        self.model = None
        self.model_name = None
        
        # Try each model in order
        for model_name in self.model_names:
            try:
                self.model = genai.GenerativeModel(model_name)
                self.model_name = model_name
                print(f" Quiz Generator initialized with model: {model_name}")
                break
            except Exception as e:
                print(f" Model {model_name} unavailable: {e}")
                continue
        
        if self.model is None:
            print(" All Gemini models failed to initialize. Backup quiz bank will be used.")
    
    def generate_quiz(
        self,
        grade: str,
        subject: str,
        topic: str,
        difficulty: str,
        num_questions: int = 10
    ) -> List[Dict]:
        """
        Generate quiz questions with retry logic and backup fallback.
        
        Tries up to 3 times with model fallback, then falls back to backup bank.
        """
        max_retries = 2
        last_error = None
        
        for attempt in range(max_retries):
            try:
                if self.model is None:
                    raise Exception("No Gemini model available")
                
                prompt = self._build_prompt(grade, subject, topic, difficulty, num_questions)
                
                print(f" Attempt {attempt + 1}/{max_retries}: Generating {num_questions} questions for {subject} - {topic}")
                
                # Generate with structured JSON output config
                response = self.model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.7,
                        top_p=0.8,
                        top_k=40,
                        max_output_tokens=4096,
                        response_mime_type="application/json",
                    ),
                    request_options={"timeout": 15}  # 15 second timeout for fast response
                )
                
                if not response.text:
                    raise ValueError("Empty response from Gemini API")
                    
                print(f" Received response from {self.model_name}")
                
                # Parse and validate
                questions = self._parse_response(response.text)
                validated = self._validate_questions(questions, num_questions)
                print(f" Generated {len(validated)} valid questions")
                return validated
                
            except Exception as e:
                last_error = str(e)
                print(f" Attempt {attempt + 1} failed: {last_error}")
                
                # Try switching to next model on failure
                if attempt < max_retries - 1:
                    self._try_next_model()
        
        # All retries exhausted — use backup quiz bank
        print(f" All {max_retries} API attempts failed. Using backup quiz bank.")
        return self._get_backup_questions(subject, topic, difficulty, num_questions)
    
    def _try_next_model(self):
        """Try to switch to the next available model."""
        if self.model_name is None:
            return
            
        current_idx = self.model_names.index(self.model_name) if self.model_name in self.model_names else -1
        
        for i in range(current_idx + 1, len(self.model_names)):
            try:
                model_name = self.model_names[i]
                self.model = genai.GenerativeModel(model_name)
                self.model_name = model_name
                print(f" Switched to fallback model: {model_name}")
                return
            except Exception:
                continue
        
        # If all models after current failed, try from beginning
        for i in range(0, current_idx):
            try:
                model_name = self.model_names[i]
                self.model = genai.GenerativeModel(model_name)
                self.model_name = model_name
                print(f" Retrying with model: {model_name}")
                return
            except Exception:
                continue
    
    def _build_prompt(
        self,
        grade: str,
        subject: str,
        topic: str,
        difficulty: str,
        num_questions: int
    ) -> str:
        """Build the prompt for Gemini API."""
        
        grade_desc = self._get_grade_description(grade)
        
        prompt = f"""Generate exactly {num_questions} multiple-choice quiz questions for Sri Lankan students.

Requirements:
- Grade Level: {grade_desc} (Grade {grade})
- Subject: {subject}
- Topic: {topic}
- Difficulty: {difficulty}

Rules:
1. Questions must be appropriate for Grade {grade} in the Sri Lankan education system
2. All questions must be directly related to: {topic}
3. Each question must have exactly 4 options
4. Only ONE option should be correct
5. Include a brief educational explanation for each answer
6. correctAnswer must be the index (0, 1, 2, or 3) of the correct option
7. Shuffle correct answer positions across questions
8. Make wrong answers plausible but clearly incorrect
9. Difficulty "{difficulty}": Easy=recall, Medium=application, Hard=synthesis, Mixed=varied

Respond with ONLY a JSON array of exactly {num_questions} objects. Each object must have exactly these keys:
- "question" (string)
- "options" (array of exactly 4 strings)
- "correctAnswer" (integer: 0, 1, 2, or 3)
- "explanation" (string)
- "difficulty" (string)
- "topic" (string)

No markdown, no code fences, no extra text. Just the JSON array."""
        
        return prompt
    
    def _get_grade_description(self, grade: str) -> str:
        """Get descriptive level for grade."""
        grade_map = {
            '6': 'Grade 6 (Junior secondary)',
            '7': 'Grade 7 (Junior secondary)',
            '8': 'Grade 8 (Junior secondary)',
            '9': 'Grade 9 (Junior secondary)',
            '10': 'Grade 10 (O/L)',
            '11': 'Grade 11 (O/L)',
            '12': 'Grade 12 (A/L)',
            '13': 'Grade 13 (A/L)'
        }
        return grade_map.get(grade, f'Grade {grade}')
    
    def _parse_response(self, response_text: str) -> List[Dict]:
        """
        Parse JSON response from Gemini with robust error handling.
        
        Multi-stage parsing: direct parse -> cleanup -> regex extraction -> per-question recovery.
        """
        text = response_text.strip()
        
        # Stage 0: Try direct parse first (works when response_mime_type is respected)
        try:
            questions = json.loads(text)
            if isinstance(questions, list) and len(questions) > 0:
                print(f" Direct JSON parse succeeded: {len(questions)} questions")
                return questions
        except (json.JSONDecodeError, TypeError):
            pass
        
        # Stage 1: Strip markdown code fences
        if '```json' in text:
            start = text.find('```json') + 7
            end = text.find('```', start)
            if end > start:
                text = text[start:end].strip()
        elif '```' in text:
            start = text.find('```') + 3
            end = text.find('```', start)
            if end > start:
                text = text[start:end].strip()
        
        # Stage 2: Extract JSON array from surrounding text
        start_idx = text.find('[')
        end_idx = text.rfind(']') + 1
        
        if start_idx == -1 or end_idx == 0:
            print(f" No JSON array found in response")
            raise ValueError("No JSON array found in response")
        
        json_text = text[start_idx:end_idx]
        
        # Stage 3: Aggressive cleanup
        # Remove BOM and control characters (except newline/tab)
        json_text = json_text.replace('\ufeff', '')
        json_text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', json_text)
        
        # Remove trailing commas before closing brackets/braces
        json_text = re.sub(r',\s*([}\]])', r'\1', json_text)
        
        # Fix missing commas between objects
        json_text = re.sub(r'}\s*{', '},{', json_text)
        
        # Replace smart/curly quotes with standard quotes
        json_text = json_text.replace('\u201c', '"').replace('\u201d', '"')
        json_text = json_text.replace('\u2018', "'").replace('\u2019', "'")
        
        # Remove single-line comments (// ...)
        json_text = re.sub(r'//[^\n]*', '', json_text)
        
        print(f" Attempting cleaned JSON parse ({len(json_text)} chars)")
        
        try:
            questions = json.loads(json_text)
            print(f" Cleaned parse succeeded: {len(questions)} questions")
            return questions
        except json.JSONDecodeError as e:
            print(f" Cleaned parse failed: {e.msg} at line {e.lineno}, col {e.colno}")
        
        # Stage 4: Per-question recovery — extract individual JSON objects
        print(" Attempting per-question recovery...")
        recovered = self._recover_individual_questions(json_text)
        if recovered:
            print(f" Recovered {len(recovered)} questions from malformed response")
            return recovered
        
        # Stage 5: Last resort — try ast.literal_eval
        try:
            result = ast.literal_eval(json_text)
            if isinstance(result, list):
                print(f" ast.literal_eval fallback succeeded: {len(result)} questions")
                return result
        except (ValueError, SyntaxError):
            pass
        
        raise ValueError(f"All JSON parsing strategies failed for response ({len(json_text)} chars)")
    
    def _recover_individual_questions(self, json_text: str) -> List[Dict]:
        """
        Extract valid question objects individually from malformed JSON.
        
        If one question in the array is malformed, still recover the valid ones.
        """
        recovered = []
        
        # Find all {...} blocks that look like question objects
        brace_depth = 0
        obj_start = None
        
        for i, char in enumerate(json_text):
            if char == '{':
                if brace_depth == 0:
                    obj_start = i
                brace_depth += 1
            elif char == '}':
                brace_depth -= 1
                if brace_depth == 0 and obj_start is not None:
                    obj_str = json_text[obj_start:i+1]
                    try:
                        obj = json.loads(obj_str)
                        if 'question' in obj and 'options' in obj:
                            recovered.append(obj)
                    except json.JSONDecodeError:
                        # Try cleaning this individual object
                        try:
                            cleaned = re.sub(r',\s*}', '}', obj_str)
                            obj = json.loads(cleaned)
                            if 'question' in obj and 'options' in obj:
                                recovered.append(obj)
                        except json.JSONDecodeError:
                            print(f"   Skipping unrecoverable question object")
                    obj_start = None
        
        return recovered
    
    def _validate_questions(
        self,
        questions: List[Dict],
        expected_count: int
    ) -> List[Dict]:
        """
        Validate generated questions.
        
        Ensures each question has required fields and correct format.
        """
        if not isinstance(questions, list):
            raise ValueError("Response must be a JSON array")
        
        if len(questions) == 0:
            raise ValueError("No questions generated")
        
        validated = []
        
        for i, q in enumerate(questions):
            try:
                # Required fields
                if not all(key in q for key in ['question', 'options', 'correctAnswer', 'explanation']):
                    print(f"Warning: Question {i+1} missing required fields, skipping")
                    continue
                
                # Validate options
                if not isinstance(q['options'], list) or len(q['options']) != 4:
                    print(f"Warning: Question {i+1} must have exactly 4 options, skipping")
                    continue
                
                # Validate correctAnswer — handle both int and string
                correct_answer = q['correctAnswer']
                if isinstance(correct_answer, str):
                    try:
                        correct_answer = int(correct_answer)
                        q['correctAnswer'] = correct_answer
                    except ValueError:
                        print(f"Warning: Question {i+1} has non-numeric correctAnswer, skipping")
                        continue
                
                if not isinstance(correct_answer, int) or correct_answer not in [0, 1, 2, 3]:
                    print(f"Warning: Question {i+1} has invalid correctAnswer ({correct_answer}), skipping")
                    continue
                
                # Add to validated list
                validated.append(q)
                
            except Exception as e:
                print(f"Error validating question {i+1}: {str(e)}")
                continue
        
        if len(validated) == 0:
            raise ValueError("No valid questions after validation")
        
        # Return requested number of questions (or all if less)
        return validated[:expected_count]
    
    # ==================== BANK-ONLY QUIZ GENERATION ====================

    def generate_bank_quiz(
        self,
        subject: str,
        topic: str,
        difficulty: str,
        num_questions: int = 10
    ) -> List[Dict]:
        """
        Generate quiz from the backup question bank only.
        No API call is made, no daily limit is consumed.
        """
        print(f"📚 Generating bank-only quiz: {subject} / {topic} / {difficulty} (x{num_questions})")
        return self._get_backup_questions(subject, topic, difficulty, num_questions)

    # ==================== BACKUP QUIZ BANK ====================
    
    def _get_backup_questions(self, subject: str, topic: str, difficulty: str, num_questions: int) -> List[Dict]:
        """
        Return pre-made backup questions when the API is unavailable.
        Covers major Sri Lankan curriculum subjects.
        """
        subject_lower = subject.lower()
        
        # Select the most relevant question bank
        if 'math' in subject_lower:
            bank = self._math_backup()
        elif 'physics' in subject_lower:
            bank = self._physics_backup()
        elif 'chemistry' in subject_lower:
            bank = self._chemistry_backup()
        elif 'biology' in subject_lower:
            bank = self._biology_backup()
        elif 'english' in subject_lower:
            bank = self._english_backup()
        elif 'ict' in subject_lower or 'programming' in subject_lower:
            bank = self._ict_backup()
        elif 'history' in subject_lower:
            bank = self._history_backup()
        elif 'science' in subject_lower:
            bank = self._science_backup()
        elif 'sinhala' in subject_lower:
            bank = self._sinhala_backup()
        elif 'commerce' in subject_lower or 'accounting' in subject_lower or 'economics' in subject_lower:
            bank = self._commerce_backup()
        else:
            bank = self._general_backup(subject)
        
        # Shuffle and return requested count
        random.shuffle(bank)
        
        # Override topic/difficulty to match request
        for q in bank:
            q['topic'] = topic
            q['difficulty'] = difficulty
        
        result = bank[:min(num_questions, len(bank))]
        print(f"📦 Returning {len(result)} backup questions for {subject}")
        return result
    
    def _math_backup(self):
        return [
            {"question": "What is the value of x if 2x + 6 = 14?", "options": ["2", "3", "4", "5"], "correctAnswer": 2, "explanation": "2x + 6 = 14 → 2x = 8 → x = 4", "difficulty": "Easy", "topic": "Algebra"},
            {"question": "What is the area of a circle with radius 7 cm? (Use π = 22/7)", "options": ["154 cm²", "148 cm²", "144 cm²", "132 cm²"], "correctAnswer": 0, "explanation": "A = πr² = (22/7) × 7² = 154 cm²", "difficulty": "Easy", "topic": "Geometry"},
            {"question": "If f(x) = 3x² - 2x + 1, what is f(2)?", "options": ["9", "7", "11", "5"], "correctAnswer": 0, "explanation": "f(2) = 3(4) - 2(2) + 1 = 12 - 4 + 1 = 9", "difficulty": "Medium", "topic": "Functions"},
            {"question": "What is the sum of the first 10 natural numbers?", "options": ["45", "55", "50", "60"], "correctAnswer": 1, "explanation": "Sum = n(n+1)/2 = 10(11)/2 = 55", "difficulty": "Easy", "topic": "Arithmetic"},
            {"question": "Simplify: (x² - 9) ÷ (x - 3)", "options": ["x + 3", "x - 3", "x² - 3", "x + 9"], "correctAnswer": 0, "explanation": "(x² - 9) = (x+3)(x-3), so dividing by (x-3) gives (x+3)", "difficulty": "Medium", "topic": "Algebra"},
            {"question": "What is the gradient of the line y = 3x - 5?", "options": ["3", "-5", "5", "-3"], "correctAnswer": 0, "explanation": "In y = mx + c form, the gradient m = 3", "difficulty": "Easy", "topic": "Coordinate Geometry"},
            {"question": "If sin θ = 3/5, what is cos θ?", "options": ["4/5", "3/4", "5/3", "4/3"], "correctAnswer": 0, "explanation": "Using sin²θ + cos²θ = 1: cos²θ = 1 - 9/25 = 16/25, cos θ = 4/5", "difficulty": "Medium", "topic": "Trigonometry"},
            {"question": "What is the derivative of x³ + 2x?", "options": ["3x² + 2", "3x + 2", "x² + 2", "3x² + 2x"], "correctAnswer": 0, "explanation": "d/dx(x³) = 3x², d/dx(2x) = 2, so derivative = 3x² + 2", "difficulty": "Medium", "topic": "Differentiation"},
            {"question": "A triangle has sides 3, 4, and 5. Is it a right triangle?", "options": ["Yes", "No", "Cannot determine", "Only if it's isosceles"], "correctAnswer": 0, "explanation": "3² + 4² = 9 + 16 = 25 = 5². It satisfies the Pythagorean theorem.", "difficulty": "Easy", "topic": "Geometry"},
            {"question": "What is log₁₀(1000)?", "options": ["3", "2", "4", "10"], "correctAnswer": 0, "explanation": "10³ = 1000, so log₁₀(1000) = 3", "difficulty": "Easy", "topic": "Logarithms"},
        ]
    
    def _physics_backup(self):
        return [
            {"question": "What is the SI unit of force?", "options": ["Newton", "Joule", "Watt", "Pascal"], "correctAnswer": 0, "explanation": "The SI unit of force is Newton (N), named after Sir Isaac Newton.", "difficulty": "Easy", "topic": "Mechanics"},
            {"question": "A car accelerates from 0 to 20 m/s in 5 seconds. What is its acceleration?", "options": ["4 m/s²", "5 m/s²", "100 m/s²", "25 m/s²"], "correctAnswer": 0, "explanation": "a = Δv/Δt = (20-0)/5 = 4 m/s²", "difficulty": "Easy", "topic": "Kinematics"},
            {"question": "What type of energy does a compressed spring have?", "options": ["Elastic potential energy", "Kinetic energy", "Thermal energy", "Chemical energy"], "correctAnswer": 0, "explanation": "A compressed spring stores elastic potential energy.", "difficulty": "Easy", "topic": "Energy"},
            {"question": "According to Ohm's law, if V = 12V and R = 4Ω, what is the current?", "options": ["3A", "48A", "8A", "16A"], "correctAnswer": 0, "explanation": "I = V/R = 12/4 = 3A", "difficulty": "Easy", "topic": "Electricity"},
            {"question": "What is the speed of light in a vacuum?", "options": ["3 × 10⁸ m/s", "3 × 10⁶ m/s", "3 × 10¹⁰ m/s", "3 × 10⁴ m/s"], "correctAnswer": 0, "explanation": "The speed of light in vacuum is approximately 3 × 10⁸ m/s.", "difficulty": "Easy", "topic": "Waves"},
            {"question": "A 5 kg object is lifted 3 m. What is the work done? (g = 10 m/s²)", "options": ["150 J", "15 J", "50 J", "30 J"], "correctAnswer": 0, "explanation": "W = mgh = 5 × 10 × 3 = 150 J", "difficulty": "Medium", "topic": "Work and Energy"},
            {"question": "What happens to the resistance of a metallic conductor when temperature increases?", "options": ["It increases", "It decreases", "It stays the same", "It becomes zero"], "correctAnswer": 0, "explanation": "For metallic conductors, resistance increases with temperature due to increased atomic vibrations.", "difficulty": "Medium", "topic": "Electricity"},
            {"question": "Which of these is a vector quantity?", "options": ["Velocity", "Speed", "Temperature", "Mass"], "correctAnswer": 0, "explanation": "Velocity has both magnitude and direction, making it a vector quantity.", "difficulty": "Easy", "topic": "Mechanics"},
            {"question": "What is the gravitational potential energy of a 2kg object at 10m height? (g=10m/s²)", "options": ["200 J", "20 J", "100 J", "50 J"], "correctAnswer": 0, "explanation": "PE = mgh = 2 × 10 × 10 = 200 J", "difficulty": "Easy", "topic": "Energy"},
            {"question": "In a series circuit, what remains constant?", "options": ["Current", "Voltage", "Resistance", "Power"], "correctAnswer": 0, "explanation": "In a series circuit, the same current flows through all components.", "difficulty": "Medium", "topic": "Electricity"},
        ]
    
    def _chemistry_backup(self):
        return [
            {"question": "What is the chemical formula of water?", "options": ["H₂O", "H₂O₂", "HO", "H₃O"], "correctAnswer": 0, "explanation": "Water consists of 2 hydrogen atoms and 1 oxygen atom: H₂O.", "difficulty": "Easy", "topic": "General Chemistry"},
            {"question": "What is the pH of a neutral solution?", "options": ["7", "0", "14", "1"], "correctAnswer": 0, "explanation": "A pH of 7 is neutral, below 7 is acidic, above 7 is basic.", "difficulty": "Easy", "topic": "Acids and Bases"},
            {"question": "Which element has the atomic number 6?", "options": ["Carbon", "Nitrogen", "Oxygen", "Boron"], "correctAnswer": 0, "explanation": "Carbon (C) has 6 protons, giving it atomic number 6.", "difficulty": "Easy", "topic": "Atomic Structure"},
            {"question": "What type of bond is formed between Na and Cl in NaCl?", "options": ["Ionic bond", "Covalent bond", "Metallic bond", "Hydrogen bond"], "correctAnswer": 0, "explanation": "Na transfers an electron to Cl, forming an ionic bond.", "difficulty": "Medium", "topic": "Chemical Bonding"},
            {"question": "What is the molar mass of CO₂?", "options": ["44 g/mol", "28 g/mol", "32 g/mol", "16 g/mol"], "correctAnswer": 0, "explanation": "CO₂: C(12) + 2×O(16) = 12 + 32 = 44 g/mol", "difficulty": "Medium", "topic": "Stoichiometry"},
            {"question": "Which gas is produced when zinc reacts with dilute HCl?", "options": ["Hydrogen", "Oxygen", "Chlorine", "Carbon dioxide"], "correctAnswer": 0, "explanation": "Zn + 2HCl → ZnCl₂ + H₂. Hydrogen gas is released.", "difficulty": "Easy", "topic": "Chemical Reactions"},
            {"question": "How many electrons can the second shell hold?", "options": ["8", "2", "18", "32"], "correctAnswer": 0, "explanation": "The second shell can hold a maximum of 2n² = 2(2²) = 8 electrons.", "difficulty": "Easy", "topic": "Atomic Structure"},
            {"question": "What is the common name for sodium chloride?", "options": ["Table salt", "Baking soda", "Vinegar", "Lime"], "correctAnswer": 0, "explanation": "NaCl is commonly known as table salt.", "difficulty": "Easy", "topic": "General Chemistry"},
            {"question": "In an exothermic reaction, energy is:", "options": ["Released to surroundings", "Absorbed from surroundings", "Neither released nor absorbed", "Converted to mass"], "correctAnswer": 0, "explanation": "Exothermic reactions release energy, usually as heat.", "difficulty": "Easy", "topic": "Thermochemistry"},
            {"question": "What is Avogadro's number?", "options": ["6.022 × 10²³", "6.022 × 10²²", "3.14 × 10²³", "1.602 × 10⁻¹⁹"], "correctAnswer": 0, "explanation": "Avogadro's number is approximately 6.022 × 10²³ particles per mole.", "difficulty": "Easy", "topic": "Stoichiometry"},
        ]
    
    def _biology_backup(self):
        return [
            {"question": "What is the powerhouse of the cell?", "options": ["Mitochondria", "Nucleus", "Ribosome", "Chloroplast"], "correctAnswer": 0, "explanation": "Mitochondria produce ATP through cellular respiration, providing energy.", "difficulty": "Easy", "topic": "Cell Biology"},
            {"question": "What is the process by which plants make food?", "options": ["Photosynthesis", "Respiration", "Transpiration", "Fermentation"], "correctAnswer": 0, "explanation": "Photosynthesis uses light energy to convert CO₂ and water into glucose.", "difficulty": "Easy", "topic": "Plant Biology"},
            {"question": "DNA stands for:", "options": ["Deoxyribonucleic acid", "Diribonucleic acid", "Deoxyribonitric acid", "Dinucleic acid"], "correctAnswer": 0, "explanation": "DNA stands for Deoxyribonucleic acid, the molecule that carries genetic information.", "difficulty": "Easy", "topic": "Genetics"},
            {"question": "Which blood group is called the universal donor?", "options": ["O negative", "AB positive", "A positive", "B negative"], "correctAnswer": 0, "explanation": "O negative can donate to all blood types as it has no antigens.", "difficulty": "Medium", "topic": "Human Biology"},
            {"question": "What is the largest organ in the human body?", "options": ["Skin", "Liver", "Brain", "Heart"], "correctAnswer": 0, "explanation": "The skin is the largest organ, covering about 1.5-2 m².", "difficulty": "Easy", "topic": "Human Biology"},
            {"question": "How many chromosomes do humans have?", "options": ["46", "23", "48", "44"], "correctAnswer": 0, "explanation": "Humans have 46 chromosomes (23 pairs) in each somatic cell.", "difficulty": "Easy", "topic": "Genetics"},
            {"question": "What gas do plants absorb during photosynthesis?", "options": ["Carbon dioxide", "Oxygen", "Nitrogen", "Hydrogen"], "correctAnswer": 0, "explanation": "Plants absorb CO₂ from the atmosphere during photosynthesis.", "difficulty": "Easy", "topic": "Plant Biology"},
            {"question": "Which type of cell division produces identical daughter cells?", "options": ["Mitosis", "Meiosis", "Binary fission", "Budding"], "correctAnswer": 0, "explanation": "Mitosis produces two genetically identical daughter cells.", "difficulty": "Medium", "topic": "Cell Biology"},
            {"question": "What is the function of red blood cells?", "options": ["Transport oxygen", "Fight infection", "Blood clotting", "Produce hormones"], "correctAnswer": 0, "explanation": "RBCs contain hemoglobin which binds and transports oxygen.", "difficulty": "Easy", "topic": "Human Biology"},
            {"question": "Which vitamin is produced when skin is exposed to sunlight?", "options": ["Vitamin D", "Vitamin C", "Vitamin A", "Vitamin B12"], "correctAnswer": 0, "explanation": "UV light triggers vitamin D synthesis in the skin.", "difficulty": "Easy", "topic": "Human Biology"},
        ]
    
    def _english_backup(self):
        return [
            {"question": "Which of the following is a synonym of 'happy'?", "options": ["Joyful", "Angry", "Sad", "Tired"], "correctAnswer": 0, "explanation": "'Joyful' means full of joy, which is similar in meaning to 'happy'.", "difficulty": "Easy", "topic": "Vocabulary"},
            {"question": "Choose the correct form: 'She ___ to school every day.'", "options": ["goes", "go", "going", "gone"], "correctAnswer": 0, "explanation": "Third person singular (she) requires 'goes' in simple present tense.", "difficulty": "Easy", "topic": "Grammar"},
            {"question": "What is the past tense of 'write'?", "options": ["Wrote", "Written", "Writed", "Writing"], "correctAnswer": 0, "explanation": "'Write' is an irregular verb. Past tense: wrote; Past participle: written.", "difficulty": "Easy", "topic": "Grammar"},
            {"question": "Which is the correct sentence?", "options": ["He doesn't like apples.", "He don't like apples.", "He doesn't likes apples.", "He not like apples."], "correctAnswer": 0, "explanation": "Third person singular uses 'doesn't' + base form of the verb.", "difficulty": "Easy", "topic": "Grammar"},
            {"question": "What is an antonym of 'ancient'?", "options": ["Modern", "Old", "Historic", "Classic"], "correctAnswer": 0, "explanation": "'Modern' means recent or current, the opposite of 'ancient' (very old).", "difficulty": "Easy", "topic": "Vocabulary"},
            {"question": "Identify the noun in: 'The children played happily.'", "options": ["Children", "Played", "Happily", "The"], "correctAnswer": 0, "explanation": "'Children' is a noun (naming word) referring to young people.", "difficulty": "Easy", "topic": "Grammar"},
            {"question": "Which word is an adverb?", "options": ["Quickly", "Quick", "Quicker", "Quickest"], "correctAnswer": 0, "explanation": "Adverbs modify verbs and often end in '-ly'. 'Quickly' describes how an action is done.", "difficulty": "Easy", "topic": "Grammar"},
            {"question": "Choose the correct preposition: 'She is good ___ mathematics.'", "options": ["at", "in", "on", "with"], "correctAnswer": 0, "explanation": "The correct phrase is 'good at' when referring to skill in a subject.", "difficulty": "Medium", "topic": "Grammar"},
            {"question": "What type of sentence is: 'What a beautiful day!'?", "options": ["Exclamatory", "Interrogative", "Imperative", "Declarative"], "correctAnswer": 0, "explanation": "Exclamatory sentences express strong emotion and end with '!'.", "difficulty": "Medium", "topic": "Grammar"},
            {"question": "Which is the plural of 'child'?", "options": ["Children", "Childs", "Childrens", "Childes"], "correctAnswer": 0, "explanation": "'Child' is an irregular noun. Its plural form is 'children'.", "difficulty": "Easy", "topic": "Grammar"},
        ]
    
    def _ict_backup(self):
        return [
            {"question": "What does CPU stand for?", "options": ["Central Processing Unit", "Computer Processing Unit", "Central Program Unit", "Computer Program Unit"], "correctAnswer": 0, "explanation": "CPU stands for Central Processing Unit, the brain of the computer.", "difficulty": "Easy", "topic": "Computer Basics"},
            {"question": "Which of the following is an input device?", "options": ["Keyboard", "Monitor", "Printer", "Speaker"], "correctAnswer": 0, "explanation": "A keyboard is used to input data into a computer.", "difficulty": "Easy", "topic": "Computer Basics"},
            {"question": "What does HTML stand for?", "options": ["HyperText Markup Language", "High Text Markup Language", "HyperText Machine Language", "Home Tool Markup Language"], "correctAnswer": 0, "explanation": "HTML (HyperText Markup Language) is used to create web pages.", "difficulty": "Easy", "topic": "Web Development"},
            {"question": "Which of these is a programming language?", "options": ["Python", "Microsoft Word", "Google Chrome", "Windows"], "correctAnswer": 0, "explanation": "Python is a popular programming language. The others are applications or an OS.", "difficulty": "Easy", "topic": "Programming"},
            {"question": "What is the binary representation of decimal 5?", "options": ["101", "110", "100", "111"], "correctAnswer": 0, "explanation": "5 in binary: 4+1 = 1×2² + 0×2¹ + 1×2⁰ = 101", "difficulty": "Medium", "topic": "Number Systems"},
            {"question": "What does RAM stand for?", "options": ["Random Access Memory", "Read Access Memory", "Random Application Memory", "Remote Access Memory"], "correctAnswer": 0, "explanation": "RAM (Random Access Memory) is temporary, volatile memory.", "difficulty": "Easy", "topic": "Computer Basics"},
            {"question": "Which protocol is used for secure web browsing?", "options": ["HTTPS", "HTTP", "FTP", "SMTP"], "correctAnswer": 0, "explanation": "HTTPS uses SSL/TLS encryption for secure communication.", "difficulty": "Medium", "topic": "Networking"},
            {"question": "In a flowchart, what shape represents a decision?", "options": ["Diamond", "Rectangle", "Oval", "Parallelogram"], "correctAnswer": 0, "explanation": "A diamond (rhombus) shape represents a decision point in flowcharts.", "difficulty": "Easy", "topic": "Programming"},
            {"question": "What is 1 byte equal to?", "options": ["8 bits", "4 bits", "16 bits", "2 bits"], "correctAnswer": 0, "explanation": "1 byte = 8 bits. A bit is the smallest unit of data (0 or 1).", "difficulty": "Easy", "topic": "Computer Basics"},
            {"question": "Which data type stores true/false values?", "options": ["Boolean", "Integer", "String", "Float"], "correctAnswer": 0, "explanation": "Boolean data type stores only true or false (1 or 0).", "difficulty": "Easy", "topic": "Programming"},
        ]
    
    def _history_backup(self):
        return [
            {"question": "In which year did Sri Lanka gain independence?", "options": ["1948", "1947", "1950", "1945"], "correctAnswer": 0, "explanation": "Sri Lanka (then Ceylon) gained independence from Britain on February 4, 1948.", "difficulty": "Easy", "topic": "Sri Lankan History"},
            {"question": "Who was the first Prime Minister of Ceylon?", "options": ["D.S. Senanayake", "S.W.R.D. Bandaranaike", "Dudley Senanayake", "Sir John Kotelawala"], "correctAnswer": 0, "explanation": "D.S. Senanayake became the first PM of independent Ceylon in 1948.", "difficulty": "Easy", "topic": "Sri Lankan History"},
            {"question": "The ancient capital Anuradhapura was established around:", "options": ["4th century BCE", "1st century CE", "6th century CE", "10th century CE"], "correctAnswer": 0, "explanation": "Anuradhapura was established as the capital around 380 BCE.", "difficulty": "Medium", "topic": "Ancient Sri Lanka"},
            {"question": "Who built the Ruwanwelisaya stupa?", "options": ["King Dutugemunu", "King Vijaya", "King Parakramabahu", "King Devanampiyatissa"], "correctAnswer": 0, "explanation": "King Dutugemunu built the Ruwanwelisaya stupa in Anuradhapura.", "difficulty": "Easy", "topic": "Ancient Sri Lanka"},
            {"question": "When did Buddhism arrive in Sri Lanka?", "options": ["3rd century BCE", "1st century BCE", "5th century BCE", "1st century CE"], "correctAnswer": 0, "explanation": "Buddhism was introduced by Arahat Mahinda during the reign of King Devanampiyatissa, 3rd century BCE.", "difficulty": "Easy", "topic": "Ancient Sri Lanka"},
            {"question": "Sigiriya Rock Fortress was built by:", "options": ["King Kashyapa I", "King Parakramabahu", "King Vijaya", "King Dutugamunu"], "correctAnswer": 0, "explanation": "King Kashyapa I (477-495 CE) built the palace on top of Sigiriya.", "difficulty": "Easy", "topic": "Ancient Sri Lanka"},
            {"question": "The Donoughmore Constitution was introduced in:", "options": ["1931", "1948", "1920", "1945"], "correctAnswer": 0, "explanation": "The Donoughmore Constitution of 1931 introduced universal suffrage to Ceylon.", "difficulty": "Medium", "topic": "Modern Sri Lanka"},
            {"question": "Sri Lanka became a republic in which year?", "options": ["1972", "1948", "1978", "1956"], "correctAnswer": 0, "explanation": "Sri Lanka became a republic on May 22, 1972, changing its name from Ceylon.", "difficulty": "Medium", "topic": "Modern Sri Lanka"},
            {"question": "The Mahavamsa is a:", "options": ["Historical chronicle", "Religious text", "Legal document", "Trade agreement"], "correctAnswer": 0, "explanation": "The Mahavamsa is an ancient Pali chronicle of Sri Lankan history.", "difficulty": "Easy", "topic": "Ancient Sri Lanka"},
            {"question": "Which European power first colonized Sri Lanka?", "options": ["Portuguese", "Dutch", "British", "French"], "correctAnswer": 0, "explanation": "The Portuguese arrived in 1505 and established control over coastal areas.", "difficulty": "Easy", "topic": "Colonial History"},
        ]
    
    def _science_backup(self):
        return [
            {"question": "What is the chemical symbol for gold?", "options": ["Au", "Ag", "Fe", "Cu"], "correctAnswer": 0, "explanation": "Au comes from the Latin word 'aurum' meaning gold.", "difficulty": "Easy", "topic": "Chemistry"},
            {"question": "What planet is known as the Red Planet?", "options": ["Mars", "Jupiter", "Venus", "Saturn"], "correctAnswer": 0, "explanation": "Mars appears red due to iron oxide (rust) on its surface.", "difficulty": "Easy", "topic": "Astronomy"},
            {"question": "What is the boiling point of water at sea level?", "options": ["100°C", "0°C", "212°C", "50°C"], "correctAnswer": 0, "explanation": "Water boils at 100°C (212°F) at standard atmospheric pressure.", "difficulty": "Easy", "topic": "Properties of Matter"},
            {"question": "Which organ pumps blood throughout the body?", "options": ["Heart", "Brain", "Liver", "Lungs"], "correctAnswer": 0, "explanation": "The heart pumps blood through the circulatory system.", "difficulty": "Easy", "topic": "Human Body"},
            {"question": "Sound travels fastest through:", "options": ["Solids", "Liquids", "Gases", "Vacuum"], "correctAnswer": 0, "explanation": "Sound travels fastest through solids because particles are closest together.", "difficulty": "Medium", "topic": "Sound"},
            {"question": "What force keeps us on the ground?", "options": ["Gravity", "Friction", "Magnetism", "Tension"], "correctAnswer": 0, "explanation": "Gravity is the force that pulls objects toward the center of Earth.", "difficulty": "Easy", "topic": "Forces"},
            {"question": "Which gas makes up most of Earth's atmosphere?", "options": ["Nitrogen", "Oxygen", "Carbon dioxide", "Hydrogen"], "correctAnswer": 0, "explanation": "Nitrogen makes up about 78% of Earth's atmosphere.", "difficulty": "Easy", "topic": "Earth Science"},
            {"question": "What is the process of a liquid turning into gas called?", "options": ["Evaporation", "Condensation", "Freezing", "Sublimation"], "correctAnswer": 0, "explanation": "Evaporation is the process where liquid changes to gas.", "difficulty": "Easy", "topic": "States of Matter"},
            {"question": "How many bones are in the adult human body?", "options": ["206", "208", "300", "180"], "correctAnswer": 0, "explanation": "An adult human body has 206 bones.", "difficulty": "Easy", "topic": "Human Body"},
            {"question": "What do we call animals that eat only plants?", "options": ["Herbivores", "Carnivores", "Omnivores", "Decomposers"], "correctAnswer": 0, "explanation": "Herbivores are animals that feed only on plants.", "difficulty": "Easy", "topic": "Ecology"},
        ]
    
    def _sinhala_backup(self):
        return [
            {"question": "සිංහල හෝඩියේ ස්වර අකුරු ගණන කීයද?", "options": ["18", "20", "16", "22"], "correctAnswer": 0, "explanation": "සිංහල හෝඩියේ ස්වර අකුරු 18 ක් ඇත.", "difficulty": "Easy", "topic": "Sinhala Grammar"},
            {"question": "'පොත' යන වචනයේ ව්‍යංජන අකුරු මොනවාද?", "options": ["ප, ත", "පො, ත", "ප, ත, ්", "ප, ො, ත"], "correctAnswer": 0, "explanation": "'පොත' යන වචනයේ 'ප' සහ 'ත' යන ව්‍යංජන අකුරු දෙක ඇත.", "difficulty": "Easy", "topic": "Sinhala Grammar"},
            {"question": "නාම පදයක් යනු කුමක්ද?", "options": ["පුද්ගලයන්, ස්ථාන, දේවල් හඳුනා ගන්නා පදයකි", "ක්‍රියාවක් හඳුනා ගන්නා පදයකි", "විශේෂණයක් හඳුනා ගන්නා පදයකි", "සම්බන්ධකයක් හඳුනා ගන්නා පදයකි"], "correctAnswer": 0, "explanation": "නාම පද මඟින් පුද්ගලයන්, ස්ථාන, දේවල් හා අදහස් හඳුනාගනී.", "difficulty": "Easy", "topic": "Sinhala Grammar"},
            {"question": "'ගස' යන වචනයේ බහුවචනය කුමක්ද?", "options": ["ගස්", "ගසන්", "ගසු", "ගසක්"], "correctAnswer": 0, "explanation": "'ගස' යන වචනයේ බහුවචනය 'ගස්' වේ.", "difficulty": "Easy", "topic": "Sinhala Grammar"},
            {"question": "සිංහල භාෂාවේ පළමු ලිඛිත සාක්ෂි හමුවන්නේ කවර සමයේද?", "options": ["ක්‍රි.පූ. 3 වන සියවස", "ක්‍රි.පූ. 1 වන සියවස", "ක්‍රි.ව. 5 වන සියවස", "ක්‍රි.ව. 10 වන සියවස"], "correctAnswer": 0, "explanation": "බ්‍රාහ්මී ශිලා ලිපි ක්‍රි.පූ. 3 වන සියවසට අයත් වේ.", "difficulty": "Medium", "topic": "Sinhala Literature"},
            {"question": "ක්‍රියා පදයක් යනු කුමක්ද?", "options": ["ක්‍රියාවක් පෙන්නුම් කරන පදයකි", "නාමයක් පෙන්නුම් කරන පදයකි", "ගුණයක් පෙන්නුම් කරන පදයකි", "ස්ථානයක් පෙන්නුම් කරන පදයකි"], "correctAnswer": 0, "explanation": "ක්‍රියා පද මඟින් කිසියම් ක්‍රියාවක් හෝ තත්ත්වයක් පෙන්නුම් කරයි.", "difficulty": "Easy", "topic": "Sinhala Grammar"},
            {"question": "'අම්මා බත් උයනවා' - මෙහි කර්තෘ පදය කුමක්ද?", "options": ["අම්මා", "බත්", "උයනවා", "බත් උයනවා"], "correctAnswer": 0, "explanation": "කර්තෘ පදය ක්‍රියාව සිදු කරන්නා වන 'අම්මා' වේ.", "difficulty": "Easy", "topic": "Sinhala Grammar"},
            {"question": "විභක්ති යනු මොනවාද?", "options": ["නාම පද වෙනස් කරන ප්‍රත්‍යයන්", "ක්‍රියා පද වෙනස් කරන ප්‍රත්‍යයන්", "විශේෂණ පද වෙනස් කරන ප්‍රත්‍යයන්", "ක්‍රියා විශේෂණ පද"], "correctAnswer": 0, "explanation": "විභක්ති මඟින් නාම පදයේ කාර්යය වාක්‍යයක් තුළ පෙන්නුම් කරයි.", "difficulty": "Medium", "topic": "Sinhala Grammar"},
            {"question": "සිංහල අකුරු මුලින්ම ලියැවුණු දේ කුමක්ද?", "options": ["ඔල් පත්", "කඩදාසි", "ගල්", "ලී"], "correctAnswer": 0, "explanation": "සිංහල ප්‍රාචීන ලේඛන ඔල් පත් මත ලියා ඇත.", "difficulty": "Medium", "topic": "Sinhala Literature"},
            {"question": "'සොඳුරු' යන පදයේ අර්ථය කුමක්ද?", "options": ["ලස්සන", "විශාල", "කුඩා", "බිය"], "correctAnswer": 0, "explanation": "'සොඳුරු' යනු 'සුන්දර' හෙවත් 'ලස්සන' යන අර්ථය දෙයි.", "difficulty": "Easy", "topic": "Vocabulary"},
        ]
    
    def _commerce_backup(self):
        return [
            {"question": "What is the accounting equation?", "options": ["Assets = Liabilities + Equity", "Assets = Liabilities - Equity", "Assets + Liabilities = Equity", "Equity = Assets + Liabilities"], "correctAnswer": 0, "explanation": "A = L + E is the fundamental accounting equation.", "difficulty": "Easy", "topic": "Accounting"},
            {"question": "What does GDP stand for?", "options": ["Gross Domestic Product", "General Domestic Product", "Gross Direct Product", "Global Domestic Product"], "correctAnswer": 0, "explanation": "GDP measures the total value of goods and services produced in a country.", "difficulty": "Easy", "topic": "Economics"},
            {"question": "A debit entry increases which type of account?", "options": ["Assets", "Liabilities", "Revenue", "Capital"], "correctAnswer": 0, "explanation": "Debits increase asset and expense accounts.", "difficulty": "Medium", "topic": "Accounting"},
            {"question": "What is inflation?", "options": ["General increase in price levels", "Decrease in price levels", "Increase in currency value", "Decrease in money supply"], "correctAnswer": 0, "explanation": "Inflation is a sustained increase in the general price level of goods and services.", "difficulty": "Easy", "topic": "Economics"},
            {"question": "Which is a current asset?", "options": ["Cash", "Building", "Machinery", "Land"], "correctAnswer": 0, "explanation": "Cash is a current asset as it's liquid and available within one year.", "difficulty": "Easy", "topic": "Accounting"},
            {"question": "What is the law of demand?", "options": ["Higher price → lower demand", "Higher price → higher demand", "Lower price → lower demand", "Price has no effect on demand"], "correctAnswer": 0, "explanation": "The law of demand states that quantity demanded decreases as price increases, ceteris paribus.", "difficulty": "Easy", "topic": "Economics"},
            {"question": "What is the purpose of a balance sheet?", "options": ["Show financial position at a point in time", "Show profits over a period", "Show cash flow", "Show budget plans"], "correctAnswer": 0, "explanation": "A balance sheet shows assets, liabilities, and equity at a specific date.", "difficulty": "Medium", "topic": "Accounting"},
            {"question": "What is opportunity cost?", "options": ["Value of the next best alternative forgone", "Cost of production", "Total expenses", "Market price"], "correctAnswer": 0, "explanation": "Opportunity cost is what you give up when choosing one option over another.", "difficulty": "Medium", "topic": "Economics"},
            {"question": "Revenue minus expenses equals:", "options": ["Profit or Loss", "Assets", "Cash flow", "Capital"], "correctAnswer": 0, "explanation": "When revenue exceeds expenses, there's a profit; when expenses exceed revenue, there's a loss.", "difficulty": "Easy", "topic": "Accounting"},
            {"question": "What type of economy has both private and public sectors?", "options": ["Mixed economy", "Market economy", "Command economy", "Traditional economy"], "correctAnswer": 0, "explanation": "A mixed economy combines elements of private enterprise and government intervention.", "difficulty": "Easy", "topic": "Economics"},
        ]
    
    def _general_backup(self, subject: str):
        """Fallback for any subject not covered above."""
        return [
            {"question": f"Which of the following best describes the importance of studying {subject}?", "options": ["It develops critical thinking and knowledge", "It has no practical application", "It is only useful for exams", "It is an outdated subject"], "correctAnswer": 0, "explanation": f"Studying {subject} helps develop analytical skills and broadens understanding.", "difficulty": "Easy", "topic": "General"},
            {"question": "What is the best study technique for understanding complex topics?", "options": ["Active recall and spaced repetition", "Reading the same notes repeatedly", "Highlighting everything", "Studying only the night before"], "correctAnswer": 0, "explanation": "Active recall (testing yourself) and spaced repetition are proven to be the most effective study methods.", "difficulty": "Easy", "topic": "Study Skills"},
            {"question": "Which of these is a key benefit of group study?", "options": ["Learning from different perspectives", "More distractions", "Less individual effort", "Guaranteed better grades"], "correctAnswer": 0, "explanation": "Group study allows you to hear different viewpoints and explanations.", "difficulty": "Easy", "topic": "Study Skills"},
            {"question": "What does 'critical thinking' mean?", "options": ["Analyzing information objectively before making judgments", "Criticizing others' opinions", "Believing everything without question", "Only accepting written information"], "correctAnswer": 0, "explanation": "Critical thinking involves careful analysis and evaluation of information.", "difficulty": "Easy", "topic": "General"},
            {"question": "What is the most effective way to prepare for an exam?", "options": ["Practice with past papers and review weak areas", "Memorize everything the night before", "Only read the textbook once", "Skip difficult topics entirely"], "correctAnswer": 0, "explanation": "Practicing past papers helps understand the exam format and identifies weak areas.", "difficulty": "Easy", "topic": "Study Skills"},
        ]


# Singleton instance
_quiz_generator = None

def get_quiz_generator() -> QuizGenerator:
    """Get or create the quiz generator singleton."""
    global _quiz_generator
    if _quiz_generator is None:
        _quiz_generator = QuizGenerator()
    return _quiz_generator

def reset_quiz_generator():
    """Reset the singleton (used when config changes)."""
    global _quiz_generator
    _quiz_generator = None
