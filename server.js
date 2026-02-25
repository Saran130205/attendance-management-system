const express = require("express");
const session = require("express-session");
const db = require("./config/db");

const app = express();

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "secretKey",
    resave: false,
    saveUninitialized: false,
  })
);

// console.log("🔥 SERVER FILE RUNNING 🔥");

// ================= LOGIN =================
app.post("/api/login", (req, res) => {
  const { name, password } = req.body;

  db.query("SELECT * FROM users WHERE name = ?", [name], (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });

    if (results.length === 0)
      return res.status(404).json({ message: "User not found" });

    const user = results[0];

    if (user.password !== password)
      return res.status(401).json({ message: "Wrong password" });

    req.session.user = user;

    res.json({ role: user.role });
  });
});

// ================= SESSION CHECK =================
app.get("/api/me", (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ message: "Not logged in" });

  res.json(req.session.user);
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

  const query = `
    SELECT 
      a.id,
      u.name,
      u.role,
      a.date,
      a.check_in,
      a.check_out
    FROM attendance a
    INNER JOIN users u ON a.user_id = u.id
    ORDER BY a.date DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Attendance Query Error:", err);
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
      console.error("Present Users found error",err);
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
      console.error("Holiday Fetch Error:", err);
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
      console.log(err);
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
      console.log(err);
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
      console.error("Attendance Error:", err);
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

  if (!req.session.user)
    return res.status(401).json({ message: "Unauthorized" });

  const userId = req.session.user.id;

  const today = new Date().toISOString().split("T")[0];
  const time = new Date().toTimeString().split(" ")[0];

  const sql = `
    INSERT INTO attendance (user_id, date, status, check_in)
    VALUES (?, ?, 'present', ?)
  `;

  db.query(sql, [userId, today, time], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Checked In Successfully" });
  });
});

//Checkout 
app.post("/api/employee/checkout", (req, res) => {

  if (!req.session.user)
    return res.status(401).json({ message: "Unauthorized" });

  const userId = req.session.user.id;
  const today = new Date().toISOString().split("T")[0];
  const time = new Date().toTimeString().split(" ")[0];

  const sql = `
    UPDATE attendance
    SET check_out = ?
    WHERE user_id = ? AND date = ?
  `;

  db.query(sql, [time, userId, today], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Checked Out Successfully" });
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
      console.log(err);
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