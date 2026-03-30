from flask import Flask, request, send_file
from PIL import Image, ImageSequence, ImageDraw, ImageFont
import requests, io, threading, random, time, tempfile, os
import imageio
import numpy as np
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Canvas dimensions - optimized for 3 cards in one row
CANVAS_WIDTH = 1050
CANVAS_HEIGHT = 950  # Reduced to fit content better

# Profile section
PROFILE_PIC_SIZE = 180
PROFILE_PIC_Y = 110  # Moved down for more space from top
USERNAME_Y = 320  # Moved down for better spacing
USERNAME_FONT_SIZE = 42

# XP Bar section
XP_BAR_Y = 400  # Adjusted for spacing
XP_BAR_HEIGHT = 30
XP_BAR_WIDTH = 500
XP_BAR_RADIUS = 8

# Featured cards section - Only 3 cards in one row
CARD_WIDTH = 300
CARD_HEIGHT = 385
CARD_COLS = 3
CARD_ROWS = 1  # Only 1 row
CARD_H_SPACING = 25
CARD_V_SPACING = 20
CARDS_SECTION_Y = 490  # Adjusted start position for cards

# Section labels
SECTION_PADDING = 30

MAX_FRAMES = 20
TIMEOUT = 30

MAZOKU_PREFIX = "https://cdn7.mazoku.cc/cards/"
SHOOB_WEBM_HOST = "cdn.shoob.gg"

DEFAULT_BG_COLOR = (18, 18, 24)  # Dark background


# ---------------- HELPERS ---------------- #

def generate_random_user_agent():
    versions = ['4.0.3','4.1.1','4.2.2','4.3','4.4','5.0.2','5.1','6.0','7.0','8.0','9.0','10.0','11.0']
    device_models = ['M2004J19C','S2020X3','Xiaomi4S','RedmiNote9','SamsungS21','GooglePixel5']
    build_versions = ['RP1A.200720.011','RP1A.210505.003','RP1A.210812.016','QKQ1.200114.002','RQ2A.210505.003']

    major = random.randint(1, 80)
    minor = random.randint(1, 999)
    build = random.randint(1, 9999)
    chrome = f"Chrome/{major}.{minor}.{build}"

    wa_major = random.randint(1, 9)
    wa_minor = random.randint(1, 9)
    whatsapp = f"WhatsApp/1.{wa_major}.{wa_minor}"

    android = random.choice(versions)
    device = random.choice(device_models)
    build_ver = random.choice(build_versions)

    return (
        f"Mozilla/5.0 (Linux; Android {android}; {device} Build/{build_ver}) "
        f"AppleWebKit/537.36 (KHTML, like Gecko) {chrome} Mobile Safari/537.36 {whatsapp}"
    )


def generate_random_ip():
    return ".".join(str(random.randint(0, 255)) for _ in range(4))


def get_buffer(url, special=False, retries=3):
    last_error = None

    for attempt in range(1, retries + 1):
        try:
            headers = {}
            if special:
                headers = {
                    "User-Agent": generate_random_user_agent(),
                    "X-Forwarded-For": generate_random_ip(),
                    "Accept": "*/*",
                }

            res = requests.get(
                url,
                headers=headers,
                timeout=TIMEOUT,
                allow_redirects=True,
                stream=False,
            )
            res.raise_for_status()

            buf = res.content
            if not buf:
                raise ValueError("Empty buffer received")

            return io.BytesIO(buf)

        except Exception as e:
            last_error = e
            retryable = any(code in str(e) for code in ["ECONNRESET", "ETIMEDOUT", "timeout", "Connection reset"])

            if not retryable or attempt == retries:
                break

            time.sleep(0.5 * attempt)

    raise last_error


def normalize_url(url):
    if SHOOB_WEBM_HOST in url and url.endswith(".webm"):
        return url[:-5] + ".gif"
    return url


def is_special(url):
    return url.startswith(MAZOKU_PREFIX)


