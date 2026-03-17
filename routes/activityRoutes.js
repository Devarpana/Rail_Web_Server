// routes/activityRoutes.js
import express from 'express';
import activityController from '../controller/ActivityController.js'; // Adjust path
import userAuth from '../middleware/UserAuth.js'; // Your authentication middleware

const router = express.Router();

// Route to get recent activities (Admin only)
// Change from '/activities/recent' to just '/recent'
router.get('/recent', userAuth, activityController.getRecentActivities);

// Example: If you had a route to create an activity
// router.post('/', userAuth, activityController.createActivity);
// Example: If you had a route to get a specific activity by ID
// router.get('/:id', userAuth, activityController.getActivityById);

export default router;