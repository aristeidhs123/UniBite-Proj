// ../js/profile.js
// Handles the profile page display and editing experience.
// Includes profile summary, photo upload preview, personal info editing,
// and list of current user's meal listings.

let selectedProfilePhoto = null;

function initProfile() {
    console.log("initProfile called");
    renderProfileSummary();
    loadProfileEditForm();
    loadUserListings();
    loadUserOrders();
    initProfileTabs();

    const editBtn = document.getElementById("edit-profile-btn");
    const cancelBtn = document.getElementById("cancel-profile-btn");
    const photoInput = document.getElementById("profile-photo-input");
    const form = document.getElementById("profile-form");

    if (editBtn) {
        editBtn.addEventListener("click", () => {
            toggleProfileEditPanel(true);
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
            toggleProfileEditPanel(false);
        });
    }

    if (photoInput) {
        photoInput.addEventListener("change", handleProfilePhotoChange);
    }

    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            saveProfile();
        });
    }
}

function renderProfileSummary() {
    const usernameEl = document.getElementById("profile-username");
    const pointsEl = document.getElementById("profile-points");
    const emailDisplay = document.getElementById("profile-email-display");
    const locationDisplay = document.getElementById("profile-location-display");
    const displayNameEl = document.getElementById("profile-display-name");
    const avatarImg = document.getElementById("profile-avatar-image");
    const avatarInitials = document.getElementById("profile-avatar-initials");

    const profile = getCurrentUserProfile();
    const username = profile?.username || window.CURRENT_USER || "";
    const displayName = profile?.displayName || username;
    const email = profile?.email || "-";
    const location = profile?.location || "-";
    const photo = profile?.photo || "";

    if (displayNameEl) {
        displayNameEl.textContent = displayName;
    }
    if (usernameEl) {
        usernameEl.textContent = username;
    }
    if (pointsEl) {
        pointsEl.textContent = profile?.points ?? 0;
    }
    if (emailDisplay) {
        emailDisplay.textContent = `Email: ${email}`;
    }
    if (locationDisplay) {
        locationDisplay.textContent = `Location: ${location}`;
    }

    if (photo && avatarImg) {
        avatarImg.src = photo;
        avatarImg.style.display = "block";
        avatarInitials.style.display = "none";
    } else {
        if (avatarImg) avatarImg.style.display = "none";
        if (avatarInitials) {
            avatarInitials.style.display = "block";
            avatarInitials.textContent = getInitials(displayName || username);
        }
    }
}

function loadProfileEditForm() {
    const displayNameInput = document.getElementById("profile-display-name-input");
    const emailInput = document.getElementById("profile-email-input");
    const locationInput = document.getElementById("profile-location-input");
    const profilePhotoPreviewWrap = document.getElementById("profile-photo-preview-wrap");
    const profilePhotoPreview = document.getElementById("profile-photo-preview");

    const profile = getCurrentUserProfile();
    const displayName = profile?.displayName || profile?.username || window.CURRENT_USER || "";

    if (displayNameInput) {
        displayNameInput.value = displayName;
    }
    if (emailInput) {
        emailInput.value = profile?.email || "";
    }
    if (locationInput) {
        locationInput.value = profile?.location || "";
    }

    selectedProfilePhoto = profile?.photo || null;
    if (selectedProfilePhoto && profilePhotoPreview && profilePhotoPreviewWrap) {
        profilePhotoPreview.src = selectedProfilePhoto;
        profilePhotoPreviewWrap.style.display = "block";
    } else if (profilePhotoPreviewWrap) {
        profilePhotoPreviewWrap.style.display = "none";
    }

    toggleProfileEditPanel(false);
}

function toggleProfileEditPanel(show) {
    const panel = document.getElementById("profile-edit-panel");
    if (!panel) return;
    if (typeof show === "boolean") {
        panel.classList.toggle("hidden", !show);
    } else {
        panel.classList.toggle("hidden");
    }
}

function handleProfilePhotoChange(event) {
    const file = event.target.files[0];
    const previewWrap = document.getElementById("profile-photo-preview-wrap");
    const preview = document.getElementById("profile-photo-preview");

    if (!file || !preview || !previewWrap) {
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        selectedProfilePhoto = reader.result;
        preview.src = reader.result;
        previewWrap.style.display = "block";
    };
    reader.readAsDataURL(file);
}

function getInitials(text) {
    const words = String(text).trim().split(/\s+/);
    if (words.length === 0) return "?";
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
}

function saveProfile() {
    const displayNameInput = document.getElementById("profile-display-name-input");
    const emailInput = document.getElementById("profile-email-input");
    const locationInput = document.getElementById("profile-location-input");

    if (!displayNameInput || !emailInput || !locationInput) {
        return;
    }

    const profile = getCurrentUserProfile();
    if (!profile) return;

    const updated = {
        ...profile,
        displayName: displayNameInput.value.trim() || profile.username,
        email: emailInput.value.trim(),
        location: locationInput.value.trim(),
        photo: selectedProfilePhoto || profile.photo || ""
    };

    updateUserProfile(updated);
    showToast("Profile updated successfully.", "success");
    renderProfileSummary();
    loadProfileEditForm();
}

