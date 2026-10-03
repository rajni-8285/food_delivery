const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const User = require("../models/User");
const Customer = require("../models/Customer");

const generateToken = require("../utils/generateToken");
const { sendEmail } = require("../services/emailService");

const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must contain at least 6 characters",
            });
        }

        const existingUser = await User.findOne({
            email: normalizedEmail,
        });

        if (existingUser) {
            return res.status(409).json({
                message: "User already exists",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const verificationToken = crypto.randomBytes(32).toString("hex");

        const verificationTokenExpiry = new Date(
            Date.now() + 24 * 60 * 60 * 1000
        );

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: "customer",
            isVerified: false,
            verificationToken,
            verificationTokenExpiry,
        });

        await Customer.create({
            user: user._id,
            name: user.name,
            email: user.email,
        });

        const verificationUrl =
            `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;

        try {
            await sendEmail({
                to: user.email,
                subject: "Verify your Pizza Store account",
                html: `
                    <h2>Welcome ${user.name}</h2>
                    <p>Please verify your email address.</p>
                    <p>
                        <a href="${verificationUrl}">
                            Verify Email
                        </a>
                    </p>
                    <p>This link expires in 24 hours.</p>
                `,
            });
        } catch (emailError) {
            await Customer.deleteOne({ user: user._id });
            await User.deleteOne({ _id: user._id });

            console.error("Verification email error:", emailError);

            return res.status(500).json({
                message:
                    "Account could not be created because verification email failed",
            });
        }

        return res.status(201).json({
            message:
                "Registration successful. Please check your email to verify your account.",
        });
    } catch (error) {
        console.error("Register error:", error);

        return res.status(500).json({
            message: "Server error",
        });
    }
};

const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({
                message: "Verification token is required",
            });
        }

        const user = await User.findOne({
            verificationToken: token,
            verificationTokenExpiry: {
                $gt: new Date(),
            },
        });

        if (!user) {
            return res.status(400).json({
                message: "Invalid or expired verification link",
            });
        }

        user.isVerified = true;
        user.verificationToken = null;
        user.verificationTokenExpiry = null;

        await user.save();

        return res.status(200).json({
            message: "Email verified successfully",
        });
    } catch (error) {
        console.error("Verify email error:", error);

        return res.status(500).json({
            message: "Server error",
        });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({
            email: normalizedEmail,
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password",
            });
        }

        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                message: "Invalid email or password",
            });
        }

        if (!user.isVerified) {
            return res.status(403).json({
                message: "Please verify your email before logging in",
            });
        }

        const token = generateToken(user);

        return res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified,
            },
        });
    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            message: "Server error",
        });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({
            email: normalizedEmail,
        });

        // Do not reveal whether email exists.
        if (!user) {
            return res.status(200).json({
                message:
                    "If an account exists with this email, a reset link has been sent",
            });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpiry = new Date(
            Date.now() + 15 * 60 * 1000
        );

        await user.save();

        const resetUrl =
            `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

        try {
            await sendEmail({
                to: user.email,
                subject: "Reset your Pizza Store password",
                html: `
                    <h2>Password Reset</h2>
                    <p>Hello ${user.name},</p>
                    <p>Click the link below to reset your password.</p>
                    <p>
                        <a href="${resetUrl}">
                            Reset Password
                        </a>
                    </p>
                    <p>This link expires in 15 minutes.</p>
                `,
            });
        } catch (emailError) {
            user.resetPasswordToken = null;
            user.resetPasswordExpiry = null;

            await user.save();

            console.error("Reset email error:", emailError);

            return res.status(500).json({
                message: "Unable to send password reset email",
            });
        }

        return res.status(200).json({
            message:
                "If an account exists with this email, a reset link has been sent",
        });
    } catch (error) {
        console.error("Forgot password error:", error);

        return res.status(500).json({
            message: "Server error",
        });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({
                message: "Token and new password are required",
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must contain at least 6 characters",
            });
        }

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpiry: {
                $gt: new Date(),
            },
        });

        if (!user) {
            return res.status(400).json({
                message: "Invalid or expired reset token",
            });
        }

        user.password = await bcrypt.hash(password, 10);
        user.resetPasswordToken = null;
        user.resetPasswordExpiry = null;

        await user.save();

        return res.status(200).json({
            message: "Password reset successfully",
        });
    } catch (error) {
        console.error("Reset password error:", error);

        return res.status(500).json({
            message: "Server error",
        });
    }
};

const getMe = async (req, res) => {
    return res.status(200).json({
        user: req.user,
    });
};

module.exports = {
    registerUser,
    verifyEmail,
    loginUser,
    forgotPassword,
    resetPassword,
    getMe,
};