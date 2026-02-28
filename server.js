const express = require("express");
const session = require("express-session");
const db = require("./config/db");
const ExcelJS = require("exceljs");

const app = express();

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "yourSecretKey",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // true only in HTTPS
}));

// ================= LOGIN =================
app.post("/api/login", (req, res) => {
  const { name, password, role } = req.body;

  if (!name || !password || !role) {
    return res.status(400).json({ message: "All fields are required" });
  }

  db.query(
    "SELECT id, name, password, role FROM users WHERE name = ? AND role = ?",
    [name, role],
    (err, results) => {

      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ message: "Internal server error" });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "User not found for selected role" });
      }

      const user = results[0];

      if (user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Save session
      req.session.user = {
        id: user.id,
        name: user.name,
        role: user.role
      };

      res.json({
        message: "Login successful",
        role: user.role
      });
    }
  );
});

// ================= ADMIN ROUTES =================

// Get all users
app.get("/api/admin/users", (req, res) => {
  if (!req.session.user || req.session.user.role !== "admin")
    return res.status(403).json({ message: "Admin only" });

  db.query(
    "SELECT id, name, role, department FROM users",
    (err, results) => {
      if (err) return res.status(500).json({ message: "Database error" });
      res.json(results);
    }
  );
});

// Create user
app.post("/api/admin/create-user", (req, res) => {
  if (!req.session.user || req.session.user.role !== "admin")
    return res.status(403).json({ message: "Admin only" });

  const { name, password, role, department } = req.body;

  db.query(
    "INSERT INTO users (name, password, role, department) VALUES (?, ?, ?, ?)",
    [name, password, role, department],
    (err) => {
      if (err) return res.status(500).json({ message: "Database error" });
      res.json({ message: "User created successfully" });
    }
  );
});

// Update user
app.put("/api/admin/update-user/:id", (req, res) => {
  if (!req.session.user || req.session.user.role !== "admin")
    return res.status(403).json({ message: "Admin only" });

  const { id } = req.params;
  const { name, role, department } = req.body;

  db.query(
    "UPDATE users SET name = ?, role = ?, department = ? WHERE id = ?",
    [name, role, department, id],
    (err) => {
      if (err) return res.status(500).json({ message: "Database error" });
      res.json({ message: "User updated successfully" });
    }
  );
});

// Delete user
app.delete("/api/admin/delete-user/:id", (req, res) => {
  if (!req.session.user || req.session.user.role !== "admin")
    return res.status(403).json({ message: "Admin only" });

  const { id } = req.params;

  db.query("DELETE FROM users WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json({ message: "Database error" });

    res.json({ message: "User deleted successfully" });
  });
});

//Admin Attendance

  app.get("/api/admin/attendance", (req, res) => {
  if (!req.session.user || req.session.user.role !== "admin")
    return res.status(403).json({ message: "Admin only" });

  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const query = `
    SELECT 
      a.id,
      u.name,
      u.role,
      DATE_FORMAT(a.\`date\`, '%Y-%m-%d') AS date,
      a.check_in,
      a.check_out
    FROM attendance a
    INNER JOIN users u ON a.user_id = u.id
    ORDER BY a.\`date\` DESC, a.id DESC
    LIMIT ${offset}, ${limit}
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.log("DB ERROR:", err);
      return res.status(500).json({ message: "Database error" });
    }

    res.json(results);
  });
});

//present Employees
app.get("/api/admin/present-users",(req, res) =>{
  if (!req.session.user || req.session.user.role !== "admin")
    return res.status(403).json({ message: "Admin only" });
const query = `
    SELECT 
      u.name,
      u.role,
      a.check_in
    FROM attendance a
    JOIN users u ON a.user_id = u.id
    WHERE a.check_in IS NOT NULL 
      AND a.check_out IS NULL
    ORDER BY a.check_in DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      // console.error("Present Users found error",err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json(results);
  });
});

