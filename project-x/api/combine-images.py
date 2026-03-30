from flask import Flask, request, send_file
from PIL import Image, ImageSequence
import requests, io, threading, random, time, tempfile, os
import imageio
import numpy as np
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DEFAULT_BACKGROUND_URL = "https://i.ibb.co/pvmn4QW3/wallhaven-lywpjl-1056x1056.png"

# Canvas dimensions (Square)
CANVAS_WIDTH = 1050
CANVAS_HEIGHT = 1050

# Grid configuration: 4 Columns, 3 Rows = 12 Cards
COLS = 4
ROWS = 3
H_SPACING = 14
V_SPACING = 14

# Calculate image size to fit canvas
IMAGE_WIDTH = (CANVAS_WIDTH - (COLS - 1) * H_SPACING) // COLS   # 252
IMAGE_HEIGHT = (CANVAS_HEIGHT - (ROWS - 1) * V_SPACING) // ROWS  # 340

MAX_FRAMES = 30
TIMEOUT = 30

MAZOKU_PREFIX = "https://cdn7.mazoku.cc/cards/"
SHOOB_WEBM_HOST = "cdn.shoob.gg"


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


# ---------------- FRAME LOADER ---------------- #

def load_animated(url, results, index):
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
                # Convert to RGBA first, then crop to aspect ratio and resize
                frame_rgba = frame.convert("RGBA")
                frame_cropped = crop_to_aspect(frame_rgba, IMAGE_WIDTH, IMAGE_HEIGHT)
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
                    frame_cropped = crop_to_aspect(clean, IMAGE_WIDTH, IMAGE_HEIGHT)
                    frames.append(frame_cropped)
                    i += 1
                    img.seek(img.tell() + 1)
            except EOFError:
                pass

        else:
            frame_rgba = img.convert("RGBA")
            frame_cropped = crop_to_aspect(frame_rgba, IMAGE_WIDTH, IMAGE_HEIGHT)
            frames.append(frame_cropped)

        if not frames:
            results[index] = None
            return

        results[index] = (frames, duration)

    except Exception as e:
        print(f"[ERROR] index={index} url={url} → {e}")
        results[index] = None


# ---------------- API ---------------- #

@app.route("/api/combine-images", methods=["GET"])
def combine_images():
    # Get custom background URL or use default
    bg_url = request.args.get("bgurl", DEFAULT_BACKGROUND_URL)
    
    urls = [request.args.get(f"pic{i}") for i in range(1, 13) if request.args.get(f"pic{i}")]
    if not urls:
        return "No images provided", 400

    results = [None] * len(urls)
    threads = []

    for i, url in enumerate(urls):
        t = threading.Thread(target=load_animated, args=(url, results, i))
        t.start()
        threads.append(t)

    for t in threads:
        t.join()

    gifs = [r for r in results if r]
    if not gifs:
        return "All images failed to load", 500

    frames_list = [g[0] for g in gifs]
    duration_ms = sum(g[1] for g in gifs) // len(gifs)
    fps = max(1, round(1000 / duration_ms))
    max_frames = min(max(len(f) for f in frames_list), MAX_FRAMES)

    # Calculate total canvas dimensions
    total_w = COLS * IMAGE_WIDTH + (COLS - 1) * H_SPACING
    total_h = ROWS * IMAGE_HEIGHT + (ROWS - 1) * V_SPACING

    # Ensure even dimensions (required by yuv420p)
    total_w += total_w % 2
    total_h += total_h % 2

    # Load and process background image with cropping to 1050x1050 (Square)
    try:
        bg_raw = get_buffer(bg_url)
        bg_img = Image.open(bg_raw).convert("RGBA")
        # This crops the background to fit the square canvas
        bg = crop_to_aspect(bg_img, CANVAS_WIDTH, CANVAS_HEIGHT)
    except Exception as e:
        print(f"[WARN] Failed to load background from {bg_url}, using default. Error: {e}")
        bg_raw = get_buffer(DEFAULT_BACKGROUND_URL)
        bg_img = Image.open(bg_raw).convert("RGBA")
        bg = crop_to_aspect(bg_img, CANVAS_WIDTH, CANVAS_HEIGHT)

    composed_frames = []
    for i in range(max_frames):
        frame = bg.copy()
        for idx, gif_frames in enumerate(frames_list):
            f = gif_frames[i % len(gif_frames)]
            if f.mode != "RGBA":
                f = f.convert("RGBA")
            r, c = divmod(idx, COLS)
            x = c * (IMAGE_WIDTH + H_SPACING)
            y = r * (IMAGE_HEIGHT + V_SPACING)
            frame.paste(f, (x, y), f)
        composed_frames.append(np.array(frame.convert("RGB")))

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
            mp4_bytes = f.read()
    finally:
        os.unlink(tmp_path)

    return send_file(
        io.BytesIO(mp4_bytes),
        mimetype="video/mp4",
        download_name="combined.mp4"
    )


if __name__ == "__main__":
    app.run(threaded=True)