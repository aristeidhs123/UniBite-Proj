// ../js/feed.js
// Feed: shows all available listings, search, category filter, create request
// initFeed must be called by main.js

function initFeed() {
    console.log("initFeed called");
    seedDemoMeals();
    renderCategories();
    loadListings();

    const searchInput = document.getElementById("search");
    if (searchInput) {
        searchInput.addEventListener("input", filterListings);
    }

    const categoryBtns = document.querySelectorAll(".category-btn");
    if (categoryBtns && categoryBtns.length) {
        categoryBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                categoryBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                filterByCategory(btn.textContent.trim());
            });
        });
    }
}

function renderCategories() {
    const categoryBtns = document.querySelectorAll(".category-btn");
    if (!categoryBtns.length) return;
    categoryBtns.forEach((btn, index) => {
        if (index === 0) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
}

function loadListings() {
    const feed = document.getElementById("feed");
    if (!feed) return;
    feed.innerHTML = "";

    const meals = JSON.parse(localStorage.getItem("meals") || "[]");
    const available = meals.filter(m => (m.status || "available") !== "received");

    if (available.length === 0) {
        feed.innerHTML = "<p>No available meals right now. Upload one!</p>";
        return;
    }

    available.sort((a, b) => {
        const aKey = Number(a.ts || a.id || 0);
        const bKey = Number(b.ts || b.id || 0);
        return bKey - aKey;
    });

    available.forEach(meal => addListingToFeed(meal));
}

function addListingToFeed(meal) {
    const feed = document.getElementById("feed");
    if (!feed) return;

    const div = document.createElement("div");
    div.className = "listing";
    div.dataset.category = meal.category || "Uncategorized";
    div.dataset.id = meal.id;

    const displayCook = meal.user ? (String(meal.user).startsWith("@") ? meal.user : `@${meal.user}`) : "Unknown";

    div.innerHTML = `
        <div class="listing-row" style="display:flex;gap:12px;align-items:center;">
            <div class="listing-thumb" style="width:84px;height:84px;border-radius:8px;overflow:hidden;background:#eee;flex-shrink:0;">
                ${meal.image ? `<img src="${meal.image}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#999">No Image</div>`}
            </div>
            <div style="flex:1">
                <h3 style="margin:0 0 6px 0">${escapeHtml(meal.title)}</h3>
                <p style="margin:0 0 6px 0;color:#555">${escapeHtml(meal.desc)}</p>
                <small class="listing-category">Category: ${escapeHtml(meal.category || "n/a")}</small>
                <div style="margin-top:8px;display:flex;gap:8px;">
                    <button class="request-btn msg-btn">Send Request</button>
                    <button class="view-btn msg-btn">View</button>
                </div>
                <div style="margin-top:6px;font-size:13px;color:#666;"><strong>Cook:</strong> <span class="listing-cook">${escapeHtml(displayCook)}</span></div>
            </div>
        </div>
    `;

    const reqBtn = div.querySelector(".request-btn");
    const viewBtn = div.querySelector(".view-btn");

    if (reqBtn) {
        reqBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            createRequestForMeal(meal);
        });
    }

    if (viewBtn) {
        viewBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            openListingPage(meal.id);
        });
    }

    div.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        openListingPage(meal.id);
    });

    feed.appendChild(div);
}

function filterListings() {
    const query = (document.getElementById("search")?.value || "").toLowerCase();
    const listings = document.querySelectorAll("#feed .listing");

    listings.forEach(listing => {
        const title = (listing.querySelector("h3")?.textContent || "").toLowerCase();
        const desc = (listing.querySelector("p")?.textContent || "").toLowerCase();
        const cookText = (listing.querySelector(".listing-cook")?.textContent || "").toLowerCase();

        if (title.includes(query) || desc.includes(query) || cookText.includes(query)) {
            listing.style.display = "block";
        } else {
            listing.style.display = "none";
        }
    });
}

function filterByCategory(category) {
    const listings = document.querySelectorAll("#feed .listing");
    const cat = category.trim();
    listings.forEach(listing => {
        if (cat === "All" || listing.dataset.category === cat) {
            listing.style.display = "block";
        } else {
            listing.style.display = "none";
        }
    });
}


window.initFeed = initFeed;
