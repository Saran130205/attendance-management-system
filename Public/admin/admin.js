console.log("ADMIN JS LOADED");

  let allAttendance = [];
  let currentPage = 1;

  async function loadAttendance() {
  const res = await fetch(`/api/admin/attendance?page=${currentPage}`);
  const data = await res.json();   // ✅ define data properly

  if (!Array.isArray(data)) {
    console.error("Invalid response:", data);
    return;
  }

  allAttendance = data;
  renderAttendance(allAttendance);
}

  function renderAttendance(records) {

    const tbody = document.querySelector("#attendanceTable tbody");
    tbody.innerHTML = "";

    records.forEach(record => {

      const dateOnly = record.date;
      let totalDuration = "-";

      if (record.check_in && record.check_out) {
        const checkIn = new Date(`1970-01-01T${record.check_in}`);
        const checkOut = new Date(`1970-01-01T${record.check_out}`);
        const diffMs = checkOut - checkIn;

        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

        totalDuration = `${hours}h ${minutes}m ${seconds}s`;
      }

      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${record.name}</td>
        <td>${record.role}</td>
        <td>${dateOnly}</td>
        <td>${record.check_in || "-"}</td>
        <td>${record.check_out || "-"}</td>
        <td>${totalDuration}</td>
      `;

      tbody.appendChild(row);
    });
  }


document.addEventListener("DOMContentLoaded", function () {

  let allUsers = [];



  // ================= AUTH =================

  async function checkAuth() {
    const res = await fetch("/api/me");

    if (!res.ok) {
      window.location.href = "/common/common.html";
      return;
    }

    const user = await res.json();
    document.getElementById("welcomeText").innerText = `Hello ${user.name}..,`;

    if (user.role !== "admin") {
      window.location.href = "/common/common.html";
      return;
    }

    loadUsers();
    loadAttendance();
    loadHRAnalytics();
  }

  checkAuth();
  // ================= LEAVE BUTTON =================

const viewLeaveBtn = document.getElementById("viewLeaveBtn");
const leaveSection = document.getElementById("leaveSection");

if (viewLeaveBtn && leaveSection) {

  leaveSection.classList.add("hidden");

  viewLeaveBtn.addEventListener("click", async () => {

    leaveSection.classList.toggle("hidden");

    if (!leaveSection.classList.contains("hidden")) {
      await loadLeaveRequests();
    }

  });
}

// ================= CALENDAR BUTTON =================

const calendarBtn = document.getElementById("calendarBtn");
const overlay = document.getElementById("calendarOverlay");
const closeCalendar = document.getElementById("closeCalendar");
const calendar = document.getElementById("calendar2026");

if (calendarBtn && overlay && closeCalendar && calendar) {

  overlay.classList.add("hidden");

  calendarBtn.addEventListener("click", async () => {
    await loadHolidays();
    generateCalendar();
    overlay.classList.remove("hidden");
  });

  closeCalendar.addEventListener("click", () => {
    overlay.classList.add("hidden");
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.classList.add("hidden");
    }
  });
}

//Edit and Delete Button conff

document.addEventListener("click", function (e) {

  // DELETE BUTTON
  if (e.target.classList.contains("delete-btn")) {
    const userId = e.target.getAttribute("data-id");

    showConfirm(
      "Delete User",
      "Are you want to delete?",
      async () => {
        await fetch(`/api/admin/delete-user/${userId}`, {
          method: "DELETE"
        });

        loadUsers(); // refresh table
      }
    );
  }

  // EDIT BUTTON
  if (e.target.classList.contains("edit-btn")) {
    const userId = e.target.getAttribute("data-id");

    showConfirm(
      "Edit User",
      "Do you want to edit this user?",
      () => {
        openEditForm(userId);
      }
    );
  }

});


  // ================= USERS =================

  async function loadUsers() {
    const res = await fetch("/api/admin/users");
    allUsers = await res.json();
    renderUsers(allUsers);
  }

  function renderUsers(users) {
    const tbody = document.querySelector("#userTable tbody");
    tbody.innerHTML = "";

    users.forEach(user => {

      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${user.id}</td>
        <td>${user.name}</td>
        <td>${user.role}</td>
        <td>${user.department}</td>
        <td id="attendance-${user.id}">-</td>
        <td>
          <button class="edit-btn" data-id="${user.id}">Edit</button>
          <button class="delete-btn" data-id="${user.id}">Delete</button>
          <button id="status-btn-${user.id}" onclick="viewStatus(${user.id})">View Status</button>
          <button onclick="openUserCalendar(${user.id}, '${user.name}')">View Calendar</button>
          <button onclick="viewMonthlyHours(${user.id}, '${user.name}')">Work Hours</button>
          <button onclick="exportAttendance(${user.id})">Export Attendance</button>
        </td>
      `;

      tbody.appendChild(row);

      fetch(`/api/admin/user-attendance-summary/${user.id}`)
        .then(res => res.json())
        .then(data => {
          const cell = document.getElementById(`attendance-${user.id}`);
          if (cell) {
            cell.innerText = `${data.presentDays} / ${data.workingDays}`;
          }
        })
        .catch(() => {
          const cell = document.getElementById(`attendance-${user.id}`);
          if (cell) cell.innerText = "-";
        });
    });
  }

  // ================= SEARCH USERS =================

  document.getElementById("searchInput")
    .addEventListener("input", function () {

      const searchValue = this.value.toLowerCase();

      const filteredUsers = allUsers.filter(user =>
        user.name.toLowerCase().includes(searchValue) ||
        user.role.toLowerCase().includes(searchValue) ||
        user.department.toLowerCase().includes(searchValue)
      );

      renderUsers(filteredUsers);
    });

  // ================= USER TABLE ACTIONS =================

  document.getElementById("userTable")
    .addEventListener("click", async (e) => {

      if (e.target.classList.contains("delete-btn")) {
        const id = e.target.dataset.id;
        await fetch(`/api/admin/delete-user/${id}`, { method: "DELETE" });
        loadUsers();
      }

      if (e.target.classList.contains("edit-btn")) {
        const id = e.target.dataset.id;

        const res = await fetch("/api/admin/users");
        const users = await res.json();
        const user = users.find(u => u.id == id);

        document.getElementById("name").value = user.name;
        document.getElementById("role").value = user.role;
        document.getElementById("department").value = user.department;
        document.getElementById("createForm").dataset.editId = id;
      }
    });

  // ================= ATTENDANCE =================

  
  document.getElementById("attendanceSearch")
    .addEventListener("input", filterAttendance);

  document.getElementById("monthFilter")
    .addEventListener("change", filterAttendance);

  function filterAttendance() {
    const nameValue = document.getElementById("attendanceSearch").value.toLowerCase();
    const monthValue = document.getElementById("monthFilter").value;

    const filtered = allAttendance.filter(record => {
      const recordMonth = record.date.split("-")[1];
      const matchName = record.name.toLowerCase().includes(nameValue);
      const matchMonth = monthValue === "" || recordMonth === monthValue;
      return matchName && matchMonth;
    });

    renderAttendance(filtered);
  }

  async function loadHRAnalytics() {
  console.log("Analytics function called");

  const res = await fetch("/api/admin/hr-analytics");
  const data = await res.json();

  console.log("Analytics data:", data);

  document.getElementById("totalCard").innerText =
    `Total: ${data.totalEmployees}`;

  document.getElementById("presentCard").innerText =
    `Present: ${data.presentToday}`;

  document.getElementById("absentCard").innerText =
    `Absent: ${data.absentToday}`;
}

