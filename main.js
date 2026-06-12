// ../js/main.js
// Shared helper functions for UniBite application pages.
// This file contains shared UI helpers, toast messages,
// notification badges, and the common request handling logic used throughout.

window.CURRENT_USER =
    sessionStorage.getItem("CURRENT_USER") || null;

// ---------------- HELPERS ----------------

function normalizeUser(user) {

    return String(user || "")
        .trim()
        .replace(/@/g, "")
        .toLowerCase();
}

function ensureCurrentUserProfile() {
    if (!window.CURRENT_USER) {
        return null;
    }

    return {
        username: window.CURRENT_USER,
        displayName: sessionStorage.getItem("CURRENT_USER_NAME") || window.CURRENT_USER,
        email: sessionStorage.getItem("CURRENT_USER_EMAIL") || window.CURRENT_USER,
        backendId: Number(sessionStorage.getItem("CURRENT_USER_ID") || 0),
        points: Number(sessionStorage.getItem("CURRENT_USER_POINTS") || 0),
        role: sessionStorage.getItem("CURRENT_USER_ROLE") || "student"
    };
}

function updateUserProfile(updated) {
    if (!updated) return;
    if (updated.points !== undefined) {
        sessionStorage.setItem("CURRENT_USER_POINTS", String(updated.points));
    }
}

function addUserPoints(username, delta) {
    const currentPoints = Number(sessionStorage.getItem("CURRENT_USER_POINTS") || 0);
    const nextPoints = Math.max(0, currentPoints + Number(delta || 0));
    sessionStorage.setItem("CURRENT_USER_POINTS", String(nextPoints));
    return { username, points: nextPoints };
}

function getCurrentUserProfile() {
    return ensureCurrentUserProfile();
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

// ---------------- NOTIFICATION BADGE ----------------

function getUnreadCount() {

    const notifications =
        JSON.parse(sessionStorage.getItem("notifications") || "[]");

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

async function loadSharedHeader() {
    const headerContainer = document.getElementById("shared-header");
    if (!headerContainer) return;

    const fallbackHeader = `
        <header class="top-header">
            <h1 class="logo">UniBite</h1>
            <div class="top-right">
                <button id="feed-menu-toggle" class="menu-toggle-btn" aria-label="Open navigation menu">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
                <div id="feed-menu-drawer" class="feed-menu-drawer">
                    <button class="header-btn drawer-btn" data-action="feed">Feed</button>
                    <button class="header-btn drawer-btn" data-action="profile">Profile</button>
                    <button class="header-btn drawer-btn" data-action="requests">Requests</button>
                    <button class="header-btn drawer-btn" data-action="notifications">Notifications</button>
                    <button class="header-btn drawer-btn" data-action="upload">Upload</button>
                    <button class="header-btn drawer-btn" data-action="login">Login / Sign up</button>
                    <button class="header-btn drawer-btn" data-action="logout">Logout</button>
                    <button class="header-btn drawer-btn" data-action="admin" style="display:none;">Admin</button>
                </div>
            </div>
        </header>
    `;

    try {
        const response = await fetch("shared-header.html", { cache: "no-store" });
        if (!response.ok) {
            console.warn("Could not load shared header:", response.statusText);
            headerContainer.innerHTML = fallbackHeader;
            return;
        }
        headerContainer.innerHTML = await response.text();
    } catch (error) {
        console.warn("Shared header load failed:", error);
        headerContainer.innerHTML = fallbackHeader;
    }
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

document.addEventListener("DOMContentLoaded", async () => {
    await loadSharedHeader();

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
            case "requests":
                window.location.href = "requests.html";
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
                sessionStorage.removeItem("CURRENT_USER");
                sessionStorage.removeItem("CURRENT_USER_NAME");
                sessionStorage.removeItem("CURRENT_USER_EMAIL");
                sessionStorage.removeItem("CURRENT_USER_ID");
                sessionStorage.removeItem("CURRENT_USER_ROLE");
                sessionStorage.removeItem("CURRENT_USER_POINTS");
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
        const isAdmin = sessionStorage.getItem("CURRENT_USER_ROLE") === "admin";
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

            sessionStorage.removeItem("CURRENT_USER");
            sessionStorage.removeItem("CURRENT_USER_NAME");
            sessionStorage.removeItem("CURRENT_USER_EMAIL");
            sessionStorage.removeItem("CURRENT_USER_ID");
            sessionStorage.removeItem("CURRENT_USER_ROLE");
            sessionStorage.removeItem("CURRENT_USER_POINTS");

            window.CURRENT_USER = null;

            showToast("Logged out.", "info");

            try { checkAndApplyRatingPenalties(); } catch (e) { console.error(e); }

            // Go to index feed without full reload (best-effort)
            try { loadIndexWithoutReload(); } catch (e) { window.location.href = 'index.html'; }
        }
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

        case "admin":

            if (!requireLogin()) return;

            if (typeof initAdmin === "function") {
                initAdmin();
             }

            break;
    }
});
