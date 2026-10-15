const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");

const loginErrors = {
    missing: "Username and password are required.",
    invalid: "Invalid username or password.",
    server: "Something went wrong. Please try again."
};

const errorCode = new URLSearchParams(window.location.search).get("error");
if (errorCode && loginErrors[errorCode]) {
    message.textContent = loginErrors[errorCode];
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch("/api/admin/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (!response.ok) {
            message.textContent = data.message || "Login failed.";
            return;
        }

        window.location.href = "/admin/";
    } catch (error) {
        console.error(error);
        message.textContent = "Something went wrong. Please try again.";
    }
});