function updateClock() {

  const now = new Date(); 

  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };

  const date = now.toLocaleDateString('en-IN', options);
  const time = now.toLocaleTimeString('en-IN');

  const el = document.getElementById("liveDateTime");

  if (el) {
    el.innerText = `${date} | ${time}`;
  }
}

setInterval(updateClock, 1000);
updateClock();

// ================= HOLIDAYS =================

let holidays = [];

async function loadHolidays() {

  try {
    const res = await fetch("/api/admin/holidays");
    const data = await res.json();

    holidays = data.map(h => ({
      date: new Date(h.holidays_date).toLocaleDateString("en-CA")
    }));

  } catch (err) {
    console.error("Holiday Load Error:", err);
  }
}

function generateCalendar() {

  const calendar = document.getElementById("calendar2026");
  if (!calendar) return;

  calendar.innerHTML = "";
  const year = new Date().getFullYear();

  const today = new Date();
  const todayString = today.getFullYear() + "-" +
  String(today.getMonth() + 1).padStart(2, "0") + "-" +
  String(today.getDate()).padStart(2, "0");

  for (let month = 0; month < 12; month++) {
    const monthBox = document.createElement("div");
    monthBox.classList.add("month-box");
    const title = document.createElement("h3");
    title.innerText = new Date(year, month).toLocaleString("en-IN", { month: "long" });
    monthBox.appendChild(title);
    const grid = document.createElement("div");
    grid.classList.add("days-grid");
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      grid.appendChild(document.createElement("div"));
    }

    for (let day = 1; day <= daysInMonth; day++) {

      const fullDate = new Date(year, month, day);
      const daysOfWeek = fullDate.getDay();
      const weekOfMonth = Math.ceil(day/7);
      
      const dateString = fullDate.getFullYear() + "-" +
      String(fullDate.getMonth() + 1).padStart(2, "0") + "-" +
      String(fullDate.getDate()).padStart(2, "0");

      const box = document.createElement("div");
      box.classList.add("day-box");
      box.innerText = day;

      if(daysOfWeek === 0) {
        box.classList.add("sunday");
      } else if (daysOfWeek === 6){
        if(weekOfMonth !== 2){
          box.classList.add("saturday")
        }
      }

      if (dateString === todayString) {
        box.classList.add("today");
      }

      if (holidays.some(h => h.date === dateString)) {
        box.classList.add("holiday");
      }

      grid.appendChild(box);
    }

    monthBox.appendChild(grid);
    calendar.appendChild(monthBox);
  }
}


