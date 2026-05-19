// notifications.js - Requests and messages tabbed dashboard
// This file renders the notifications page, including requests and
// message tabs, and provides tools to handle request approval, pickup,
// delivery confirmation, no-shows, and rating flow.

let currentNotificationTab = "requests";

function initNotifications() {
    console.log("initNotifications called");

    // Mark all visible notifications as read when opening the notifications page
    let notifications = JSON.parse(localStorage.getItem("notifications") || "[]");
    let changed = false;
    notifications = notifications.map(note => {
        if (normalizeUser(note.to) === normalizeUser(window.CURRENT_USER) && !note.read) {
            changed = true;
            return { ...note, read: true };
        }
        return note;
    });
    if (changed) {
        localStorage.setItem("notifications", JSON.stringify(notifications));
    }
    if (typeof updateNotificationBadge === "function") {
        updateNotificationBadge();
    }

    const tabs = document.querySelectorAll(".tab-btn");
    tabs.forEach(btn => {
        btn.addEventListener("click", () => {
            setNotificationsTab(btn.dataset.tab);
        });
    });

    loadRequestsForNotifications();
    loadMessagesForNotifications();
    setNotificationsTab("requests");

    const requests = JSON.parse(localStorage.getItem("requests") || "[]");
    const myRequests = requests.filter(r =>
        normalizeUser(r.from) === normalizeUser(window.CURRENT_USER)
        ||
        normalizeUser(r.to) === normalizeUser(window.CURRENT_USER)
    );
    if (myRequests.length > 0) {
        showRequestDetail(myRequests[0].mealId, myRequests[0]);
    }
}

// Switch between the 'requests' and 'messages' tabs on the notifications page.
function setNotificationsTab(tab) {
    currentNotificationTab = tab;
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === tab);
    });

    const requestsPanel = document.getElementById("requests-list");
    const messagesPanel = document.getElementById("messages-list");

    if (requestsPanel) {
        requestsPanel.style.display = tab === "requests" ? "block" : "none";
    }
    if (messagesPanel) {
        messagesPanel.style.display = tab === "messages" ? "block" : "none";
    }
}

