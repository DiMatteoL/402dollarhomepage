#!/usr/bin/env python3
"""
Script to render text using Geist font and output pixel coordinates
as a SQL query with CTEs for a 1000x1000 grid.

Requirements:
    pip install pillow

Usage:
    python geist_pixels.py
"""

from PIL import Image, ImageDraw, ImageFont
import os
from collections import defaultdict

# Configuration
TEXT = "x402"  # Text to render (with x prefix)
CHAR_SIZE = 300  # Large size for 1:1 scale (no scaling needed)
SCALE = 1  # No scaling = maximum smoothness, 1 rendered pixel = 1 canvas pixel
OWNER = "Satoshi"  # Default owner for seed pixels

# Gradient colors (cyan to magenta like the example)
GRADIENT_START = (0, 255, 255)  # Cyan #00ffff
GRADIENT_END = (255, 0, 255)    # Magenta #ff00ff

# Try to find Geist font - adjust path as needed
GEIST_FONT_PATHS = [
    # macOS common locations
    "/Library/Fonts/GeistMono-Regular.otf",
    "/Library/Fonts/Geist-Regular.otf",
    "/Library/Fonts/Geist-Bold.otf",
    "/Library/Fonts/GeistVF.ttf",
    os.path.expanduser("~/Library/Fonts/GeistMono-Regular.otf"),
    os.path.expanduser("~/Library/Fonts/Geist-Regular.otf"),
    os.path.expanduser("~/Library/Fonts/Geist-Bold.otf"),
    os.path.expanduser("~/Library/Fonts/GeistVF.ttf"),
    # Linux common locations
    "/usr/share/fonts/truetype/geist/Geist-Regular.otf",
    "/usr/local/share/fonts/Geist-Regular.otf",
    # Current directory
    "./Geist-Regular.otf",
    "./Geist-Bold.otf",
    "./GeistMono-Regular.otf",
]


def find_geist_font():
    """Try to find Geist font on the system."""
    for path in GEIST_FONT_PATHS:
        if os.path.exists(path):
            return path
    return None


def render_char_to_bitmap(char, font, target_height=11, antialiasing=True):
    """
    Render a single character to a bitmap array with optional anti-aliasing.
    Returns list of (x, y, alpha) tuples relative to character origin.
    alpha is 1.0 for solid pixels, 0.3-0.7 for anti-aliased edge pixels.
    Also returns baseline offset for proper alignment.
    """
    # Create a temporary image to measure the character
    temp_img = Image.new('L', (200, 200), 0)
    temp_draw = ImageDraw.Draw(temp_img)

    # Get character bounding box
    bbox = temp_draw.textbbox((0, 0), char, font=font)
    char_width = bbox[2] - bbox[0]
    char_height = bbox[3] - bbox[1]

    # Create image sized to character with padding for anti-aliasing
    img = Image.new('L', (char_width + 8, char_height + 8), 0)
    draw = ImageDraw.Draw(img)

    # Draw character with anti-aliasing (PIL does this automatically for truetype)
    draw.text((-bbox[0] + 2, -bbox[1] + 2), char, font=font, fill=255)

    # Extract pixels with alpha values - SHARP mode
    pixels = []
    for y in range(img.height):
        for x in range(img.width):
            value = img.getpixel((x, y))
            if antialiasing:
                # High threshold for sharp, crisp letters
                # Only include pixels that are mostly solid
                if value > 100:  # High threshold = sharp edges
                    alpha = value / 255.0
                    pixels.append((x, y, alpha))
            else:
                if value > 128:
                    pixels.append((x, y, 1.0))

    # Normalize - find bounds (only consider solid-ish pixels for bounds)
    solid_pixels = [(x, y) for x, y, a in pixels if a > 0.5]
    if not solid_pixels:
        solid_pixels = [(x, y) for x, y, a in pixels]

    if not solid_pixels:
        return [], 0, 0, 0

    min_x = min(p[0] for p in solid_pixels)
    min_y = min(p[1] for p in solid_pixels)
    max_x = max(p[0] for p in solid_pixels)
    max_y = max(p[1] for p in solid_pixels)

    # Normalize to 0,0 origin
    normalized = [(x - min_x, y - min_y, a) for x, y, a in pixels]
    width = max_x - min_x + 1
    height = max_y - min_y + 1

    # Calculate baseline offset (distance from bottom of char to baseline)
    # For baseline alignment, we need to know where the bottom is
    baseline_offset = 0  # Will be adjusted based on character type

    return normalized, width, height, baseline_offset


