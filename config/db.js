const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "SARAN1302",
  database: "attendance_system",
  // timezone: "+05:30"

});

db.connect((err) => {
  if (err) {
    console.log("Database connection failed:", err);
  } else {
    console.log("Database connected successfully");
  }
});

module.exports = db;