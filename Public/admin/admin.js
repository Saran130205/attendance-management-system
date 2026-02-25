console.log("ADMIN JS LOADED");
let allAttendance = [];

document.addEventListener("DOMContentLoaded", function () {
  let allUsers = [];

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
  }

  checkAuth();

  // ================= USERS =================

  async function loadUsers() {
    const res = await fetch("/api/admin/users");
    allUsers = await res.json();
    renderUsers(allUsers);
    return; 
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
      <td id="attendance-${user.id}"></td>
      <td>
        <button class="edit-btn" data-id="${user.id}">Edit</button>
        <button class="delete-btn" data-id="${user.id}">Delete</button>
        <button id="status-btn-${user.id}" onclick="viewStatus(${user.id})">View Status</button>
        <button onclick="openUserCalendar(${user.id}, '${user.name}')">View Calendar</button>
        <button onclick="viewMonthlyHours(${user.id}, '${user.name}')">Work Hours</button>
      </td>
    `;

    tbody.appendChild(row);

    // 🔥 Fetch actual attendance summary
    fetch(`/api/admin/user-attendance-summary/${user.id}`)
      .then(res => res.json())
      .then(data => {

        const cell = document.getElementById(`attendance-${user.id}`);

        cell.innerText = `${data.presentDays} / ${data.workingDays}`;

        // if (data.presentDays < data.workingDays * 0.5) {
        //   cell.style.color = "red";
        // } else {
        //   cell.style.color = "green";
        // }

      })
      .catch(() => {
        const cell = document.getElementById(`attendance-${user.id}`);
        cell.innerText = "-";
      });

  });
  }
}
// ================= SEARCH =================

document.getElementById("searchInput")
  .addEventListener("input", function () {

    const searchValue = this.value.toLowerCase();

    const filteredUsers = allUsers.filter(user =>
      user.name.toLowerCase().includes(searchValue) ||
      user.role.toLowerCase().includes(searchValue) ||
      user.department.toLowerCase().includes(searchValue)
    );

    const tbody = document.querySelector("#userTable tbody");
    tbody.innerHTML = "";

    filteredUsers.forEach(user => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${user.id}</td>
        <td>${user.name}</td>
        <td>${user.role}</td>
        <td>${user.department}</td>
        <td>
          <button class="edit-btn" data-id="${user.id}">Edit</button>
          <button class="delete-btn" data-id="${user.id}">Delete</button>
          <button id="status-btn-${user.id}" onclick="viewStatus(${user.id})">
            View Status
          </button>
        </td>
      `;

      tbody.appendChild(row);
    });

});

  document.getElementById("userTable").addEventListener("click", async (e) => {

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
 let allAttendance = [];

// 🔥 LOAD ATTENDANCE
async function loadAttendance() {
  const res = await fetch("/api/admin/attendance");
  allAttendance = await res.json();
  renderAttendance(allAttendance);
}


// 🔥 RENDER FUNCTION
function renderAttendance(records) {

  const tbody = document.querySelector("#attendanceTable tbody");
  tbody.innerHTML = "";

  records.forEach(record => {

    const dateOnly = record.date.split("T")[0];

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


// 🔥 SEARCH + MONTH FILTER
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

  // ================= CREATE / UPDATE USER =================

  document.getElementById("createForm")
    .addEventListener("submit", async (e) => {

      e.preventDefault();

      const name = document.getElementById("name").value;
      const password = document.getElementById("password").value;
      const role = document.getElementById("role").value;
      const department = document.getElementById("department").value;

      const editId = e.target.dataset.editId;

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
    });

  // ================= LEAVE APPROVAL =================

  const viewLeaveBtn = document.getElementById("viewLeaveBtn");
  const leaveSection = document.getElementById("leaveSection");

  leaveSection.classList.add("hidden");

  viewLeaveBtn.addEventListener("click", async () => {

    leaveSection.classList.toggle("hidden");

    if (!leaveSection.classList.contains("hidden")) {
      await loadLeaveRequests();
    }
  });

  async function loadLeaveRequests() {

    const res = await fetch("/api/admin/leave-requests");
    const data = await res.json();

    const tbody = document.querySelector("#leaveTable tbody");
    tbody.innerHTML = "";

    if (data.length === 0) {
      tbody.innerHTML = "<tr><td colspan='6'>No leave requests</td></tr>";
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
        <td>
          <span class="status ${leave.status.toLowerCase()}">
            ${leave.status}
          </span>
        </td>
        <td>
          ${leave.status === "Pending" ? `
            <button class="approve-btn" data-id="${leave.id}">Approve</button>
            <button class="reject-btn" data-id="${leave.id}">Reject</button>
          ` : "-"}
        </td>
      `;

      tbody.appendChild(row);
    });
  }

  document.getElementById("leaveTable").addEventListener("click", async (e) => {

    if (e.target.classList.contains("approve-btn") ||
        e.target.classList.contains("reject-btn")) {

      const id = e.target.dataset.id;

      const status = e.target.classList.contains("approve-btn")
        ? "Approved"
        : "Rejected";

      await fetch(`/api/admin/update-leave/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      await loadLeaveRequests();
    }
  });

  //calendar 

let holidays = [];

const calendarBtn = document.getElementById("calendarBtn");
const overlay = document.getElementById("calendarOverlay");
const closeCalendar = document.getElementById("closeCalendar");
const calendar = document.getElementById("calendar2026");

// Safety check
if (calendarBtn && overlay && closeCalendar && calendar) {

  overlay.classList.add("hidden");

  async function loadHolidays() {
    try {
      const res = await fetch("/api/admin/holidays");
      const data = await res.json();

      holidays = data.map(h => ({
        date: new Date(h.holidays_date).toISOString().split("T")[0]
      }));

    } catch (err) {
      console.error("Holiday Load Error:", err);
    }
  }

  function generateCalendar() {

    calendar.innerHTML = "";
    const year = new Date().getFullYear();

    for (let month = 0; month < 12; month++) {

      const monthBox = document.createElement("div");
      monthBox.classList.add("month-box");

      const title = document.createElement("h3");
      title.innerText = new Date(year, month)
        .toLocaleString("en-IN", { month: "long" });

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
        const weekDay = fullDate.getDay();

        const today = new Date();
        const todayString = today.toISOString().split("T")[0];
        // const dateString = fullDate.toISOString().split("T")[0];

        const box = document.createElement("div");
        box.classList.add("day-box");
        box.innerText = day;

        const dateString = fullDate.toISOString().split("T")[0];

        if (weekDay === 0) box.classList.add("sunday");
        if (weekDay === 6) box.classList.add("saturday");

        if (holidays.some(h => h.date === dateString)) {
          box.classList.add("holiday");
        }

        if (dateString === todayString) {
        box.classList.add("today");
        }

        grid.appendChild(box);
      }

      monthBox.appendChild(grid);
      calendar.appendChild(monthBox);
    }
  }

  // OPEN
  calendarBtn.addEventListener("click", async () => {
    await loadHolidays();
    generateCalendar();
    overlay.classList.remove("hidden");
  });

  // CLOSE BUTTON
  closeCalendar.addEventListener("click", () => {
    overlay.classList.add("hidden");
  });

  // CLICK OUTSIDE
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.classList.add("hidden");
    }
  });

}
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
      setTimeout(()=>{
        btn.innerText = "View Status";
        btn.style.backgroundColor = "";
        btn.style.color = "";
      }, 2000);

    })
    .catch(err => console.error("Status Error:", err));

};