// Load the cook/consumer request list and render each request card.
function loadRequestsForNotifications() {
    const container = document.getElementById("requests-list");
    if (!container) return;
    
    const requests = JSON.parse(localStorage.getItem("requests") || "[]");
    const myRequests = requests
        .filter(r =>
            normalizeUser(r.from) === normalizeUser(window.CURRENT_USER)
            ||
            normalizeUser(r.to) === normalizeUser(window.CURRENT_USER)
        )
        .sort((a, b) => {
            const getKey = req => Number(req.ts || parseInt(String(req.id || "").replace(/\D/g, ""), 10) || 0);
            return getKey(b) - getKey(a);
        });
    
    if (myRequests.length === 0) {
        container.innerHTML = "<p style='text-align:center;padding:20px;color:#999;'>No requests yet.</p>";
        return;
    }
    
    container.innerHTML = "";
    
    myRequests.forEach(req => {
        const box = document.createElement("div");
        box.className = "notification-box request-item";
        box.style.cursor = "pointer";
        
        const actionButtons = [];
        const isCook = normalizeUser(req.to) === normalizeUser(window.CURRENT_USER);
        const isConsumer = normalizeUser(req.from) === normalizeUser(window.CURRENT_USER);
        
        if (req.status === "pending" && isCook) {
            actionButtons.push(`<button class="approve-btn" data-req-id="${req.id}">Accept</button>`);
            actionButtons.push(`<button class="reject-btn" data-req-id="${req.id}">Reject</button>`);
        } else if (req.status === "sent" && isCook) {
            actionButtons.push(`<button class="sent-status-btn" disabled style="opacity:0.6;cursor:not-allowed;">Waiting for customer pickup</button>`);
            actionButtons.push(`<button class="no-show-btn" data-req-id="${req.id}" style="background:#d32f2f;">No-show</button>`);
        } else if (req.status === "sent" && isConsumer) {
            actionButtons.push(`<button class="pickup-btn" data-req-id="${req.id}" style="background:#4caf50;">Mark Picked Up</button>`);
        } else if (req.status === "picked-up" && isCook) {
            actionButtons.push(`<button class="delivered-btn" data-req-id="${req.id}">Confirm Received</button>`);
            actionButtons.push(`<button class="no-show-btn" data-req-id="${req.id}" style="background:#d32f2f;">No-show</button>`);
        } else if (req.status === "picked-up" && isConsumer) {
            actionButtons.push(`<button class="pending-btn" disabled style="opacity:0.6;cursor:not-allowed;">Pickup reported to cook</button>`);
        } else if (req.status === "delivered" && isConsumer && !window.hasUserRatedDelivery(req.id)) {
            actionButtons.push(`<button class="rating-btn" data-req-id="${req.id}" style="background:#2196F3;">Rate Meal</button>`);
            actionButtons.push(`<button class="delivered-status-btn" disabled style="opacity:0.8;cursor:not-allowed;">✓ Delivered</button>`);
        } else if (req.status === "delivered") {
            actionButtons.push(`<button class="delivered-status-btn" disabled style="opacity:0.8;cursor:not-allowed;">✓ Delivered</button>`);
        } else if (req.status === "no-show") {
            actionButtons.push(`<button class="no-show-status-btn" disabled style="opacity:0.8;cursor:not-allowed;">No-show</button>`);
        }
        
        box.innerHTML = `
            <div class="request-header" style="display:flex;justify-content:space-between;align-items:center;">
                <div style="flex:1;">
                    <h4 style="margin:0 0 6px 0;">${escapeHtml(req.mealTitle)}</h4>
                    <p style="margin:2px 0;font-size:14px;"><strong>From:</strong> ${escapeHtml(req.from)}</p>
                    <p style="margin:2px 0;font-size:14px;"><strong>To:</strong> ${escapeHtml(req.to)}</p>
                    <p style="margin:2px 0;font-size:14px;"><strong>Status:</strong> <span class="status-badge ${req.status}">${escapeHtml(req.status)}</span></p>
                </div>
            </div>
            <div class="notification-actions" style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
                ${actionButtons.join("")}
            </div>
        `;
        
        box.addEventListener("click", (e) => {
            if (!e.target.closest("button")) {
                showRequestDetail(req.mealId, req);
            }
        });
        
        const deliveredBtn = box.querySelector(".delivered-btn");
        const pickupBtn = box.querySelector(".pickup-btn");
        const approveBtn = box.querySelector(".approve-btn");
        const rejectBtn = box.querySelector(".reject-btn");
        const ratingBtn = box.querySelector(".rating-btn");
        
        if (pickupBtn) {
            pickupBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                markRequestPickedUp(req.id);
                setTimeout(() => loadRequestsForNotifications(), 300);
                setTimeout(() => loadMessagesForNotifications(), 300);
            });
        }

        if (deliveredBtn) {
            deliveredBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                markRequestAsDelivered(req.id);
                setTimeout(() => loadRequestsForNotifications(), 300);
                setTimeout(() => loadMessagesForNotifications(), 300);
            });
        }

        const noShowBtn = box.querySelector(".no-show-btn");
        if (noShowBtn) {
            noShowBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                markRequestNoShow(req.id);
                setTimeout(() => loadRequestsForNotifications(), 300);
                setTimeout(() => loadMessagesForNotifications(), 300);
            });
        }
        
        if (approveBtn) {
            approveBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                updateRequestStatus(req.id, "sent");
                setTimeout(() => loadRequestsForNotifications(), 300);
                setTimeout(() => loadMessagesForNotifications(), 300);
            });
        }
        
        if (rejectBtn) {
            rejectBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                updateRequestStatus(req.id, "rejected");
                setTimeout(() => loadRequestsForNotifications(), 300);
                setTimeout(() => loadMessagesForNotifications(), 300);
            });
        }
        
        if (ratingBtn) {
            ratingBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                showRatingModal(req.id);
            });
        }
        
        container.appendChild(box);
    });
}