// Load all meal listings created by the current user into the profile page.
function loadUserListings() {
    const container = document.getElementById("profile-listings");
    if (!container) return;
    container.innerHTML = "";

    const meals = JSON.parse(localStorage.getItem("meals") || "[]");
    // Exclude meals that were marked deleted (kept for statistics)
    const userMeals = meals.filter(meal => normalizeUser(meal.user) === normalizeUser(window.CURRENT_USER) && String(meal.status || "") !== "deleted");

    if (userMeals.length === 0) {
        container.innerHTML = "<p style='text-align:center;padding:20px;color:#666;'>No cooked meals yet. Upload a meal!</p>";
        return;
    }

    userMeals.sort((a, b) => (Number(b.ts || b.id || 0) - Number(a.ts || a.id || 0)));

    userMeals.forEach(meal => {
        const div = document.createElement("div");
        div.className = "listing";
        div.dataset.id = meal.id;

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
                        <button class="edit-btn msg-btn">Edit</button>
                        <button class="delete-btn msg-btn">Delete</button>
                        <button class="toggle-btn msg-btn">${meal.status === "received" ? "Mark Available" : "Mark Received"}</button>
                        <button class="view-btn msg-btn">View</button>
                    </div>
                    <div style="margin-top:6px;font-size:13px;color:#666;">
                        <strong>Status:</strong> ${escapeHtml(meal.status || "available")}
                    </div>
                </div>
            </div>
        `;

        const editBtn = div.querySelector(".edit-btn");
        const deleteBtn = div.querySelector(".delete-btn");
        const toggleBtn = div.querySelector(".toggle-btn");
        const viewBtn = div.querySelector(".view-btn");

        if (editBtn) editBtn.addEventListener("click", (e) => { e.stopPropagation(); localStorage.setItem("editMealId", meal.id); window.location.href = "upload.html"; });
        if (deleteBtn) deleteBtn.addEventListener("click", (e) => { e.stopPropagation(); if (!confirm("Delete this listing?")) return; deleteMeal(meal.id); loadUserListings(); });
        if (toggleBtn) toggleBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleReceived(meal.id); loadUserListings(); });
        if (viewBtn) viewBtn.addEventListener("click", (e) => { e.stopPropagation(); openListingPage(meal.id); });

        div.addEventListener("click", (e) => { if (e.target.closest("button")) return; openListingPage(meal.id); });

        container.appendChild(div);
    });
}

function initProfileTabs() {
    const tabs = document.querySelectorAll(".profile-tab-btn");
    tabs.forEach(btn => {
        btn.addEventListener("click", () => {
            setProfileTab(btn.dataset.tab);
        });
    });
    setProfileTab("meals");
}

function setProfileTab(tab) {
    document.querySelectorAll(".profile-tab-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === tab);
    });
    const mealsPanel = document.getElementById("profile-meals-panel");
    const ordersPanel = document.getElementById("profile-orders-panel");
    if (mealsPanel) {
        mealsPanel.classList.toggle("hidden", tab !== "meals");
    }
    if (ordersPanel) {
        ordersPanel.classList.toggle("hidden", tab !== "orders");
    }
}

function loadUserOrders() {
    const container = document.getElementById("profile-orders");
    if (!container) return;
    container.innerHTML = "";

    const requests = JSON.parse(localStorage.getItem("requests") || "[]");
    const userOrders = requests
        .filter(req => normalizeUser(req.from) === normalizeUser(window.CURRENT_USER))
        .sort((a, b) => {
            const getKey = req => Number(req.ts || req.sent_ts || parseInt(String(req.id || "").replace(/\D/g, ""), 10) || 0);
            return getKey(b) - getKey(a);
        });

    if (userOrders.length === 0) {
        container.innerHTML = "<p style='text-align:center;padding:20px;color:#666;'>No orders yet.</p>";
        return;
    }

    userOrders.forEach(req => {
        const div = document.createElement("div");
        div.className = "listing profile-order-card";
        const orderDate = req.sent_ts ? new Date(req.sent_ts).toLocaleDateString() : "Unknown date";
        div.innerHTML = `
            <h4>${escapeHtml(req.mealTitle || "Meal")}</h4>
            <p style="margin:4px 0;"><strong>Cook:</strong> ${escapeHtml(req.to || "-")}</p>
            <p style="margin:4px 0;"><strong>Status:</strong> ${escapeHtml(req.status || "pending")}</p>
            <p class="order-status">Ordered on ${escapeHtml(orderDate)}</p>
        `;
        container.appendChild(div);
    });
}

// Mark a meal listing as deleted without removing it completely from storage.
function deleteMeal(id) {
    let meals = JSON.parse(localStorage.getItem("meals") || "[]");
    meals = meals.map(m => {
        if (String(m.id) === String(id)) {
            return { ...m, status: "deleted", deleted_ts: Date.now() };
        }
        return m;
    });
    localStorage.setItem("meals", JSON.stringify(meals));
    showToast("Meal marked deleted (kept for statistics).", "success");
}

// Toggle the meal status between received and available on the profile page.
function toggleReceived(id) {
    let meals = JSON.parse(localStorage.getItem("meals") || "[]");
    meals = meals.map(m => {
        if (String(m.id) === String(id)) {
            const newStatus = m.status === "received" ? "available" : "received";
            return { ...m, status: newStatus };
        }
        return m;
    });
    localStorage.setItem("meals", JSON.stringify(meals));
    showToast("Status updated!", "success");
}

function openListingPage(listingId) {
    window.location.href = `listing.html?id=${encodeURIComponent(listingId)}`;
}

window.initProfile = initProfile;
