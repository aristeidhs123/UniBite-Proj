let feedMap = null;
let feedMarkers = [];
let currentLocation = [38.2466, 21.7345];
let selectedCategory = "All";
let selectedSort = "newest";
let selectedDistanceFilter = "";
let selectedAllergens = [];
let selectedIngredients = [];
let mapEnabled = true;
let feedMeals = [];

function initFeed() {
    renderCategories();
    initMap();
    setupFeedEvents();
    loadListings();
}

function setupFeedEvents() {
    const searchInput = document.getElementById("search");
    if (searchInput) searchInput.addEventListener("input", loadListings);

    const locateBtn = document.getElementById("locate-btn");
    if (locateBtn) locateBtn.addEventListener("click", useCurrentLocation);

    const enableMapBtn = document.getElementById("enable-map-btn");
    const disableMapBtn = document.getElementById("disable-map-btn");

    if (enableMapBtn) {
        enableMapBtn.addEventListener("click", () => {
            mapEnabled = true;
            updateMapToggleState();
            updateMapMarkers(feedMeals);
        });
    }

    if (disableMapBtn) {
        disableMapBtn.addEventListener("click", () => {
            mapEnabled = false;
            updateMapToggleState();
            updateMapMarkers([]);
        });
    }

    const sortSelect = document.getElementById("sort-select");
    if (sortSelect) {
        sortSelect.addEventListener("change", () => {
            selectedSort = sortSelect.value;
            renderFeed();
        });
    }

    const distanceFilter = document.getElementById("distance-filter");
    if (distanceFilter) {
        distanceFilter.addEventListener("change", () => {
            selectedDistanceFilter = distanceFilter.value;
            renderFeed();
        });
    }

    document.querySelectorAll(".category-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".category-btn").forEach(item => item.classList.remove("active"));
            btn.classList.add("active");
            selectedCategory = btn.textContent.trim();
            renderFeed();
        });
    });

    setupDropdown("allergen-filter-btn", "allergen-filter-dropdown");
    setupDropdown("ingredient-filter-btn", "ingredient-filter-dropdown");
    updateMapToggleState();
}

function setupDropdown(buttonId, dropdownId) {
    const btn = document.getElementById(buttonId);
    const dropdown = document.getElementById(dropdownId);
    if (!btn || !dropdown) return;

    btn.addEventListener("click", () => {
        const expanded = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!expanded));
        dropdown.classList.toggle("hidden", expanded);
        dropdown.setAttribute("aria-hidden", String(expanded));
    });

    document.addEventListener("click", (event) => {
        if (!btn.contains(event.target) && !dropdown.contains(event.target)) {
            btn.setAttribute("aria-expanded", "false");
            dropdown.classList.add("hidden");
            dropdown.setAttribute("aria-hidden", "true");
        }
    });
}

function renderCategories() {
    document.querySelectorAll(".category-btn").forEach((btn, index) => {
        btn.classList.toggle("active", index === 0);
    });
}

async function loadListings() {
    const feed = document.getElementById("feed");
    if (!feed) return;

    feed.innerHTML = "<p>Loading meals...</p>";

    try {
        feedMeals = await mealService.getAllRemote();
    } catch (error) {
        feed.innerHTML = `<p>Could not load meals from backend: ${escapeHtml(error.message || "Server error")}</p>`;
        updateMapMarkers([]);
        return;
    }

    renderAllergenOptions();
    renderIngredientOptions();
    renderFeed();
}

function renderFeed() {
    const feed = document.getElementById("feed");
    if (!feed) return;

    const query = (document.getElementById("search")?.value || "").trim().toLowerCase();
    let visibleMeals = feedMeals.filter(meal => String(meal.status || "") !== "deleted");

    if (selectedCategory !== "All") {
        visibleMeals = visibleMeals.filter(meal => String(meal.category || "").toLowerCase() === selectedCategory.toLowerCase());
    }

    if (query) {
        visibleMeals = visibleMeals.filter(meal => {
            const text = [meal.title, meal.desc, meal.user, meal.pickupLocation].join(" ").toLowerCase();
            return text.includes(query);
        });
    }

    if (selectedAllergens.length) {
        visibleMeals = visibleMeals.filter(meal => {
            const mealAllergens = (meal.allergens || []).map(item => String(item).toLowerCase());
            return selectedAllergens.some(item => mealAllergens.includes(String(item).toLowerCase()));
        });
    }

    if (selectedIngredients.length) {
        visibleMeals = visibleMeals.filter(meal => {
            const text = [meal.title, meal.desc].join(" ").toLowerCase();
            return selectedIngredients.some(item => text.includes(String(item).toLowerCase()));
        });
    }

    visibleMeals = visibleMeals.map(meal => {
        const coords = meal.coords || getLocationCoordinates(meal.pickupLocation || "");
        return { ...meal, coords, distance: getDistanceKm(currentLocation, coords) };
    });

    if (selectedDistanceFilter) {
        visibleMeals = visibleMeals.filter(meal => meal.distance <= Number(selectedDistanceFilter));
    }

    visibleMeals = sortMealsForFeed(visibleMeals);

    feed.innerHTML = "";

    if (!visibleMeals.length) {
        feed.innerHTML = "<p>No listings found. Try a different filter.</p>";
    } else {
        visibleMeals.forEach(addListingToFeed);
    }

    updateMapMarkers(visibleMeals);
    updateLocationLabel();
}

