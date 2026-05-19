// ../js/main.js
// Shared helper functions for UniBite application pages.
// This file contains user management, localStorage helpers, toast messages,
// notification badges, and the common request handling logic used throughout.

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
            quantity: 3,
            pickupLocation: "Dorm 12, Hall A",
            pickupTime: "18:30",
            allergens: ["Dairy"],
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
            quantity: 2,
            pickupLocation: "Main Campus Canteen",
            pickupTime: "20:00",
            allergens: ["Nuts"],
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
            quantity: 1,
            pickupLocation: "East Dorm Kitchen",
            pickupTime: "09:30",
            allergens: ["Eggs", "Dairy"],
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
            quantity: 0,
            pickupLocation: "Campus Library Lounge",
            pickupTime: "19:00",
            allergens: ["Gluten"],
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

        showToast("Please login first.", "warning");

        window.location.href = "login.html";

        return false;
    }

    return true;
}

function updateExpiredMealsStatus() {
    const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;
    const meals = JSON.parse(localStorage.getItem("meals") || "[]");
    let changed = false;

    const updatedMeals = meals.map(meal => {
        const createdTime = meal.ts || 0;
        const isExpired = (Date.now() - createdTime) > FORTY_EIGHT_HOURS;
        if (isExpired && meal.status !== "expired") {
            changed = true;
            return { ...meal, status: "expired" };
        }
        return meal;
    });

    if (changed) {
        localStorage.setItem("meals", JSON.stringify(updatedMeals));
    }
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

    const notifBtn =
        document.querySelector('[data-notif-badge]');

    if (!notifBtn) return;

    let badge =
        document.getElementById("notif-badge");

    if (!badge) {

        badge = document.createElement("span");

        badge.id = "notif-badge";

        badge.className = "notif-badge";

        notifBtn.appendChild(badge);
    }

    const count = getUnreadCount();
    const isNotificationsPage = document.body.dataset.page === "notifications";

    if (count > 0 && !isNotificationsPage) {

        badge.style.display = "inline-block";

        badge.textContent = count;

    } else {

        badge.style.display = "none";
    }
}

function createToastContainer() {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.className = "toast-container";
        document.body.appendChild(container);
    }
    return container;
}

function showToast(message, type = "success", duration = 3500) {
    const container = createToastContainer();
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${type === "success" ? "✓" : type === "error" ? "⚠" : type === "warning" ? "!" : "ℹ"}</div>
        <div class="toast-message">${escapeHtml(message)}</div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(20px)";
        setTimeout(() => {
            toast.remove();
        }, 250);
    }, duration);
}

// ---------------- REQUEST SYSTEM ----------------

