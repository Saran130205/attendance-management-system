const loginBtn = document.getElementById("loginBtn");
const togglePassword = document.getElementById("togglePassword");

function showError(message) {
  const popup = document.getElementById("errorPopup");
  const text = document.getElementById("errorText");

  text.innerText = message;
  popup.style.display = "block";

  setTimeout(() => {
    popup.style.display = "none";
  }, 3000);
}

// Password toggle
togglePassword.addEventListener("click", () => {
  const passwordInput = document.getElementById("password");
  passwordInput.type =
    passwordInput.type === "password" ? "text" : "password";
});

// Login button click
loginBtn.addEventListener("click", async () => {

  const name = document.getElementById("name").value.trim();
  const password = document.getElementById("password").value.trim();
  const role = document.getElementById("role").value;

  if (!name || !password || !role) {
    showError("Please fill all fields.");
    return;
  }

  // Button loading state
  loginBtn.innerText = "Logging in...";
  loginBtn.disabled = true;

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: name,
        password: password,
        role: role
      })
    });

    const data = await response.json();

    if (!response.ok) {
      showError(data.message || "Login failed.");
      loginBtn.innerText = "Login";
      loginBtn.disabled = false;
      return;
    }

    // Redirect based on role
    if (data.role === "admin") {
      window.location.href = "/admin/admin.html";
    } 
    else if (data.role === "manager") {
      window.location.href = "/manager/manager.html";
    } 
    else {
      window.location.href = "/employee/employee.html";
    }

  } catch (error) {
    console.error("Login error:", error);
    showError("Server error. Please try again.");
    loginBtn.innerText = "Login";
    loginBtn.disabled = false;
  }
});