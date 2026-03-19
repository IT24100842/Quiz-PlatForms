const express = require("express");
const forgotPasswordController = require("../controllers/forgotPasswordController");

const router = express.Router();

router.post("/forgot-password/request", forgotPasswordController.requestOtp);
router.post("/forgot-password/verify-otp", forgotPasswordController.verifyOtp);
router.post("/forgot-password/reset", forgotPasswordController.resetPassword);

module.exports = router;
