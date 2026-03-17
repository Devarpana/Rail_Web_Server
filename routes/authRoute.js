import express from 'express';
import {
    register,
    login,
    logout,
    forgotPassword,
    resetPassword,
    getUserById,
    isAuthenticated,
    verifyEmail,
} from '../controller/AuthController.js';
import userAuth from '../middleware/UserAuth.js';
import { adminBroadcastMail } from '../controller/AdminController.js';

const authRouter = express.Router();

// Authentication Routes
authRouter.post('/register', register); // User registration
authRouter.post('/login', login); // User login
authRouter.post('/logout', logout); // User logout
authRouter.post('/forgot-password', forgotPassword); // Send OTP for password reset
authRouter.post('/reset-password', resetPassword); // Reset password using OTP
authRouter.post('/verify-email', verifyEmail); // Verify email using OTP
authRouter.get('/getuserbyid', userAuth, getUserById); // Fetch user data by ID (protected)
authRouter.get('/is-auth', userAuth, isAuthenticated); // Changed to GET (more appropriate for checking auth status)

// Admin: Send email to a specific user or all users
authRouter.post('/admin/send-mail', adminBroadcastMail); // Manual token verification in controller

export default authRouter;