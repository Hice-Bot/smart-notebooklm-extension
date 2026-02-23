import os
import requests
import base64
from PIL import Image
import io

TOKEN = os.environ.get("DEEPINFRA_TOKEN")
if not TOKEN:
    print("DEEPINFRA_TOKEN environment variable not set.")
    exit(1)

API_URL = "https://api.deepinfra.com/v1/openai/images/generations"

def generate_image(prompt, filename):
    print(f"Generating {filename}...")
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {TOKEN}"
    }
    payload = {
        "prompt": prompt,
        "size": "1024x1024",
        "model": "stabilityai/sdxl-turbo",
        "n": 1,
        "response_format": "b64_json"
    }
    
    res = requests.post(API_URL, headers=headers, json=payload)
    if res.status_code != 200:
        print(f"Error generating {filename}: {res.text}")
        return False
        
    data = res.json()
    b64 = data["data"][0]["b64_json"]
    
    img_data = base64.b64decode(b64)
    with open(filename, "wb") as f:
        f.write(img_data)
        
    print(f"Saved {filename}")
    return True

os.makedirs("assets", exist_ok=True)

# Prompts
logo_prompt = "A sleek, modern app icon for a smart notebook web extension. The design features a minimalist glowing notebook. Dark mode aesthetic, neon blue and purple accents, high quality, vector style, flat design but premium, solid dark background."
generations = [
    ("assets/logo.png", logo_prompt),
    ("assets/promo_1.png", "A futuristic laptop screen with glowing code and a colorful notebook hovering out of it, dark mode aesthetic, neon purple and blue glowing lights, high quality, 3d render."),
    ("assets/promo_2.png", "A minimalist illustration of a glowing brain connected to a sleek neon binder clip, representing AI saving knowledge, dark premium aesthetic, vector art."),
    ("assets/promo_3.png", "A sleek abstract dashboard interface showing knowledge nodes connecting into a central notebook, futuristic UI, glassmorphism, dark background with vibrant cyber accents.")
]

for filename, prompt in generations:
    generate_image(prompt, filename)

# Resize logo for icons
logo_path = "assets/logo.png"
if os.path.exists(logo_path):
    print("Resizing logo for Chrome extension icons...")
    try:
        img = Image.open(logo_path)
        os.makedirs("icons", exist_ok=True)
        for size in [16, 48, 128]:
            resized = img.resize((size, size), Image.Resampling.LANCZOS)
            resized.save(f"icons/icon{size}.png")
        print("Icons created successfully.")
    except Exception as e:
        print(f"Error resizing image: {e}")