window.openUserCalendar = async function(userId, userName) {

  const overlay = document.getElementById("userCalendarOverlay");
  const calendarDiv = document.getElementById("userCalendar");
  const nameTitle = document.getElementById("calendarUserName");

  nameTitle.innerText = `${userName} - Monthly Calendar`;
  calendarDiv.innerHTML = "";

  const res = await fetch(`/api/admin/user-calendar/${userId}`);
  const data = await res.json();

  const presentDates = data.attendance.map(a =>
    new Date(a.date).toISOString().split("T")[0]
  );

  const leaveDates = [];
  data.leaves.forEach(l => {
    const start = new Date(l.from_date);
    const end = new Date(l.to_date);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      leaveDates.push(d.toISOString().split("T")[0]);
    }
  });

  const year = new Date().getFullYear();
  const month = new Date().getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {

  const dateObj = new Date(year, month, day);
  const dateStr = dateObj.toISOString().split("T")[0];

  const box = document.createElement("div");
  box.classList.add("day-box");
  box.innerText = day;

  const dayOfWeek = dateObj.getDay();

  if (presentDates.includes(dateStr)) {
    box.classList.add("present");

  } else if (leaveDates.includes(dateStr)) {
    box.classList.add("leave");

  } else if (dayOfWeek === 0) {
    box.classList.add("sunday");

  } else if (dayOfWeek === 6) {
    box.classList.add("saturday");

  } else {
    box.classList.add("absent");
  }

  calendarDiv.appendChild(box);
}

  overlay.classList.remove("hidden");
};

window.closeUserCalendar = function() {
  document.getElementById("userCalendarOverlay")
    .classList.add("hidden");
};

window.viewMonthlyHours = async function(userId, userName) {

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

window.closeHours = function() {
  document.getElementById("hoursOverlay").classList.add("hidden");
};