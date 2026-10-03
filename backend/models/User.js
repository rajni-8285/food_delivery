const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        password: {
            type: String,
            required: true,
            minlength: 6,
        },

        role: {
            type: String,
            enum: ["customer", "admin"],
            default: "customer",
        },

        isVerified: {
            type: Boolean,
            default: false,
        },

        verificationToken: {
            type: String,
            default: null,
        },

        verificationTokenExpiry: {
            type: Date,
            default: null,
        },

        resetPasswordToken: {
            type: String,
            default: null,
        },

        resetPasswordExpiry: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model(
    "User",
    userSchema,
    "pizza_customer_record"
);