import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userModel from '../models/User.js';
import transporter from '../config/nodemailer.js';
import mongoose from 'mongoose';

// Admin Login
export const adminLogin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and Password are required" });
    }

    try {
        // Find the user by email
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Check if the user has the admin role
        if (user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Access denied. Not an admin account." });
        }

        // Verify the password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid Email or Password" });
        }

        // Generate an OTP
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        user.resetOtp = otp;
        user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000; // OTP valid for 15 minutes
        await user.save();

        // Send the OTP to the admin's email
        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: "Admin Login OTP",
            text: `Hello Admin,\n\nYour OTP for logging into the admin panel is ${otp}. Please use this OTP within 15 minutes to complete your login.\n\nBest Regards,\nE-book Team`
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({
            success: true,
            message: "OTP sent to your email. Please verify to complete login.",
        });
    } catch (error) {
        console.error("Error during admin login:", error.message);
        return res.status(500).json({ success: false, message: "An error occurred during admin login" });
    }
};

// Admin OTP Verification
export const adminVerifyOtp = async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }

    try {
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: "Admin not found" });
        }

        // Check if the user has the admin role
        if (user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Access denied. Not an admin account." });
        }

        // Verify OTP
        if (user.resetOtp !== otp || !user.resetOtp) {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }

        // Check if OTP has expired
        if (user.resetOtpExpireAt < Date.now()) {
            return res.status(400).json({ success: false, message: "OTP has expired" });
        }

        // Clear OTP fields after successful verification
        user.resetOtp = null;
        user.resetOtpExpireAt = null;
        await user.save();

        // Generate a JWT token
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

        return res.status(200).json({
            success: true,
            message: "Admin OTP verified successfully. Login complete.",
            token,
        });
    } catch (error) {
        console.error("Error during admin OTP verification:", error.message);
        return res.status(500).json({ success: false, message: "An error occurred during OTP verification" });
    }
};

// Fetch Admin Data by ID
export const getAdminById = async (req, res) => {
    const adminId = req.headers.id; // Extract 'id' from headers

    if (!adminId) {
        return res.status(400).json({ success: false, message: "Admin ID is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(adminId)) {
        return res.status(400).json({ success: false, message: "Invalid Admin ID" });
    }

    try {
        const admin = await userModel.findById(adminId);

        if (!admin) {
            return res.status(404).json({ success: false, message: "Admin not found" });
        }

        if (admin.role !== "admin") {
            return res.status(403).json({ success: false, message: "Access denied. Not an admin account." });
        }

        return res.status(200).json({
            success: true,
            adminData: {
                avatar: admin.avatar,
                id: admin._id,
                username: admin.username,
                email: admin.email,
                role: admin.role,
                isVerified: admin.isVerified,
            },
        });
    } catch (error) {
        console.error("Error fetching admin data:", error.message);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Admin sends email to all or specific user
export const adminBroadcastMail = async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Authorization header is missing or invalid" });
    }

    const token = authHeader.split(" ")[1];
    let userId;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }

    const adminUser = await userModel.findById(userId);
    if (!adminUser || adminUser.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Not an admin account." });
    }

    const { subject, message, email } = req.body;

    if (!subject || !message) {
        return res.status(400).json({ message: "Subject and message are required." });
    }

    try {
        let recipients = [];

        if (email) {
            const user = await userModel.findOne({ email });
            if (!user) {
                return res.status(404).json({ message: "User with this email not found." });
            }
            recipients = [user.email];
        } else {
            const users = await userModel.find({}, { email: 1, _id: 0 });
            recipients = users.map(u => u.email);
        }

        for (const to of recipients) {
            await transporter.sendMail({
                from: process.env.SENDER_EMAIL,
                to,
                subject,
                text: message,
            });
        }

        return res.status(200).json({
            success: true,
            message: `Email successfully sent to ${email ? email : 'all users'}`,
        });

    } catch (error) {
        console.error("Error sending email:", error.message);
        return res.status(500).json({ message: "Email sending failed", error: error.message });
    }
};