def render_text_bitmaps(text, font_path=None, char_height=CHAR_SIZE):
    """
    Render each character of text to bitmap format with baseline alignment.
    Returns dict mapping char -> (pixels, width, height, y_offset)
    where y_offset is used to align characters to a common baseline.
    """
    # Load font - find appropriate size for target height
    if font_path and os.path.exists(font_path):
        # Start with target height and adjust
        font_size = char_height + 4
        font = ImageFont.truetype(font_path, font_size)
        print(f"Using font: {font_path}")
    else:
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", char_height + 2)
            print("Using fallback font: Menlo")
        except:
            font = ImageFont.load_default()
            print("Using default PIL font")

    char_bitmaps = {}
    max_height = 0

    # First pass: render all characters and find max height
    for char in set(text):
        pixels, width, height, _ = render_char_to_bitmap(char, font, char_height, antialiasing=True)
        char_bitmaps[char] = (pixels, width, height, 0)
        max_height = max(max_height, height)
        solid_count = sum(1 for _, _, a in pixels if a > 0.7)
        edge_count = len(pixels) - solid_count
        print(f"  Character '{char}': {len(pixels)} pixels ({solid_count} solid, {edge_count} edge), {width}x{height}")

    # Second pass: calculate y_offset for baseline alignment (align to bottom)
    for char in char_bitmaps:
        pixels, width, height, _ = char_bitmaps[char]
        # y_offset to push shorter characters down to align at bottom
        y_offset = max_height - height
        char_bitmaps[char] = (pixels, width, height, y_offset)
        if y_offset > 0:
            print(f"  Character '{char}': baseline offset +{y_offset}px (aligning to bottom)")

    return char_bitmaps, max_height


def format_pixels_as_values(pixels):
    """Format pixel list as SQL VALUES clause with alpha for anti-aliasing."""
    if not pixels:
        return ""

    # Group by row for readability
    by_row = defaultdict(list)
    for x, y, alpha in pixels:
        by_row[y].append((x, alpha))

    lines = []
    for y in sorted(by_row.keys()):
        row_pixels = sorted(by_row[y], key=lambda p: p[0])
        # Include alpha value (rounded to 2 decimals)
        row_values = ", ".join(f"({x}, {y}, {alpha:.2f})" for x, alpha in row_pixels)
        lines.append(f"                -- Row {y}\n                {row_values}")

    return ",\n".join(lines)


