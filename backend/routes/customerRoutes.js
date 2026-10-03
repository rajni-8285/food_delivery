const express = require("express");

const {
    getMyCustomerProfile,
    updateMyCustomerProfile,
} = require("../controllers/customerController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/me", protect, getMyCustomerProfile);

router.put("/me", protect, updateMyCustomerProfile);

module.exports = router;