// models/ActivityLog.js
import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
    message: {
        type: String,
        required: true
    },
    type: { // e.g., 'info', 'success', 'warning', 'error'
        type: String,
        enum: ['info', 'success', 'warning', 'error'],
        default: 'info'
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    // Optional: Reference to the user who performed the action
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    // Mongoose will automatically add createdAt and updatedAt fields
    // but for logs, we often use a single 'timestamp' as defined above
    timestamps: false
});

export default mongoose.model('ActivityLog', activityLogSchema);