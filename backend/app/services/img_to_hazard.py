import os
import base64
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from PIL import Image
import io

# --- Load Environment Variables ---
# This loads the GEMINI_API_KEY from your .env file
load_dotenv()

# Set GOOGLE_API_KEY from GEMINI_API_KEY for LangChain compatibility
gemini_key = os.getenv("GEMINI_API_KEY")
if gemini_key:
    os.environ["GOOGLE_API_KEY"] = gemini_key

# --- Main Function to Analyze Hazard ---
def analyze_ocean_hazard(image_path: str):
    """
    Analyzes an image to detect an ocean hazard using LangChain and Gemini Vision.

    Args:
        image_path (str): The file path to the ocean image.

    Returns:
        str: The formatted analysis from the model.
    """
    # --- 1. Initialize the Gemini Vision Model with LangChain ---
    # We use the 'gemini-pro-vision' model for multimodal tasks.
    # New, faster model
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash")

    # --- 2. Load and Prepare the Image ---
    try:
        # Open image with Pillow to handle various formats and get format info
        img = Image.open(image_path)
        # Determine image format (jpeg, png, etc.)
        image_format = img.format.lower()
        
        # Convert image to bytes
        with io.BytesIO() as output:
            img.save(output, format=img.format)
            image_bytes = output.getvalue()

        # Encode the image bytes to a base64 string
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        image_uri = f"data:image/{image_format};base64,{base64_image}"
        
    except FileNotFoundError:
        return f"Error: The file '{image_path}' was not found. Please check the path."
    except Exception as e:
        return f"Error processing image: {e}"

    # --- 3. Craft a Specific Prompt for the Task ---
    # This prompt guides the model to give a precise, formatted answer.
    prompt_text = (
        "You are an expert ocean hazard detection system from image data. "
        "Analyze the provided image for the primary potential ocean hazard. "
        "Respond ONLY with the following three lines:\n"
        "**Hazard:** [Type of Hazard]\n"
        "**Description:** [A concise, one-line explanation of the hazard.]\n"
        "**Severity:** [Low, Moderate, High, or Critical]\n"
        "If no clear hazard is visible, state 'No specific hazard detected'."
    )
    
    # --- 4. Create the Message Payload for LangChain ---
    # A HumanMessage is used to structure input for the model.
    # The 'content' is a list containing both our text prompt and the image.
    message = HumanMessage(
        content=[
            {"type": "text", "text": prompt_text},
            {"type": "image_url", "image_url": {"url": image_uri}},
        ]
    )

    # --- 5. Invoke the Model and Get the Response ---
    print(f"🔎 Analyzing '{image_path}' for ocean hazards...")
    try:
        response = llm.invoke([message])
        return response.content
    except Exception as e:
        return f"Error: An error occurred during the API call: {e}"

# --- Main Execution Block ---
if __name__ == "__main__":
    # ❗️ IMPORTANT: Replace this with the path to YOUR image file.
    # For example: 'images/rip-current.jpg' or 'photos/algal-bloom.png'
    image_to_analyze = "flooding.jpg"
    
    # Ensure the API key is available before running
    if not os.getenv("GEMINI_API_KEY"):
        print("Error: API key not found. Please create a .env file with your GEMINI_API_KEY.")
    else:
        analysis_result = analyze_ocean_hazard(image_to_analyze)
        
        print("\n Hazard Analysis Result ")
        print(analysis_result)