// ================= CREATE / UPDATE USER =================

document.getElementById("createForm")
  .addEventListener("submit", async (e) => {

    e.preventDefault();

    const name = document.getElementById("name").value;
    const password = document.getElementById("password").value;
    const role = document.getElementById("role").value;
    const department = document.getElementById("department").value;

    const editId = e.target.dataset.editId;

    try {

      if (editId) {

        await fetch(`/api/admin/update-user/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, role, department })
        });

        delete e.target.dataset.editId;

      } else {

        await fetch("/api/admin/create-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, password, role, department })
        });

      }

      e.target.reset();
      loadUsers();
      loadHRAnalytics();   // refresh dashboard numbers

    } catch (err) {
      console.error("Create/Update Error:", err);
    }

  });

  async function loadLeaveRequests() {

  const res = await fetch("/api/admin/leave-requests");
  const data = await res.json();

  const tbody = document.querySelector("#leaveTable tbody");

  if (!tbody) return;

  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML =
      "<tr><td colspan='6'>No leave requests</td></tr>";
    return;
  }

  data.forEach(leave => {

    const fromDate = leave.from_date.split("T")[0];
    const toDate = leave.to_date.split("T")[0];

    const row = document.createElement("tr");

    row.innerHTML = `
  <td>${leave.employee_name}</td>
  <td>${fromDate}</td>
  <td>${toDate}</td>
  <td>${leave.reason}</td>
  <td>${leave.status}</td>
  <td>
    ${leave.status === "Pending" ? `
      <button class="approve-btn" data-id="${leave.id}">
        Approve
      </button>
      <button class="reject-btn" data-id="${leave.id}">
        Reject
      </button>
    ` : "-"}
  </td>
`;

    tbody.appendChild(row);
  });
}

document.getElementById("leaveTable")
  ?.addEventListener("click", async (e) => {

    if (e.target.classList.contains("approve-btn") ||
        e.target.classList.contains("reject-btn")) {

      const leaveId = e.target.dataset.id;

      const status = e.target.classList.contains("approve-btn")
        ? "Approved"
        : "Rejected";

      try {
        await fetch(`/api/admin/update-leave/${leaveId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        });

        // Reload leave table after update
        await loadLeaveRequests();

      } catch (err) {
        console.error("Leave Update Error:", err);
      }
    }
  });

  // ================= LOGOUT =================

  window.logout = async function () {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/common/common.html";
  };

});

