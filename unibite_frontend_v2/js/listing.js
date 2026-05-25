// ../js/listing.js
// Listing detail page logic. Reads the requested listing ID from the URL,
// renders meal details, and initializes a small map with the pickup location.

function getQueryParam(name) {

    const params =
        new URLSearchParams(window.location.search);

    return params.get(name);
}

function initListingPage() {

    const detail =
        document.getElementById("listing-detail");

    if (!detail) return;

    const listingId = getQueryParam("id");

    const meals =
        mealService.getAll();

    const meal = meals.find(m =>
        String(m.id) === String(listingId)
    );

    if (!meal || String(meal.status || "") === "deleted") {
        detail.innerHTML = "<p>Listing not found.</p>";
        return;
    }

    // 48-hour expiration check
    const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;
    const expired = (Date.now() - (meal.ts || 0)) > FORTY_EIGHT_HOURS;

    const isOwner =
        normalizeUser(meal.user) ===
        normalizeUser(window.CURRENT_USER);

    const quantity = Number(meal.quantity == null ? 1 : meal.quantity);
    const isUnavailable = expired || meal.status === "received" || quantity <= 0;
    const statusClass = isUnavailable ? "unavailable" : "available";
    let statusText;
    if (expired) {
        statusText = "Expired (48h limit reached)";
    } else if (meal.status === "received") {
        statusText = "Received";
    } else if (quantity <= 0) {
        statusText = "Out of Stock";
    } else {
        statusText = "Available";
    }

    detail.innerHTML = `

        <div class="meal-detail" style="max-width:600px;margin:0 auto;padding:20px;background:white;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

            <div class="detail-image" style="background:url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22%3E%3Crect fill=%22%23ddd%22 width=%22200%22 height=%22200%22/%3E%3C/svg%3E') center/cover; height:300px; border-radius:8px; margin-bottom:20px;">
                ${meal.image ? `<img src="${escapeHtml(meal.image)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">` : ''}
            </div>

            <h2 style="margin:15px 0 10px 0;font-size:28px;">${escapeHtml(meal.title)}</h2>
            <p style="color:#666;margin:5px 0 15px 0;font-size:15px;">${escapeHtml(meal.desc)}</p>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:15px;">
                <div style="background:#f5f5f5;padding:12px;border-radius:4px;">
                    <strong style="font-size:12px;color:#666;">CATEGORY</strong>
                    <p style="margin:6px 0 0 0;font-size:15px;">${escapeHtml(meal.category)}</p>
                </div>
                <div style="background:#f5f5f5;padding:12px;border-radius:4px;">
                    <strong style="font-size:12px;color:#666;">PORTIONS</strong>
                    <p style="margin:6px 0 0 0;font-size:15px;">${quantity}</p>
                </div>
                <div style="background:#f5f5f5;padding:12px;border-radius:4px;">
                    <strong style="font-size:12px;color:#666;">STATUS</strong>
                    <p style="margin:6px 0 0 0;font-size:15px;"><span class="status-label ${statusClass}">${statusText}</span></p>
                </div>
                <div style="background:#f5f5f5;padding:12px;border-radius:4px;">
                    <strong style="font-size:12px;color:#666;">COOK</strong>
                    <p style="margin:6px 0 0 0;font-size:15px;">${escapeHtml(meal.user)}</p>
                </div>
            </div>

            <div style="background:#f9f9f9;padding:15px;border-radius:4px;margin-bottom:15px;border-left:4px solid #349e54;">
                <p style="margin:5px 0;font-size:14px;"><strong>📍 Pickup Location:</strong> ${escapeHtml(meal.pickupLocation || "N/A")}</p>
                <p style="margin:5px 0;font-size:14px;"><strong>🕐 Pickup Time:</strong> ${escapeHtml(meal.pickupTime || "N/A")}</p>
            </div>

            ${meal.allergens && meal.allergens.length > 0 ? `
            <div style="background:#fff3cd;padding:15px;border-radius:4px;margin-bottom:15px;border-left:4px solid #ff9800;">
                <p style="margin:0;font-size:14px;"><strong>⚠️ Allergens:</strong> ${escapeHtml(meal.allergens.join(", "))}</p>
            </div>
            ` : ''}

            <div id="listing-map" style="height:280px;border-radius:8px;overflow:hidden;margin-bottom:15px;">
                <p style="margin:0;padding:20px;text-align:center;color:#666;">Loading map…</p>
            </div>

            ${
                !isOwner
                ?
                (meal.status !== "received" && quantity > 0)
                    ? `<button id="request-btn" class="approve-btn" style="width:100%;padding:12px;font-size:15px;font-weight:600;">Send Request</button>`
                    : `<p class="status-label" style="text-align:center;padding:15px;font-size:15px;">This meal is currently unavailable.</p>`
                :
                `<div style="background:#e8f5e9;padding:15px;border-radius:4px;text-align:center;border-left:4px solid #349e54;"><p style="margin:0;font-size:15px;font-weight:600;color:#1b5e20;">✓ This is your listing</p></div>`
            }

        </div>
    `;

    const requestBtn =
        document.getElementById("request-btn");

    if (requestBtn) {

        requestBtn.addEventListener("click", () => {

            createRequestForMeal(meal);
        });
    }

    const coords = getLocationCoordinates(meal.pickupLocation || "");
    initializeMap("listing-map", coords, meal.pickupLocation || "Pickup location");
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

function initializeMap(containerId, coords, label) {
    const container = document.getElementById(containerId);
    if (!container || typeof L === "undefined") return;

    container.innerHTML = "";

    const map = L.map(containerId, {
        center: coords,
        zoom: 16,
        scrollWheelZoom: false
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const marker = L.marker(coords).addTo(map);
    marker.bindPopup(`<strong>${escapeHtml(label)}</strong>`).openPopup();
}

window.initListingPage = initListingPage;

document.addEventListener(
    "DOMContentLoaded",
    initListingPage
);