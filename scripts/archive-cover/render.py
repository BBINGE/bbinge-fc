from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


CANVAS = 1080
PANEL_WIDTH = 410


def vertical_gradient(size: tuple[int, int], top: str, bottom: str) -> Image.Image:
    width, height = size
    top_rgb = tuple(bytes.fromhex(top.removeprefix("#")))
    bottom_rgb = tuple(bytes.fromhex(bottom.removeprefix("#")))
    image = Image.new("RGB", size)
    pixels = image.load()
    for y in range(height):
        ratio = y / max(height - 1, 1)
        color = tuple(round(a + (b - a) * ratio) for a, b in zip(top_rgb, bottom_rgb))
        for x in range(width):
            pixels[x, y] = color
    return image


def paste_text_gradient(
    canvas: Image.Image,
    text: str,
    xy: tuple[int, int],
    font: ImageFont.FreeTypeFont,
    top: str = "#F8F7F6",
    bottom: str = "#DCDDD8",
) -> None:
    mask = Image.new("L", canvas.size, 0)
    ImageDraw.Draw(mask).text(xy, text, font=font, fill=255, anchor="la")
    gradient = vertical_gradient(canvas.size, top, bottom)
    canvas.paste(gradient, (0, 0), mask)


def render(args: argparse.Namespace) -> None:
    here = Path(__file__).resolve().parent
    font_dir = here / "fonts"
    light = ImageFont.truetype(font_dir / "GmarketSansTTFLight.ttf", 64)
    medium = ImageFont.truetype(font_dir / "GmarketSansTTFMedium.ttf", 50)
    bold = ImageFont.truetype(font_dir / "GmarketSansTTFBold.ttf", 194)
    signature = ImageFont.truetype(font_dir / "GmarketSansTTFMedium.ttf", 20)

    portrait = Image.open(args.photo).convert("RGB")
    portrait = ImageOps.fit(portrait, (CANVAS - PANEL_WIDTH, CANVAS), method=Image.Resampling.LANCZOS, centering=(0.5, 0.42))
    canvas = Image.new("RGB", (CANVAS, CANVAS), "white")
    canvas.paste(portrait, (PANEL_WIDTH, 0))

    trophy_source = Image.open(args.trophy).convert("RGB").crop((0, 0, PANEL_WIDTH, CANVAS))
    panel = trophy_source.copy()
    tint = vertical_gradient((PANEL_WIDTH, CANVAS), args.top, args.bottom)
    panel = Image.blend(panel, tint, 0.85)

    shadow = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rectangle((PANEL_WIDTH - 5, 0, PANEL_WIDTH + 8, CANVAS), fill=(46, 43, 46, 205))
    shadow = shadow.filter(ImageFilter.GaussianBlur(7))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), shadow)
    canvas.paste(panel, (0, 0))

    stroke = vertical_gradient((5, CANVAS), "#F83600", "#FACC22")
    canvas.paste(stroke, (PANEL_WIDTH - 5, 0))

    stamp_path = Path(args.stamp) if args.stamp else None
    if stamp_path and stamp_path.exists():
        stamp = Image.open(stamp_path).convert("RGB")
        stamp = ImageOps.contain(stamp, (110, 105), method=Image.Resampling.LANCZOS)
        border = ImageOps.expand(stamp, border=8, fill="#2E2B2E")
        canvas.paste(border, (CANVAS - border.width - 24, 20))

    draw = ImageDraw.Draw(canvas)
    draw.text((24, 373), args.year, font=light, fill="white", anchor="la")
    draw.text((24, 454), "코파 아메리카", font=medium, fill="white", anchor="la")
    paste_text_gradient(canvas, "MVP", (20, 505), bold)
    draw = ImageDraw.Draw(canvas)
    draw.text((292, 691), "삥이FC", font=signature, fill="white", anchor="la")
    draw.text((CANVAS - 42, CANVAS - 43), "삥이FC", font=signature, fill="white", anchor="ra")

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").resize((773, 773), Image.Resampling.LANCZOS).save(output, optimize=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Render a BBinge FC Copa America archive cover without Photoshop.")
    parser.add_argument("--year", required=True)
    parser.add_argument("--photo", required=True)
    parser.add_argument("--stamp")
    parser.add_argument("--trophy", required=True, help="1080px PSD-exported trophy source layer")
    parser.add_argument("--top", default="#525589")
    parser.add_argument("--bottom", default="#ACA8E0")
    parser.add_argument("--output", required=True)
    return parser.parse_args()


if __name__ == "__main__":
    render(parse_args())

