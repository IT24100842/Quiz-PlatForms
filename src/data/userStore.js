const bcrypt = require("bcryptjs");

// In-memory demo users. Replace with real DB calls in production.
const users = new Map();

users.set("user@example.com", {
  email: "user@example.com",
  // Demo password: oldpassword123
  passwordHash: bcrypt.hashSync("oldpassword123", 10),
});

function findUserByEmail(email) {
  return users.get(String(email).toLowerCase()) || null;
}

function updatePasswordHash(email, newHash) {
  const normalizedEmail = String(email).toLowerCase();
  const user = users.get(normalizedEmail);
  if (!user) return null;

  user.passwordHash = newHash;
  users.set(normalizedEmail, user);
  return user;
}

module.exports = { findUserByEmail, updatePasswordHash };
