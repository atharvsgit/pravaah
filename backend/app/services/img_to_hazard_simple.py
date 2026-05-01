import os

def analyze_ocean_hazard(image_path: str):
    """
    Analyzes an image to detect an ocean hazard.
    Simplified version that works without external dependencies for testing.
    
    Args:
        image_path (str): The file path to the ocean image.
    
    Returns:
        str: The formatted analysis from the model.
    """
    
    # Check if the image file exists
    if not os.path.exists(image_path):
        return f"Error: The file '{image_path}' was not found."
    
    # For now, return a mock analysis result to test the integration
    # In production, this would call the actual AI model
    analysis_result = """**Hazard:** High Waves
**Description:** Potentially dangerous wave conditions detected with significant wave height.
**Severity:** Moderate

Note: This is a mock analysis for testing the integration. The actual analysis would use AI vision models to detect real hazards."""
    
    return analysis_result

# Keep the original function as a backup for when dependencies are available
def analyze_ocean_hazard_full(image_path: str):
    """
    Full implementation with AI analysis (requires langchain and other dependencies)
    """
    try:
        from langchain_core.messages import HumanMessage
        from langchain_google_genai import ChatGoogleGenerativeAI
        from PIL import Image
        import io
        import base64
        from dotenv import load_dotenv
        
        # Load environment variables
        load_dotenv()
        
        # Initialize the model
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash")
        
        # Load and prepare the image
        img = Image.open(image_path)
        image_format = img.format.lower()
        
        with io.BytesIO() as output:
            img.save(output, format=img.format)
            image_bytes = output.getvalue()

        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        image_uri = f"data:image/{image_format};base64,{base64_image}"
        
        # Craft the prompt
        prompt_text = (
            "You are an expert ocean hazard detection system from image data. "
            "Analyze the provided image for the primary potential ocean hazard. "
            "Respond ONLY with the following three lines:\n"
            "**Hazard:** [Type of Hazard]\n"
            "**Description:** [A concise, one-line explanation of the hazard.]\n"
            "**Severity:** [Low, Moderate, High, or Critical]\n"
            "If no clear hazard is visible, state 'No specific hazard detected'."
        )
        
        # Create the message
        message = HumanMessage(
            content=[
                {"type": "text", "text": prompt_text},
                {"type": "image_url", "image_url": {"url": image_uri}},
            ]
        )
        
        # Get the response
        response = llm.invoke([message])
        return response.content
        
    except ImportError as e:
        return f"AI dependencies not available, using mock analysis: {analyze_ocean_hazard(image_path)}"
    except Exception as e:
        return f"Error during AI analysis: {e}. Using mock analysis: {analyze_ocean_hazard(image_path)}"