
const form = document.querySelector("#login-form");
const identity = document.querySelector("#identity");
const password = document.querySelector("#password");
const message = document.querySelector("#message");
const showPassword = document.querySelector("#show-pass");
const forgotPassword = document.querySelector("#forgot");

/* =====customer login==== */

form.addEventListener("submit", (event) => {
    event.preventDefault();

    const customerIdentity = identity.value.trim();
    const customerPassword = password.value.trim();

    if (!customerIdentity || !customerPassword) {
        message.textContent = "Please enter your library login details.";
        return;
    }

    sessionStorage.setItem("wplDemoCustomer", "true");
    sessionStorage.setItem("wplCustomerIdentity", customerIdentity);

    location.href = "customer-dashboard.html";
});

/* =====show and hide password==== */

showPassword.addEventListener("click", () => {
    const isHidden = password.type === "password";

    password.type = isHidden ? "text" : "password";
    showPassword.textContent = isHidden ? "Hide" : "Show";
});

/* =====forgot password==== */

forgotPassword.addEventListener("click", (event) => {
    event.preventDefault();

    message.textContent =
        "Please contact the library for help resetting your password.";
});