// ===== Govt-Holidays =====
app.get("/api/admin/holidays", (req, res) => {

  if (!req.session.user || req.session.user.role !== "admin")
    return res.status(403).json({ message: "Admin only" });

  db.query("SELECT * FROM holidays", (err, results) => {

    if (err) {
      // console.error("Holiday Fetch Error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    res.json(results);
  });
});

// Admin - Get All Leave Requests
app.get("/api/admin/leave-requests", (req, res) => {

  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }

  const sql = `
    SELECT lr.*, u.name AS employee_name
    FROM leave_requests lr
    JOIN users u ON lr.employee_id = u.id
    ORDER BY lr.created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      // console.log(err);
      return res.status(500).json({ message: "Error fetching leave requests" });
    }

    res.json(results);
  });

});

//leave app/rej

app.put("/api/admin/update-leave/:id", (req, res) => {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }

  const leaveId = req.params.id;
  const { status } = req.body;

  const sql = "UPDATE leave_requests SET status = ? WHERE id = ?";

  db.query(sql, [status, leaveId], (err) => {
    if (err) {
      // console.log(err);
      return res.status(500).json({ message: "Update failed" });
    }

    res.json({ message: "Leave updated successfully" });
  });
});

//View Status

app.get("/api/admin/status/:id", (req, res) => {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }

  const employeeId = req.params.id;

  const sql = `
    SELECT * FROM attendance
    WHERE user_id = ?
    AND date = CURDATE()
  `;

  db.query(sql, [employeeId], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length > 0) {
      return res.json({ status: "Present" });
    } else {
      return res.json({ status: "Absent" });
    }
  });
});

//user attendance summary

app.get("/api/admin/user-attendance-summary/:id", (req, res)=>{
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }
  const userId = req.params.id;
  const month = new Date().getMonth() + 1; // current month
  const year = new Date().getFullYear();

  const presentQuery = `
    SELECT COUNT(DISTINCT date) AS presentDays
    FROM attendance
    WHERE user_id = ?
    AND MONTH(date) = ?
    AND YEAR(date) = ?
  `;

  db.query(presentQuery, [userId, month, year], (err, result) => {
    if (err) return res.status(500).json(err);

    const presentDays = result[0].presentDays;

    // Calculate Working Days (Mon–Fri)
    const totalDays = new Date(year, month, 0).getDate();

    let workingDays = 0;

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();

      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
    }

    res.json({
      presentDays,
      workingDays
    });
  });
});

//User-calendar

app.get("/api/admin/user-calendar/:id", (req, res) => {

  const userId = req.params.id;

  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();

  const attendanceSql = `
    SELECT date FROM attendance
    WHERE user_id = ?
    AND MONTH(date) = ?
    AND YEAR(date) = ?
  `;

  const leaveSql = `
    SELECT from_date, to_date FROM leave_requests
    WHERE employee_id = ?   
    AND status = 'Approved'
    AND (
      MONTH(from_date) = ?
      OR MONTH(to_date) = ?
    )
  `;

  db.query(attendanceSql, [userId, month, year], (err, attendance) => {

    if (err) {
      // console.log("Attendance SQL Error:", err);
      return res.status(500).json({ attendance: [], leaves: [] });
    }

    db.query(leaveSql, [userId, month, month], (err2, leaves) => {

      if (err2) {
        // console.log("Leave SQL Error:", err2);
        return res.status(500).json({ attendance: [], leaves: [] });
      }

      res.json({
        attendance: attendance || [],
        leaves: leaves || []
      });

    });

  });

});

//User-monthly-hours
app.get("/api/admin/user-monthly-hours/:id", (req, res) => {

  const userId = req.params.id;

  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();

  const sql = `
    SELECT check_in, check_out, date
    FROM attendance
    WHERE user_id = ?
    AND MONTH(date) = ?
    AND YEAR(date) = ?
    AND check_in IS NOT NULL
    AND check_out IS NOT NULL
  `;

  db.query(sql, [userId, month, year], (err, records) => {

    if (err) return res.status(500).json({ error: err });

    let totalSeconds = 0;

    records.forEach(r => {
      const checkIn = new Date(`1970-01-01T${r.check_in}`);
      const checkOut = new Date(`1970-01-01T${r.check_out}`);
      totalSeconds += (checkOut - checkIn) / 1000;
    });

    const workedHours = totalSeconds / 3600;

    // Calculate working days (Mon-Fri)
    const totalDays = new Date(year, month, 0).getDate();
    let workingDays = 0;

    for (let d = 1; d <= totalDays; d++) {
      const day = new Date(year, month - 1, d).getDay();
      if (day !== 0 && day !== 6) workingDays++;
    }

    const standardHours = workingDays * 8.5;

    res.json({
      workedHours: workedHours.toFixed(2),
      standardHours: standardHours.toFixed(2),
      difference: (workedHours - standardHours).toFixed(2)
    });

  });

});

//===== hr-analytics =====

app.get("/api/admin/hr-analytics", async (req, res) => {

  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }

  try {

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;

    // console.log("Today:", formattedDate);

    // Total Users
    const [totalRows] = await db.promise().query(
      "SELECT COUNT(*) as total FROM users"
    );

    // console.log("Total Rows:", totalRows);

    // Present Today
    const [presentRows] = await db.promise().query(
      "SELECT COUNT(DISTINCT user_id) as present FROM attendance WHERE date = ?",
      [formattedDate]
    );

    // console.log("Present Rows:", presentRows);

    const total = totalRows[0]?.total || 0;
    const present = presentRows[0]?.present || 0;
    const absent = total - present;

    res.json({
      totalEmployees: total,
      presentToday: present,
      absentToday: absent
    });

  } catch (err) {
    // console.error("Analytics Error FULL:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }

});

//export attendance

// const ExcelJS = require("exceljs");

app.get("/api/admin/export-attendance/:userId", async (req, res) => {

  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }

  try {

    const userId = req.params.userId;

    const [userRows] = await db.promise().query(
      "SELECT name, department, role FROM users WHERE id = ?",
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userRows[0];


    const [attendanceRows] = await db.promise().query(
      `SELECT date, check_in, check_out 
       FROM attendance 
       WHERE user_id = ?
       ORDER BY date ASC`,
      [userId]
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Monthly Attendance");

    //  HEADER STYLE 

    sheet.mergeCells("A1:E1");
    sheet.getCell("A1").value =
      `${user.name} - ${user.department} - ${user.role}`;

    sheet.getCell("A1").font = { size: 14, bold: true };
    sheet.getCell("A1").alignment = { horizontal: "center" };

    sheet.addRow([]);

    //  TABLE HEADER 

    const headerRow = sheet.addRow([
      "Date",
      "Status",
      "Check-In",
      "Check-Out",
      "Total Hours"
    ]);

    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: "center" };

    headerRow.eachCell(cell => {
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" }
      };
    });

    //DATA 

    let totalHoursMonth = 0;
    let presentDays = 0;

    attendanceRows.forEach(row => {

      let totalHours = "-";
      let status = "Absent";

      if (row.check_in && row.check_out) {

        const checkIn = new Date(`1970-01-01T${row.check_in}`);
        const checkOut = new Date(`1970-01-01T${row.check_out}`);

        const diffMs = checkOut - checkIn;

        const hours = diffMs / (1000 * 60 * 60);
        totalHours = hours.toFixed(2);

        totalHoursMonth += hours;
        presentDays++;
        status = "Present";
      }

      sheet.addRow([
        row.date.toLocaleDateString(),
        status,
        row.check_in || "-",
        row.check_out || "-",
        totalHours
      ]);
    });

    //SUMMARY 

    sheet.addRow([]);
    sheet.addRow(["Working Days (Company)", attendanceRows.length]);
    sheet.addRow(["Total Present Days", presentDays]);
    sheet.addRow(["Total Worked Hours", totalHoursMonth.toFixed(2)]);

    
    const expectedHours = attendanceRows.length * 8.5;
    sheet.addRow(["Expected Monthly Hours", expectedHours.toFixed(2)]);
    sheet.addRow([
      "Difference",
      (totalHoursMonth - expectedHours).toFixed(2)
    ]);


    sheet.columns.forEach(column => {
      column.width = 18;
    });

    // DOWNLOAD 

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${user.name}_attendance.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    // console.error("Export Error:", err);
    res.status(500).json({ message: "Export Failed" });
  }

});
// ================= EMPLOYEE ROUTES =================

app.get("/api/employee/attendance", (req, res) => {

  if (!req.session.user || req.session.user.role !== "employee") {
    return res.status(403).json({ message: "Employee only" });
  }

  const sql = `
    SELECT 
      date,
      status,
      check_in,
      check_out,
      CASE 
        WHEN check_in IS NOT NULL AND check_out IS NOT NULL
        THEN TIMESTAMPDIFF(MINUTE, check_in, check_out)
        ELSE NULL
      END AS worked_minutes
    FROM attendance
    WHERE user_id = ?
    ORDER BY date DESC
  `;

  db.query(sql, [req.session.user.id], (err, results) => {
    if (err) {
      // console.error("Attendance Error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    res.json(results);
  });

});
//Profile update
app.put("/api/employee/profile", (req, res) => {

  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { gender, dob, age, contact, password } = req.body;

  let sql = `
    UPDATE users
    SET gender = ?, dob = ?, age = ?, contact = ?
  `;

  let params = [gender, dob, age, contact];

  if (password && password.trim() !== "") {
    sql += `, password = ?`;
    params.push(password);
  }

  sql += ` WHERE id = ?`;
  params.push(req.session.user.id);

  db.query(sql, params, (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Profile Updated Successfully" });
  });

});
//get Profile
app.get("/api/employee/profile", (req, res) => {

  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const sql = `
    SELECT name, department, gender, dob, age, contact
    FROM users
    WHERE id = ?
  `;

  db.query(sql, [req.session.user.id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result[0]);
  });

});

//CheckIn
app.post("/api/employee/checkin", (req, res) => {

  if (!req.session.user || req.session.user.role !== "employee") {
    return res.status(403).json({ message: "Employee only" });
  }

  const userId = req.session.user.id;

  const today = new Date()
  const date = today.toISOString().split("T")[0];
  const time = today.toTimeString().split(" ")[0];

  const checkSql = `SELECT * FROM attendance WHERE user_id = ? AND date = ?`;

  db.query(checkSql, [userId, date], (err, results) => {
    if (err) return res.status(500).json({message:"Server Error"});

    if(results.length > 0 ) {
      return res.json({ message : "Already Checkin"})
    }
  
  const sql = `
    INSERT INTO attendance (user_id, date, status, check_in)
    VALUES (?, CURDATE(), 'present', CURTIME())
  `;

  db.query(sql, [userId, today, time], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Checked In Successfully" });
    });
  });
});

//Checkout 
app.post("/api/employee/checkout", (req, res) => {

  if (!req.session.user || req.session.user.role !== "employee") {
    return res.status(403).json({ message: "Employee only" });
  }

  const userId = req.session.user.id;
  const today = new Date();
  const date = today.toISOString().split("T")[0];
  const time = today.toTimeString().split(" ")[0];

  const sql = `
    UPDATE attendance
    SET check_out = ?
    WHERE user_id = ? AND date = ?
    AND check_out IS NULL
  `;

  db.query(sql, [time, userId, date], (err, result) => {

    if (err) return res.status(500).json({ message: "Server error" });

    if (result.affectedRows === 0) {
      return res.json({ message: "Already checked out" });
    }

    res.json({ message: "Checked out successfully" });
  });
});

//LEAVE REQUEST 
app.post("/api/employee/request-leave", (req, res) => {
  if (!req.session.user || req.session.user.role !== "employee") {
    return res.status(403).json({ message: "Employee only" });
  }

  const { from_date, to_date, reason } = req.body;
  const employee_id = req.session.user.id;

  if (!from_date || !to_date || !reason) {
    return res.status(400).json({ message: "All fields required" });
  }

  const sql = `
    INSERT INTO leave_requests (employee_id, from_date, to_date, reason)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [employee_id, from_date, to_date, reason], (err) => {
    if (err) {
      // console.log(err);
      return res.status(500).json({ message: "Error submitting leave" });
    }

    res.json({ message: "Leave request submitted successfully" });
  });
});

