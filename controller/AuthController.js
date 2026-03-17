import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userModel from "../models/User.js";
import transporter from "../config/nodemailer.js";
import mongoose from "mongoose";

// Register
export const register = async (req, res) => {
    const { username, email, phone_number, password, role } = req.body;

    if (!username || !email || !phone_number || !password) {
        return res.status(400).json({ success: false, message: "Missing Details" });
    }

    try {
        const existingUser = await userModel.findOne({ email });
        const existingPhoneNumber = await userModel.findOne({ phone_number });
        
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User already exists with this email" });
        }

        if (existingPhoneNumber) {
            return res.status(400).json({ success: false, message: "User already exists with this phone number" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new userModel({
            username,
            email,
            phone_number,
            password: hashedPassword,
            
        });

        await user.save();

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: `Welcome to Rail Watch, ${role === "admin" ? "Admin" : "User"}!`,
            text: `Hello ${username},\n\nWelcome to Rail Watch You have successfully registered with the email: ${email}.\n\nBest Regards,\nTIH Teams`,
        };

        try {
            await transporter.sendMail(mailOptions);
        } catch (error) {
            console.error('Error sending email:', error.message);
            return res.status(500).json({ success: false, message: "Registration successful, but email sending failed." });
        }

        return res.status(201).json({ success: true, message: "User registered successfully", token });
    } catch (error) {
        console.error("Error during registration:", error.message);
        return res.status(500).json({ success: false, message: "Error in registration", error: error.message });
    }
};

// Login
export const login = async (req, res) => {
    const { email, phone_number, password } = req.body;

    if (!email && !phone_number || !password) {
        return res.status(400).json({ success: false, message: "Email or Phone number and Password are required" });
    }

    try {
        const user = email ? 
            await userModel.findOne({ email }) : 
            await userModel.findOne({ phone_number });
            
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid Email/Phone number or Password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid Email/Phone number or Password" });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
            success: true,
            message: "Login Successful",
            token,
            id: user._id,
            role: user.role,
        });
    } catch (error) {
        console.error("Error during login:", error.message);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// Forget Password - Generate OTP
export const forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" });
    }

    try {
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes

        user.resetOtp = otp;
        user.resetOtpExpireAt = otpExpiry;

        await user.save();

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: "Password Reset OTP",
            text: `Your password reset OTP is ${otp}. It is valid for 10 minutes.`,
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({ success: true, message: "OTP sent to your email." });
    } catch (error) {
        console.error("Error during forgot password:", error.message);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// Reset Password
export const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        return res.status(400).json({ success: false, message: "Missing details" });
    }

    try {
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.resetOtp !== otp || user.resetOtpExpireAt < Date.now()) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.resetOtp = "";
        user.resetOtpExpireAt = 0;

        await user.save();

        return res.status(200).json({ success: true, message: "Password reset successfully" });
    } catch (error) {
        console.error("Error during password reset:", error.message);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// Logout
export const logout = (req, res) => {
    try {
        res.clearCookie("token", {
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        });
        return res.json({ success: true, message: "Logged Out" });
    } catch (error) {
        console.error("Error during logout:", error.message);
        return res.json({ success: false, message: error.message });
    }
};

// Verify Email
export const verifyEmail = async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ success: false, message: "Missing details" });
    }

    try {
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.resetOtp !== otp || user.resetOtpExpireAt < Date.now()) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
        }

        user.resetOtp = "";
        user.resetOtpExpireAt = 0;
        user.isVerified = true; // Assuming you have an `isVerified` field in the user model

        await user.save();

        return res.status(200).json({ success: true, message: "Email verified successfully" });
    } catch (error) {
        console.error("Error during email verification:", error.message);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// Check if Authenticated
export const isAuthenticated = (req, res) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        return res.status(200).json({
            success: true,
            message: "User is authenticated",
            userId: decoded.id,
            role: decoded.role,
        });
    } catch (error) {
        console.error("Error verifying token:", error.message);
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
};

// Get User by ID
export const getUserById = async (req, res) => {
    const userId = req.userId; // Assuming `userId` is extracted from middleware like `userAuth`

    if (!userId) {
        return res.status(400).json({ success: false, message: "User ID is required" });
    }

    try {
        const user = await userModel.findById(userId).select("-password -resetOtp -resetOtpExpireAt");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({
            success: true,
            message: "User fetched successfully",
            user,
        });
    } catch (error) {
        console.error("Error fetching user by ID:", error.message);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
