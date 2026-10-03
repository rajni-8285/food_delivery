const express = require("express");

const {
    registerUser,
    verifyEmail,
    loginUser,
    forgotPassword,
    resetPassword,
    getMe,
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);

router.get("/verify-email", verifyEmail);

router.post("/login", loginUser);

router.post("/forgot-password", forgotPassword);

router.post("/reset-password", resetPassword);

router.get("/me", protect, getMe);

module.exports = router;