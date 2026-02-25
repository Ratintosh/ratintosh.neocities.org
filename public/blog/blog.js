async function loadPosts(category = null) {
    document.getElementById("content").style.display = "none";
    document.getElementById("grid").style.display = "grid";

    const res = await fetch("/blog/posts.json");
    const posts = await res.json();

    const grid = document.getElementById("grid");
    grid.innerHTML = "";

    posts
        .filter(p => !category || p.category === category)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .forEach(post => {
            const card = document.createElement("div");
            card.className = "post-card";
            card.innerHTML = `
                <a class="card" href="#${post.category}/${post.slug}">
                    <img src="${post.thumb}" alt="thumbnail">
                    <h3>${post.title}</h3>
                    <p>${post.desc}</p>
                    <br>
                    <p style="color:gray">${post.date}</p>
                </a>
            `;
            grid.appendChild(card);
        });
}

async function loadArticle(category, slug) {
    const url = `/blog/posts/${category}/${slug}.html`;
    const res = await fetch(url);
    const html = await res.text();

    document.getElementById("content").style.display = "block";
    document.getElementById("grid").style.display = "none";
    document.getElementById("content").innerHTML = html;
}

function router() {
    const route = location.hash.slice(1);

    if (!route) {
        loadPosts();
        return;
    }

    const parts = route.split("/");

    if (parts.length === 1) {
        loadPosts(parts[0]);
        return;
    }

    const [category, slug] = parts;
    loadArticle(category, slug);
}

function go(path = "") {
    if (!path && (location.hash === "" || location.hash === "#")) {
        router();
    } else if (location.hash === "#" + path) {
    router();
  } else {
    location.hash = path;
  }
}

window.addEventListener("hashchange", () => {
        if (location.hash === "#") {
                history.replaceState(null, "", `${location.pathname}${location.search}`);
        }
        router();
});
window.addEventListener("load", router);