def generate_sql(text, char_bitmaps, max_char_height, scale=SCALE, canvas_size=1000, char_spacing=3):
    """Generate the complete SQL query with CTEs, supporting anti-aliasing and baseline alignment."""

    # Calculate total dimensions
    char_positions = []
    total_width = 0

    for i, char in enumerate(text):
        pixels, width, height, y_offset = char_bitmaps[char]
        char_positions.append({
            'char': char,
            'offset': total_width,
            'width': width,
            'height': height,
            'y_offset': y_offset,  # For baseline alignment
            'pixels': pixels
        })
        total_width += width
        if i < len(text) - 1:
            total_width += char_spacing

    # Generate font CTEs with alpha values for anti-aliasing
    font_ctes = []
    char_names = {}

    for pos in char_positions:
        char = pos['char']
        if char in char_names:
            continue

        # Create safe CTE name
        if char.isalpha():
            cte_name = f"font_{char.lower()}"
        elif char.isdigit():
            cte_name = f"font_{char}"
        else:
            cte_name = f"font_char_{ord(char)}"

        char_names[char] = cte_name

        values = format_pixels_as_values(pos['pixels'])
        # Include alpha column for anti-aliasing
        font_ctes.append(f"""{cte_name} AS (
    SELECT x, y, alpha
    FROM (
            VALUES {values}
        ) AS t(x, y, alpha)
)""")

    # Generate scaled character CTEs with baseline alignment
    scaled_ctes = []
    for i, pos in enumerate(char_positions):
        char = pos['char']
        cte_name = char_names[char]
        offset = pos['offset']
        y_offset = pos['y_offset']  # Baseline alignment offset

        scaled_ctes.append(f"""-- Character '{char}' at position {i} (y_offset: {y_offset} for baseline alignment)
char_{i}_scaled AS (
    SELECT p.start_x + ({offset} * p.scale) + (f.x * p.scale) + sx AS pixel_x,
        p.start_y + ({y_offset} * p.scale) + (f.y * p.scale) + sy AS pixel_y,
        f.alpha AS alpha
    FROM {cte_name} f
        CROSS JOIN positions p
        CROSS JOIN generate_series(0, (SELECT scale - 1 FROM params)) sx
        CROSS JOIN generate_series(0, (SELECT scale - 1 FROM params)) sy
)""")

    # Generate UNION ALL for all characters (include alpha for anti-aliasing)
    union_parts = []
    for i in range(len(char_positions)):
        if i == 0:
            union_parts.append(f"    SELECT pixel_x AS x, pixel_y AS y, alpha FROM char_{i}_scaled")
        else:
            union_parts.append(f"    UNION ALL SELECT pixel_x AS x, pixel_y AS y, alpha FROM char_{i}_scaled")

    # Calculate text dimensions for gradient
    text_width_formula = f"(({len(text)} * char_width + {len(text) - 1} * char_spacing) * scale)"

    sql = f"""-- Reset xf tables and draw "{text}" centered on the 1000x1000 pixel grid
-- With beautiful cyan-to-magenta gradient (matching site theme)
-- Rendered using Geist font with ANTI-ALIASING for smooth edges
-- Baseline-aligned characters (x sits at bottom with numbers)
-- Run this in Supabase SQL Editor

-- Step 1: Reset both tables
TRUNCATE TABLE xf_payments RESTART IDENTITY CASCADE;
DELETE FROM xf_pixels;

-- Step 2: Insert "{text}" text pixels with gradient and anti-aliasing
-- Each character is approximately {char_positions[0]['width']}px wide x {max_char_height}px tall
-- Scale factor: {scale}x
-- Anti-aliasing: Edge pixels have alpha < 1.0 for smoother appearance

-- Generate pixels using a CTE with the font bitmap data

WITH -- Font definitions for {', '.join(text)} (with alpha for anti-aliasing)
{','.join(font_ctes)},

-- Parameters
params AS (
    SELECT {scale} AS scale,
        {char_positions[0]['width']} AS char_width,
        {max_char_height} AS char_height,
        {char_spacing} AS char_spacing,
        {canvas_size} AS canvas_size
),

-- Calculate positions
positions AS (
    SELECT scale,
        char_width,
        char_height,
        char_spacing,
        canvas_size,
        {text_width_formula} AS text_width,
        (char_height * scale) AS text_height,
        ((canvas_size - {text_width_formula}) / 2) AS start_x,
        ((canvas_size - (char_height * scale)) / 2) AS start_y
    FROM params
),

-- Scale and position each character's pixels
{','.join(scaled_ctes)},

-- Combine all characters
all_pixels AS (
{chr(10).join(union_parts).replace('    SELECT', '    SELECT', 1)}
),

-- Calculate gradient colors with anti-aliasing
-- Alpha modulates the color intensity for smooth edges
gradient_pixels AS (
    SELECT DISTINCT ON (x, y) x,
        y,
        -- Calculate gradient ratio (0 to 1 across the text width)
        GREATEST(0, LEAST(1, (x - (SELECT start_x FROM positions))::float / (SELECT text_width FROM positions)::float)) AS ratio,
        -- Use max alpha for overlapping pixels
        MAX(alpha) AS alpha
    FROM all_pixels
    WHERE x >= 0
        AND x < {canvas_size}
        AND y >= 0
        AND y < {canvas_size}
    GROUP BY x, y
)

-- Insert all pixels with SHARP gradient colors
-- Minimal anti-aliasing - nearly all pixels get full color
INSERT INTO xf_pixels (
        x,
        y,
        color,
        owner,
        timestamp,
        price,
        "updateCount"
    )
SELECT x,
    y,
    -- Interpolate RGB: cyan (0,255,255) to magenta (255,0,255)
    -- SUPER SHARP: All pixels above threshold get full gradient color
    -- Only very edge pixels (alpha < 0.5) get slightly dimmed
    CASE
        WHEN alpha >= 0.5 THEN
            -- Solid pixels: full gradient color (most pixels)
            '#' || LPAD(TO_HEX((ratio * 255)::int), 2, '0') ||
            LPAD(TO_HEX(((1 - ratio) * 255)::int), 2, '0') || 'ff'
        ELSE
            -- Very edge pixels only: slight dim to smooth just the outermost edge
            '#' || LPAD(TO_HEX(LEAST(255, (ratio * 255 * 0.85)::int)), 2, '0') ||
            LPAD(TO_HEX(LEAST(255, ((1 - ratio) * 255 * 0.85)::int)), 2, '0') ||
            LPAD(TO_HEX(LEAST(255, (255 * 0.85)::int)), 2, '0')
    END AS color,
    '{OWNER}' AS owner,
    NOW() AS timestamp,
    0.01 AS price,
    1 AS "updateCount"
FROM gradient_pixels;

-- Report results
SELECT 'Done! Inserted ' || COUNT(*) || ' pixels for {text} logo with anti-aliased cyan→magenta gradient' AS result
FROM xf_pixels
WHERE owner = '{OWNER}';
"""

    return sql