// Load personal notification messages and display them in the messages tab.
function loadMessagesForNotifications() {
    const container = document.getElementById("messages-list");
    if (!container) return;

    const notifications = JSON.parse(localStorage.getItem("notifications") || "[]");
    const myMessages = notifications
        .filter(n => normalizeUser(n.to) === normalizeUser(window.CURRENT_USER))
        .sort((a, b) => (b.ts || 0) - (a.ts || 0));

    if (myMessages.length === 0) {
        container.innerHTML = "<p style='text-align:center;padding:20px;color:#999;'>No messages yet.</p>";
        return;
    }

    container.innerHTML = "";

    myMessages.forEach(note => {
        const box = document.createElement("div");
        box.className = "notification-box message-item";
        box.style.cursor = "pointer";

        const formattedDate = new Date(note.ts || Date.now()).toLocaleString();
        const sourceLabel = escapeHtml(note.from || "System");
        const typeLabel = escapeHtml(note.type || "message");

        box.innerHTML = `
            <div class="request-header" style="display:flex;justify-content:space-between;align-items:center;">
                <div style="flex:1;">
                    <h4 style="margin:0 0 6px 0;">${escapeHtml(note.mealTitle || "Notification")}</h4>
                    <p style="margin:2px 0;font-size:14px;"><strong>From:</strong> ${sourceLabel}</p>
                    <p style="margin:2px 0;font-size:14px;"><strong>Type:</strong> ${typeLabel}</p>
                    <p style="margin:2px 0;font-size:12px;color:#666;">${formattedDate}</p>
                </div>
            </div>
            <div class="message-text">${escapeHtml(note.message)}</div>
            ${note.requestId ? `<div class="notification-actions" style="margin-top:10px;"><button class="view-request-btn" data-request-id="${note.requestId}">View Request</button></div>` : ""}
        `;

        box.addEventListener("click", (e) => {
            if (e.target.closest(".view-request-btn")) return;
            showMessageDetail(note);
        });

        const viewBtn = box.querySelector(".view-request-btn");
        if (viewBtn) {
            viewBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const requests = JSON.parse(localStorage.getItem("requests") || "[]");
                const req = requests.find(r => r.id === note.requestId);
                if (req) {
                    setNotificationsTab("requests");
                    showRequestDetail(req.mealId, req);
                }
            });
        }

        container.appendChild(box);
    });
}

// Show the full details of a selected notification message.
function showMessageDetail(note) {
    const detailContainer = document.getElementById("detail-content");
    if (!detailContainer) return;

    const request = note.requestId ? JSON.parse(localStorage.getItem("requests") || "[]").find(r => r.id === note.requestId) : null;
    const dateText = new Date(note.ts || Date.now()).toLocaleString();

    detailContainer.innerHTML = `
        <div class="meal-detail">
            <h2 style="margin:0 0 12px 0;">Message Details</h2>
            <p><strong>From:</strong> ${escapeHtml(note.from || "System")}</p>
            <p><strong>To:</strong> ${escapeHtml(note.to)}</p>
            <p><strong>Type:</strong> ${escapeHtml(note.type || "notification")}</p>
            <p style="margin:8px 0;"><strong>Message:</strong> ${escapeHtml(note.message)}</p>
            <p style="margin:8px 0;color:#666;"><strong>Received:</strong> ${dateText}</p>
            ${request ? `<p style="margin:8px 0;"><strong>Request Status:</strong> ${escapeHtml(request.status)}</p>` : ""}
        </div>
    `;
}

