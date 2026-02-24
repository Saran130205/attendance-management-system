document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const password = document.getElementById("password").value;
  const error = document.getElementById("error").value;

  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, password }),
  });
  const data = await res.json();
  console.log("LOGIN RESPONSE:", data);

  if (!res.ok) {
    error.innerText = data.message;
    return;
  }

  if (data.role === "admin") {
    window.location.href = "/admin/admin.html";
  } else if (data.role === "manager") {
    window.location.href = "/manager/manager.html";
  } else if (data.role === "employee") {
    window.location.href = "/employee/employee.html";
  }
});
