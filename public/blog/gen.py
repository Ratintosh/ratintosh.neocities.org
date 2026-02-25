import json
from datetime import datetime
from pathlib import Path
from bs4 import BeautifulSoup  # pip install beautifulsoup4

BASE_DIR = Path(__file__).resolve().parent
POSTS_DIR = BASE_DIR / "posts"
OUTPUT_FILE = BASE_DIR / "posts.json"


def get_meta_content(soup, name):
    tag = soup.find("meta", attrs={"name": name})
    if tag and tag.has_attr("content"):
        content = tag["content"].strip()
        if content:
            return content
    return None


def parse_date(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None

posts = []

for category_dir in sorted(POSTS_DIR.iterdir(), key=lambda p: p.name.lower()):
    if not category_dir.is_dir():
        continue

    category = category_dir.name

    for file_path in sorted(category_dir.glob("*.html"), key=lambda p: p.name.lower()):
        if file_path.suffix.lower() != ".html":
            continue

        filename = file_path.name
        slug = file_path.stem
        url = f"/blog/posts/{category}/{filename}"

        with file_path.open("r", encoding="utf-8") as f:
            soup = BeautifulSoup(f, "html.parser")

        # --- Title ---
        title_meta = get_meta_content(soup, "title")
        if title_meta:
            title = title_meta
        else:
            title_tag = soup.find("title") or soup.find("h1")
            title = title_tag.text.strip() if title_tag else slug.replace("-", " ").title()

        # --- Description ---
        desc_meta = get_meta_content(soup, "description")
        if desc_meta:
            desc = desc_meta
        else:
            p_tag = soup.find("p")
            desc = p_tag.text.strip() if p_tag else "No description available."

        # --- Thumbnail ---
        thumb_meta = get_meta_content(soup, "thumbnail")
        if thumb_meta:
            thumb = thumb_meta
        else:
            img_tag = soup.find("img")
            thumb = img_tag["src"] if img_tag and img_tag.has_attr("src") else "/img/blogs/default.jpg"

        # --- Date ---
        raw_date = get_meta_content(soup, "date")
        parsed_date = parse_date(raw_date)
        if parsed_date is None:
            parsed_date = datetime.fromtimestamp(file_path.stat().st_mtime)

        date = parsed_date.isoformat(timespec="seconds")

        posts.append({
            "title": title,
            "category": category,
            "slug": slug,
            "date": date,
            "desc": desc,
            "thumb": thumb,
            "url": url
        })

# Sort by date descending
posts.sort(key=lambda x: parse_date(x["date"]) or datetime.min, reverse=True)

# Write JSON
with OUTPUT_FILE.open("w", encoding="utf-8") as f:
    json.dump(posts, f, indent=2, ensure_ascii=False)

print(f"Generated {len(posts)} posts in {OUTPUT_FILE}")