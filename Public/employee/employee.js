/* ================= AUTH CHECK ================= */

async function checkAuth() {
  try {
    const res = await fetch("/api/me", {
      credentials: "same-origin",
    });

    if (!res.ok) {
      window.location.href = "/common/common.html";
      return;
    }

    const user = await res.json();

    document.getElementById("welcomeText").innerText = `Hello ${user.name}..,`;

    if (user.role !== "employee") {
      window.location.href = "/common/common.html";
      return;
    }

    await loadAttendance();
    await updateCheckButtons();
  } catch (err) {
    console.error("Auth error:", err);
  }
}

checkAuth();

async function loadEmployeeCalendar() {

  const res = await fetch("/api/employee/leave-calendar");
  const data = await res.json();

  const calendar = document.getElementById("employeeCalendar");

  if (!calendar) return;

  calendar.innerHTML = "";

  const year = new Date().getFullYear();
  const month = new Date().getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {

    const dateObj = new Date(year, month, day);
    const dateStr = dateObj.toISOString().split("T")[0];

    const box = document.createElement("div");

    box.classList.add("day-box");

    box.innerText = day;

    data.forEach(leave => {

      const from = leave.from_date.split("T")[0];
      const to = leave.to_date.split("T")[0];

      if (dateStr >= from && dateStr <= to) {
        box.classList.add("leave-day");
      }

    });

    calendar.appendChild(box);

  }

}

/* ================= CHECK BUTTON STATUS ================= */

async function updateCheckButtons() {
  try {
    const res = await fetch("/api/employee/disable-checkin", {
      credentials: "same-origin",
    });

    const data = await res.json();

    const checkInBtn = document.getElementById("checkInBtn");
    const checkOutBtn = document.getElementById("checkOutBtn");

    if (!checkInBtn || !checkOutBtn) return;

    if (!data.checkedIn) {
      checkInBtn.disabled = false;
      checkOutBtn.disabled = true;
    } else if (data.checkedIn && !data.checkedOut) {
      checkInBtn.disabled = true;
      checkOutBtn.disabled = false;
    } else {
      checkInBtn.disabled = true;
      checkOutBtn.disabled = true;
    }
  } catch (err) {
    console.error("Button update error:", err);
  }
}

/* ================= CHECK IN ================= */

const checkInBtn = document.getElementById("checkInBtn");

if (checkInBtn) {
  checkInBtn.addEventListener("click", async () => {
    checkInBtn.disabled = true;

    try {
      await fetch("/api/employee/checkin", {
        method: "POST",
      });

      await loadAttendance();
      await updateCheckButtons();
    } catch (err) {
      console.error("Check-in error:", err);
    }
  });
}

/* ================= CHECK OUT ================= */

const checkOutBtn = document.getElementById("checkOutBtn");

if (checkOutBtn) {
  checkOutBtn.addEventListener("click", async () => {
    checkOutBtn.disabled = true;

    try {
      await fetch("/api/employee/checkout", {
        method: "POST",
      });

      await loadAttendance();
      await updateCheckButtons();
    } catch (err) {
      console.error("Check-out error:", err);
    }
  });
}

/* ================= LOAD ATTENDANCE ================= */

