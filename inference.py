import os
from google.generativeai import GenerativeModel
import google.generativeai as genai

def query(text):
    """
    Standard inference function for OpenEnv checks.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return "Error: GEMINI_API_KEY not found"
    
    genai.configure(api_key=api_key)
    model = GenerativeModel('gemini-1.5-flash')
    
    response = model.generate_content(text)
    return response.text

if __name__ == "__main__":
    # Test locally
    print(query("Hello, who are you?"))
