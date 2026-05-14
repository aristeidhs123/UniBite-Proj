// ../js/requests.js

function initRequests() {

    const container = document.getElementById("requests-list");

    if (!container) return;

    const requests = JSON.parse(localStorage.getItem("requests") || "[]");

    const myRequests = requests.filter(r =>
        normalizeUser(r.to) === normalizeUser(window.CURRENT_USER)
    );

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
            actionButtons.push(`<button class="delivered-btn">Mark Delivered</button>`);
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
        const deliveredBtn = box.querySelector(".delivered-btn");

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

        if (deliveredBtn) {
            deliveredBtn.addEventListener("click", () => {
                updateRequestStatus(req.id, "delivered");
            });
        }

        container.appendChild(box);
    });
}

function updateRequestStatus(requestId, status) {

    let requests = JSON.parse(localStorage.getItem("requests") || "[]");

    requests = requests.map(r => {

        if (r.id === requestId) {
            r.status = status;
        }

        return r;
    });

    localStorage.setItem("requests", JSON.stringify(requests));

    const updated = requests.find(r => r.id === requestId);

    if (updated) {

        const notifications = JSON.parse(
            localStorage.getItem("notifications") || "[]"
        );

        let message = `Your request for "${updated.mealTitle}" was ${status}.`;
        if (status === "sent") {
            message = `Your request for "${updated.mealTitle}" was accepted and is on the way.`;
        } else if (status === "delivered") {
            message = `Your request for "${updated.mealTitle}" was marked delivered.`;
            addUserPoints(updated.to, 1);
        }

        notifications.push({
            id: `note_${Date.now()}`,
            type: "request-response",
            requestId: updated.id,
            mealId: updated.mealId,
            mealTitle: updated.mealTitle,
            from: window.CURRENT_USER,
            to: updated.from,
            message,
            read: false,
            ts: Date.now()
        });

        localStorage.setItem(
            "notifications",
            JSON.stringify(notifications)
        );
    }

    updateNotificationBadge();

    initRequests();
}

function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

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