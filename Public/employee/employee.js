async function checkAuth() {
  const res = await fetch("/api/me");
  if (!res.ok) {
    window.location.href = "/common/common.html";
    return;
  }

  const user = await res.json();
    document.getElementById("welcomeText").innerText = `Hello ${user.name}`;
  if (user.role !== "employee") {
    window.location.href = "/common/common.html";
    return;
  }

  loadAttendance();
}

checkAuth();

/* ================= CHECK IN ================= */

document.getElementById("checkInBtn")
.addEventListener("click", async () => {

  await fetch("/api/employee/checkin", {
    method: "POST"
  });

  loadAttendance();
});


/* ================= CHECK OUT ================= */

document.getElementById("checkOutBtn")
.addEventListener("click", async () => {

  await fetch("/api/employee/checkout", {
    method: "POST"
  });

  loadAttendance();
});

async function loadAttendance() {
  const res = await fetch("/api/employee/attendance");
  const data = await res.json();

  const tbody = document.querySelector("#attendanceTable tbody");
  tbody.innerHTML = "";

  const requiredMinutes = 8.5 * 60; // 8 hours 30 mins = 510 mins

  data.forEach(row => {

    let workedDisplay = "-";

    if (row.worked_minutes !== null) {

      const hours = Math.floor(row.worked_minutes / 60);
      const mins = row.worked_minutes % 60;

      workedDisplay = `${hours}h ${mins}m / 8h 30m`;

      if (row.worked_minutes < requiredMinutes) {
        workedDisplay += " (Short)";
      } else {
        workedDisplay += " (Full)";
      }
    }

    tbody.innerHTML += `
      <tr>
        <td>${new Date(row.date).toLocaleDateString()}</td>
        <td>${row.status}</td>
        <td>${row.check_in || "-"}</td>
        <td>${row.check_out || "-"}</td>
        <td>${workedDisplay}</td>
      </tr>
    `;
  });
}
/* ================= LOAD PROFILE ================= */

async function loadProfile() {

  const res = await fetch("/api/employee/profile");
  const data = await res.json();

  document.getElementById("name").value = data.name || "";
  document.getElementById("department").value = data.department || "";
  document.getElementById("gender").value = data.gender || "";
if (data.dob) {
  const formattedDob = new Date(data.dob).toISOString().split("T")[0];
  document.getElementById("dob").value = formattedDob;
} else {
  document.getElementById("dob").value = "";
}  document.getElementById("age").value = data.age || "";
  document.getElementById("contact").value = data.contact || "";

}

loadProfile();


/* ================= EDIT MODE ================= */

const editBtn = document.getElementById("editBtn");
const saveBtn = document.getElementById("saveBtn");

editBtn.addEventListener("click", () => {

  document.getElementById("gender").disabled = false;
  document.getElementById("dob").disabled = false;
  document.getElementById("age").disabled = false;
  document.getElementById("contact").disabled = false;
  document.getElementById("password").disabled = false;

  saveBtn.style.display = "inline-block";
  editBtn.style.display = "none";
});


/* ================= SAVE PROFILE ================= */

document.getElementById("profileForm")
.addEventListener("submit", async function(e) {

  e.preventDefault();

  const gender = document.getElementById("gender").value;
  const dob = document.getElementById("dob").value;
  const age = document.getElementById("age").value;
  const contact = document.getElementById("contact").value;
  const password = document.getElementById("password").value;

  const res = await fetch("/api/employee/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gender, dob, age, contact, password })
  });

  const data = await res.json();
  alert(data.message);

  document.getElementById("gender").disabled = true;
  document.getElementById("dob").disabled = true;
  document.getElementById("age").disabled = true;
  document.getElementById("contact").disabled = true;
  document.getElementById("password").disabled = true;

  saveBtn.style.display = "none";
  editBtn.style.display = "inline-block";

  document.getElementById("password").value = "";

  loadProfile();
});

async function logout() {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/common/common.html";
}