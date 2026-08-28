#!/usr/bin/env python3
import os
import subprocess
from PIL import Image, ImageDraw

ICONS_DIR = os.path.join(os.path.dirname(__file__), "..", "icons")
os.makedirs(ICONS_DIR, exist_ok=True)
SVG_PATH = os.path.join(ICONS_DIR, "favicon.svg")

def generate_with_imagemagick():
    sizes = [
        ("icon-180.png", 180),
        ("icon-192.png", 192),
        ("icon-512.png", 512),
        ("apple-touch-icon.png", 180),
    ]
    for filename, size in sizes:
        out_path = os.path.join(ICONS_DIR, filename)
        cmd = ["convert", "-background", "none", "-density", "384", "-resize", f"{size}x{size}", SVG_PATH, out_path]
        try:
            subprocess.run(cmd, check=True)
            print(f"Generated {filename} ({size}x{size}) with ImageMagick")
        except Exception as e:
            print(f"ImageMagick failed for {filename}: {e}, falling back to Pillow generator")
            generate_fallback_png(filename, size)

def generate_maskable():
    # Maskable icon needs 10-15% safe area padding
    out_path = os.path.join(ICONS_DIR, "icon-maskable.png")
    cmd = ["convert", "-background", "#0F172A", "-density", "384", "-resize", "420x420", "-gravity", "center", "-extent", "512x512", SVG_PATH, out_path]
    try:
        subprocess.run(cmd, check=True)
        print("Generated icon-maskable.png (512x512)")
    except Exception as e:
        print(f"ImageMagick maskable failed: {e}")
        generate_fallback_png("icon-maskable.png", 512)

def generate_fallback_png(filename, size):
    out_path = os.path.join(ICONS_DIR, filename)
    img = Image.new("RGBA", (size, size), (15, 23, 42, 255))
    draw = ImageDraw.Draw(img)
    
    # Draw rounded rect / squircle
    margin = int(size * 0.08)
    draw.rounded_rectangle([margin, margin, size - margin, size - margin], radius=int(size * 0.22), fill=(30, 41, 59, 255), outline=(56, 189, 248, 200), width=max(2, int(size * 0.02)))
    
    # Draw briefcase emblem
    bx1 = int(size * 0.22)
    by1 = int(size * 0.38)
    bx2 = int(size * 0.78)
    by2 = int(size * 0.76)
    draw.rounded_rectangle([bx1, by1, bx2, by2], radius=int(size * 0.06), fill=(16, 185, 129, 255), outline=(6, 182, 212, 255), width=max(2, int(size * 0.015)))
    
    # Handle
    hx1 = int(size * 0.38)
    hy1 = int(size * 0.28)
    hx2 = int(size * 0.62)
    hy2 = int(size * 0.40)
    draw.arc([hx1, hy1, hx2, hy2], start=180, end=0, fill=(56, 189, 248, 255), width=max(3, int(size * 0.03)))
    
    img.save(out_path, "PNG")
    print(f"Generated fallback {filename} ({size}x{size})")

if __name__ == "__main__":
    generate_with_imagemagick()
    generate_maskable()
    print("All icons successfully generated!")
