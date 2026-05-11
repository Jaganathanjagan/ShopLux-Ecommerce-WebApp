// ================= SPLASH SCREEN =================

window.addEventListener("load", () => {

    setTimeout(() => {

        const splash = document.getElementById("splash-screen");

        if (splash) {
            splash.style.display = "none";
        }

    }, 1500);

});


// ================= THEME TOGGLE =================

const themeToggle = document.getElementById("theme-toggle");

if (themeToggle) {

    themeToggle.addEventListener("click", () => {

        const html = document.documentElement;
        const icon = document.getElementById("theme-icon");

        if (html.getAttribute("data-theme") === "dark") {

            html.setAttribute("data-theme", "light");

            icon.classList.remove("fa-moon");
            icon.classList.add("fa-sun");

        } else {

            html.setAttribute("data-theme", "dark");

            icon.classList.remove("fa-sun");
            icon.classList.add("fa-moon");
        }
    });
}


// ================= PASSWORD TOGGLE =================

function togglePassword(id, btn) {

    const input = document.getElementById(id);

    const icon = btn.querySelector("i");

    if (input.type === "password") {

        input.type = "text";

        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");

    } else {

        input.type = "password";

        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
    }
}


// ================= SWITCH LOGIN/REGISTER =================

function switchTab(type) {

    const loginForm = document.getElementById("form-login");
    const registerForm = document.getElementById("form-register");

    const loginTab = document.getElementById("tab-login");
    const registerTab = document.getElementById("tab-register");

    if (type === "login") {

        loginForm.style.display = "block";
        registerForm.style.display = "none";

        loginTab.classList.add("active");
        registerTab.classList.remove("active");

    } else {

        loginForm.style.display = "none";
        registerForm.style.display = "block";

        registerTab.classList.add("active");
        loginTab.classList.remove("active");
    }
}


// ================= TOAST =================

function showToast(message) {

    const toast = document.getElementById("toast");

    const toastMsg = document.getElementById("toast-msg");

    toastMsg.innerText = message;

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);
}


// ================= LOGIN =================

function handleLogin(event) {

    event.preventDefault();

    const email = document.getElementById("login-email").value;

    const password = document.getElementById("login-password").value;

    if (email === "" || password === "") {

        alert("Please fill all fields");

        return;
    }

    showToast("Login Successful!");

    setTimeout(() => {

        window.location.href = "index.html";

    }, 1500);
}


// ================= REGISTER =================

function handleRegister(event) {

    event.preventDefault();

    const password = document.getElementById("reg-password").value;

    const confirm = document.getElementById("reg-confirm").value;

    if (password !== confirm) {

        alert("Passwords do not match");

        return;
    }

    showToast("Account Created!");

    switchTab("login");
}


// ================= SOCIAL LOGIN =================

function socialLogin(provider) {

    showToast(provider + " login coming soon!");
}


// ================= FORGOT PASSWORD =================

function showForgotModal() {

    document.getElementById("forgot-modal").style.display = "flex";
}

function hideForgotModal() {

    document.getElementById("forgot-modal").style.display = "none";
}

function sendResetEmail() {

    showToast("Reset link sent!");

    hideForgotModal();
}


// ================= PASSWORD STRENGTH =================

const regPassword = document.getElementById("reg-password");

if (regPassword) {

    regPassword.addEventListener("input", () => {

        const value = regPassword.value;

        const bar = document.getElementById("pw-strength-bar");

        const label = document.getElementById("pw-strength-label");

        if (value.length < 4) {

            bar.style.width = "25%";
            label.innerText = "Weak";

        } else if (value.length < 8) {

            bar.style.width = "60%";
            label.innerText = "Medium";

        } else {

            bar.style.width = "100%";
            label.innerText = "Strong";
        }
    });
}