// ================= VIEW STATUS =================

window.viewStatus = function (userId) {

  fetch(`/api/admin/status/${userId}`)
    .then(res => res.json())
    .then(data => {

      const btn = document.getElementById(`status-btn-${userId}`);
      if (!btn) return;

      if (data.status === "Present") {
        btn.innerText = "Present";
        btn.style.backgroundColor = "green";
        btn.style.color = "white";
      } else {
        btn.innerText = "Absent";
        btn.style.backgroundColor = "red";
        btn.style.color = "white";
      }

      setTimeout(() => {
        btn.innerText = "View Status";
        btn.style.backgroundColor = "";
        btn.style.color = "";
      }, 2000);

    })
    .catch(err => console.error("Status Error:", err));
};


// ================= USER CALENDAR =================

window.openUserCalendar = async function (userId, userName) {

  const overlay = document.getElementById("userCalendarOverlay");
  const calendarDiv = document.getElementById("userCalendar");
  const nameTitle = document.getElementById("calendarUserName");

  nameTitle.innerText = `${userName} - Monthly Calendar`;
  calendarDiv.innerHTML = "";

  const res = await fetch(`/api/admin/user-calendar/${userId}`);
  const data = await res.json();

  const presentDates = data.attendance.map(a =>
    new Date(a.date).toLocaleDateString("en-CA")
  );

  const year = new Date().getFullYear();
  const month = new Date().getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {

    const dateObj = new Date(year, month, day);
    const dateStr = dateObj.toLocaleDateString("en-CA")

    const box = document.createElement("div");
    box.classList.add("day-box");
    box.innerText = day;

    if (presentDates.includes(dateStr)) {
      box.classList.add("present");
    } else {
      box.classList.add("absent");
    }

    calendarDiv.appendChild(box);
  }

  overlay.classList.remove("hidden");
};


// ================= MONTHLY HOURS =================

window.viewMonthlyHours = async function (userId, userName) {

  const overlay = document.getElementById("hoursOverlay");
  const content = document.getElementById("hoursContent");
  const title = document.getElementById("hoursUserName");

  title.innerText = `${userName} - Monthly Work Summary`;

  const res = await fetch(`/api/admin/user-monthly-hours/${userId}`);
  const data = await res.json();

  content.innerHTML = `
    <p><strong>Standard Monthly Hours:</strong> ${data.standardHours} hrs</p>
    <p><strong>Employee Worked Hours:</strong> ${data.workedHours} hrs</p>
    <p><strong>Difference:</strong> ${data.difference} hrs</p>
  `;

  overlay.classList.remove("hidden");
};

window.exportAttendance = function (userId) {
  window.location.href = `/api/admin/export-attendance/${userId}`;
};


window.closeUserCalendar = function () {
  const overlay = document.getElementById("userCalendarOverlay");
  if (overlay) {
    overlay.classList.add("hidden");
  }
};

window.closeHours = function () {
  const overlay = document.getElementById("hoursOverlay");
  if (overlay) {
    overlay.classList.add("hidden");
  }
};

function showConfirm(title, message, onConfirm) {
  const modal = document.getElementById("confirmModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalMessage = document.getElementById("modalMessage");
  const confirmBtn = document.getElementById("confirmBtn");
  const cancelBtn = document.getElementById("cancelBtn");

  modalTitle.innerText = title;
  modalMessage.innerText = message;

  modal.style.display = "flex";

  confirmBtn.onclick = () => {
    modal.style.display = "none";
    onConfirm();
  };

  cancelBtn.onclick = () => {
    modal.style.display = "none";
  };
}

// function logout() {
//   showConfirm(
//     "Logout",
//     "Are you sure you want to logout?",
//     () => {
//       window.location.href = "/logout";
//     }
//   );
// }

function nextPage() {
  currentPage ++;
  document.getElementById("pageNumber").innerText = currentPage;
  loadAttendance();
}

function prevPage() {
  if (currentPage > 1) {
    currentPage --;
    document.getElementById("pageNumber").innerText = currentPage;
    loadAttendance();
  }
}
