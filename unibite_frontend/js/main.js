// ../js/main.js

window.CURRENT_USER =
    localStorage.getItem("CURRENT_USER") || null;

// ---------------- HELPERS ----------------

function normalizeUser(user) {

    return String(user || "")
        .trim()
        .replace(/@/g, "")
        .toLowerCase();
}

function getUsers() {
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    return Array.isArray(users) ? users : [];
}

function saveUsers(users) {
    localStorage.setItem("users", JSON.stringify(users));
}

function findUser(username) {
    return getUsers().find(u =>
        normalizeUser(u.username) === normalizeUser(username)
    );
}

function ensureCurrentUserProfile() {
    if (!window.CURRENT_USER) {
        return null;
    }

    const users = getUsers();
    let user = users.find(u =>
        normalizeUser(u.username) === normalizeUser(window.CURRENT_USER)
    );

    if (!user) {
        user = {
            username: window.CURRENT_USER,
            points: 5,
            createdAt: Date.now(),
            role: "student"
        };
        users.push(user);
        saveUsers(users);
    }

    return user;
}

function updateUserProfile(updated) {
    const users = getUsers().map(u =>
        normalizeUser(u.username) === normalizeUser(updated.username)
            ? { ...u, ...updated }
            : u
    );
    saveUsers(users);
}

function addUserPoints(username, delta) {
    const users = getUsers();
    const normalized = normalizeUser(username);
    let user = users.find(u =>
        normalizeUser(u.username) === normalized
    );

    if (!user) {
        user = {
            username: username,
            points: 5,
            createdAt: Date.now(),
            role: "student"
        };
        users.push(user);
    }

    user.points = Math.max(0, Number(user.points || 0) + Number(delta || 0));
    saveUsers(users);
    return user;
}

function getCurrentUserProfile() {
    return ensureCurrentUserProfile();
}

function seedDemoMeals() {
    const existingMeals = JSON.parse(localStorage.getItem("meals") || "[]");
    if (existingMeals.length > 0) {
        return;
    }

    const demoMeals = [
        {
            id: "meal_1",
            title: "Greek Salad",
            desc: "Fresh salad with tomatoes, cucumber, feta and olives.",
            category: "Lunch",
            image: "",
            user: "@cooknwave",
            status: "available",
            ts: Date.now() - 500000
        },
        {
            id: "meal_2",
            title: "Baklava",
            desc: "Sweet layers of filo pastry, nuts and honey.",
            category: "Dessert",
            image: "",
            user: "@chefanna",
            status: "available",
            ts: Date.now() - 400000
        },
        {
            id: "meal_3",
            title: "Breakfast Omelette",
            desc: "Fluffy omelette with herbs and cheese.",
            category: "Breakfast",
            image: "",
            user: "@foodie",
            status: "available",
            ts: Date.now() - 300000
        },
        {
            id: "meal_4",
            title: "Spaghetti Bolognese",
            desc: "Classic pasta with rich tomato and meat sauce.",
            category: "Dinner",
            image: "",
            user: "@cooknwave",
            status: "available",
            ts: Date.now() - 200000
        }
    ];

    localStorage.setItem("meals", JSON.stringify(demoMeals));
}

