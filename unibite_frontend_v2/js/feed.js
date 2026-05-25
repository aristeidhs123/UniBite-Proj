// ../js/feed.js
// This file controls the UniBite feed page.
// It loads meal listings from localStorage, applies filters and search,
// updates the interactive Leaflet map, and handles request or view actions.
// The main page logic lives in initFeed and loadListings.

let feedMap = null;
let feedMarkers = [];
let currentLocation = [38.2466, 21.7345];
let locationLabel = "Campus center";
let selectedCategory = "All";
let selectedSort = "newest";
let selectedDistanceFilter = "";
let selectedAllergens = [];
let selectedIngredients = [];
let mapEnabled = true;

// 48-hour expiration check
function isExpired(meal) {
    const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000; // milliseconds
    const createdTime = meal.ts || 0;
    const currentTime = Date.now();
    return (currentTime - createdTime) > FORTY_EIGHT_HOURS;
}

function initFeed() {
    console.log("initFeed called");
    seedDemoMeals();
    renderCategories();
    initMap();
    loadListings();

    const searchInput = document.getElementById("search");
    if (searchInput) {
        searchInput.addEventListener("input", loadListings);
    }

    const locateBtn = document.getElementById("locate-btn");
    if (locateBtn) {
        locateBtn.addEventListener("click", () => {
            useCurrentLocation();
        });
    }

    const enableMapBtn = document.getElementById("enable-map-btn");
    const disableMapBtn = document.getElementById("disable-map-btn");
    if (enableMapBtn) {
        enableMapBtn.addEventListener("click", () => {
            mapEnabled = true;
            updateMapToggleState();
        });
    }
    if (disableMapBtn) {
        disableMapBtn.addEventListener("click", () => {
            mapEnabled = false;
            updateMapToggleState();
        });
    }

    const sortSelect = document.getElementById("sort-select");
    if (sortSelect) {
        sortSelect.addEventListener("change", () => {
            selectedSort = sortSelect.value;
            loadListings();
        });
    }

    const distanceFilter = document.getElementById("distance-filter");
    if (distanceFilter) {
        distanceFilter.addEventListener("change", () => {
            selectedDistanceFilter = distanceFilter.value;
            loadListings();
        });
    }

    // Render allergen dropdown and hook selection handlers
    const allergenDropdown = document.getElementById("allergen-filter-dropdown");
    const allergenBtn = document.getElementById("allergen-filter-btn");
    if (allergenDropdown && allergenBtn) {
        renderAllergenOptions();
        allergenBtn.addEventListener("click", (e) => {
            const expanded = allergenBtn.getAttribute("aria-expanded") === "true";
            allergenBtn.setAttribute("aria-expanded", String(!expanded));
            allergenDropdown.classList.toggle("hidden", expanded);
            allergenDropdown.setAttribute("aria-hidden", String(expanded));
        });
        // close when clicking outside
        document.addEventListener("click", (e) => {
            if (!allergenBtn.contains(e.target) && !allergenDropdown.contains(e.target)) {
                allergenBtn.setAttribute("aria-expanded", "false");
                allergenDropdown.classList.add("hidden");
                allergenDropdown.setAttribute("aria-hidden", "true");
            }
        });
    }

    // Render ingredient dropdown and hook handlers
    const ingredientDropdown = document.getElementById("ingredient-filter-dropdown");
    const ingredientBtn = document.getElementById("ingredient-filter-btn");
    if (ingredientDropdown && ingredientBtn) {
        renderIngredientOptions();
        ingredientBtn.addEventListener("click", (e) => {
            const expanded = ingredientBtn.getAttribute("aria-expanded") === "true";
            ingredientBtn.setAttribute("aria-expanded", String(!expanded));
            ingredientDropdown.classList.toggle("hidden", expanded);
            ingredientDropdown.setAttribute("aria-hidden", String(expanded));
        });
        document.addEventListener("click", (e) => {
            if (!ingredientBtn.contains(e.target) && !ingredientDropdown.contains(e.target)) {
                ingredientBtn.setAttribute("aria-expanded", "false");
                ingredientDropdown.classList.add("hidden");
                ingredientDropdown.setAttribute("aria-hidden", "true");
            }
        });
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

    updateMapToggleState();
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

// Load the feed UI by reading stored meals and applying the current filters.
// This function refreshes the visible list, updates map markers, and handles
// sorting by newest or distance.
function loadListings() {
    const feed = document.getElementById("feed");
    if (!feed) return;
    feed.innerHTML = "";

    const meals = mealService.getAll();
    const query = (document.getElementById("search")?.value || "").trim().toLowerCase();

    // Exclude expired and deleted listings from the visible feed
    let visibleMeals = meals.filter(meal => !isExpired(meal) && String(meal.status || "") !== "deleted");

    if (selectedCategory !== "All") {
        visibleMeals = visibleMeals.filter(meal => String(meal.category || "").toLowerCase() === selectedCategory.toLowerCase());
    }

    if (query) {
        visibleMeals = visibleMeals.filter(meal => {
            const title = String(meal.title || "").toLowerCase();
            const desc = String(meal.desc || "").toLowerCase();
            const cook = String(meal.user || "").toLowerCase();
            const location = String(meal.pickupLocation || "").toLowerCase();
            return title.includes(query) || desc.includes(query) || cook.includes(query) || location.includes(query);
        });
    }

    if (selectedAllergens && selectedAllergens.length) {
        visibleMeals = visibleMeals.filter(meal => Array.isArray(meal.allergens) && selectedAllergens.some(sel => meal.allergens.some(a => String(a).toLowerCase() === String(sel).toLowerCase())));
    }

    if (selectedIngredients && selectedIngredients.length) {
        visibleMeals = visibleMeals.filter(meal => {
            const title = String(meal.title || "").toLowerCase();
            const desc = String(meal.desc || "").toLowerCase();
            return selectedIngredients.some(sel => title.includes(String(sel).toLowerCase()) || desc.includes(String(sel).toLowerCase()));
        });
    }

    const mealsWithDistance = visibleMeals.map(meal => {
        const coords = getLocationCoordinates(meal.pickupLocation || "");
        const distance = getDistanceKm(currentLocation, coords);
        return { ...meal, coords, distance };
    });

    let sortedMeals = mealsWithDistance.slice();

    if (selectedSort === "distance") {
        sortedMeals.sort((a, b) => a.distance - b.distance);
    } else {
        sortedMeals.sort((a, b) => {
            const aQty = Number(a.quantity == null ? 1 : a.quantity);
            const bQty = Number(b.quantity == null ? 1 : b.quantity);
            const aUnavailable = a.status === "received" || aQty <= 0;
            const bUnavailable = b.status === "received" || bQty <= 0;
            if (aUnavailable !== bUnavailable) {
                return aUnavailable ? 1 : -1;
            }
            return Number(b.ts || b.id || 0) - Number(a.ts || a.id || 0);
        });
    }

    if (selectedDistanceFilter) {
        const maxDistance = Number(selectedDistanceFilter);
        sortedMeals = sortedMeals.filter(meal => meal.distance <= maxDistance);
    }

    if (sortedMeals.length === 0) {
        feed.innerHTML = "<p>No listings found. Try a different filter.</p>";
    } else {
        sortedMeals.forEach(meal => addListingToFeed(meal));
    }

    updateMapMarkers(sortedMeals);
    updateLocationLabel();
}

// Create a single listing card in the feed. This handles the listing layout,
// button behavior, and disabled state when the meal is expired or already taken.
function addListingToFeed(meal) {
    const feed = document.getElementById("feed");
    if (!feed) return;

    const quantity = Number(meal.quantity == null ? 1 : meal.quantity);
    const expired = isExpired(meal);
    const isUnavailable = expired || meal.status === "received" || quantity <= 0;
    const div = document.createElement("div");
    div.className = "listing" + (isUnavailable ? " unavailable-listing" : "");
    div.dataset.category = meal.category || "Uncategorized";
    div.dataset.id = meal.id;

    const displayCook = meal.user ? (String(meal.user).startsWith("@") ? meal.user : `@${meal.user}`) : "Unknown";

    div.innerHTML = `
        <div class="listing-row" style="display:flex;gap:12px;align-items:center;">
            <div class="listing-thumb" style="width:140px;height:140px;border-radius:12px;overflow:hidden;background:#eee;flex-shrink:0;">
                ${meal.image ? `<img src="${meal.image}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#999">No Image</div>`}
            </div>
            <div style="flex:1">
                <h3 style="margin:0 0 6px 0">${escapeHtml(meal.title)}</h3>
                <p style="margin:0 0 6px 0;color:#555">${escapeHtml(meal.desc)}</p>
                <small class="listing-category">Category: ${escapeHtml(meal.category || "n/a")}</small>
                <div style="margin-top:6px;font-size:13px;color:#666;">
                    Portions: ${Number(meal.quantity == null ? 1 : meal.quantity)} &middot; Pickup: ${escapeHtml(meal.pickupLocation || "n/a")} at ${escapeHtml(meal.pickupTime || "n/a")}
                </div>
                <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                    <button class="request-btn msg-btn">Send Request</button>
                    <button class="view-btn msg-btn">View</button>
                    <span style="font-size:13px;color:#444;margin-left:auto;">
                        ${expired ? "🕐 Expired" : (meal.status === "received" || Number(meal.quantity == null ? 1 : meal.quantity) <= 0 ? "Out of stock" : escapeHtml(meal.status || "available"))}
                    </span>
                </div>
                <div style="margin-top:6px;font-size:13px;color:#666;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
                    <span><strong>Cook:</strong> <span class="listing-cook">${escapeHtml(displayCook)}</span></span>
                    <span class="listing-distance" style="font-size:13px;color:#444;">${typeof meal.distance === 'number' ? `${meal.distance.toFixed(1)} km away` : ''}</span>
                </div>
                ${Array.isArray(meal.allergens) && meal.allergens.length ? `<div style="margin-top:6px;font-size:12px;color:#aa0000;"><strong>Allergens:</strong> ${escapeHtml(meal.allergens.join(", "))}</div>` : ""}
            </div>
        </div>
    `;

    const reqBtn = div.querySelector(".request-btn");
    const viewBtn = div.querySelector(".view-btn");

    if (reqBtn) {
        if (isUnavailable) {
            reqBtn.disabled = true;
            reqBtn.textContent = expired ? "Expired" : "Unavailable";
            reqBtn.style.opacity = "0.6";
            reqBtn.style.cursor = "not-allowed";
        } else {
            reqBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                createRequestForMeal(meal);
            });
        }
    }

    const distanceLabel = div.querySelector(".listing-distance");
    if (distanceLabel && typeof meal.distance === "number") {
        distanceLabel.textContent = `${meal.distance.toFixed(1)} km away`;
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
    loadListings();
}

function filterByCategory(category) {
    selectedCategory = category.trim();
    loadListings();
}

function getLocationCoordinates(location) {
    const map = {
        "Dorm 12, Hall A": [38.2465, 21.7340],
        "Main Campus Canteen": [38.2468, 21.7375],
        "East Dorm Kitchen": [38.2485, 21.7380],
        "Campus Library Lounge": [38.2478, 21.7350],
        "Library Lounge": [38.2478, 21.7350],
        "Dorm 12": [38.2465, 21.7340],
        "Main Campus": [38.2468, 21.7375],
        "Campus Library": [38.2478, 21.7350],
        "Canteen": [38.2468, 21.7375]
    };

    for (const key in map) {
        if (location.toLowerCase().includes(key.toLowerCase())) {
            return map[key];
        }
    }

    return [38.2466, 21.7345];
}

function getAllAllergens() {
    const meals = mealService.getAll();
    const allergens = new Set();
    meals.forEach(meal => {
        if (Array.isArray(meal.allergens)) {
            meal.allergens.forEach(a => {
                const value = String(a || "").trim();
                if (value) allergens.add(value);
            });
        }
    });
    return Array.from(allergens).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function renderAllergenOptions() {
    const dropdown = document.getElementById("allergen-filter-dropdown");
    const btn = document.getElementById("allergen-filter-btn");
    if (!dropdown || !btn) return;

    const allergens = getAllAllergens();
    dropdown.innerHTML = allergens.map(a => `<div class="filter-item" data-value="${escapeHtml(a)}">${escapeHtml(a)}</div>`).join("");

    // attach handlers
    dropdown.querySelectorAll(".filter-item").forEach(item => {
        item.addEventListener("click", (e) => {
            const val = item.getAttribute("data-value");
            const idx = selectedAllergens.findIndex(s => String(s).toLowerCase() === String(val).toLowerCase());
            if (idx >= 0) {
                selectedAllergens.splice(idx, 1);
                item.classList.remove("selected");
            } else {
                selectedAllergens.push(val);
                item.classList.add("selected");
            }
            updateFilterButtonLabel(btn, selectedAllergens, "All Allergens");
            loadListings();
        });
    });
}

function getAllIngredients() {
    const meals = mealService.getAll();
    const words = new Set();
    const stopwords = new Set(["with","and","from","the","for","in","on","of","at","a","an","to","your","home","fresh","sweet","classic","rich", "meal", "dish", "plate"]);

    meals.forEach(meal => {
        const text = `${meal.title || ""} ${meal.desc || ""}`.toLowerCase();
        text.split(/[^a-zA-Zα-ωΑ-Ω0-9]+/).forEach(part => {
            const word = part.trim();
            if (word && word.length >= 3 && !stopwords.has(word) && !/^[0-9]+$/.test(word)) {
                words.add(word);
            }
        });
    });

    return Array.from(words).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function renderIngredientOptions() {
    const dropdown = document.getElementById("ingredient-filter-dropdown");
    const btn = document.getElementById("ingredient-filter-btn");
    if (!dropdown || !btn) return;

    const ingredients = getAllIngredients();
    dropdown.innerHTML = ingredients.map(i => `<div class="filter-item" data-value="${escapeHtml(i)}">${escapeHtml(i)}</div>`).join("");

    dropdown.querySelectorAll(".filter-item").forEach(item => {
        item.addEventListener("click", () => {
            const val = item.getAttribute("data-value");
            const idx = selectedIngredients.findIndex(s => String(s).toLowerCase() === String(val).toLowerCase());
            if (idx >= 0) {
                selectedIngredients.splice(idx, 1);
                item.classList.remove("selected");
            } else {
                selectedIngredients.push(val);
                item.classList.add("selected");
            }
            updateFilterButtonLabel(btn, selectedIngredients, "All Ingredients / Cuisines");
            loadListings();
        });
    });
}

function getDistanceKm(fromCoords, toCoords) {
    const [lat1, lon1] = fromCoords;
    const [lat2, lon2] = toCoords;
    const toRad = value => (value * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
}

// Small helper to update button labels when selections change
function updateFilterButtonLabel(btn, items, defaultLabel) {
    if (!btn) return;
    if (!items || items.length === 0) {
        btn.textContent = defaultLabel + " ▾";
    } else if (items.length === 1) {
        btn.textContent = items[0] + " ▾";
    } else {
        btn.textContent = `${items.length} selected ▾`;
    }
}

function initMap() {
    const feedMapContainer = document.getElementById("feed-map");
    if (!feedMapContainer || typeof L === "undefined") return;

    feedMap = L.map("feed-map", {
        center: currentLocation,
        zoom: 15,
        scrollWheelZoom: true
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(feedMap);
}

function updateLocationLabel() {
    const label = document.getElementById("location-label");
    if (!label) return;
    label.textContent = selectedSort === "distance" ? `Sorted from ${locationLabel}` : locationLabel;
}

function updateMapToggleState() {
    const enableMapBtn = document.getElementById("enable-map-btn");
    const disableMapBtn = document.getElementById("disable-map-btn");
    const feedMapContainer = document.getElementById("feed-map");
    if (!feedMapContainer) return;

    if (enableMapBtn && disableMapBtn) {
        if (mapEnabled) {
            enableMapBtn.classList.add("active");
            disableMapBtn.classList.remove("active");
        } else {
            enableMapBtn.classList.remove("active");
            disableMapBtn.classList.add("active");
        }
    }

    if (mapEnabled) {
        feedMapContainer.classList.remove("map-disabled");
        if (feedMap) {
            feedMap.dragging.enable();
            feedMap.scrollWheelZoom.enable();
            feedMap.doubleClickZoom.enable();
            if (feedMap.keyboard) feedMap.keyboard.enable();
        }
    } else {
        feedMapContainer.classList.add("map-disabled");
        if (feedMap) {
            feedMap.dragging.disable();
            feedMap.scrollWheelZoom.disable();
            feedMap.doubleClickZoom.disable();
            if (feedMap.keyboard) feedMap.keyboard.disable();
        }
    }
}

function useCurrentLocation() {
    if (!navigator.geolocation) {
        showToast("Geolocation is not available in your browser.", "warning");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            currentLocation = [position.coords.latitude, position.coords.longitude];
            locationLabel = "Your location";
            selectedSort = "distance";
            const sortSelect = document.getElementById("sort-select");
            if (sortSelect) sortSelect.value = "distance";
            loadListings();
        },
        () => {
            showToast("Unable to retrieve your location.", "warning");
        }
    );
}

function updateMapMarkers(meals) {
    if (!feedMap) return;

    feedMarkers.forEach(marker => {
        feedMap.removeLayer(marker);
    });
    feedMarkers = [];

    meals.forEach(meal => {
        const coords = meal.coords || getLocationCoordinates(meal.pickupLocation || "");
        const isUnavailable = meal.status === "received" || Number(meal.quantity == null ? 1 : meal.quantity) <= 0;
        const marker = L.marker(coords, { opacity: isUnavailable ? 0.6 : 1 });
        marker.addTo(feedMap);
        marker.bindPopup(`<strong>${escapeHtml(meal.title)}</strong><br>${escapeHtml(meal.pickupLocation || "n/a")}<br>Portions: ${Number(meal.quantity == null ? 1 : meal.quantity)}<br>${isUnavailable ? 'Unavailable' : 'Available'}${typeof meal.distance === 'number' ? '<br>' + meal.distance.toFixed(1) + ' km away' : ''}`);
        marker.on("click", () => openListingPage(meal.id));
        feedMarkers.push(marker);
    });

    if (meals.length > 0) {
        const bounds = L.latLngBounds(meals.map(meal => meal.coords || getLocationCoordinates(meal.pickupLocation || "")));
        feedMap.fitBounds(bounds.pad(0.2));
    } else {
        feedMap.setView(currentLocation, 15);
    }
}

window.initFeed = initFeed;