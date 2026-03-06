import re
import sys
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
POSTS_DIR = BASE_DIR / "../posts"
THUMB_DIR = BASE_DIR / "../thumbnails"


def slugify(text):
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"\s+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


def choose_category():
    categories = [p.name for p in POSTS_DIR.iterdir() if p.is_dir()]
    categories.sort()

    print("\nAvailable categories:")
    for i, cat in enumerate(categories):
        print(f"{i+1}. {cat}")

    choice = input("\nChoose category number or type a new one: ").strip()

    if choice.isdigit():
        index = int(choice) - 1
        if 0 <= index < len(categories):
            return categories[index]

    return slugify(choice)


def create_post(title, category):
    slug = slugify(title)
    date = datetime.now().isoformat(timespec="seconds")

    category_dir = POSTS_DIR / category
    category_dir.mkdir(parents=True, exist_ok=True)

    file_path = category_dir / f"{slug}.html"

    if file_path.exists():
        print("Post already exists:", file_path)
        return

    html_template = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">

<meta name="title" content="{title}">
<meta name="description" content="Short description here">
<meta name="date" content="{date}">
<meta name="thumbnail" content="/blog/thumbnails/{slug}.jpg">

<title>{title}</title>

<link rel="stylesheet" href="/blog/post.css">
</head>

<body>

<h1>{title}</h1>

<p>Write your post here.</p>

</body>
</html>
"""

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(html_template)

    # thumbnail placeholder
    THUMB_DIR.mkdir(exist_ok=True)
    thumb_path = THUMB_DIR / f"{slug}.jpg"

    if not thumb_path.exists():
        thumb_path.touch()

    print("\nCreated post:")
    print(file_path)
    print("Thumbnail placeholder:")
    print(thumb_path)


def main():
    if len(sys.argv) > 1:
        title = " ".join(sys.argv[1:])
    else:
        title = input("Post title: ").strip()

    category = choose_category()
    create_post(title, category)


if __name__ == "__main__":
    main()