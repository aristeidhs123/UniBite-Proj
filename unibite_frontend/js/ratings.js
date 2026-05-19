// ratings.js - Rating system for delivered meals
// This file collects meal ratings, stores them, grants points to cooks,
// and applies penalties when consumers do not rate in time.

let ratingSelectedStars = 0;

function getRatings() {
    return JSON.parse(localStorage.getItem("ratings") || "[]");
}

function saveRatings(ratings) {
    localStorage.setItem("ratings", JSON.stringify(ratings));
}

function submitRating(requestId, stars, comment = "") {
    if (!requestId || stars < 1 || stars > 5) {
        showToast("Invalid rating data.", "error");
        return;
    }

    let ratings = getRatings();
    let requests = JSON.parse(localStorage.getItem("requests") || "[]");
    const request = requests.find(r => r.id === requestId);

    if (!request) {
        showToast("Request not found.", "warning");
        return;
    }

    // Check if already rated
    const existing = ratings.find(r => r.requestId === requestId);
    if (existing) {
        showToast("This delivery has already been rated.", "warning");
        return;
    }

    // Add new rating
    ratings.push({
        id: `rating_${Date.now()}`,
        requestId: requestId,
        mealId: request.mealId,
        mealTitle: request.mealTitle,
        from: window.CURRENT_USER,
        to: request.to,
        stars: Number(stars),
        comment: comment,
        ts: Date.now(),
        delivered_ts: request.delivered_ts || Date.now()
    });

    saveRatings(ratings);

    // Mark the request as rated so penalties won't fire and UI updates immediately
    requests = requests.map(r => {
        if (r.id === requestId) {
            return { ...r, rated: true };
        }
        return r;
    });
    localStorage.setItem("requests", JSON.stringify(requests));

    // Update points for the cook
    const cookPoints = addUserPoints(request.to, calculatePointsFromRating(stars));

    // Send confirmation message to cook
    let notifications = JSON.parse(localStorage.getItem("notifications") || "[]");
    const ratingMessage = `${window.CURRENT_USER} rated your "${request.mealTitle}" ${stars}★. Comment: "${comment || "No comment"}"`;
    
    notifications.push({
        id: `note_${Date.now()}`,
        type: "rating-received",
        requestId: requestId,
        from: window.CURRENT_USER,
        to: request.to,
        message: ratingMessage,
        read: false,
        ts: Date.now()
    });

    localStorage.setItem("notifications", JSON.stringify(notifications));

    if (typeof updateNotificationBadge === "function") {
        updateNotificationBadge();
    }

    showToast(`Thank you! You rated this meal ${stars}★. The cook gained ${cookPoints} point(s).`, "success");
    
    // Close modal if exists
    const modal = document.getElementById("rating-modal");
    if (modal) {
        modal.style.display = "none";
    }

    // Reload page or update UI
    setTimeout(() => {
        if (document.body.dataset.page === "notifications") {
            initNotifications();
        }
    }, 500);
}

function calculatePointsFromRating(stars) {
    if (stars >= 4) return 2;
    if (stars >= 1) return 1;
    return 0;
}

function hasUserRatedDelivery(requestId) {
    const ratings = getRatings();
    return ratings.some(r => r.requestId === requestId);
}

function getUserUnratedDeliveries() {
    const requests = JSON.parse(localStorage.getItem("requests") || "[]");
    const deliveredRequests = requests.filter(r => 
        normalizeUser(r.from) === normalizeUser(window.CURRENT_USER) &&
        r.status === "delivered" &&
        !r.rated &&
        !r.ratingPenaltyApplied &&
        !hasUserRatedDelivery(r.id)
    );

    return deliveredRequests;
}

function checkAndApplyRatingPenalties() {
    let requests = JSON.parse(localStorage.getItem("requests") || "[]");
    const unrated = getUserUnratedDeliveries();
    const now = Date.now();
    const RATING_DEADLINE = 48 * 60 * 60 * 1000; // 48 hours
    let changed = false;

    unrated.forEach(delivery => {
        const deliveryTime = parseInt(delivery.delivered_ts || delivery.ts || 0);
        const timeSinceDelivery = now - deliveryTime;

        if (timeSinceDelivery > RATING_DEADLINE) {
            // Apply penalty: -1 point
            addUserPoints(window.CURRENT_USER, -1);

            requests = requests.map(req => {
                if (req.id === delivery.id) {
                    changed = true;
                    return { ...req, ratingPenaltyApplied: true };
                }
                return req;
            });

            // Log penalty in notifications
            let notifications = JSON.parse(localStorage.getItem("notifications") || "[]");
            notifications.push({
                id: `note_${Date.now()}`,
                type: "rating-penalty",
                requestId: delivery.id,
                from: "System",
                to: window.CURRENT_USER,
                message: `You did not rate "${delivery.mealTitle}" within 48 hours. -1 point penalty applied.`,
                read: false,
                ts: Date.now()
            });
            localStorage.setItem("notifications", JSON.stringify(notifications));
        }
    });

    if (changed) {
        localStorage.setItem("requests", JSON.stringify(requests));
    }

    if (typeof updateNotificationBadge === "function") {
        updateNotificationBadge();
    }
}

