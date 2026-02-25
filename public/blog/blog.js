const contentEl = document.getElementById("content");
const gridEl = document.getElementById("grid");
const sidebarLinks = Array.from(document.querySelectorAll(".sidebar a"));

let currentRouteToken = 0;

function setView(mode) {
    if (mode === "content") {
        contentEl.style.display = "block";
        gridEl.style.display = "none";
        return;
    }

    contentEl.style.display = "none";
    gridEl.style.display = "grid";
}

function normalizeRoute(hashValue) {
    const raw = (hashValue || "").replace(/^#/, "").trim();
    if (!raw) {
        return "";
    }

    return raw
        .split("/")
        .filter(Boolean)
        .map(part => decodeURIComponent(part))
        .join("/");
}

function updateActiveNav(route) {
    const category = route ? route.split("/")[0] : "";

    sidebarLinks.forEach(link => {
        const onclickAttr = link.getAttribute("onclick") || "";
        const match = onclickAttr.match(/go\(['\"]?([^'\")]+)?['\"]?\)/);
        const target = (match && match[1]) || "";
        link.classList.toggle("active", target === category || (!target && !category));
    });
}

function renderGrid(posts) {
    gridEl.innerHTML = "";

    if (!posts.length) {
        gridEl.innerHTML = "<p>No posts found in this category yet.</p>";
        return;
    }

    const fragment = document.createDocumentFragment();

    posts.forEach(post => {
        const card = document.createElement("div");
        card.className = "post-card";
        card.innerHTML = `
            <a class="card" href="#${encodeURIComponent(post.category)}/${encodeURIComponent(post.slug)}">
                <img src="${post.thumb}" alt="thumbnail">
                <h3>${post.title}</h3>
                <p>${post.desc}</p>
                <br>
                <p style="color:gray">${post.date}</p>
            </a>
        `;
        fragment.appendChild(card);
    });

    gridEl.appendChild(fragment);
}

function renderError(message) {
    setView("content");
    contentEl.innerHTML = `<p>${message}</p>`;
}

async function loadPosts(category = null, routeToken = 0) {
    setView("grid");

    try {
        const res = await fetch("/blog/posts.json");
        if (!res.ok) {
            throw new Error(`Failed to load posts (${res.status})`);
        }

        const posts = await res.json();
        if (!Array.isArray(posts)) {
            throw new Error("Invalid post index format");
        }

        const filtered = posts
            .filter(post => !category || post.category === category)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        if (routeToken !== currentRouteToken) {
            return;
        }

        renderGrid(filtered);
    } catch (error) {
        if (routeToken !== currentRouteToken) {
            return;
        }
        renderError(error.message || "Could not load posts.");
    }
}

async function loadArticle(category, slug, routeToken = 0) {
    try {
        const url = `/blog/posts/${encodeURIComponent(category)}/${encodeURIComponent(slug)}.html`;
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error("That article does not exist.");
        }

        const html = await res.text();

        if (routeToken !== currentRouteToken) {
            return;
        }

        setView("content");
        contentEl.innerHTML = html;
    } catch (error) {
        if (routeToken !== currentRouteToken) {
            return;
        }
        renderError(error.message || "Could not load article.");
    }
}

function router() {
    const route = normalizeRoute(location.hash);
    const routeToken = ++currentRouteToken;

    updateActiveNav(route);

    if (!route) {
        loadPosts(null, routeToken);
        return;
    }

    const parts = route.split("/");

    if (parts.length === 1) {
        loadPosts(parts[0], routeToken);
        return;
    }

    const [category, slug] = parts;
    if (!category || !slug) {
        loadPosts(null, routeToken);
        return;
    }

    loadArticle(category, slug, routeToken);
}

function go(path = "") {
    const cleanedPath = String(path || "").replace(/^#/, "");

    if (!cleanedPath) {
        if (location.hash) {
            history.replaceState(null, "", `${location.pathname}${location.search}`);
        }
        router();
        return;
    }

    if (location.hash === `#${cleanedPath}`) {
        router();
        return;
    }

    location.hash = cleanedPath;
}

window.addEventListener("hashchange", () => {
    if (location.hash === "#") {
        history.replaceState(null, "", `${location.pathname}${location.search}`);
    }
    router();
});

window.addEventListener("DOMContentLoaded", router);