//leave status of employee

app.get("/api/employee/my-leaves", (req, res) => {
  if (!req.session.user || req.session.user.role !== "employee") {
    return res.status(403).json({ message: "Employee only" });
  }

  const sql = `
    SELECT * FROM leave_requests
    WHERE employee_id = ?
    ORDER BY created_at DESC
  `;

  db.query(sql, [req.session.user.id], (err, results) => {
    if (err) return res.status(500).json({ message: "Error fetching leaves" });

    res.json(results);
  });
});

//Auto disable checkin
app.get("/api/employee/disable-checkin", (req, res) => {

  const userId = req.session.user.id;
  const today = new Date().toISOString().split("T")[0];

  const sql = `
    SELECT check_in, check_out
    FROM attendance
    WHERE user_id = ? AND date = ?
  `;

  db.query(sql, [userId, today], (err, results) => {

    if (err) return res.status(500).json({ message: "Server error" });

    if (results.length === 0) {
      return res.json({
        checkedIn: false,
        checkedOut: false
      });
    }

    const record = results[0];

    res.json({
      checkedIn: !!record.check_in,
      checkedOut: !!record.check_out
    });
  });
});


//check-in
app.post("/api/employee/check-in",(req, res) =>{
  if (!req.session.user || req.session.user.role !== "employee") {
    return res.status(403).json({ message: "Employee only" });
  }

  const userId = req.session.user.id;
  const today = new Date();
  const date = today.toISOString.split("T")[0];
  const time = today.toTimeString.split("T")[0];

  const sql = `
  INSERT INTO attendance (user_id, date, status, check_in)
  VALUES (?, CURDATE(), 'present', CURTIME())
`;

  db.query(sql, [userId, date, time], (err) => {
    if (err) {
      // console.error("Check-in error:", err);
      return res.status(500).json({ message: "Server error" });
    }

    res.json({ message: "Checked in successfully" });
  });
});

