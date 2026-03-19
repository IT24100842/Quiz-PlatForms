// In-memory OTP storage for demo purposes.
// In production, use Redis or a database with TTL support.
const otpStore = new Map();

function setOtp(email, value) {
  otpStore.set(String(email).toLowerCase(), value);
}

function getOtp(email) {
  return otpStore.get(String(email).toLowerCase()) || null;
}

function removeOtp(email) {
  otpStore.delete(String(email).toLowerCase());
}

module.exports = { setOtp, getOtp, removeOtp };
