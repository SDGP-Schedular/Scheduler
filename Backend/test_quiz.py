"""Test script to reproduce quiz JSON parsing error"""
import sys
sys.path.insert(0, '.')

from services.quiz_generator import QuizGenerator
from dotenv import load_dotenv

load_dotenv()

# Create quiz generator
generator = QuizGenerator()

# Try to generate a quiz
try:
    print(" Testing quiz generation...")
    questions = generator.generate_quiz(
        grade="10",
        subject="Mathematics",
        topic="Algebra - Linear Equations",
        difficulty="Easy",
        num_questions=5
    )
    print(f" Success! Generated {len(questions)} questions")
    
except Exception as e:
    print(f" Error occurred: {str(e)}")
    import traceback
    traceback.print_exc()