def crop_to_aspect(img, target_width, target_height):
    """
    Crop image to target aspect ratio if needed, then resize.
    If the aspect ratio matches (within tolerance), just resize without cropping.
    """
    current_ratio = img.width / img.height
    target_ratio = target_width / target_height
    
    # Tolerance for "same ratio" (0.5% difference)
    RATIO_TOLERANCE = 0.005
    
    if abs(current_ratio - target_ratio) / target_ratio < RATIO_TOLERANCE:
        # Same ratio (or very close), just resize
        return img.resize((target_width, target_height), Image.Resampling.LANCZOS)
    
    # Different ratio, need to crop
    if current_ratio > target_ratio:
        # Image is wider than target, crop width (center crop)
        new_height = img.height
        new_width = int(new_height * target_ratio)
        left = (img.width - new_width) // 2
        img = img.crop((left, 0, left + new_width, new_height))
    else:
        # Image is taller than target, crop height (center crop)
        new_width = img.width
        new_height = int(new_width / target_ratio)
        top = (img.height - new_height) // 2
        img = img.crop((0, top, new_width, top + new_height))
    
    return img.resize((target_width, target_height), Image.Resampling.LANCZOS)


def create_circular_mask(size):
    """Create a circular mask for profile picture"""
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)
    return mask


def apply_ring_to_profile(profile_img, ring_url, size):
    """
    Apply a ring/border around the profile picture.
    ring_url: URL to a ring image (should be square with transparent center)
    """
    try:
        ring_raw = get_buffer(ring_url)
        ring_img = Image.open(ring_raw).convert("RGBA")
        ring_img = ring_img.resize((size, size), Image.Resampling.LANCZOS)
        
        # Create composite with ring
        result = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        
        # Paste profile in center (slightly smaller to fit inside ring)
        profile_size = int(size * 0.85)  # 85% of ring size
        profile_offset = (size - profile_size) // 2
        
        profile_resized = profile_img.resize((profile_size, profile_size), Image.Resampling.LANCZOS)
        circular_mask = create_circular_mask(profile_size)
        
        result.paste(profile_resized, (profile_offset, profile_offset), circular_mask)
        result.paste(ring_img, (0, 0), ring_img)
        
        return result
    except Exception as e:
        print(f"[WARN] Failed to load ring: {e}")
        # Return profile with simple circular mask
        mask = create_circular_mask(size)
        result = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        result.paste(profile_img, (0, 0), mask)
        return result


def draw_rounded_rect(draw, coords, radius, fill):
    """Draw a rounded rectangle"""
    x1, y1, x2, y2 = coords
    draw.rectangle([x1 + radius, y1, x2 - radius, y2], fill=fill)
    draw.rectangle([x1, y1 + radius, x2, y2 - radius], fill=fill)
    draw.pieslice([x1, y1, x1 + 2*radius, y1 + 2*radius], 180, 270, fill=fill)
    draw.pieslice([x2 - 2*radius, y1, x2, y1 + 2*radius], 270, 360, fill=fill)
    draw.pieslice([x1, y2 - 2*radius, x1 + 2*radius, y2], 90, 180, fill=fill)
    draw.pieslice([x2 - 2*radius, y2 - 2*radius, x2, y2], 0, 90, fill=fill)


def draw_rounded_rect_on_image(img, coords, radius, fill):
    """Draw a rounded rectangle on an RGBA image"""
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw_rounded_rect(draw, coords, radius, fill)
    return Image.alpha_composite(img, overlay)


def get_font(size, bold=False):
    """Get a font, fallback to default if not available"""
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/TTF/DejaVuSans.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    
    for path in font_paths:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    
    return ImageFont.load_default()


