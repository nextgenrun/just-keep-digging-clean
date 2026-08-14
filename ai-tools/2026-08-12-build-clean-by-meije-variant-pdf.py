"""Build the bundled Clean by Meije flyer-concept PDF without image recompression."""

from pathlib import Path

from PIL import Image
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "2026-08-12-clean-by-meije-three-flyer-variations.pdf"
PAGE_WIDTH = 6 * inch
PAGE_HEIGHT = 9 * inch
EXPECTED_PIXELS = (1024, 1536)

PAGES = (
    {
        "path": ROOT / "ai-tools" / "2026-08-12-clean-by-meije-variant-booklet-cover.png",
        "bookmark": "cover",
        "outline": "Cover",
        "level": 0,
    },
    {
        "path": ROOT / "ai-tools" / "2026-08-12-clean-by-meije-material-reset-page-1.png",
        "bookmark": "material-reset",
        "outline": "1. Material Reset",
        "level": 0,
    },
    {
        "path": ROOT / "ai-tools" / "2026-08-12-clean-by-meije-material-reset-page-2.png",
        "bookmark": "material-reset-page-2",
        "outline": "Page 2",
        "level": 1,
    },
    {
        "path": ROOT / "ai-tools" / "2026-08-12-clean-by-meije-precision-layers-page-1.png",
        "bookmark": "precision-layers",
        "outline": "2. Precision Layers",
        "level": 0,
    },
    {
        "path": ROOT / "ai-tools" / "2026-08-12-clean-by-meije-precision-layers-page-2.png",
        "bookmark": "precision-layers-page-2",
        "outline": "Page 2",
        "level": 1,
    },
    {
        "path": ROOT / "ai-tools" / "2026-08-12-clean-by-meije-quiet-impact-page-1.png",
        "bookmark": "quiet-impact",
        "outline": "3. Quiet Impact",
        "level": 0,
    },
    {
        "path": ROOT / "ai-tools" / "2026-08-12-clean-by-meije-quiet-impact-page-2-v2.png",
        "bookmark": "quiet-impact-page-2",
        "outline": "Page 2",
        "level": 1,
    },
)


def validate_sources() -> None:
    for page in PAGES:
        path = page["path"]
        if not path.is_file():
            raise FileNotFoundError(path)
        with Image.open(path) as image:
            if image.size != EXPECTED_PIXELS:
                raise ValueError(f"Unexpected canvas {image.size} for {path.name}")
            if image.mode != "RGB":
                raise ValueError(f"Unexpected image mode {image.mode} for {path.name}")


def build_pdf() -> None:
    validate_sources()
    if OUTPUT.exists():
        raise FileExistsError(f"Refusing to overwrite existing PDF: {OUTPUT}")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    document = canvas.Canvas(
        str(OUTPUT),
        pagesize=(PAGE_WIDTH, PAGE_HEIGHT),
        pageCompression=1,
        pdfVersion=(1, 7),
    )
    document.setTitle("Clean by Meije - Drie flyerconcepten")
    document.setAuthor("Clean by Meije")
    document.setSubject("Material Reset, Precision Layers en Quiet Impact")
    document.setCreator("OpenAI Codex with ImageGen")
    document.setKeywords("Clean by Meije, flyer, dieptereiniging, concepten")

    for page in PAGES:
        document.bookmarkPage(page["bookmark"])
        document.addOutlineEntry(
            page["outline"],
            page["bookmark"],
            level=page["level"],
            closed=False,
        )
        document.drawImage(
            ImageReader(str(page["path"])),
            0,
            0,
            width=PAGE_WIDTH,
            height=PAGE_HEIGHT,
            preserveAspectRatio=False,
            mask="auto",
        )
        document.showPage()

    document.save()
    print(f"Created {OUTPUT}")
    print(f"Pages: {len(PAGES)}")
    print(f"Page size: {PAGE_WIDTH / inch:.2f} x {PAGE_HEIGHT / inch:.2f} inches")


if __name__ == "__main__":
    build_pdf()
