import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv('GEMINI_API_KEY')
genai.configure(api_key=api_key)

print("Available models that support generateContent:")
print("="*60)
for model in genai.list_models():
    if 'generateContent' in model.supported_generation_methods:
        print(f"Model: {model.name}")
        print(f"  Display Name: {model.display_name}")
        print(f"  Description: {model.description[:100]}...")
        print()
