#!/usr/bin/env python3
"""
Generate PNG icons for TranslateGemma Chrome extension
"""

try:
    from PIL import Image, ImageDraw
except ImportError:
    print("PIL/Pillow not installed. Installing...")
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow"])
    from PIL import Image, ImageDraw

def create_icon(size):
    """Create a gradient icon with translation arrows"""
    # Create image with gradient background
    img = Image.new('RGB', (size, size))
    draw = ImageDraw.Draw(img)

    # Draw gradient background (purple to blue)
    for y in range(size):
        r = int(102 + (118 - 102) * y / size)
        g = int(126 + (75 - 126) * y / size)
        b = int(234 + (162 - 234) * y / size)
        draw.line([(0, y), (size, y)], fill=(r, g, b))

    # Draw translation arrows (simplified)
    arrow_color = (255, 255, 255)
    line_width = max(1, size // 16)

    # Calculate positions
    center_y = size // 2
    arrow_y1 = center_y - size // 6
    arrow_y2 = center_y + size // 6
    left_x = size // 4
    right_x = size * 3 // 4

    # Top arrow (pointing right)
    draw.line([(left_x, arrow_y1), (right_x, arrow_y1)], fill=arrow_color, width=line_width)
    # Arrow head
    arrow_size = size // 8
    draw.line([(right_x - arrow_size, arrow_y1 - arrow_size), (right_x, arrow_y1)], fill=arrow_color, width=line_width)
    draw.line([(right_x - arrow_size, arrow_y1 + arrow_size), (right_x, arrow_y1)], fill=arrow_color, width=line_width)

    # Bottom arrow (pointing left)
    draw.line([(right_x, arrow_y2), (left_x, arrow_y2)], fill=arrow_color, width=line_width)
    # Arrow head
    draw.line([(left_x + arrow_size, arrow_y2 - arrow_size), (left_x, arrow_y2)], fill=arrow_color, width=line_width)
    draw.line([(left_x + arrow_size, arrow_y2 + arrow_size), (left_x, arrow_y2)], fill=arrow_color, width=line_width)

    return img

def main():
    sizes = [16, 48, 128]

    for size in sizes:
        print(f"Generating icon{size}.png...")
        icon = create_icon(size)
        icon.save(f'icon{size}.png', 'PNG')
        print(f"✓ icon{size}.png created")

    print("\nAll icons generated successfully!")

if __name__ == '__main__':
    main()
