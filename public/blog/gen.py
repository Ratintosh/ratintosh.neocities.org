import os
import json
from datetime import datetime
from bs4 import BeautifulSoup  # pip install beautifulsoup4

POSTS_DIR = "posts"  # adjust if needed
OUTPUT_FILE = "posts.json"

posts = []

for category in os.listdir(POSTS_DIR):
    cat_dir = os.path.join(POSTS_DIR, category)
    if not os.path.isdir(cat_dir):
        continue

    for filename in os.listdir(cat_dir):
        if not filename.endswith(".html"):
            continue

        filepath = os.path.join(cat_dir, filename)
        slug = filename.replace(".html", "")
        url = f"/blog/posts/{category}/{filename}"

        with open(filepath, "r", encoding="utf-8") as f:
            soup = BeautifulSoup(f, "html.parser")

        # --- Title ---
        title_meta = soup.find("meta", attrs={"name": "title"})
        if title_meta and title_meta.has_attr("content"):
            title = title_meta["content"].strip()
        else:
            title_tag = soup.find("title") or soup.find("h1")
            title = title_tag.text.strip() if title_tag else slug.replace("-", " ").title()

        # --- Description ---
        desc_meta = soup.find("meta", attrs={"name": "description"})
        if desc_meta and desc_meta.has_attr("content"):
            desc = desc_meta["content"].strip()
        else:
            p_tag = soup.find("p")
            desc = p_tag.text.strip() if p_tag else "No description available."

        # --- Thumbnail ---
        thumb_meta = soup.find("meta", attrs={"name": "thumbnail"})
        if thumb_meta and thumb_meta.has_attr("content"):
            thumb = thumb_meta["content"].strip()
            print(thumb)
        else:
            img_tag = soup.find("img")
            thumb = img_tag["src"] if img_tag and img_tag.has_attr("src") else "/img/blogs/default.jpg"
            print(thumb)

        # --- Date ---
        date_meta = soup.find("meta", attrs={"name": "date"})
        date = date_meta["content"].strip() if date_meta and date_meta.has_attr("content") else datetime.today().isoformat()

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
posts.sort(key=lambda x: x["date"], reverse=True)

# Write JSON
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(posts, f, indent=2, ensure_ascii=False)

print(f"Generated {len(posts)} posts in {OUTPUT_FILE}")