function createRequestForMeal(meal) {

    if (!requireLogin()) return;

    // 48-hour expiration check
    const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;
    const expired = (Date.now() - (meal.ts || 0)) > FORTY_EIGHT_HOURS;
    
    if (expired) {
        showToast("This meal has expired (48-hour limit reached). You cannot request it.", "warning");
        return;
    }

    const consumerProfile = getCurrentUserProfile();
    if (!consumerProfile || Number(consumerProfile.points || 0) < 1) {
        showToast("You need at least 1 point to request a meal. New users start with 5 points.", "warning");
        return;
    }

    if (Number(meal.quantity == null ? 1 : meal.quantity) < 1 || meal.status === "received") {
        showToast("This meal is currently unavailable.", "warning");
        return;
    }

    if (
        normalizeUser(meal.user)
        ===
        normalizeUser(window.CURRENT_USER)
    ) {

        showToast("You cannot request your own meal.", "warning");

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

        showToast("You already requested this meal.", "warning");

        return;
    }

    const request = {

        id: `req_${Date.now()}`,

        mealId: meal.id,

        mealTitle: meal.title,

        from: window.CURRENT_USER,

        to: meal.user,

        status: "pending",

        reservedPoints: 1,

        ts: Date.now()
    };

    requests.push(request);

    localStorage.setItem(
        "requests",
        JSON.stringify(requests)
    );

    addUserPoints(window.CURRENT_USER, -1);

    let notifications =
        JSON.parse(localStorage.getItem("notifications") || "[]");

    notifications.push({

        id: `note_${Date.now()}`,

        type: "request-created",

        requestId: request.id,

        mealId: meal.id,

        mealTitle: meal.title,

        from: window.CURRENT_USER,

        to: meal.user,

        message:
            `${window.CURRENT_USER} requested "${meal.title}"`,

        read: false,
        ts: Date.now()
    });

    localStorage.setItem(
        "notifications",
        JSON.stringify(notifications)
    );

    // Confirmation message for the sender
    notifications = JSON.parse(localStorage.getItem("notifications") || "[]");
    notifications.push({
        id: `note_${Date.now()}`,
        type: "request-confirmation",
        requestId: request.id,
        mealId: meal.id,
        mealTitle: meal.title,
        from: "System",
        to: window.CURRENT_USER,
        message: `Your request for "${meal.title}" was sent to ${meal.user}.`,
        read: false,
        ts: Date.now()
    });
    localStorage.setItem("notifications", JSON.stringify(notifications));

    updateNotificationBadge();

    showToast("Request sent successfully.", "success");
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

// Load index page content without performing a full page reload.
function loadIndexWithoutReload() {
    fetch("index.html")
        .then(r => r.text())
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");
            const newContainer = doc.querySelector('.container');
            if (newContainer) {
                const old = document.querySelector('.container');
                if (old) {
                    old.replaceWith(newContainer.cloneNode(true));
                } else {
                    document.body.appendChild(newContainer.cloneNode(true));
                }
            }

            // Update page dataset and URL
            document.body.dataset.page = 'feed';
            try { history.pushState({}, '', 'index.html'); } catch (e) {}

            // Ensure feed script is loaded and initialized
            if (typeof initFeed === 'function') {
                try { initFeed(); } catch (e) { console.error(e); }
            } else {
                const s = document.createElement('script');
                s.src = '../js/feed.js';
                s.onload = () => { if (typeof initFeed === 'function') initFeed(); };
                document.body.appendChild(s);
            }

            // Update header UI and badges to reflect logged-out state
            try { updateHeaderUI(); updateNotificationBadge(); } catch (e) { /* ignore */ }
        })
        .catch(err => {
            console.error('Could not load index without reload', err);
            window.location.href = 'index.html';
        });
}

