// utils/logger.js
import ActivityLog from '../models/ActivityLog.js'; // Adjust path as needed

/**
 * Logs an activity to the database.
 * @param {string} message - The description of the activity.
 * @param {'info'|'success'|'warning'|'error'} type - The type of activity.
 * @param {string|null} userId - The ID of the user performing the activity (optional).
 */
const logActivity = async (message, type = 'info', userId = null) => {
    try {
        const newLog = new ActivityLog({
            message,
            type,
            timestamp: new Date(),
            user: userId // This will be null if no userId is passed
        });
        await newLog.save();
        // You can still console.log here for server-side debugging,
        // but the main record is now in the DB.
        console.log(`[ACTIVITY LOG] [${type.toUpperCase()}] ${message}`);
    } catch (error) {
        console.error('Failed to save activity log to database:', error);
    }
};

export default logActivity;