def draw_xp_bar(img, current_xp, needed_xp, y_offset):
    """
    Draw an XP progress bar like rank cards.
    Returns the y position after the XP bar.
    """
    draw = ImageDraw.Draw(img)
    
    # Calculate progress percentage
    if needed_xp > 0:
        progress = min(current_xp / needed_xp, 1.0)
    else:
        progress = 0
    
    # Bar dimensions
    bar_x = (CANVAS_WIDTH - XP_BAR_WIDTH) // 2
    bar_y = y_offset
    
    # Background bar (dark)
    bg_bar_color = (40, 40, 50, 255)
    draw_rounded_rect(
        draw,
        (bar_x, bar_y, bar_x + XP_BAR_WIDTH, bar_y + XP_BAR_HEIGHT),
        XP_BAR_RADIUS,
        bg_bar_color
    )
    
    # Progress fill (gradient-like effect with solid color)
    if progress > 0:
        fill_width = int((XP_BAR_WIDTH - 4) * progress)
        if fill_width > 0:
            fill_color = (255, 140, 0, 255)  # Orange
            # Add slight inner padding
            draw_rounded_rect(
                draw,
                (bar_x + 2, bar_y + 2, bar_x + 2 + fill_width, bar_y + XP_BAR_HEIGHT - 2),
                XP_BAR_RADIUS - 2,
                fill_color
            )
    
    # XP text
    xp_text = f"{current_xp:,} / {needed_xp:,} XP"
    font = get_font(18, bold=True)
    bbox = draw.textbbox((0, 0), xp_text, font=font)
    text_width = bbox[2] - bbox[0]
    text_x = (CANVAS_WIDTH - text_width) // 2
    text_y = bar_y + (XP_BAR_HEIGHT - (bbox[3] - bbox[1])) // 2
    
    # Text shadow
    draw.text((text_x + 1, text_y + 1), xp_text, font=font, fill=(0, 0, 0, 180))
    draw.text((text_x, text_y), xp_text, font=font, fill=(255, 255, 255, 255))
    
    # Level/Progress indicator (small text above bar)
    level_text = f"Level Progress"
    level_font = get_font(14, bold=False)
    level_bbox = draw.textbbox((0, 0), level_text, font=level_font)
    level_width = level_bbox[2] - level_bbox[0]
    level_x = (CANVAS_WIDTH - level_width) // 2
    
    draw.text((level_x, bar_y - 22), level_text, font=level_font, fill=(150, 150, 160, 255))
    
    return bar_y + XP_BAR_HEIGHT + 20


# ---------------- CARD LOADER ---------------- #

def load_card(url, results, index):
    """Load a card image (animated or static)"""
    try:
        url = normalize_url(url)
        special = is_special(url)

        raw = get_buffer(url, special=special)
        img = Image.open(raw)
        fmt = img.format

        frames = []
        duration = 80

        if fmt == "GIF":
            duration = img.info.get("duration", 80)
            for i, frame in enumerate(ImageSequence.Iterator(img)):
                if i >= MAX_FRAMES:
                    break
                frame_rgba = frame.convert("RGBA")
                frame_cropped = crop_to_aspect(frame_rgba, CARD_WIDTH, CARD_HEIGHT)
                frames.append(frame_cropped)

        elif fmt == "WEBP":
            duration = img.info.get("duration", 80)
            i = 0
            try:
                while True:
                    if i >= MAX_FRAMES:
                        break
                    frame = img.convert("RGBA")
                    clean = Image.new("RGBA", frame.size, (0, 0, 0, 0))
                    clean.paste(frame, (0, 0), frame)
                    frame_cropped = crop_to_aspect(clean, CARD_WIDTH, CARD_HEIGHT)
                    frames.append(frame_cropped)
                    i += 1
                    img.seek(img.tell() + 1)
            except EOFError:
                pass

        else:
            frame_rgba = img.convert("RGBA")
            frame_cropped = crop_to_aspect(frame_rgba, CARD_WIDTH, CARD_HEIGHT)
            frames.append(frame_cropped)

        if not frames:
            results[index] = None
            return

        results[index] = (frames, duration)

    except Exception as e:
        print(f"[ERROR] card index={index} url={url} → {e}")
        results[index] = None


def load_profile_picture(url, results):
    """Load profile picture"""
    try:
        raw = get_buffer(url)
        img = Image.open(raw).convert("RGBA")
        img = crop_to_aspect(img, PROFILE_PIC_SIZE, PROFILE_PIC_SIZE)
        results[0] = img
    except Exception as e:
        print(f"[ERROR] profile picture url={url} → {e}")
        results[0] = None


def load_background(url, results):
    """Load background image"""
    try:
        raw = get_buffer(url)
        img = Image.open(raw).convert("RGBA")
        img = crop_to_aspect(img, CANVAS_WIDTH, CANVAS_HEIGHT)
        results[0] = img
    except Exception as e:
        print(f"[ERROR] background url={url} → {e}")
        results[0] = None


# ---------------- CARD GENERATION ---------------- #