// Show extended request details in the right-hand panel for a selected request.
function showRequestDetail(mealId, request) {
    const detailContainer = document.getElementById("detail-content");
    if (!detailContainer) return;
    
    const meals = JSON.parse(localStorage.getItem("meals") || "[]");
    const meal = meals.find(m => m.id === mealId);
    
    if (!meal) {
        detailContainer.innerHTML = "<p>Meal not found.</p>";
        return;
    }
    
    const statusClass = meal.status === "received" || (meal.quantity !== null && meal.quantity <= 0) ? "unavailable" : "available";
    const statusText = meal.status === "received" ? "Received" : (meal.quantity !== null && meal.quantity <= 0 ? "Out of Stock" : "Available");
    
    detailContainer.innerHTML = `
        <div class="meal-detail">
            <div class="detail-image" style="background:url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22%3E%3Crect fill=%22%23ddd%22 width=%22200%22 height=%22200%22/%3E%3C/svg%3E') center/cover; height:250px; border-radius:8px; margin-bottom:15px;">
            ${meal.image ? `<img src="${escapeHtml(meal.image)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">` : ''}
        </div>
        <h2 style="margin:15px 0 10px 0;">${escapeHtml(meal.title)}</h2>
        <p style="color:#666;margin:5px 0 15px 0;font-size:14px;">${escapeHtml(meal.desc)}</p>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:15px;">
            <div style="background:#f5f5f5;padding:10px;border-radius:4px;">
                <strong style="font-size:12px;color:#666;">CATEGORY</strong>
                <p style="margin:4px 0 0 0;font-size:14px;">${escapeHtml(meal.category)}</p>
            </div>
            <div style="background:#f5f5f5;padding:10px;border-radius:4px;">
                <strong style="font-size:12px;color:#666;">PORTIONS</strong>
                <p style="margin:4px 0 0 0;font-size:14px;">${meal.quantity == null ? 1 : meal.quantity}</p>
            </div>
            <div style="background:#f5f5f5;padding:10px;border-radius:4px;">
                <strong style="font-size:12px;color:#666;">STATUS</strong>
                <p style="margin:4px 0 0 0;font-size:14px;"><span class="status-label ${statusClass}">${statusText}</span></p>
            </div>
            <div style="background:#f5f5f5;padding:10px;border-radius:4px;">
                <strong style="font-size:12px;color:#666;">REQUEST STATUS</strong>
                <p style="margin:4px 0 0 0;font-size:14px;"><span class="status-badge ${request.status}">${escapeHtml(request.status)}</span></p>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:15px;">
            <div style="background:#f8f9fa;padding:10px;border-radius:4px;">
                <strong style="font-size:12px;color:#666;">REQUEST FROM</strong>
                <p style="margin:4px 0 0 0;font-size:14px;">${escapeHtml(request.from)}</p>
            </div>
            <div style="background:#f8f9fa;padding:10px;border-radius:4px;">
                <strong style="font-size:12px;color:#666;">REQUEST TO</strong>
                <p style="margin:4px 0 0 0;font-size:14px;">${escapeHtml(request.to)}</p>
            </div>
        </div>
        
        <div style="background:#f9f9f9;padding:12px;border-radius:4px;margin-bottom:15px;border-left:3px solid #349e54;">
            <p style="margin:5px 0;font-size:13px;"><strong>📍 Pickup Location:</strong> ${escapeHtml(meal.pickupLocation || "N/A")}</p>
            <p style="margin:5px 0;font-size:13px;"><strong>🕐 Pickup Time:</strong> ${escapeHtml(meal.pickupTime || "N/A")}</p>
            <p style="margin:5px 0;font-size:13px;"><strong>👨‍🍳 Cook:</strong> ${escapeHtml(meal.user)}</p>
        </div>
        
        ${meal.allergens && meal.allergens.length > 0 ? `
        <div style="background:#fff3cd;padding:12px;border-radius:4px;margin-bottom:15px;border-left:3px solid #ff9800;">
            <p style="margin:0;font-size:13px;"><strong>⚠️ Allergens:</strong> ${escapeHtml(meal.allergens.join(", "))}</p>
        </div>
        ` : ''}
        
        <div style="display:flex;gap:10px;margin-top:15px;">
            <button id="view-listing-btn" class="approve-btn" style="flex:1;">View Full Listing</button>
        </div>
    `;
    
    const viewBtn = document.getElementById("view-listing-btn");
    if (viewBtn) {
        viewBtn.addEventListener("click", () => {
            window.location.href = `listing.html?id=${encodeURIComponent(mealId)}`;
        });
    }
}

