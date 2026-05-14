// ../js/login.js

function initLogin() {

    const form =
        document.getElementById("login-form");

    if (!form) return;

    form.addEventListener("submit", (e) => {

        e.preventDefault();

        let username =
            document.getElementById("username")
            .value
            .trim();

        const password =
            document.getElementById("password")
            .value
            .trim();

        if (!username || !password) {

            alert("Please fill all fields.");

            return;
        }

        if (!username.startsWith("@")) {

            username = `@${username}`;
        }

        localStorage.setItem(
            "CURRENT_USER",
            username
        );

        window.CURRENT_USER = username;
        if (typeof ensureCurrentUserProfile === "function") {
            ensureCurrentUserProfile();
        }

        alert("Login successful.");

        window.location.href = "index.html";
    });
}

window.initLogin = initLogin;