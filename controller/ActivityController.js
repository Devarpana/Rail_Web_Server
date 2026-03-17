// controllers/ActivityController.js
import ActivityLog from '../models/ActivityLog.js';
import userModel from '../models/User.js'; // For authentication
import jwt from 'jsonwebtoken'; // For authentication

export const getRecentActivities = async (req, res) => {
    try {
        // --- Admin Authentication & Authorization (similar to other admin routes) ---
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: "Authorization header is missing." });
        }
        const token = authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "Authorization token is missing." });
        }

        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decodedToken.id);
        if (!user || user.role !== "admin") {
            return res.status(403).json({ message: "You are not authorized to view activities." });
        }
        // --- End Authentication ---

        const limit = parseInt(req.query.limit) || 5; // Get limit from query, default to 5
        const activities = await ActivityLog.find()
            .sort({ timestamp: -1 }) // Sort by latest first
            .limit(limit); // Limit the number of results

        res.status(200).json({ success: true, data: activities });
    } catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export default { getRecentActivities };