// Mark a request as delivered and notify the requesting user.
function markRequestAsDelivered(requestId) {
    let requests = JSON.parse(localStorage.getItem("requests") || "[]");
    const request = requests.find(r => r.id === requestId);
    
    if (!request) return;
    
    requests = requests.map(r => {
        if (r.id === requestId) {
            r.status = "delivered";
            r.delivered_ts = Date.now();
        }
        return r;
    });
    localStorage.setItem("requests", JSON.stringify(requests));
    
    // Send notification to the consumer
    const notifications = JSON.parse(localStorage.getItem("notifications") || "[]");
    notifications.push({
        id: `note_${Date.now()}`,
        type: "delivery-confirmation",
        requestId: request.id,
        mealId: request.mealId,
        mealTitle: request.mealTitle,
        from: window.CURRENT_USER,
        to: request.from,
        message: `Your order for "${request.mealTitle}" has been received! Please rate your experience within 48 hours.`,
        read: false,
        ts: Date.now()
    });
    localStorage.setItem("notifications", JSON.stringify(notifications));
    
    // Update the request.js badge if needed
    if (typeof updateNotificationBadge === "function") {
        updateNotificationBadge();
    }
}

// Set a request status to picked-up and send a notification to the cook.
function markRequestPickedUp(requestId) {
    let requests = JSON.parse(localStorage.getItem("requests") || "[]");
    let updated = null;

    requests = requests.map(r => {
        if (r.id === requestId) {
            updated = { ...r, status: "picked-up", pickedUp_ts: Date.now() };
            return updated;
        }
        return r;
    });

    if (!updated) return;

    localStorage.setItem("requests", JSON.stringify(requests));

    let notifications = JSON.parse(localStorage.getItem("notifications") || "[]");
    notifications.push({
        id: `note_${Date.now()}`,
        type: "pickup-notice",
        requestId: updated.id,
        mealId: updated.mealId,
        mealTitle: updated.mealTitle,
        from: window.CURRENT_USER,
        to: updated.to,
        message: `The consumer marked the meal "${updated.mealTitle}" as picked up. Please confirm receipt.`,
        read: false,
        ts: Date.now()
    });
    localStorage.setItem("notifications", JSON.stringify(notifications));

    if (typeof updateNotificationBadge === "function") {
        updateNotificationBadge();
    }
}

// Mark a request as no-show, return inventory, and apply a penalty point.
function markRequestNoShow(requestId) {
    let requests = JSON.parse(localStorage.getItem("requests") || "[]");
    let updated = null;

    requests = requests.map(r => {
        if (r.id === requestId) {
            updated = { ...r, status: "no-show", noShow_ts: Date.now() };
            return updated;
        }
        return r;
    });

    if (!updated) return;

    localStorage.setItem("requests", JSON.stringify(requests));

    let meals = JSON.parse(localStorage.getItem("meals") || "[]");
    meals = meals.map(m => {
        if (String(m.id) === String(updated.mealId)) {
            m.quantity = Number(m.quantity == null ? 1 : m.quantity) + 1;
            if (m.quantity > 0 && m.status !== "expired") {
                m.status = "available";
            }
        }
        return m;
    });
    localStorage.setItem("meals", JSON.stringify(meals));

    addUserPoints(updated.from, -1);

    let notifications = JSON.parse(localStorage.getItem("notifications") || "[]");
    notifications.push({
        id: `note_${Date.now()}`,
        type: "request-no-show",
        requestId: updated.id,
        mealId: updated.mealId,
        mealTitle: updated.mealTitle,
        from: window.CURRENT_USER,
        to: updated.from,
        message: `The cook marked your request for "${updated.mealTitle}" as no-show. -1 point penalty applied.`,
        read: false,
        ts: Date.now()
    });
    localStorage.setItem("notifications", JSON.stringify(notifications));

    if (typeof updateNotificationBadge === "function") {
        updateNotificationBadge();
    }
}

window.initNotifications = initNotifications;