async function loadAttendance() {
  try {
    const res = await fetch("/api/employee/attendance");
    const data = await res.json();

    const tbody = document.querySelector("#attendanceTable tbody");

    if (!tbody) return;

    tbody.innerHTML = "";

    const requiredMinutes = 8.5 * 60;

    data.attendance.forEach((row) => {
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
  } catch (err) {
    console.error("Attendance load error:", err);
  }
}

//================== loadLeaveBalance ================ 
async function loadLeaveBalance() {

  try {

    const res = await fetch("/api/employee/leave-balance");
    const data = await res.json();

    const el = document.getElementById("leaveBalance");

    if (el) {
      el.innerText = `Leave: ${data.used} / ${data.total}`;
    }

  } catch (err) {
    console.error("Leave balance error:", err);
  }

}

// // ================ Leave Count =============
// async function loadLeaveCount(){

//   const res = await fetch("/api/employee/leave-count");
//   const data = await res.json();

//   document.getElementById("leaveUsed").innerText = data.usedLeaves;

// }

/* ================= AUTO REFRESH ATTENDANCE ================= */

setInterval(() => {
  loadAttendance();
  updateCheckButtons();
}, 30000);

/* ================= LOAD PROFILE ================= */

async function loadProfile() {
  try {
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
    }

    document.getElementById("age").value = data.age || "";
    document.getElementById("contact").value = data.contact || "";
  } catch (err) {
    console.error("Profile load error:", err);
  }
}

loadProfile();
loadLeaveBalance();

/* ================= EDIT PROFILE ================= */

const editBtn = document.getElementById("editBtn");
const saveBtn = document.getElementById("saveBtn");

if (editBtn) {
  editBtn.addEventListener("click", () => {
    document.getElementById("gender").disabled = false;
    document.getElementById("dob").disabled = false;
    document.getElementById("age").disabled = false;
    document.getElementById("contact").disabled = false;
    document.getElementById("password").disabled = false;

    saveBtn.style.display = "inline-block";
    editBtn.style.display = "none";
  });
}

/* ================= SAVE PROFILE ================= */

const profileForm = document.getElementById("profileForm");

if (profileForm) {
  profileForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const gender = document.getElementById("gender").value;
    const dob = document.getElementById("dob").value;
    const age = document.getElementById("age").value;
    const contact = document.getElementById("contact").value;
    const password = document.getElementById("password").value;

    const saveBtn = document.getElementById("saveBtn");
    const editBtn = document.getElementById("editBtn");

    try {
      // Send only filled fields
      const bodyData = {};

      if (gender) bodyData.gender = gender;
      if (dob) bodyData.dob = dob;
      if (age) bodyData.age = age;
      if (contact) bodyData.contact = contact;
      if (password) bodyData.password = password;

      const res = await fetch("/api/employee/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();

      // alert(data.message);

      // Logout if password changed
      // Logout if password changed
      if (data.logout) {
        alert("Password changed. Please re-login.");

        window.location.href = "/common/common.html";
        return;
      }

      // Normal profile update message
      alert(data.message || "Profile updated successfully");
      // alert(data.message || "Profile updated successfully");
      // Disable fields again
      document.getElementById("gender").disabled = true;
      document.getElementById("dob").disabled = true;
      document.getElementById("age").disabled = true;
      document.getElementById("contact").disabled = true;
      document.getElementById("password").disabled = true;

      if (saveBtn) saveBtn.style.display = "none";
      if (editBtn) editBtn.style.display = "inline-block";

      // Clear password field
      document.getElementById("password").value = "";

      await loadProfile();
    } catch (err) {
      console.error("Profile update error:", err);
      alert("Update failed");
    }
  });
}

/* ================= LEAVE SECTION ================= */

document.addEventListener("DOMContentLoaded", () => {
  const leaveBtn = document.getElementById("leaveBtn");
  const leaveSection = document.getElementById("leaveSection");
  const cancelLeave = document.getElementById("cancelLeave");
  const submitLeave = document.getElementById("submitLeave");

  if (leaveSection) {
    leaveSection.classList.add("hidden");
  }

  if (leaveBtn && leaveSection) {
    leaveBtn.addEventListener("click", async () => {
      leaveSection.classList.toggle("hidden");

      if (!leaveSection.classList.contains("hidden")) {
        await loadMyLeaves();
      }
    });
  }

  if (cancelLeave) {
    cancelLeave.addEventListener("click", () => {
      document.getElementById("leaveForm").classList.add("hidden");
    });
  }

  if (submitLeave) {
    submitLeave.addEventListener("click", async () => {
      const fromDate = document.getElementById("fromDate").value;
      const toDate = document.getElementById("toDate").value;
      const reason = document.getElementById("reason").value;

      if (!fromDate || !toDate || !reason) {
        alert("All fields are required");
        return;
      }

      try {
        const res = await fetch("/api/employee/request-leave", {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            from_date: fromDate,
            to_date: toDate,
            reason,
          }),
        });

        const data = await res.json();

        alert(data.message);

        document.getElementById("fromDate").value = "";
        document.getElementById("toDate").value = "";
        document.getElementById("reason").value = "";

        await loadMyLeaves();
      } catch (err) {
        alert("Error submitting leave");
      }
    });
  }
});

/* ================= LOAD MY LEAVES ================= */

async function loadMyLeaves() {
  const res = await fetch("/api/employee/my-leaves");
  const data = await res.json();

  const tbody = document.querySelector("#myLeaveTable tbody");

  if (!tbody) return;

  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML = "<tr><td colspan='4'>No leave history</td></tr>";

    return;
  }

  data.forEach((leave) => {
    const fromDate = leave.from_date.split("T")[0];
    const toDate = leave.to_date.split("T")[0];

    let statusColor = "orange";

    if (leave.status === "Approved") statusColor = "green";
    if (leave.status === "Rejected") statusColor = "red";

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${fromDate}</td>
      <td>${toDate}</td>
      <td>${leave.reason}</td>
      <td style="color:${statusColor};font-weight:bold;">
        ${leave.status}
      </td>
    `;

    tbody.appendChild(row);
  });
}

/* ================= LOGOUT ================= */

async function logout() {
  await fetch("/api/logout", {
    method: "POST",
  });

  window.location.href = "/common/common.html";
}
