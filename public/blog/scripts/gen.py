import json
from datetime import datetime
from email.utils import format_datetime
from html.parser import HTMLParser
from pathlib import Path
import xml.etree.ElementTree as ET

BASE_DIR = Path(__file__).resolve().parent
POSTS_DIR = BASE_DIR / "../posts"
OUTPUT_FILE = BASE_DIR / "../posts.json"
RSS_FILE = BASE_DIR / "../rss.xml"

SITE_URL = "https://ratintosh.neocities.org"
BLOG_PATH = "/blog"
FEED_TITLE = "Ratintosh's Blog"
FEED_DESCRIPTION = "Articles, projects, and notes from Ratintosh."


class PostHtmlParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta = {}
        self.title = None
        self.h1 = None
        self.first_paragraph = None
        self.first_image = None
        self._capture_tag = None
        self._capture_buffer = []

    def handle_starttag(self, tag, attrs):
        tag_name = tag.lower()
        attrs_map = {k.lower(): v for k, v in attrs}

        if tag_name == "meta":
            name = (attrs_map.get("name") or "").strip().lower()
            content = (attrs_map.get("content") or "").strip()
            if name and content and name not in self.meta:
                self.meta[name] = content
            return

        if tag_name == "img" and self.first_image is None:
            src = (attrs_map.get("src") or "").strip()
            if src:
                self.first_image = src
            return

        if self._capture_tag is not None:
            return

        if tag_name == "title" and self.title is None:
            self._capture_tag = "title"
            self._capture_buffer = []
            return

        if tag_name == "h1" and self.h1 is None:
            self._capture_tag = "h1"
            self._capture_buffer = []
            return

        if tag_name == "p" and self.first_paragraph is None:
            self._capture_tag = "p"
            self._capture_buffer = []

    def handle_data(self, data):
        if self._capture_tag is not None:
            self._capture_buffer.append(data)

    def handle_endtag(self, tag):
        if self._capture_tag is None:
            return

        tag_name = tag.lower()
        if tag_name != self._capture_tag:
            return

        text = "".join(self._capture_buffer).strip()
        if text:
            if self._capture_tag == "title" and self.title is None:
                self.title = text
            elif self._capture_tag == "h1" and self.h1 is None:
                self.h1 = text
            elif self._capture_tag == "p" and self.first_paragraph is None:
                self.first_paragraph = text

        self._capture_tag = None
        self._capture_buffer = []


def get_meta_content(meta_map, name):
    content = meta_map.get(name.lower())
    if content:
        return content.strip()
    return None


def parse_date(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def to_absolute_url(path):
    if path.startswith("http://") or path.startswith("https://"):
        return path
    if not path.startswith("/"):
        path = f"/{path}"
    return f"{SITE_URL}{path}"


def to_rfc2822(value):
    parsed = parse_date(value)
    if parsed is None:
        return None

    # Treat naive datetimes as local time so feed readers get a valid timezone.
    if parsed.tzinfo is None:
        parsed = parsed.astimezone()

    return format_datetime(parsed)


def get_post_sort_key(post):
    parsed = parse_date(post["date"])
    if parsed is None:
        return 0.0

    # Ensure all values are comparable even when timezone metadata is missing.
    if parsed.tzinfo is None:
        parsed = parsed.astimezone()

    return parsed.timestamp()


def build_rss_feed(posts):
    ET.register_namespace("atom", "http://www.w3.org/2005/Atom")

    rss = ET.Element(
        "rss",
        {
            "version": "2.0",
        },
    )

    channel = ET.SubElement(rss, "channel")
    ET.SubElement(channel, "title").text = FEED_TITLE
    ET.SubElement(channel, "link").text = to_absolute_url(f"{BLOG_PATH}/")
    ET.SubElement(channel, "description").text = FEED_DESCRIPTION
    ET.SubElement(channel, "language").text = "en-us"
    ET.SubElement(channel, "lastBuildDate").text = format_datetime(datetime.now().astimezone())
    ET.SubElement(channel, "generator").text = "scripts/gen.py"
    ET.SubElement(
        channel,
        "{http://www.w3.org/2005/Atom}link",
        {
            "href": to_absolute_url(f"{BLOG_PATH}/rss.xml"),
            "rel": "self",
            "type": "application/rss+xml",
        },
    )

    for post in posts:
        item = ET.SubElement(channel, "item")
        post_link = to_absolute_url(post["url"])

        ET.SubElement(item, "title").text = post["title"]
        ET.SubElement(item, "link").text = post_link
        ET.SubElement(item, "guid", {"isPermaLink": "true"}).text = post_link
        ET.SubElement(item, "description").text = post["desc"]
        ET.SubElement(item, "category").text = post["category"]

        pub_date = to_rfc2822(post["date"])
        if pub_date:
            ET.SubElement(item, "pubDate").text = pub_date

    return ET.ElementTree(rss)

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

        html = file_path.read_text(encoding="utf-8")
        parser = PostHtmlParser()
        parser.feed(html)
        parser.close()

        # --- Title ---
        title_meta = get_meta_content(parser.meta, "title")
        if title_meta:
            title = title_meta
        else:
            title = parser.title or parser.h1 or slug.replace("-", " ").title()

        # --- Description ---
        desc_meta = get_meta_content(parser.meta, "description")
        if desc_meta:
            desc = desc_meta
        else:
            desc = parser.first_paragraph or "No description available."

        # --- Thumbnail ---
        thumb_meta = get_meta_content(parser.meta, "thumbnail")
        if thumb_meta:
            thumb = thumb_meta
        else:
            thumb = parser.first_image or "/img/blogs/default.jpg"

        # --- Date ---
        raw_date = get_meta_content(parser.meta, "date")
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
posts.sort(key=get_post_sort_key, reverse=True)

# Write JSON
with OUTPUT_FILE.open("w", encoding="utf-8") as f:
    json.dump(posts, f, indent=2, ensure_ascii=False)

# Write RSS
rss_tree = build_rss_feed(posts)
if hasattr(ET, "indent"):
    ET.indent(rss_tree, space="  ")
rss_tree.write(RSS_FILE, encoding="utf-8", xml_declaration=True)

print(f"Generated {len(posts)} posts in {OUTPUT_FILE} and {RSS_FILE}")