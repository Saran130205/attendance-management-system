document.addEventListener("DOMContentLoaded", function () {
  const tableBody = document.querySelector("#userTable tbody");

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
    await loadHolidays();
    loadUsers();
    loadAttendance();
    generateCalendar2026();
  }

  checkAuth();
  //load Users
  async function loadUsers() {
    const res = await fetch("/api/admin/users");
    const users = await res.json();

    const tbody = document.querySelector("#userTable tbody");
    if (!tbody) {
      console.log("User table not found");
      return;
    }
    tbody.innerHTML = "";

    users.forEach((user) => {
      const row = document.createElement("tr"); // 🔥 THIS WAS MISSING

      row.innerHTML = `
  <td>${user.id}</td>
  <td>${user.name}</td>
  <td>${user.role}</td>
  <td>${user.department}</td>
  <td>
    <button class="edit-btn" data-id="${user.id}">Edit</button>
    <button class="delete-btn" data-id="${user.id}">Delete</button>
    <button class="view-attendance" data-id="${user.id}">View Attendance </button> 
  </td>
`;
      tbody.appendChild(row);
    });
  }

  document.querySelector("#userTable").addEventListener("click", async (e) => {
    // ================= DELETE =================
    if (e.target.classList.contains("delete-btn")) {
      const id = e.target.dataset.id;

      const res = await fetch(`/api/admin/delete-user/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        console.log("Delete failed:", res.status);
        return;
      }

      loadUsers();
    }

    // ================= EDIT =================
    if (e.target.classList.contains("edit-btn")) {
      const id = e.target.dataset.id;

      const res = await fetch("/api/admin/users");
      const users = await res.json();

      const user = users.find((u) => u.id == id);
      if (!user) return;

      document.getElementById("name").value = user.name;
      document.getElementById("role").value = user.role;
      document.getElementById("department").value = user.department;

      document.getElementById("createForm").dataset.editId = id;
    }
  });
  //loadattendance

  async function loadAttendance() {
    const res = await fetch("/api/admin/attendance");
    const data = await res.json();

    const tbody = document.querySelector("#attendanceTable tbody");
    tbody.innerHTML = "";

    data.forEach((record) => {
      // ✅ Extract YYYY-MM-DD only
      const dateOnly = record.date.split("T")[0];

      // ✅ Combine date + time properly
      const checkInDate = record.check_in
        ? new Date(`${dateOnly}T${record.check_in}`)
        : null;

      const checkOutDate = record.check_out
        ? new Date(`${dateOnly}T${record.check_out}`)
        : null;

      const checkInFormatted = checkInDate
        ? checkInDate.toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })
        : "-";

      const checkOutFormatted = checkOutDate
        ? checkOutDate.toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })
        : "-";

      let duration = "-";

      if (checkInDate && checkOutDate) {
        const diffMs = checkOutDate - checkInDate;
        const totalSeconds = Math.floor(diffMs / 1000);

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        duration = `${hours}h ${minutes}m ${seconds}s`;
      }

      const row = document.createElement("tr");

      row.innerHTML = `
      <td>${record.name}</td>
      <td>${record.role}</td>
      <td>${new Date(dateOnly).toLocaleDateString("en-IN")}</td>
      <td>${checkInFormatted}</td>
      <td>${checkOutFormatted}</td>
      <td>${duration}</td>
    `;

      tbody.appendChild(row);
    });
  }

  // ================= FORM SUBMIT =================
  document
    .getElementById("createForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("name").value;
      const password = document.getElementById("password").value;
      const role = document.getElementById("role").value;
      const department = document.getElementById("department").value;

      const editId = e.target.dataset.editId;

      if (editId) {
        // UPDATE
        await fetch(`/api/admin/update-user/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, role, department }),
        });

        delete e.target.dataset.editId;
      } else {
        // CREATE
        await fetch("/api/admin/create-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, password, role, department }),
        });
      }

      e.target.reset();
      loadUsers();
    });

  // ================= DELETE =================
  // async function deleteUser(id) {
  //   await fetch(`/admin/delete-user/${id}`, {
  //     method: "DELETE",
  //   });
  //   loadUsers();
  // }

  // ===== View Attendance =====
  document.querySelector("#userTable").addEventListener("click", async (e) => {
    if (e.target.classList.contains("view-attendance")) {
      const id = e.target.dataset.id;
      const res = await fetch(`/api/admin/view-attendance/${id}`);
      const data = await res.json();

      const tbody = document.querySelector("#attendanceTable tbody");
      tbody.innerHTML = "";
      data.forEach((record) => {
        const dateOnly = record.date.split("T")[0];

        const checkInDate = record.check_in
          ? new Date(`${dateOnly}T${record.check_in}`)
          : null;

        const checkOutDate = record.check_out
          ? new Date(`${dateOnly}T${record.check_out}`)
          : null;

        const checkInFormatted = checkInDate
          ? checkInDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
          : "-";

        const checkOutFormatted = checkOutDate
          ? checkOutDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
          : "-";

        let duration = "-";

        if (checkInDate && checkOutDate) {
          const diffMs = checkOutDate - checkInDate;
          const totalSeconds = Math.floor(diffMs / 1000);

          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;

          duration = `${hours}h ${minutes}m ${seconds}s`;
        }

        const row = document.createElement("tr");

        row.innerHTML = `
        <td>-</td>
        <td>-</td>
        <td>${new Date(dateOnly).toLocaleDateString("en-IN")}</td>
        <td>${checkInFormatted}</td>
        <td>${checkOutFormatted}</td>
        <td>${duration}</td>
      `;

        tbody.appendChild(row);
      });
    }
  });

  //Search

  document.getElementById("searchInput").addEventListener("keyup", function () {
    const filter = this.value.toLowerCase();
    const rows = document.querySelectorAll("#userTable tbody tr");

    rows.forEach((row) => {
      if (row.cells.length > 1) {
        const name = row.cells[1].innerText.toLowerCase();

        if (name.includes(filter)) {
          row.style.display = "";
        } else {
          row.style.display = "none";
        }
      }
    });
  });
  //===== Calendar ======

  // ===================== HOLIDAYS =====================

  let holidays = [];

  async function loadHolidays() {
    try {
      const res = await fetch("/api/admin/holidays");
      const data = await res.json();

      console.log("RAW HOLIDAY DATA:", data);

      holidays = data.map((h) => {
        const dateOnly = new Date(h.holidays_date).toLocaleDateString("en-CA");
        // en-CA gives YYYY-MM-DD format

        return {
          date: dateOnly,
        };
      });

      console.log("Formatted Holidays:", holidays);
    } catch (err) {
      console.error("Holiday Load Error:", err);
    }
  }

  //===== calendar =====
  function generateCalendar2026() {
    const calendar = document.getElementById("calendar2026");
    if (!calendar) return;

    calendar.innerHTML = "";

    const year = new Date().getFullYear();
    const today = new Date();

    for (let month = 0; month < 12; month++) {
      const monthContainer = document.createElement("div");
      monthContainer.classList.add("month-box");

      const monthTitle = document.createElement("h3");
      monthTitle.innerText = new Date(year, month).toLocaleString("en-IN", {
        month: "long",
      });

      monthContainer.appendChild(monthTitle);

      const daysGrid = document.createElement("div");
      daysGrid.classList.add("days-grid");

      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement("div");
        daysGrid.appendChild(empty);
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const fullDate = new Date(year, month, day);
        const weekDay = fullDate.getDay();

        const dayBox = document.createElement("div");
        dayBox.classList.add("day-box");
        dayBox.innerText = day;

        const today = new Date();

        if (
          fullDate.getDate() === today.getDate() &&
          fullDate.getMonth() === today.getMonth() &&
          fullDate.getFullYear() === today.getFullYear()
        ) {
          dayBox.classList.add("today");
        }

        const currentDateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        // Sunday
        if (weekDay === 0) {
          dayBox.classList.add("sunday");
        }

        // Saturday
        if (weekDay === 6) {
          dayBox.classList.add("saturday");
        }

        // Govt Holiday
        const holidayObj = holidays.find((h) => h.date === currentDateString);
        if (holidayObj) {
          dayBox.classList.add("holiday");
          dayBox.title = holidayObj.name || "Holiday";
        }

        // ✅ TODAY HIGHLIGHT (SAFE METHOD)
        if (
          day === today.getDate() &&
          month === today.getMonth() &&
          year === today.getFullYear()
        ) {
          dayBox.classList.add("today");
        }

        daysGrid.appendChild(dayBox);
      }

      monthContainer.appendChild(daysGrid);
      calendar.appendChild(monthContainer);
    }
  }
  // ===================== CALENDAR TOGGLE =====================

  const calendarBtn = document.getElementById("calendarBtn");
  const calendarContainer = document.getElementById("calendar2026");

  if (calendarBtn && calendarContainer) {
    calendarContainer.style.display = "none";

    calendarBtn.addEventListener("click", async () => {
      if (calendarContainer.style.display === "none") {
        await loadHolidays();
        generateCalendar2026();

        calendarContainer.style.display = "grid";
        calendarBtn.innerText = "Hide Calendar";
      } else {
        calendarContainer.style.display = "none";
        calendarBtn.innerText = "View Calendar";
      }
    });
  }
// lrave approvall
  document.addEventListener("DOMContentLoaded", function () {

  const viewLeaveBtn = document.getElementById("viewLeaveBtn");
  const leaveSection = document.getElementById("leaveSection");

  viewLeaveBtn.addEventListener("click", function () {

    leaveSection.classList.remove("hidden");

    fetch("/api/admin/leave-requests")
      .then(res => res.json())
      .then(data => {

        const tbody = document.querySelector("#leaveTable tbody");
        tbody.innerHTML = "";

        if (data.length === 0) {
          tbody.innerHTML = "<tr><td colspan='5'>No leave requests</td></tr>";
          return;
        }

        data.forEach(leave => {
          tbody.innerHTML += `
            <tr>
              <td>${leave.employee_name}</td>
              <td>${leave.from_date}</td>
              <td>${leave.to_date}</td>
              <td>${leave.reason}</td>
              <td>${leave.status}</td>
            </tr>
          `;
        });

      })
      .catch(err => {
        alert("Error loading leave requests");
      });

  });

});

  window.logout = async function () {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/common/common.html";
  };
});
