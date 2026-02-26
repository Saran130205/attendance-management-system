console.log("ADMIN JS LOADED");

document.addEventListener("DOMContentLoaded", function () {

  let allUsers = [];
  let allAttendance = [];

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
  }

  checkAuth();

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
          <button id="status-btn-${user.id}" onclick="viewStatus(${user.id})">
            View Status
          </button>
          <button onclick="openUserCalendar(${user.id}, '${user.name}')">
            View Calendar
          </button>
          <button onclick="viewMonthlyHours(${user.id}, '${user.name}')">
            Work Hours
          </button>
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

  async function loadAttendance() {
    const res = await fetch("/api/admin/attendance");
    allAttendance = await res.json();
    renderAttendance(allAttendance);
  }

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

  // ================= LOGOUT =================

  window.logout = async function () {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/common/common.html";
  };

});