function sortMealsForFeed(meals) {
    return [...meals].sort((a, b) => {
        const aSoldOut = Number(a.quantity || 0) <= 0 || a.status === "inactive";
        const bSoldOut = Number(b.quantity || 0) <= 0 || b.status === "inactive";

        if (aSoldOut && !bSoldOut) return 1;
        if (!aSoldOut && bSoldOut) return -1;

        if (selectedSort === "distance") {
            return Number(a.distance || 0) - Number(b.distance || 0);
        }

        return Number(b.ts || 0) - Number(a.ts || 0);
    });
}

function addListingToFeed(meal) {
    const feed = document.getElementById("feed");
    const quantity = Number(meal.quantity == null ? 1 : meal.quantity);
    const expired = isExpired(meal);
    const isUnavailable = expired || quantity <= 0 || meal.status === "received";
    const div = document.createElement("div");

    div.className = "listing" + (isUnavailable ? " unavailable-listing" : "");
    div.dataset.id = meal.id;

    const cook = meal.user ? String(meal.user) : "Unknown";
    const statusText = expired ? "Expired" : (quantity <= 0 ? "Out of stock" : (meal.status || "available"));

    div.innerHTML = `
        <div class="listing-row" style="display:flex;gap:12px;align-items:center;">
            <div class="listing-thumb" style="width:140px;height:140px;border-radius:12px;overflow:hidden;background:#eee;flex-shrink:0;">
                ${meal.image ? `<img src="${escapeHtml(meal.image)}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#999">No Image</div>`}
            </div>
            <div style="flex:1">
                <h3 style="margin:0 0 6px 0">${escapeHtml(meal.title)}</h3>
                <p style="margin:0 0 6px 0;color:#555">${escapeHtml(meal.desc)}</p>
                <small class="listing-category">Category: ${escapeHtml(meal.category || "n/a")}</small>
                <div style="margin-top:6px;font-size:13px;color:#666;">
                    Portions: ${quantity} &middot; Pickup: ${escapeHtml(meal.pickupLocation || "n/a")} at ${escapeHtml(meal.pickupTime || "n/a")}
                </div>
                <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                    <button class="request-btn msg-btn" ${isUnavailable ? "disabled" : ""}>${isUnavailable ? statusText : "Send Request"}</button>
                    <button class="view-btn msg-btn">View</button>
                    <span style="font-size:13px;color:#444;margin-left:auto;">${escapeHtml(statusText)}</span>
                </div>
                <div style="margin-top:6px;font-size:13px;color:#666;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                    <span><strong>Cook:</strong> ${escapeHtml(cook)}</span>
                    <span>${typeof meal.distance === "number" ? meal.distance.toFixed(1) + " km away" : ""}</span>
                </div>
                ${Array.isArray(meal.allergens) && meal.allergens.length ? `<div style="margin-top:6px;font-size:12px;color:#aa0000;"><strong>Allergens:</strong> ${escapeHtml(meal.allergens.join(", "))}</div>` : ""}
            </div>
        </div>
    `;

    const requestBtn = div.querySelector(".request-btn");
    const viewBtn = div.querySelector(".view-btn");

    if (requestBtn && !isUnavailable) {
        requestBtn.addEventListener("click", event => {
            event.stopPropagation();
            createRequestForMeal(meal);
        });
    }

    if (viewBtn) {
        viewBtn.addEventListener("click", event => {
            event.stopPropagation();
            openListingPage(meal.id);
        });
    }

    div.addEventListener("click", event => {
        if (event.target.closest("button")) return;
        openListingPage(meal.id);
    });

    feed.appendChild(div);
}

async function createRequestForMeal(meal) {
    if (!requireLogin()) return;

    const consumerId = window.UniBiteAPI?.getCurrentUserId ? window.UniBiteAPI.getCurrentUserId() : 1;

    try {
        await window.UniBiteAPI.RequestsAPI.create({
            listing_id: Number(meal.id),
            consumer_id: consumerId
        });

        showToast("Request sent to the cook.", "success");
    } catch (error) {
        showToast(error.message || "Could not send request.", "error");
    }
}

function isExpired(meal) {
    if (meal.expiresAt) return new Date(meal.expiresAt).getTime() <= Date.now();
    return Date.now() - Number(meal.ts || 0) > 48 * 60 * 60 * 1000;
}

function filterByCategory(category) {
    selectedCategory = category.trim();
    renderFeed();
}

function openListingPage(id) {
    window.location.href = "listing.html?id=" + encodeURIComponent(id);
}

