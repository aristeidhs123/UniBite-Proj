// ../js/messages.js
// Manages the user messages page for UniBite.
// It loads message notifications addressed to the current user, marks them read,
// and allows the user to view or delete individual messages.

function initMessages() {
    console.log("initMessages called", document.body.getAttribute("data-page"));

    const container = document.getElementById("messages-list");
    if (!container) return;

    if (!window.CURRENT_USER) {
        console.warn("CURRENT_USER not set");
        container.innerHTML = "<p>Please log in to see messages.</p>";
        return;
    }

    let notifications = JSON.parse(localStorage.getItem("notifications") || "[]");
    const myNotes = notifications.filter(n => normalizeUser(n.to) === normalizeUser(window.CURRENT_USER));

    if (myNotes.length === 0) {
        container.innerHTML = "<p>No messages yet.</p>";
        if (typeof updateNotificationBadge === "function") updateNotificationBadge();
        return;
    }

    container.innerHTML = "";
    myNotes.sort((a,b) => (b.ts || 0) - (a.ts || 0));

    myNotes.forEach(note => {
        const div = document.createElement("div");
        div.className = "message-item" + (note.read ? "" : " unread");
        div.dataset.id = note.id;

        div.innerHTML = `
            <div class="message-avatar"></div>
            <div class="message-content">
                <div class="message-sender">
                    <strong>${escapeHtml(note.from || "System")}</strong>
                    <span class="message-meta">${new Date(note.ts || Date.now()).toLocaleString()}</span>
                </div>
                <div class="message-text">${escapeHtml(note.message)}</div>
                <div class="message-actions">
                    <button class="msg-btn view-btn">View Request</button>
                    <button class="msg-btn delete-btn">Delete</button>
                </div>
            </div>
        `;

        const viewBtn = div.querySelector(".view-btn");
        if (viewBtn) viewBtn.addEventListener("click", (e) => { e.stopPropagation(); openRequestPage(note.id); });

        const delBtn = div.querySelector(".delete-btn");
        if (delBtn) delBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            deleteNotification(note.id);
            div.remove();
            if (typeof updateNotificationBadge === "function") updateNotificationBadge();
        });

        div.addEventListener("click", (e) => {
            if (e.target.closest(".msg-btn")) return;
            openRequestPage(note.id);
        });

        container.appendChild(div);
    });

    // mark unread as read for current user (only those addressed to them)
    let changed = false;
    notifications = notifications.map(n => {
        if (normalizeUser(n.to) === normalizeUser(window.CURRENT_USER) && !n.read) {
            changed = true;
            return { ...n, read: true };
        }
        return n;
    });

    if (changed) {
        localStorage.setItem("notifications", JSON.stringify(notifications));
    }

    if (typeof updateNotificationBadge === "function") updateNotificationBadge();
}

// Remove a message/notification by ID and update the stored list.
function deleteNotification(id) {
    let notifications = JSON.parse(localStorage.getItem("notifications") || "[]");
    notifications = notifications.filter(n => n.id !== id);
    localStorage.setItem("notifications", JSON.stringify(notifications));
    if (typeof updateNotificationBadge === "function") updateNotificationBadge();
}

// Navigate to the request detail page when the user clicks a message link.
function openRequestPage(noteId) {
    window.location.href = `request.html?id=${encodeURIComponent(noteId)}`;
}

window.initMessages = initMessages;
