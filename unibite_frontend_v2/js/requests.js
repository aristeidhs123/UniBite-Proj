// ../js/requests.js
// Displays request cards for the logged-in cook user.
// This file loads incoming meal requests, allows approve/reject flow,
// and updates request status in localStorage.

function initRequests() {

    const container = document.getElementById("requests-list");

    if (!container) return;

    const requests = JSON.parse(localStorage.getItem("requests") || "[]");

    const myRequests = requests
        .filter(r => normalizeUser(r.to) === normalizeUser(window.CURRENT_USER))
        .sort((a, b) => {
            const getKey = req => Number(req.ts || parseInt(String(req.id || "").replace(/\D/g, ""), 10) || 0);
            return getKey(b) - getKey(a);
        });

    if (myRequests.length === 0) {
        container.innerHTML = "<p>No requests yet.</p>";
        return;
    }

    container.innerHTML = "";

    myRequests.forEach(req => {

        const box = document.createElement("div");

        box.className = "request-box";

        const actionButtons = [];

        if (req.status === "pending") {
            actionButtons.push(`<button class="approve-btn">Approve</button>`);
            actionButtons.push(`<button class="reject-btn">Reject</button>`);
        } else if (req.status === "sent") {
            actionButtons.push(`<button class="sent-status-btn" disabled style="opacity:0.6;cursor:not-allowed;">Waiting for customer pickup</button>`);
        } else if (req.status === "delivered") {
            actionButtons.push(`<button class="delivered-status-btn" disabled style="opacity:0.8;cursor:not-allowed;">✓ Delivered</button>`);
        }

        box.innerHTML = `
            <h3>${escapeHtml(req.mealTitle)}</h3>

            <p><strong>From:</strong> ${escapeHtml(req.from)}</p>

            <p><strong>Status:</strong> ${escapeHtml(req.status)}</p>

            <div class="req-buttons">
                ${actionButtons.join("")}
            </div>
        `;

        const approveBtn = box.querySelector(".approve-btn");
        const rejectBtn = box.querySelector(".reject-btn");

        if (approveBtn) {
            approveBtn.addEventListener("click", () => {
                updateRequestStatus(req.id, "sent");
            });
        }

        if (rejectBtn) {
            rejectBtn.addEventListener("click", () => {
                updateRequestStatus(req.id, "rejected");
            });
        }

        container.appendChild(box);
    });
}

// Update the stored request status and produce side effects like notifications,
// meal quantity changes, and point adjustments.
function updateRequestStatus(requestId, status) {

    let requests = JSON.parse(localStorage.getItem("requests") || "[]");

    let updatedRequest = null;

    requests = requests.map(r => {
        if (r.id === requestId) {
            updatedRequest = { ...r, status };
            if (status === "sent") {
                updatedRequest.sent_ts = Date.now();
            }
            if (status === "delivered") {
                updatedRequest.delivered_ts = Date.now();
            }
            if (status === "no-show") {
                updatedRequest.noShow_ts = Date.now();
            }
            return updatedRequest;
        }
        return r;
    });

    localStorage.setItem("requests", JSON.stringify(requests));

    if (!updatedRequest) {
        initRequests();
        return;
    }

    const notifications = JSON.parse(
        localStorage.getItem("notifications") || "[]"
    );

    if (status === "sent") {
        let meals = mealService.getAll();
        meals = meals.map(m => {
            if (String(m.id) === String(updatedRequest.mealId)) {
                m.quantity = Math.max(0, Number(m.quantity == null ? 1 : m.quantity) - 1);
                if (m.quantity <= 0 && m.status !== "expired") {
                    m.status = "received";
                }
            }
            return m;
        });
        localStorage.setItem("meals", JSON.stringify(meals));
    }

    if (status === "rejected") {
        if (updatedRequest.reservedPoints) {
            addUserPoints(updatedRequest.from, 1);
        }
    }

    if (status === "no-show") {
        addUserPoints(updatedRequest.from, -1);
        let meals = mealService.getAll();
        meals = meals.map(m => {
            if (String(m.id) === String(updatedRequest.mealId)) {
                m.quantity = Number(m.quantity == null ? 1 : m.quantity) + 1;
                if (m.quantity > 0 && m.status !== "expired") {
                    m.status = "available";
                }
            }
            return m;
        });
        localStorage.setItem("meals", JSON.stringify(meals));
    }

    let message = `Your request for "${updatedRequest.mealTitle}" was ${status}.`;
    if (status === "sent") {
        message = `The cook accepted your request for "${updatedRequest.mealTitle}". Please pick it up soon.`;
    } else if (status === "rejected") {
        message = `The cook rejected your request for "${updatedRequest.mealTitle}".`;
    } else if (status === "delivered") {
        message = `Your order for "${updatedRequest.mealTitle}" is complete. Thank you!`;
        addUserPoints(updatedRequest.to, 1);
    } else if (status === "no-show") {
        message = `The cook marked your request for "${updatedRequest.mealTitle}" as no-show. -1 point penalty applied.`;
    }

    notifications.push({
        id: `note_${Date.now()}`,
        type: "request-response",
        requestId: updatedRequest.id,
        mealId: updatedRequest.mealId,
        mealTitle: updatedRequest.mealTitle,
        from: window.CURRENT_USER,
        to: updatedRequest.from,
        message,
        read: false,
        ts: Date.now()
    });

    localStorage.setItem(
        "notifications",
        JSON.stringify(notifications)
    );

    updateNotificationBadge();

    if (typeof showToast === "function") {
        const statusMessages = {
            sent: `Request accepted. ${updatedRequest.mealTitle} is waiting for pickup.`,
            rejected: `Request rejected. ${updatedRequest.mealTitle} is now available again.`,
            delivered: `Delivery confirmed for ${updatedRequest.mealTitle}.`,
            "no-show": `No-show marked for ${updatedRequest.mealTitle}. Points updated.`
        };
        showToast(statusMessages[status] || `Request status updated: ${status}.`, status === "rejected" || status === "no-show" ? "warning" : "success");
    }

    initRequests();
}

function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

// Render the single request detail page from the notification ID in the URL.
function initRequestPage() {

    const detail = document.getElementById("request-detail");

    if (!detail) return;

    const noteId = getQueryParam("id");

    const notifications = JSON.parse(
        localStorage.getItem("notifications") || "[]"
    );

    const note = notifications.find(n =>
        String(n.id) === String(noteId)
    );

    if (!note) {
        detail.innerHTML = "<p>Request not found.</p>";
        return;
    }

    const requests = JSON.parse(
        localStorage.getItem("requests") || "[]"
    );

    const request = requests.find(r =>
        String(r.id) === String(note.requestId)
    );

    detail.innerHTML = `
        <div class="listing">

            <h2>Request Details</h2>

            <p><strong>Meal:</strong> ${escapeHtml(note.mealTitle)}</p>

            <p><strong>From:</strong> ${escapeHtml(note.from)}</p>

            <p><strong>To:</strong> ${escapeHtml(note.to)}</p>

            <p><strong>Message:</strong> ${escapeHtml(note.message)}</p>

            <p><strong>Status:</strong>
                ${escapeHtml(request?.status || "unknown")}
            </p>

        </div>
    `;
}

window.initRequests = initRequests;
window.initRequestPage = initRequestPage;