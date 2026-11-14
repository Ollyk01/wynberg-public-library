
const loginForm = document.getElementById("adminLoginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");

document.getElementById("year").textContent = new Date().getFullYear();

togglePassword.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";

    passwordInput.type = isPassword ? "text" : "password";
    togglePassword.textContent = isPassword ? "Hide" : "Show";
});

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    loginMessage.textContent = "";
    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";

    const email = document.getElementById("email").value.trim();
    const password = passwordInput.value;

    try {
        const response = await fetch("http://127.0.0.1:3000/api/auth/login", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok || data.success === false) {
            throw new Error(data.message || "Login failed. Please check your details.");
        }

        window.location.href = "admin-dashboard.html";

    } catch (error) {
        loginMessage.textContent =
            error.message || "Unable to connect to the server. Please try again.";

        loginButton.disabled = false;
        loginButton.textContent = "Sign In";
    }
});
