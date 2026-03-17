"""
Quiz Generator Service
Uses Google Gemini API to generate quiz questions dynamically
"""

import os
import json
import re
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
        
        # Use stable Gemini 2.5 Flash for reliable quiz generation
        # This is the latest stable production model with broad availability
        self.model_name = 'gemini-2.5-flash'
        self.fallback_model_name = 'gemini-2.0-flash'
        
        try:
            self.model = genai.GenerativeModel(self.model_name)
            print(f"✅ Quiz Generator initialized with model: {self.model_name}")
        except Exception as e:
            print(f"⚠️ Failed to initialize primary model {self.model_name}: {e}")
            print(f"   Trying fallback model: {self.fallback_model_name}")
            try:
                self.model = genai.GenerativeModel(self.fallback_model_name)
                self.model_name = self.fallback_model_name
                print(f"✅ Quiz Generator initialized with fallback model: {self.model_name}")
            except Exception as fallback_error:
                print(f"❌ Both models failed. Primary: {e}, Fallback: {fallback_error}")
                raise ValueError(f"Unable to initialize any Gemini model. Please check API configuration.")
    
    def generate_quiz(
        self,
        grade: str,
        subject: str,
        topic: str,
        difficulty: str,
        num_questions: int = 10
    ) -> List[Dict]:
        """
        Generate quiz questions based on parameters.
        
        Args:
            grade: Grade level (e.g., "10", "13")
            subject: Subject name (e.g., "Mathematics", "Combined Mathematics")
            topic: Specific topic (e.g., "Differentiation", "Linear Equations")
            difficulty: Question difficulty ("Easy", "Medium", "Hard", "Mixed")
            num_questions: Number of questions to generate (default: 10)
        
        Returns:
            List of question dictionaries with format:
            {
                "question": str,
                "options": [str, str, str, str],
                "correctAnswer": int (0-3),
                "explanation": str,
                "difficulty": str,
                "topic": str
            }
        
        Raises:
            Exception: If generation fails or response is invalid
        """
        try:
            prompt = self._build_prompt(grade, subject, topic, difficulty, num_questions)
            
            print(f"🔄 Generating {num_questions} quiz questions for {subject} - {topic} (Grade {grade}, {difficulty})")
            
            # Generate content with temperature for creativity
            try:
                response = self.model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.7,  # Balanced creativity
                        top_p=0.8,
                        top_k=40,
                        max_output_tokens=4096,
                    )
                )
                
                if not response.text:
                    raise ValueError("Empty response from Gemini API")
                    
                print(f"✅ Received response from {self.model_name}")
                
            except Exception as api_error:
                error_msg = str(api_error)
                print(f"❌ API Error: {error_msg}")
                
                # Provide helpful error messages
                if "404" in error_msg or "not found" in error_msg.lower():
                    raise Exception(f"Model '{self.model_name}' is not available. Please check your API configuration and model availability.")
                elif "quota" in error_msg.lower() or "limit" in error_msg.lower():
                    raise Exception("API quota exceeded. Please check your Gemini API usage limits.")
                elif "api key" in error_msg.lower() or "authentication" in error_msg.lower():
                    raise Exception("Invalid API key. Please verify your GEMINI_API_KEY.")
                else:
                    raise Exception(f"API request failed: {error_msg}")
            
            # Extract and parse JSON from response
            try:
                questions = self._parse_response(response.text)
                print(f"✅ Parsed {len(questions)} questions from response")
            except Exception as parse_error:
                print(f"❌ Failed to parse response: {str(parse_error)}")
                print(f"Response text (first 500 chars): {response.text[:500]}")
                raise Exception(f"Failed to parse quiz questions: {str(parse_error)}")
            
            # Validate questions
            try:
                validated_questions = self._validate_questions(questions, num_questions)
                print(f"✅ Validated {len(validated_questions)} questions")
            except Exception as validation_error:
                print(f"❌ Validation failed: {str(validation_error)}")
                raise Exception(f"Quiz validation failed: {str(validation_error)}")
            
            return validated_questions
            
        except Exception as e:
            error_message = str(e)
            print(f"❌ Quiz generation failed: {error_message}")
            raise Exception(error_message)
    
    def _build_prompt(
        self,
        grade: str,
        subject: str,
        topic: str,
        difficulty: str,
        num_questions: int
    ) -> str:
        """Build the prompt for Gemini API."""
        
        # Map grade numbers to descriptive levels
        grade_desc = self._get_grade_description(grade)
        
        prompt = f"""Generate {num_questions} multiple-choice quiz questions for Sri Lankan students.

Requirements:
- Grade Level: {grade_desc} (Grade {grade})
- Subject: {subject}
- Topic: {topic}
- Difficulty: {difficulty}

Instructions:
1. Questions must be appropriate for Grade {grade} level in the Sri Lankan education system
2. All questions must be directly related to the topic: {topic}
3. Each question must have exactly 4 options (A, B, C, D)
4. Only ONE option should be correct
5. Questions should test understanding, not just memorization
6. Include a brief, educational explanation for each answer
7. Difficulty level should match "{difficulty}"
   - Easy: Basic concepts and recall
   - Medium: Application and analysis
   - Hard: Complex problem-solving and synthesis
   - Mixed: Vary difficulty across questions

Output Format:
Return ONLY a valid JSON array. No additional text before or after.
Use this exact structure:

[
  {{
    "question": "Clear, concise question text ending with a question mark",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "correctAnswer": 0,
    "explanation": "Brief explanation of why this answer is correct and others are wrong",
    "difficulty": "{difficulty}",
    "topic": "{topic}"
  }}
]

Critical Rules:
- correctAnswer must be the index (0, 1, 2, or 3) of the correct option
- Shuffle the position of correct answers (don't always make it option A or B)
- Make distractors (wrong answers) plausible but clearly incorrect
- Use proper mathematical notation where needed
- Ensure all content is factually accurate
- Questions should be diverse and cover different aspects of {topic}

Generate {num_questions} questions now:"""
        
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
        
        Handles cases where response may include markdown formatting or extra text.
        """
        # Remove markdown code blocks if present
        text = response_text.strip()
        
        if '```json' in text:
            # Extract JSON from markdown code block
            start = text.find('```json') + 7
            end = text.find('```', start)
            text = text[start:end].strip()
        elif '```' in text:
            # Extract from generic code block
            start = text.find('```') + 3
            end = text.find('```', start)
            text = text[start:end].strip()
        
        # Find JSON array
        start_idx = text.find('[')
        end_idx = text.rfind(']') + 1
        
        if start_idx == -1 or end_idx == 0:
            print(f"❌ No JSON array found in response")
            print(f"Response text (first 500 chars): {text[:500]}")
            raise ValueError("No JSON array found in response")
        
        json_text = text[start_idx:end_idx]
        
        # AGGRESSIVE JSON CLEANUP
        # 1. Remove trailing commas before closing brackets/braces
        json_text = re.sub(r',(\s*[}\]])', r'\1', json_text)
        
        # 2. Fix missing commas between objects (common Gemini error)
        # Add comma between } and {
        json_text = re.sub(r'}\s*{', '},{', json_text)
        
        # 3. Fix unescaped quotes in strings (try to detect and escape)
        # This is tricky - look for patterns like: "text with "quotes" inside"
        # Better approach: use a more lenient JSON parser or fix known patterns
        
        # 4. Replace smart quotes with regular quotes
        json_text = json_text.replace('"', '"').replace('"', '"')
        json_text = json_text.replace(''', "'").replace(''', "'")
        
        print(f"📝 Attempting to parse JSON ({len(json_text)} chars)")
        
        try:
            questions = json.loads(json_text)
            print(f"✅ Successfully parsed {len(questions)} questions")
            return questions
        except json.JSONDecodeError as e:
            print(f"❌ JSON Parse Error at line {e.lineno}, column {e.colno}")
            print(f"Error message: {str(e)}")
            print(f"\n📄 JSON text around error (lines {max(1, e.lineno-2)} to {e.lineno+2}):")
            
            # Show context around the error
            lines = json_text.split('\n')
            start_line = max(0, e.lineno - 3)
            end_line = min(len(lines), e.lineno + 3)
            
            for i in range(start_line, end_line):
                if i < len(lines):
                    prefix = ">>> " if i == e.lineno - 1 else "    "
                    col_marker = ""
                    if i == e.lineno - 1:
                        # Add column marker
                        col_marker = "\n    " + " " * (e.colno - 1) + "^--- Error here"
                    print(f"{prefix}Line {i+1}: {lines[i]}{col_marker}")
            
            print(f"\n💡 Full JSON text for manual inspection:")
            print(json_text[:1000] + "..." if len(json_text) > 1000 else json_text)
            
            raise ValueError(f"Invalid JSON in response: {str(e)}")
    
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
                
                # Validate correctAnswer
                if not isinstance(q['correctAnswer'], int) or q['correctAnswer'] not in [0, 1, 2, 3]:
                    print(f"Warning: Question {i+1} has invalid correctAnswer, skipping")
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


# Singleton instance
_quiz_generator = None

def get_quiz_generator() -> QuizGenerator:
    """Get or create the quiz generator singleton."""
    global _quiz_generator
    if _quiz_generator is None:
        _quiz_generator = QuizGenerator()
    return _quiz_generator
