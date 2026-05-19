// admin.js - Admin Dashboard functionality
// This file builds the admin analytics pages, including statistics,
// leaderboard, top meals, and recent activity panels.

function initAdmin() {
    // Check if user is admin
    const isAdmin = localStorage.getItem("IS_ADMIN") === "true";
    const currentUser = localStorage.getItem("CURRENT_USER");

    if (!isAdmin || currentUser !== "admin") {
        showToast("Access denied. Admin only.", "error");
        window.location.href = "index.html";
        return;
    }
    
    loadStatistics();
    loadLeaderboard();
    loadTopMeals();
    loadRecentActivity();
}

function getDeliveredRequests() {
    const requests = JSON.parse(localStorage.getItem("requests") || "[]");
    return requests.filter(r => r.status === "delivered");
}

function getAllUsers() {
    const users = getUsers();
    return users;
}

function getAllMeals() {
    const meals = JSON.parse(localStorage.getItem("meals") || "[]");
    return meals;
}

function getAllRequests() {
    const requests = JSON.parse(localStorage.getItem("requests") || "[]");
    return requests;
}

function getRatingsForMeal(mealId) {
    const ratings = JSON.parse(localStorage.getItem("ratings") || "[]");
    return ratings.filter(r => r.mealId === mealId);
}

function getRatingsForCook(cookUsername) {
    const ratings = JSON.parse(localStorage.getItem("ratings") || "[]");
    return ratings.filter(r => normalizeUser(r.to) === normalizeUser(cookUsername));
}

function calculatePortionsGivenByUser(username) {
    const requests = getDeliveredRequests();
    return requests.filter(r => normalizeUser(r.to) === normalizeUser(username)).length;
}

function calculateAverageRating(ratings) {
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, r) => acc + r.stars, 0);
    return (sum / ratings.length).toFixed(1);
}

function loadStatistics() {
    const requests = getDeliveredRequests();
    const meals = getAllMeals();
    const ratings = JSON.parse(localStorage.getItem("ratings") || "[]");
    const users = getAllUsers();

    // Total portions distributed (last 30 days)
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const recentDeliveries = requests.filter(r => {
        const deliveryTime = parseInt(r.delivered_ts || r.ts || 0);
        return deliveryTime >= thirtyDaysAgo;
    });

    document.getElementById("total-portions").textContent = recentDeliveries.length;

    // Total users
    document.getElementById("total-users").textContent = users.length;

    // Average rating
    const avgRating = calculateAverageRating(ratings);
    document.getElementById("avg-rating").textContent = avgRating;

    // Total meals posted
    document.getElementById("total-meals").textContent = meals.length;

    // Pending requests
    const pendingRequests = getAllRequests().filter(r => r.status === "pending");
    document.getElementById("pending-requests").textContent = pendingRequests.length;

    // Unrated delivered orders
    const unratedDeliveries = getAllRequests().filter(r => r.status === "delivered" && !r.rated && !r.ratingPenaltyApplied);
    document.getElementById("unrated-deliveries").textContent = unratedDeliveries.length;
}

function loadLeaderboard() {
    const users = getAllUsers();
    const requests = getDeliveredRequests();
    const ratings = JSON.parse(localStorage.getItem("ratings") || "[]");

    // Calculate contributions for each user
    const leaderboard = users
        .map(user => {
            const portionsGiven = requests.filter(r => 
                normalizeUser(r.to) === normalizeUser(user.username)
            ).length;
            
            const userRatings = ratings.filter(r => 
                normalizeUser(r.to) === normalizeUser(user.username)
            );
            
            const avgRating = calculateAverageRating(userRatings);

            return {
                username: user.username,
                portions: portionsGiven,
                points: user.points || 0,
                avgRating: avgRating,
                ratingsCount: userRatings.length
            };
        })
        .filter(u => u.portions > 0) // Only show donors
        .sort((a, b) => b.portions - a.portions)
        .slice(0, 10); // Top 10

    const tbody = document.getElementById("leaderboard-body");

    if (leaderboard.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:#999;">No donors yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = leaderboard.map((user, index) => `
        <tr>
            <td style="font-weight:bold;color:#ff8a3d;">${index + 1}</td>
            <td>${escapeHtml(user.username)}</td>
            <td><strong>${user.portions}</strong> portions</td>
            <td>${user.points} pts</td>
            <td>${user.avgRating}★ (${user.ratingsCount})</td>
        </tr>
    `).join("");
}

function loadTopMeals() {
    const meals = getAllMeals();
    const ratings = JSON.parse(localStorage.getItem("ratings") || "[]");

    // Calculate ratings for each meal
    const topMeals = meals
        .map(meal => {
            const mealRatings = ratings.filter(r => r.mealId === meal.id);
            const avgRating = calculateAverageRating(mealRatings);

            return {
                id: meal.id,
                title: meal.title,
                cook: meal.user,
                avgRating: avgRating,
                ratingsCount: mealRatings.length
            };
        })
        .filter(m => m.ratingsCount > 0) // Only show meals with ratings
        .sort((a, b) => {
            if (b.avgRating !== a.avgRating) {
                return b.avgRating - a.avgRating;
            }
            return b.ratingsCount - a.ratingsCount;
        })
        .slice(0, 10); // Top 10

    const tbody = document.getElementById("top-meals-body");

    if (topMeals.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:#999;">No rated meals yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = topMeals.map((meal, index) => `
        <tr>
            <td style="font-weight:bold;color:#ff8a3d;">${index + 1}</td>
            <td>${escapeHtml(meal.title)}</td>
            <td>${escapeHtml(meal.cook)}</td>
            <td><strong>${meal.avgRating}★</strong></td>
            <td>${meal.ratingsCount} rating${meal.ratingsCount !== 1 ? 's' : ''}</td>
        </tr>
    `).join("");
}

function loadRecentActivity() {
    const notifications = JSON.parse(localStorage.getItem("notifications") || "[]");
    const requests = JSON.parse(localStorage.getItem("requests") || "[]");
    
    // Combine and sort by timestamp
    const allActivity = [
        ...notifications.map(n => ({
            type: "notification",
            ts: n.ts || Date.now(),
            from: n.from,
            message: n.message,
            icon: "📬"
        })),
        ...requests.map(r => ({
            type: "request",
            ts: r.delivered_ts || r.ts || Date.now(),
            from: r.from,
            to: r.to,
            message: `${normalizeUser(r.from) ? r.from : "Unknown"} requested "${r.mealTitle}" from ${r.to}`,
            icon: r.status === "delivered" ? "✓" : "→"
        }))
    ]
    .sort((a, b) => (b.ts || 0) - (a.ts || 0))
    .slice(0, 15); // Last 15 activities

    const container = document.getElementById("recent-activity-list");

    if (allActivity.length === 0) {
        container.innerHTML = `<p style="text-align:center;color:#999;padding:20px;">No recent activity.</p>`;
        return;
    }

    container.innerHTML = allActivity.map(activity => {
        const date = new Date(activity.ts || Date.now());
        const timeAgo = getTimeAgo(date);
        
        return `
            <div class="activity-item">
                <span class="activity-icon">${activity.icon}</span>
                <div class="activity-content">
                    <p class="activity-message">
                        <strong>${escapeHtml(activity.from)}</strong>: ${escapeHtml(activity.message)}
                    </p>
                    <p class="activity-time">${timeAgo}</p>
                </div>
            </div>
        `;
    }).join("");
}

function getTimeAgo(date) {
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
}

window.initAdmin = initAdmin;

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
    if (document.body.dataset.page === "admin") {
        initAdmin();
    }
});
