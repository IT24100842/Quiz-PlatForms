const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const forgotPasswordService = require("../services/forgotPasswordService");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

const requestOtp = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);

  if (!email) {
    throw new AppError("Email is required.", 400);
  }

  const result = await forgotPasswordService.requestOtp(email);
  res.json(result);
});

const verifyOtp = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const otp = String(req.body.otp || "").trim();

  if (!email || !otp) {
    throw new AppError("Email and OTP are required.", 400);
  }

  const result = forgotPasswordService.verifyOtp(email, otp);
  res.json(result);
});

const resetPassword = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const newPassword = String(req.body.newPassword || "");

  if (!email || !newPassword) {
    throw new AppError("Email and new password are required.", 400);
  }

  const result = await forgotPasswordService.resetPassword(email, newPassword);
  res.json(result);
});

module.exports = {
  requestOtp,
  verifyOtp,
  resetPassword,
};
