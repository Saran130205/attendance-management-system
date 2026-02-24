const bcrypt = require("bcryptjs");

const password = "admin123";

bcrypt.hash(password, 10, (err, hash) => {
  console.log("Hashed Password:", hash);
});