document.addEventListener("DOMContentLoaded", () => {

    const profileBtn =
        document.getElementById("profile-btn");

    const notificationsBtn =
        document.getElementById("notifications-btn");

    const uploadBtn =
        document.getElementById("upload-btn") || document.querySelector(".upload-icon");

    const feedBtn =
        document.getElementById("feed-btn");

    const menuToggleBtn =
        document.getElementById("feed-menu-toggle");

    const feedMenuDrawer =
        document.getElementById("feed-menu-drawer");

    const logoutBtn =
        document.getElementById("logout-btn");

    const drawerButtons = feedMenuDrawer
        ? Array.from(feedMenuDrawer.querySelectorAll(".drawer-btn"))
        : [];
    let drawerTimeouts = [];

    function clearDrawerTimers() {
        drawerTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
        drawerTimeouts = [];
    }

    function showDrawerButtons() {
        clearDrawerTimers();
        drawerButtons.forEach((btn, index) => {
            const timeoutId = setTimeout(() => btn.classList.add("visible"), index * 60);
            drawerTimeouts.push(timeoutId);
        });
    }

    function hideDrawerButtons() {
        clearDrawerTimers();
        drawerButtons.forEach((btn) => btn.classList.remove("visible"));
    }

    function handleDrawerAction(action) {
        switch (action) {
            case "feed":
                window.location.href = "index.html";
                break;
            case "profile":
                window.location.href = "profile.html";
                break;
            case "notifications":
                window.location.href = "notifications.html";
                break;
            case "upload":
                window.location.href = "upload.html";
                break;
            case "login":
                window.location.href = "login.html";
                break;
            case "logout":
                localStorage.removeItem("CURRENT_USER");
                localStorage.removeItem("IS_ADMIN");
                window.CURRENT_USER = null;
                showToast("Logged out.", "info");
                window.location.href = "index.html";
                break;
            case "admin":
                window.location.href = "admin.html";
                break;
        }
    }

    if (menuToggleBtn && feedMenuDrawer) {
        menuToggleBtn.addEventListener("click", () => {
            const isOpen = feedMenuDrawer.classList.toggle("open");
            if (isOpen) {
                showDrawerButtons();
            } else {
                hideDrawerButtons();
            }
        });

        drawerButtons.forEach((btn) => {
            btn.addEventListener("click", () => {
                const action = btn.dataset.action;
                feedMenuDrawer.classList.remove("open");
                hideDrawerButtons();
                handleDrawerAction(action);
            });
        });

        document.addEventListener("click", (event) => {
            if (!feedMenuDrawer.contains(event.target) && event.target !== menuToggleBtn) {
                feedMenuDrawer.classList.remove("open");
                hideDrawerButtons();
            }
        });
    }

    if (profileBtn) {

        profileBtn.onclick = () => {

            window.location.href = "profile.html";
        };
    }

    if (notificationsBtn) {

        notificationsBtn.onclick = () => {

            window.location.href = "notifications.html";
        };
    }

    if (uploadBtn) {

        uploadBtn.onclick = () => {

            window.location.href = "upload.html";
        };
    }

    if (feedBtn) {
        feedBtn.onclick = () => {
            window.location.href = "index.html";
        };
    }

    const loginBtn = document.getElementById("login-btn");

    function updateHeaderUI() {
        const loggedIn = Boolean(window.CURRENT_USER);
        const isAdmin = localStorage.getItem("IS_ADMIN") === "true";
        // Top standalone buttons (if present in page templates) should mirror drawer state
        if (loginBtn) loginBtn.style.display = loggedIn ? "none" : "inline-block";
        if (profileBtn) profileBtn.style.display = loggedIn ? "inline-block" : "none";
        if (notificationsBtn) notificationsBtn.style.display = loggedIn ? "inline-block" : "none";
        if (uploadBtn) uploadBtn.style.display = loggedIn ? "inline-block" : "none";
        if (logoutBtn) logoutBtn.style.display = loggedIn ? "inline-block" : "none";

        const adminBtn = document.getElementById("admin-btn");
        if (adminBtn) {
            adminBtn.style.display = (loggedIn && isAdmin) ? "inline-block" : "none";
            adminBtn.onclick = () => {
                window.location.href = "admin.html";
            };
        }

        // Drawer buttons should show only relevant actions depending on login state
        if (drawerButtons && drawerButtons.length) {
            drawerButtons.forEach(btn => {
                const action = btn.dataset.action;
                switch (action) {
                    case "login":
                        btn.style.display = loggedIn ? "none" : "inline-block";
                        break;
                    case "logout":
                        btn.style.display = loggedIn ? "inline-block" : "none";
                        break;
                    case "admin":
                        btn.style.display = (loggedIn && isAdmin) ? "inline-block" : "none";
                        break;
                    default:
                        // actions: feed, profile, notifications, upload
                        btn.style.display = loggedIn ? "inline-block" : "none";
                }
            });
        }
    }

    if (loginBtn) {
        loginBtn.onclick = () => {
            window.location.href = "login.html";
        };
    }

    if (logoutBtn) {

        logoutBtn.onclick = () => {
            const proceed = confirm('Are you sure you want to logout?');
            if (!proceed) return;

            localStorage.removeItem("CURRENT_USER");
            localStorage.removeItem("IS_ADMIN");

            window.CURRENT_USER = null;

            showToast("Logged out.", "info");

            try { checkAndApplyRatingPenalties(); } catch (e) { console.error(e); }

            // Go to index feed without full reload (best-effort)
            try { loadIndexWithoutReload(); } catch (e) { window.location.href = 'index.html'; }
        }
    }

    if (typeof updateExpiredMealsStatus === "function") {
        updateExpiredMealsStatus();
    }

    updateHeaderUI();
    updateNotificationBadge();

    // Ensure drawer closed by default on load
    if (feedMenuDrawer) {
        feedMenuDrawer.classList.remove('open');
    }
    hideDrawerButtons();

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

        case "notifications":

            if (!requireLogin()) return;

            if (typeof initNotifications === "function") {
                initNotifications();
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