//check-out

app.post("/api/employee/check-out", (req, res) => {

  if (!req.session.user || req.session.user.role !== "employee") {
    return res.status(403).json({ message: "Employee only" });
  }

  const userId = req.session.user.id;

  const today = new Date();
  const date = today.toISOString().split("T")[0];
  const time = today.toTimeString().split("T")[0];

  const sql = `
  UPDATE attendance
  SET check_out = CURTIME()
  WHERE user_id = ?
    AND date = CURDATE()
    AND check_out IS NULL
`;

  db.query(sql, [time, userId, date], (err) => {
    if (err) {
      // console.error("Check-out error:", err);
      return res.status(500).json({ message: "Server error" });
    }

    res.json({ message: "Checked out successfully" });
  });
});

app.get("/api/employee/today-status", (req, res) => {

  const userId = req.session.user.id;
  const today = new Date().toISOString().split("T")[0];

  const sql = `
    SELECT check_in, check_out
    FROM attendance
    WHERE user_id = ? AND date = ?
  `;

  db.query(sql, [userId, today], (err, results) => {

    if (err) return res.status(500).json({ message: "Server error" });

    if (results.length === 0) {
      return res.json({
        checkedIn: false,
        checkedOut: false
      });
    }

    const record = results[0];

    res.json({
      checkedIn: !!record.check_in,
      checkedOut: !!record.check_out
    });
  });
});


// ================= LOGOUT =================
app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out" });
  });
});

// ================= STATIC (ALWAYS LAST) =================
app.use(express.static("Public"));

// ================= SERVER START =================
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});