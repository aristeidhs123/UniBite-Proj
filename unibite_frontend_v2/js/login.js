// ../js/login.js
// Handles login and signup pages for UniBite.
// This file also supports the admin shortcut and localStorage user persistence.

function isValidEmail(email) {
    return /^\S+@\S+\.\S+$/.test(String(email || "").trim());
}

function initLogin() {
    const form = document.getElementById("login-form");
    if (!form) return;

    const tabLogin = document.getElementById("tab-login");
    const tabSignup = document.getElementById("tab-signup");
    const signupExtra = document.getElementById("signup-extra");
    const submitBtn = document.getElementById("submit-auth");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirm-password");
    const togglePasswordBtn = document.getElementById("toggle-password");

    let mode = "login"; // or 'signup'

    function setMode(m) {
        mode = m;
        if (mode === "login") {
            signupExtra.classList.add("hidden");
            submitBtn.textContent = "Login";
            tabLogin.classList.add("active");
            tabSignup.classList.remove("active");
        } else {
            signupExtra.classList.remove("hidden");
            submitBtn.textContent = "Sign up";
            tabLogin.classList.remove("active");
            tabSignup.classList.add("active");
        }
    }

    if (tabLogin) tabLogin.addEventListener("click", () => setMode("login"));
    if (tabSignup) tabSignup.addEventListener("click", () => setMode("signup"));

    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener("click", () => {
            const reveal = passwordInput.type === "password";
            passwordInput.type = reveal ? "text" : "password";
            if (confirmPasswordInput) {
                confirmPasswordInput.type = passwordInput.type;
            }
            togglePasswordBtn.textContent = reveal ? "Hide" : "Show";
        });
    }

    setMode("login");

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        let username = (document.getElementById("username").value || "").trim();
        const password = (document.getElementById("password").value || "");

        if (!username || !password) {
            showToast("Please fill all required fields.", "warning");
            return;
        }

        const isAdminAttempt = username.toLowerCase() === "admin";
        if (!username.startsWith("@") && !isAdminAttempt) {
            username = `@${username}`;
        }

        // load users
        let users = typeof getUsers === "function" ? getUsers() : JSON.parse(localStorage.getItem("users") || "[]");
        const normalized = normalizeUser(username);
        const existing = users.find(u => normalizeUser(u.username) === normalized);

        if (mode === "login") {
            // admin shortcut
            if (isAdminAttempt && password === "admin") {
                localStorage.setItem("CURRENT_USER", "admin");
                localStorage.setItem("IS_ADMIN", "true");
                window.CURRENT_USER = "admin";
                showToast("Admin login successful.", "success");
                window.location.href = "admin.html";
                return;
            }

            if (!existing) {
                showToast("User not found. Please use Sign up.", "warning");
                setMode("signup");
                return;
            }

            const encoded = btoa(String(password));
            if (!existing.password || existing.password !== encoded) {
                showToast("Invalid credentials.", "error");
                return;
            }

            // successful login
            localStorage.setItem("CURRENT_USER", existing.username);
            localStorage.setItem("IS_ADMIN", existing.role === "admin" ? "true" : "false");
            window.CURRENT_USER = existing.username;
            if (typeof ensureCurrentUserProfile === "function") ensureCurrentUserProfile();
            showToast("Login successful.", "success");
            window.location.href = "index.html";
            return;
        }

        // signup flow
        const email = (document.getElementById("email").value || "").trim();
        const confirm = (document.getElementById("confirm-password").value || "");

        if (!isValidEmail(email)) {
            showToast("Please enter a valid email.", "warning");
            return;
        }

        if (password.length < 4) {
            showToast("Password must be at least 4 characters.", "warning");
            return;
        }

        if (password !== confirm) {
            showToast("Passwords do not match.", "warning");
            return;
        }

        if (existing) {
            showToast("User already exists. Please login.", "warning");
            setMode("login");
            return;
        }

        const newUser = {
            username: username,
            password: btoa(String(password)),
            email: email,
            points: 5,
            createdAt: Date.now(),
            role: "student"
        };

        users.push(newUser);
        if (typeof saveUsers === "function") saveUsers(users);

        localStorage.setItem("CURRENT_USER", newUser.username);
        localStorage.setItem("IS_ADMIN", "false");
        window.CURRENT_USER = newUser.username;
        if (typeof ensureCurrentUserProfile === "function") ensureCurrentUserProfile();

        showToast("Account created and logged in.", "success");
        window.location.href = "index.html";
    });
}

window.initLogin = initLogin;