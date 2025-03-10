import os
import google.generativeai as genai
from django.http import JsonResponse, FileResponse
from django.views.decorators.csrf import csrf_exempt
import json
from gtts import gTTS

# Set up Gemini API key
genai.configure(api_key="AIzaSyCJswbUfxT2YqZuJaqTPlUS4BcAe9F-Vy0")

@csrf_exempt
def process_voice_text(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            user_text = data.get("text")

            if not user_text:
                return JsonResponse({"error": "No text provided"}, status=400)

            # Generate AI response using Gemini
            model = genai.GenerativeModel("gemini-pro")
            response = model.generate_content(user_text)
            ai_response = response.text.strip()

            # Convert AI response to speech
            tts = gTTS(ai_response)
            audio_path = "response.mp3"
            tts.save(audio_path)

            return FileResponse(open(audio_path, "rb"), content_type="audio/mpeg")

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Invalid request method"}, status=400)