def display_ascii_preview(char_bitmaps, text, max_height, char_spacing=3):
    """Display ASCII preview of the rendered text with baseline alignment."""
    # Calculate dimensions
    total_width = sum(char_bitmaps[c][1] for c in text) + char_spacing * (len(text) - 1)

    # Create grid
    grid = [[' ' for _ in range(total_width)] for _ in range(max_height)]

    # Place characters with baseline alignment
    x_offset = 0
    for char in text:
        pixels, width, height, y_offset = char_bitmaps[char]
        for px, py, alpha in pixels:
            actual_y = py + y_offset  # Apply baseline offset
            if 0 <= actual_y < max_height and 0 <= x_offset + px < total_width:
                # Use different chars for different alpha levels (anti-aliasing preview)
                if alpha > 0.8:
                    grid[actual_y][x_offset + px] = '█'
                elif alpha > 0.5:
                    grid[actual_y][x_offset + px] = '▓'
                elif alpha > 0.3:
                    grid[actual_y][x_offset + px] = '▒'
                else:
                    grid[actual_y][x_offset + px] = '░'
        x_offset += width + char_spacing

    print("\nASCII Preview (with anti-aliasing: █=solid, ▓▒░=edges):")
    print("-" * (total_width + 2))
    for row in grid:
        print("|" + "".join(row) + "|")
    print("-" * (total_width + 2))


def main():
    print(f"Rendering '{TEXT}' using Geist font with anti-aliasing...")

    # Find font
    font_path = find_geist_font()
    if not font_path:
        print("\n⚠️  Geist font not found. Using fallback font.")
        print("To use Geist font, download it from: https://vercel.com/font")
        print("And install it to your system fonts folder.\n")

    # Render characters to bitmaps (now returns max_height for baseline alignment)
    char_bitmaps, max_height = render_text_bitmaps(TEXT, font_path)

    # Display preview with baseline alignment
    display_ascii_preview(char_bitmaps, TEXT, max_height)

    # Calculate total pixels
    total_pixels = 0
    for char in TEXT:
        pixels, _, _, _ = char_bitmaps[char]
        total_pixels += len(pixels) * SCALE * SCALE
    print(f"\nEstimated total pixels after {SCALE}x scale: {total_pixels}")

    # Generate SQL with baseline alignment and anti-aliasing
    sql = generate_sql(TEXT, char_bitmaps, max_height)

    # Save SQL to file
    sql_file = "geist_pixels.sql"
    with open(sql_file, "w") as f:
        f.write(sql)
    print(f"\nSQL saved to: {sql_file}")

    # Print first 80 lines of SQL
    print("\n--- SQL Preview (first 80 lines) ---")
    lines = sql.split("\n")
    for line in lines[:80]:
        print(line)
    if len(lines) > 80:
        print(f"... ({len(lines) - 80} more lines)")


if __name__ == "__main__":
    main()
