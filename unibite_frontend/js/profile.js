// ../js/profile.js

function initProfile() {
    console.log("initProfile called");
    renderProfileHeader();
    loadUserListings();
}

function renderProfileHeader() {
    const nameEl = document.querySelector(".profile-info h3");
    const pointsEl = document.querySelector(".profile-info .profile-points");
    const profile = getCurrentUserProfile();

    if (nameEl && window.CURRENT_USER) {
        const display = String(window.CURRENT_USER).startsWith("@") ? window.CURRENT_USER : `@${window.CURRENT_USER}`;
        nameEl.textContent = display;
    }

    if (pointsEl) {
        pointsEl.textContent = `Points: ${profile?.points ?? 0}`;
    }
}

function loadUserListings() {
    const container = document.getElementById("profile-listings");
    if (!container) return;
    container.innerHTML = "";

    const meals = JSON.parse(localStorage.getItem("meals") || "[]");
    const userMeals = meals.filter(meal => normalizeUser(meal.user) === normalizeUser(window.CURRENT_USER));

    if (userMeals.length === 0) {
        container.innerHTML = "<p>No listings yet. Upload a meal!</p>";
        return;
    }

    userMeals.sort((a, b) => (Number(b.ts || b.id || 0) - Number(a.ts || a.id || 0)));

    userMeals.forEach(meal => {
        const div = document.createElement("div");
        div.className = "listing";
        div.dataset.id = meal.id;

        div.innerHTML = `
            <div style="display:flex;gap:12px;align-items:center;">
                <div style="width:84px;height:84px;border-radius:8px;overflow:hidden;background:#eee;flex-shrink:0;">
                    ${meal.image ? `<img src="${meal.image}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#999">No Image</div>`}
                </div>
                <div style="flex:1">
                    <h3 style="margin:0 0 6px 0">${escapeHtml(meal.title)}</h3>
                    <p style="margin:0 0 6px 0;color:#555">${escapeHtml(meal.desc)}</p>
                    <small>Category: ${escapeHtml(meal.category || "n/a")}</small><br>
                    <small>Status: ${escapeHtml(meal.status || "available")}</small>
                    <div style="margin-top:8px;display:flex;gap:8px;">
                        <button class="edit-btn msg-btn">Edit</button>
                        <button class="delete-btn msg-btn">Delete</button>
                        <button class="toggle-btn msg-btn">${meal.status === "received" ? "Mark Available" : "Mark Received"}</button>
                        <button class="view-btn msg-btn">View</button>
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

function deleteMeal(id) {
    let meals = JSON.parse(localStorage.getItem("meals") || "[]");
    meals = meals.filter(m => String(m.id) !== String(id));
    localStorage.setItem("meals", JSON.stringify(meals));
    alert("Meal deleted!");
}

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
    alert("Status updated!");
}

function openListingPage(listingId) {
    window.location.href = `listing.html?id=${encodeURIComponent(listingId)}`;
}

window.initProfile = initProfile;
