import os
from PIL import Image, ImageDraw, ImageFont
import logging

# Setup basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Configuration ---
ICON_SIZES = {
    "icon16.png": 16,
    "icon48.png": 48,
    "icon128.png": 128
}
OUTPUT_DIR = "icons"
BACKGROUND_COLOR = "#4A90E2"  # Medium Blue
TEXT_COLOR = "white"
TEXT = "C+"
FONT_SIZE_RATIO = 0.65 # Adjust this to change text size relative to icon size

# List of potential fonts to try (common sans-serif)
FONT_PATHS = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",   # Common on Linux
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", # Common on Linux
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",    # Common on macOS
    "C:/Windows/Fonts/arialbd.ttf",                      # Common on Windows
    "arial.ttf", # Default if others not found, might work depending on system path
    "verdana.ttf"
]
# --- End Configuration ---

def find_font(preferred_fonts, fallback_size):
    """Attempts to load a font from the list, falling back to default."""
    for font_path in preferred_fonts:
        try:
            # Try loading with a dummy size first to check existence/validity
            ImageFont.truetype(font_path, 10)
            logging.info(f"Using font: {font_path}")
            return font_path
        except IOError:
            logging.debug(f"Font not found or cannot be opened: {font_path}")
        except Exception as e:
             logging.warning(f"Error loading font {font_path}: {e}")
             
    logging.warning("No preferred fonts found. Attempting to load default font.")
    try:
        # Pillow's default font might be very basic
        font = ImageFont.load_default()
        logging.info("Using Pillow's default bitmap font.")
        return font # Return the font object directly for default
    except Exception as e:
        logging.error(f"Could not load default font: {e}")
        return None # Indicate failure

def get_font_for_size(font_path_or_object, size):
     """Loads the truetype font at a specific size, or returns the default font object."""
     if isinstance(font_path_or_object, str): # It's a path
         try:
             return ImageFont.truetype(font_path_or_object, size=size)
         except Exception as e:
             logging.error(f"Error loading font {font_path_or_object} at size {size}. Falling back. Error: {e}")
             return ImageFont.load_default() # Fallback to default on error
     else: # It's likely the default font object itself
         return font_path_or_object


def create_icon(size, filename, font_path_or_object):
    """Creates a single icon file."""
    try:
        img = Image.new('RGBA', (size, size), BACKGROUND_COLOR)
        draw = ImageDraw.Draw(img)

        # Calculate font size dynamically
        font_size = int(size * FONT_SIZE_RATIO)
        
        # Get the actual font object for the calculated size
        try:
             font = get_font_for_size(font_path_or_object, font_size)
        except Exception as e:
             logging.error(f"Failed to get font for size {font_size}. Error: {e}")
             font = ImageFont.load_default() # Final fallback

        # Calculate text position (centered)
        # Use textbbox for more accurate centering with TrueType fonts
        try:
            if hasattr(font, 'getbbox'): # Use getbbox if available (Pillow >= 8.0.0)
                 bbox = draw.textbbox((0, 0), TEXT, font=font)
                 text_width = bbox[2] - bbox[0]
                 text_height = bbox[3] - bbox[1]
                 text_x = (size - text_width) / 2
                 text_y = (size - text_height) / 2 - bbox[1] # Adjust y based on bbox[1]
            else: # Fallback for older Pillow or default font (less accurate)
                text_width, text_height = draw.textsize(TEXT, font=font)
                text_x = (size - text_width) / 2
                text_y = (size - text_height) / 2

            # Draw the text
            draw.text((text_x, text_y), TEXT, fill=TEXT_COLOR, font=font)
            logging.info(f"Drew text '{TEXT}' on {filename}")

        except Exception as e:
            logging.error(f"Could not draw text on {filename}. Error: {e}. Icon will be solid color.")


        # Save the image
        img.save(os.path.join(OUTPUT_DIR, filename), "PNG")
        logging.info(f"Successfully created icon: {filename}")

    except Exception as e:
        logging.error(f"Failed to create icon {filename}. Error: {e}")

def main():
    """Main function to generate icons."""
    logging.info("Starting icon generation...")

    # Create output directory if it doesn't exist
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        logging.info(f"Created directory: {OUTPUT_DIR}")

    # Find the best available font
    usable_font = find_font(FONT_PATHS, fallback_size=10) # Size doesn't matter much for finding

    if usable_font is None:
         logging.error("No usable font found. Cannot draw text on icons.")
         # Optionally: Still create solid color icons? For now, we stop.
         # return 

    # Generate icons for each size
    for filename, size in ICON_SIZES.items():
        logging.info(f"Generating {filename} ({size}x{size})..." )
        create_icon(size, filename, usable_font)

    logging.info("Icon generation complete.")

if __name__ == "__main__":
    main()