function initRatingModal() {
    let modal = document.getElementById("rating-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "rating-modal";
        modal.className = "modal";
        modal.style.display = "none";
        modal.innerHTML = `
            <div class="modal-content" style="max-width:400px;padding:20px;border-radius:8px;">
                <h3 style="margin-top:0;">Rate this meal</h3>
                <div class="star-rating" id="star-rating">
                    ${[1,2,3,4,5].map(i => 
                        `<span class="star" data-value="${i}" style="font-size:32px;cursor:pointer;color:#ddd;margin-right:8px;">★</span>`
                    ).join("")}
                </div>
                <div id="selected-stars" style="margin-top:10px;font-weight:bold;color:#ff8a3d;">Select a rating</div>
                <textarea id="rating-comment" 
                    class="form-textarea" 
                    placeholder="Optional comment (max 200 chars)" 
                    style="width:100%;height:80px;margin-top:10px;padding:8px;border:1px solid #ddd;border-radius:4px;font-family:Arial;"
                    maxlength="200"></textarea>
                <div style="margin-top:15px;display:flex;gap:10px;">
                    <button id="submit-rating-btn" class="approve-btn" style="flex:1;padding:10px;">Submit Rating</button>
                    <button id="cancel-rating-btn" class="reject-btn" style="flex:1;padding:10px;">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        setupRatingStars();
    }
}

function setupRatingStars() {
    ratingSelectedStars = 0;

    const stars = document.querySelectorAll(".star");
    stars.forEach(star => {
        star.addEventListener("mouseover", () => {
            const value = parseInt(star.dataset.value);
            stars.forEach((s, i) => {
                if (i < value) {
                    s.style.color = "#ff8a3d";
                } else {
                    s.style.color = "#ddd";
                }
            });
        });

        star.addEventListener("click", () => {
            ratingSelectedStars = parseInt(star.dataset.value);
            document.getElementById("selected-stars").textContent = `Rating: ${ratingSelectedStars}★`;
            stars.forEach((s, i) => {
                if (i < ratingSelectedStars) {
                    s.style.color = "#ff8a3d";
                } else {
                    s.style.color = "#ddd";
                }
            });
        });
    });

    const starsContainer = document.getElementById("star-rating");
    starsContainer.addEventListener("mouseleave", () => {
        stars.forEach((s, i) => {
            if (i < ratingSelectedStars) {
                s.style.color = "#ff8a3d";
            } else {
                s.style.color = "#ddd";
            }
        });
    });

    const submitBtn = document.getElementById("submit-rating-btn");
    if (submitBtn && !submitBtn.dataset.initialized) {
        submitBtn.dataset.initialized = "true";
        submitBtn.addEventListener("click", () => {
            const comment = document.getElementById("rating-comment").value;
            if (ratingSelectedStars === 0) {
                showToast("Please select a rating.", "warning");
                return;
            }
            const requestId = submitBtn.dataset.requestId;
            submitRating(requestId, ratingSelectedStars, comment);
        });
    }

    const cancelBtn = document.getElementById("cancel-rating-btn");
    if (cancelBtn && !cancelBtn.dataset.initialized) {
        cancelBtn.dataset.initialized = "true";
        cancelBtn.addEventListener("click", () => {
            const modal = document.getElementById("rating-modal");
            modal.style.display = "none";
        });
    }
}

function showRatingModal(requestId) {
    if (hasUserRatedDelivery(requestId)) {
        showToast("You have already rated this delivery.", "warning");
        return;
    }

    initRatingModal();
    ratingSelectedStars = 0;
    const modal = document.getElementById("rating-modal");
    const submitBtn = document.getElementById("submit-rating-btn");
    submitBtn.dataset.requestId = requestId;
    modal.style.display = "flex";

    // Reset form
    document.getElementById("rating-comment").value = "";
    document.querySelectorAll(".star").forEach(star => {
        star.style.color = "#ddd";
    });
    document.getElementById("selected-stars").textContent = "Select a rating";
}

window.submitRating = submitRating;
window.checkAndApplyRatingPenalties = checkAndApplyRatingPenalties;
window.showRatingModal = showRatingModal;
window.hasUserRatedDelivery = hasUserRatedDelivery;
window.calculatePointsFromRating = calculatePointsFromRating;