function getLocationCoordinates(location) {
    // για πραγματικο χαρτη
    // Αυτο το hardcoded mapping θα γινοταν fallback μονο αν το backend
    // δεν εστελνε pickup_lat/pickup_lng για την αγγελια.
    const map = {
        "Dorm 12": [38.2465, 21.7340],
        "Main Campus": [38.2468, 21.7375],
        "Canteen": [38.2468, 21.7375],
        "East Dorm": [38.2485, 21.7380],
        "Library": [38.2478, 21.7350],
        "Εστία Α": [38.2465, 21.7340],
        "Εστία Β": [38.2485, 21.7380],
        "Πανεπιστήμιο": [38.2468, 21.7375]
    };

    const text = String(location || "").toLowerCase();
    for (const key in map) {
        if (text.includes(key.toLowerCase())) return map[key];
    }

    return [38.2466, 21.7345];
}

function getDistanceKm(a, b) {
    const R = 6371;
    const dLat = toRad(b[0] - a[0]);
    const dLon = toRad(b[1] - a[1]);
    const lat1 = toRad(a[0]);
    const lat2 = toRad(b[0]);
    const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function toRad(value) {
    return value * Math.PI / 180;
}

function initMap() {
    const mapEl = document.getElementById("feed-map");
    if (!mapEl || typeof L === "undefined") return;

    feedMap = L.map(mapEl).setView(currentLocation, 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap"
    }).addTo(feedMap);
}

function updateMapMarkers(meals) {
    if (!feedMap || typeof L === "undefined") return;

    feedMarkers.forEach(marker => marker.remove());
    feedMarkers = [];

    if (!mapEnabled) return;

    meals.forEach(meal => {
        const coords = meal.coords || getLocationCoordinates(meal.pickupLocation || "");
        const marker = L.marker(coords).addTo(feedMap);
        marker.bindPopup(`<strong>${escapeHtml(meal.title)}</strong><br>${escapeHtml(meal.pickupLocation || "")}`);
        feedMarkers.push(marker);
    });
}

function updateLocationLabel() {
    const label = document.getElementById("location-label");
    if (label) label.textContent = "Campus center";
}

function updateMapToggleState() {
    const enableMapBtn = document.getElementById("enable-map-btn");
    const disableMapBtn = document.getElementById("disable-map-btn");
    if (enableMapBtn) enableMapBtn.classList.toggle("active", mapEnabled);
    if (disableMapBtn) disableMapBtn.classList.toggle("active", !mapEnabled);
    const mapEl = document.getElementById("feed-map");
    if (mapEl) mapEl.classList.toggle("map-disabled", !mapEnabled);
}

function useCurrentLocation() {
    if (!navigator.geolocation) {
        showToast("Geolocation is not available.", "warning");
        return;
    }

    navigator.geolocation.getCurrentPosition(position => {
        currentLocation = [position.coords.latitude, position.coords.longitude];
        if (feedMap) feedMap.setView(currentLocation, 14);
        renderFeed();
    }, () => {
        showToast("Could not get your location.", "warning");
    });
}

function getAllAllergens() {
    const set = new Set();
    feedMeals.forEach(meal => (meal.allergens || []).forEach(item => item && set.add(String(item))));
    return Array.from(set).sort();
}

function renderAllergenOptions() {
    const dropdown = document.getElementById("allergen-filter-dropdown");
    const btn = document.getElementById("allergen-filter-btn");
    if (!dropdown || !btn) return;

    const allergens = getAllAllergens();
    dropdown.innerHTML = allergens.length ? allergens.map(item => `<div class="filter-item" data-value="${escapeHtml(item)}">${escapeHtml(item)}</div>`).join("") : `<div class="filter-item muted">No allergens found</div>`;

    dropdown.querySelectorAll(".filter-item[data-value]").forEach(item => {
        item.addEventListener("click", () => {
            const value = item.dataset.value;
            const index = selectedAllergens.findIndex(a => a.toLowerCase() === value.toLowerCase());
            if (index >= 0) selectedAllergens.splice(index, 1);
            else selectedAllergens.push(value);
            btn.textContent = selectedAllergens.length ? selectedAllergens.length + " allergens ▾" : "All Allergens ▾";
            renderFeed();
        });
    });
}

function renderIngredientOptions() {
    const dropdown = document.getElementById("ingredient-filter-dropdown");
    const btn = document.getElementById("ingredient-filter-btn");
    if (!dropdown || !btn) return;

    const ingredients = ["pasta", "rice", "salad", "chicken", "dessert", "soup", "vegan"];
    dropdown.innerHTML = ingredients.map(item => `<div class="filter-item" data-value="${escapeHtml(item)}">${escapeHtml(item)}</div>`).join("");

    dropdown.querySelectorAll(".filter-item").forEach(item => {
        item.addEventListener("click", () => {
            const value = item.dataset.value;
            const index = selectedIngredients.indexOf(value);
            if (index >= 0) selectedIngredients.splice(index, 1);
            else selectedIngredients.push(value);
            btn.textContent = selectedIngredients.length ? selectedIngredients.length + " selected ▾" : "All Ingredients / Cuisines ▾";
            renderFeed();
        });
    });
}

window.initFeed = initFeed;
window.loadListings = loadListings;