def create_profile_card_frame(bg, profile_pic, username, card_frames, ring_url=None, 
                               current_xp=None, needed_xp=None, show_cards_section=True):
    """Create a single frame of the profile card"""
    
    card_margin = 25
    
    # Calculate dynamic canvas height based on content
    if show_cards_section and card_frames:
        # Canvas with cards - height fits cards perfectly
        # Cards end at: cards_section_y + CARD_HEIGHT + small margin
        cards_section_y = CARDS_SECTION_Y
        if current_xp is not None and needed_xp is not None:
            cards_section_y = XP_BAR_Y + XP_BAR_HEIGHT + 60
        canvas_height = cards_section_y + CARD_HEIGHT + 35  # Just enough padding
    else:
        # Shorter canvas - just enough for profile + username + XP bar
        if current_xp is not None and needed_xp is not None:
            canvas_height = XP_BAR_Y + XP_BAR_HEIGHT + 60
        else:
            canvas_height = USERNAME_Y + 60
    
    # Start with background (cropped to canvas height)
    if bg:
        frame = bg.copy().resize((CANVAS_WIDTH, canvas_height), Image.Resampling.LANCZOS)
    else:
        frame = Image.new("RGBA", (CANVAS_WIDTH, canvas_height), DEFAULT_BG_COLOR)
    
    # Create overlay for card content area
    overlay = Image.new("RGBA", (CANVAS_WIDTH, canvas_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Determine card background height
    card_bg_bottom = canvas_height - card_margin
    
    # Draw semi-transparent card background
    card_bg_color = (30, 30, 40, 230)
    draw_rounded_rect(
        draw,
        (card_margin, 50, CANVAS_WIDTH - card_margin, card_bg_bottom),
        18,
        card_bg_color
    )
    
    # Draw header bar
    header_color = (255, 140, 0, 255)  # Orange
    draw_rounded_rect(
        draw,
        (card_margin, 50, CANVAS_WIDTH - card_margin, 85),
        12,  # Smaller radius for thin header
        header_color
    )
    # Cover bottom rounded corners of header
    draw.rectangle([card_margin, 73, CANVAS_WIDTH - card_margin, 85], fill=header_color)
    
    # Composite overlay onto frame
    frame = Image.alpha_composite(frame, overlay)
    
    # Add profile picture
    if profile_pic:
        profile_x = (CANVAS_WIDTH - PROFILE_PIC_SIZE) // 2
        
        if ring_url:
            # Apply ring
            profile_with_ring = apply_ring_to_profile(profile_pic, ring_url, PROFILE_PIC_SIZE + 30)
            profile_x = (CANVAS_WIDTH - profile_with_ring.width) // 2
            frame.paste(profile_with_ring, (profile_x, PROFILE_PIC_Y), profile_with_ring)
        else:
            # Simple circular profile with border ring
            mask = create_circular_mask(PROFILE_PIC_SIZE)
            # Add border ring
            border_size = PROFILE_PIC_SIZE + 8
            border_x = (CANVAS_WIDTH - border_size) // 2
            draw2 = ImageDraw.Draw(frame)
            draw2.ellipse(
                [border_x, PROFILE_PIC_Y - 4, border_x + border_size, PROFILE_PIC_Y - 4 + border_size],
                fill=(255, 140, 0, 255)  # Orange ring
            )
            frame.paste(profile_pic, (profile_x, PROFILE_PIC_Y), mask)
    
    # Add username
    draw = ImageDraw.Draw(frame)
    font = get_font(USERNAME_FONT_SIZE, bold=True)
    
    # Center text
    bbox = draw.textbbox((0, 0), username, font=font)
    text_width = bbox[2] - bbox[0]
    text_x = (CANVAS_WIDTH - text_width) // 2
    
    # Draw text shadow
    draw.text((text_x + 2, USERNAME_Y + 2), username, font=font, fill=(0, 0, 0, 180))
    draw.text((text_x, USERNAME_Y), username, font=font, fill=(255, 255, 255, 255))
    
    # Add XP bar if values provided
    if current_xp is not None and needed_xp is not None:
        draw_xp_bar(frame, current_xp, needed_xp, XP_BAR_Y)
    
    # Add featured cards section (only if cards are provided)
    if show_cards_section and card_frames:
        draw = ImageDraw.Draw(frame)
        
        # Add "FEATURED CARDS" section header
        section_font = get_font(24, bold=True)
        section_y = cards_section_y - 40
        draw.text((card_margin + 15, section_y), "FEATURED CARDS", font=section_font, fill=(255, 140, 0, 255))
        
        # Draw separator line
        draw.rectangle([card_margin + 15, section_y + 30, CANVAS_WIDTH - card_margin - 15, section_y + 32], 
                      fill=(255, 140, 0, 180))
        
        # Add featured cards (max 3 in one row)
        total_cards_width = CARD_COLS * CARD_WIDTH + (CARD_COLS - 1) * CARD_H_SPACING
        start_x = (CANVAS_WIDTH - total_cards_width) // 2
        
        for idx, card in enumerate(card_frames):
            col = idx % CARD_COLS
            
            # Only render first 3 cards (single row)
            if idx >= CARD_COLS:
                break
            
            x = start_x + col * (CARD_WIDTH + CARD_H_SPACING)
            y = cards_section_y
            
            # Add card shadow
            shadow_offset = 4
            draw_rounded_rect(
                draw,
                (x + shadow_offset, y + shadow_offset, x + CARD_WIDTH + shadow_offset, y + CARD_HEIGHT + shadow_offset),
                8,
                (0, 0, 0, 100)
            )
            
            # Add card border/background
            draw_rounded_rect(
                draw,
                (x - 3, y - 3, x + CARD_WIDTH + 3, y + CARD_HEIGHT + 3),
                10,
                (60, 60, 80, 255)
            )
            
            # Paste card
            if card.mode != "RGBA":
                card = card.convert("RGBA")
            frame.paste(card, (x, y), card)
    
    return frame


# ---------------- API ENDPOINTS ---------------- #

@app.route("/api/profile-card", methods=["GET"])
def generate_profile_card():
    """
    Generate a profile card with featured cards.
    
    Query Parameters:
    - username: User's display name (required)
    - avatar: URL to profile picture (required)
    - ring: URL to ring/border image for profile picture (optional)
    - bgurl: URL to background image (optional)
    - xp: Current XP value (optional, e.g., 500)
    - xpneeded: Total XP needed for level (optional, e.g., 1000)
    - card1-card3: URLs to featured cards (optional, max 3 cards)
    
    Returns:
    - MP4 video if any card is animated
    - PNG image if all cards are static
    """
    username = request.args.get("username", "User")
    avatar_url = request.args.get("avatar")
    ring_url = request.args.get("ring")
    bg_url = request.args.get("bgurl")
    
    # XP parameters
    current_xp = None
    needed_xp = None
    if request.args.get("xp") and request.args.get("xpneeded"):
        try:
            current_xp = int(request.args.get("xp"))
            needed_xp = int(request.args.get("xpneeded"))
        except ValueError:
            pass
    
    # Get card URLs - Only 3 cards max
    card_urls = []
    for i in range(1, 4):  # card1, card2, card3 only
        url = request.args.get(f"card{i}")
        if url:
            card_urls.append(url)
    
    # Load profile picture
    profile_results = [None]
    if avatar_url:
        t = threading.Thread(target=load_profile_picture, args=(avatar_url, profile_results))
        t.start()
        t.join()
    
    profile_pic = profile_results[0]
    
    # Load background
    bg_results = [None]
    if bg_url:
        t = threading.Thread(target=load_background, args=(bg_url, bg_results))
        t.start()
        t.join()
    
    bg = bg_results[0]
    
    # Load cards
    show_cards_section = len(card_urls) > 0
    
    if card_urls:
        card_results = [None] * len(card_urls)
        threads = []
        
        for i, url in enumerate(card_urls):
            t = threading.Thread(target=load_card, args=(url, card_results, i))
            t.start()
            threads.append(t)
        
        for t in threads:
            t.join()
        
        # Filter out failed loads
        loaded_cards = [r for r in card_results if r]
    else:
        loaded_cards = []
    
    # Determine if output should be animated
    is_animated = False
    frames_list = []
    duration_ms = 80
    
    if loaded_cards:
        frames_list = [c[0] for c in loaded_cards]
        duration_ms = sum(c[1] for c in loaded_cards) // len(loaded_cards)
        max_card_frames = max(len(f) for f in frames_list)
        is_animated = max_card_frames > 1
    else:
        max_card_frames = 1
    
    max_frames = min(max_card_frames, MAX_FRAMES)
    
    # Generate frames
    composed_frames = []
    for i in range(max_frames):
        # Get current frame for each card
        current_card_frames = []
        if frames_list:
            for card_frames in frames_list:
                current_card_frames.append(card_frames[i % len(card_frames)])
        
        frame = create_profile_card_frame(
            bg, profile_pic, username, current_card_frames, ring_url,
            current_xp, needed_xp, show_cards_section
        )
        composed_frames.append(np.array(frame.convert("RGB")))
    
    if is_animated:
        # Output as MP4
        fps = max(1, round(1000 / duration_ms))
        
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp_path = tmp.name
        
        try:
            writer = imageio.get_writer(
                tmp_path,
                format="FFMPEG",
                fps=fps,
                codec="libx264",
                pixelformat="yuv420p",
                output_params=[
                    "-crf", "32",
                    "-preset", "slow",
                    "-tune", "animation",
                    "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2"
                ]
            )
            for frame_arr in composed_frames:
                writer.append_data(frame_arr)
            writer.close()
            
            with open(tmp_path, "rb") as f:
                output_bytes = f.read()
        finally:
            os.unlink(tmp_path)
        
        return send_file(
            io.BytesIO(output_bytes),
            mimetype="video/mp4",
            download_name="profile_card.mp4"
        )
    else:
        # Output as PNG
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp_path = tmp.name
        
        try:
            final_frame = Image.fromarray(composed_frames[0])
            final_frame.save(tmp_path, "PNG")
            
            with open(tmp_path, "rb") as f:
                output_bytes = f.read()
        finally:
            os.unlink(tmp_path)
        
        return send_file(
            io.BytesIO(output_bytes),
            mimetype="image/png",
            download_name="profile_card.png"
        )


@app.route("/api/profile-card/preview", methods=["GET"])
def preview_profile_card():
    """
    Generate a quick preview of the profile card (always PNG, single frame).
    Useful for testing without generating full animation.
    """
    username = request.args.get("username", "User")
    avatar_url = request.args.get("avatar")
    ring_url = request.args.get("ring")
    bg_url = request.args.get("bgurl")
    
    # XP parameters
    current_xp = None
    needed_xp = None
    if request.args.get("xp") and request.args.get("xpneeded"):
        try:
            current_xp = int(request.args.get("xp"))
            needed_xp = int(request.args.get("xpneeded"))
        except ValueError:
            pass
    
    # Get first card only for preview
    card_url = request.args.get("card1")
    
    # Load assets
    profile_pic = None
    if avatar_url:
        try:
            raw = get_buffer(avatar_url)
            profile_pic = Image.open(raw).convert("RGBA")
            profile_pic = crop_to_aspect(profile_pic, PROFILE_PIC_SIZE, PROFILE_PIC_SIZE)
        except Exception as e:
            print(f"[ERROR] profile: {e}")
    
    bg = None
    if bg_url:
        try:
            raw = get_buffer(bg_url)
            bg = Image.open(raw).convert("RGBA")
            bg = crop_to_aspect(bg, CANVAS_WIDTH, CANVAS_HEIGHT)
        except Exception as e:
            print(f"[ERROR] background: {e}")
    
    cards = []
    if card_url:
        try:
            raw = get_buffer(card_url)
            card = Image.open(raw).convert("RGBA")
            card = crop_to_aspect(card, CARD_WIDTH, CARD_HEIGHT)
            cards.append(card)
        except Exception as e:
            print(f"[ERROR] card: {e}")
    
    # Create frame
    frame = create_profile_card_frame(
        bg, profile_pic, username, cards, ring_url,
        current_xp, needed_xp, show_cards_section=len(cards) > 0
    )
    
    # Output as PNG
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp_path = tmp.name
    
    try:
        frame.save(tmp_path, "PNG")
        with open(tmp_path, "rb") as f:
            output_bytes = f.read()
    finally:
        os.unlink(tmp_path)
    
    return send_file(
        io.BytesIO(output_bytes),
        mimetype="image/png",
        download_name="profile_card_preview.png"
    )


if __name__ == "__main__":
    app.run(threaded=True, port=5001)