function escapeHtml(str) {

    if (!str) return "";

    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function requireLogin() {

    if (!window.CURRENT_USER) {

        alert("Please login first.");

        window.location.href = "login.html";

        return false;
    }

    return true;
}

// ---------------- NOTIFICATION BADGE ----------------

function getUnreadCount() {

    const notifications =
        JSON.parse(localStorage.getItem("notifications") || "[]");

    return notifications.filter(n =>

        normalizeUser(n.to)
        ===
        normalizeUser(window.CURRENT_USER)

        &&

        !n.read

    ).length;
}

function updateNotificationBadge() {

    const messagesBtn =
        document.getElementById("messages-btn");

    if (!messagesBtn) return;

    let badge =
        document.getElementById("notif-badge");

    if (!badge) {

        badge = document.createElement("span");

        badge.id = "notif-badge";

        badge.className = "notif-badge";

        messagesBtn.appendChild(badge);
    }

    const count = getUnreadCount();

    if (count > 0) {

        badge.style.display = "inline-block";

        badge.textContent = count;

    } else {

        badge.style.display = "none";
    }
}

// ---------------- REQUEST SYSTEM ----------------

function createRequestForMeal(meal) {

    if (!requireLogin()) return;

    const consumerProfile = getCurrentUserProfile();
    if (!consumerProfile || Number(consumerProfile.points || 0) < 1) {
        alert("You need at least 1 point to request a meal. New users start with 5 points.");
        return;
    }

    if (
        normalizeUser(meal.user)
        ===
        normalizeUser(window.CURRENT_USER)
    ) {

        alert("You cannot request your own meal.");

        return;
    }

    let requests =
        JSON.parse(localStorage.getItem("requests") || "[]");

    const exists = requests.find(r =>

        String(r.mealId) === String(meal.id)

        &&

        normalizeUser(r.from)
        ===
        normalizeUser(window.CURRENT_USER)
    );

    if (exists) {

        alert("You already requested this meal.");

        return;
    }

    const request = {

        id: `req_${Date.now()}`,

        mealId: meal.id,

        mealTitle: meal.title,

        from: window.CURRENT_USER,

        to: meal.user,

        status: "pending"
    };

    requests.push(request);

    localStorage.setItem(
        "requests",
        JSON.stringify(requests)
    );

    let notifications =
        JSON.parse(localStorage.getItem("notifications") || "[]");

    notifications.push({

        id: `note_${Date.now()}`,

        requestId: request.id,

        mealId: meal.id,

        mealTitle: meal.title,

        from: window.CURRENT_USER,

        to: meal.user,

        message:
            `${window.CURRENT_USER} requested "${meal.title}"`,

        read: false
    });

    localStorage.setItem(
        "notifications",
        JSON.stringify(notifications)
    );

    updateNotificationBadge();

    alert("Request sent.");
}

function openListingPage(id) {

    window.location.href =
        `listing.html?id=${encodeURIComponent(id)}`;
}

// ---------------- GLOBALS ----------------

window.normalizeUser = normalizeUser;
window.escapeHtml = escapeHtml;
window.requireLogin = requireLogin;
window.updateNotificationBadge = updateNotificationBadge;
window.createRequestForMeal = createRequestForMeal;
window.openListingPage = openListingPage;
window.ensureCurrentUserProfile = ensureCurrentUserProfile;
window.getCurrentUserProfile = getCurrentUserProfile;
window.addUserPoints = addUserPoints;

// ---------------- PAGE INIT ----------------

document.addEventListener("DOMContentLoaded", () => {

    const profileBtn =
        document.getElementById("profile-btn");

    const messagesBtn =
        document.getElementById("messages-btn");

    const uploadBtn =
        document.querySelector(".upload-icon");

    const logoutBtn =
        document.getElementById("logout-btn");

    if (profileBtn) {

        profileBtn.onclick = () => {

            window.location.href = "profile.html";
        };
    }

    if (messagesBtn) {

        messagesBtn.onclick = () => {

            window.location.href = "messages.html";
        };
    }

    if (uploadBtn) {

        uploadBtn.onclick = () => {

            window.location.href = "upload.html";
        };
    }

    const loginBtn = document.getElementById("login-btn");

    function updateHeaderUI() {
        const loggedIn = Boolean(window.CURRENT_USER);
        if (loginBtn) loginBtn.style.display = loggedIn ? "none" : "inline-block";
        if (profileBtn) profileBtn.style.display = loggedIn ? "inline-block" : "none";
        if (messagesBtn) messagesBtn.style.display = loggedIn ? "inline-block" : "none";
        if (uploadBtn) uploadBtn.style.display = loggedIn ? "inline-block" : "none";
        if (logoutBtn) logoutBtn.style.display = loggedIn ? "inline-block" : "none";
    }

    if (loginBtn) {
        loginBtn.onclick = () => {
            window.location.href = "login.html";
        };
    }

    if (logoutBtn) {

        logoutBtn.onclick = () => {

            localStorage.removeItem("CURRENT_USER");

            window.CURRENT_USER = null;

            alert("Logged out.");

            window.location.href = "login.html";
        };
    }

    if (window.CURRENT_USER) {
        ensureCurrentUserProfile();
    }

    updateHeaderUI();
    updateNotificationBadge();

    const page = document.body.dataset.page;

    switch (page) {

        case "feed":

            if (typeof initFeed === "function") {
                initFeed();
            }

            break;

        case "profile":

            if (!requireLogin()) return;

            if (typeof initProfile === "function") {
                initProfile();
            }

            break;

        case "upload":

            if (!requireLogin()) return;

            if (typeof initUpload === "function") {
                initUpload();
            }

            break;

        case "messages":

            if (!requireLogin()) return;

            if (typeof initMessages === "function") {
                initMessages();
            }

            break;

        case "requests":

            if (!requireLogin()) return;

            if (typeof initRequests === "function") {
                initRequests();
            }

            break;

        case "request":

            if (!requireLogin()) return;

            if (typeof initRequestPage === "function") {
                initRequestPage();
            }

            break;

        case "listing":

            if (typeof initListingPage === "function") {
                initListingPage();
            }

            break;

        case "login":

            if (typeof initLogin === "function") {
                initLogin();
            }

            break;
    }
});