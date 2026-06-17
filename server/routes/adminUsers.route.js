import express from 'express';
import verifyFirebaseToken from '../middleware/token.js';
import { getAdmin } from '../services/adminService.js';
import { getAllUsers, getUserStats, updateUser, deleteUser } from '../services/userService.js';
import { getUserImages } from '../services/dentalImageService.js';

const router = express.Router();

// Middleware to verify the user is an admin
const verifyAdmin = async (req, res, next) => {
  try {
    const adminId = req.user.uid;
    await getAdmin(adminId);
    next();
  } catch (err) {
    console.error('Admin verification error:', err);
    return res.status(403).json({ error: 'Access denied: Admin privileges required' });
  }
};

router.use('/api/v1/users', verifyFirebaseToken, verifyAdmin);

// GET /api/v1/users/stats - Get user statistics
router.get('/api/v1/users/stats', async (req, res) => {
  try {
    const stats = await getUserStats();
    return res.status(200).json({ success: true, data: stats });
  } catch (err) {
    console.error('Retrieve stats error:', err);
    return res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

// GET /api/v1/users - Get all users
router.get('/api/v1/users', async (req, res) => {
  try {
    const { limit, cursor, search } = req.query;
    const data = await getAllUsers(limit, cursor, search);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Retrieve users error:', err);
    return res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// PATCH /api/v1/users/:userId/status - Update user status
router.patch('/api/v1/users/:userId/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE', 'BANNED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    await updateUser(req.params.userId, { status });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Update status error:', error);
    return res.status(500).json({ error: 'Failed to update user status' });
  }
});

// DELETE /api/v1/users/:userId - Delete a user
router.delete('/api/v1/users/:userId', async (req, res) => {
  try {
    await deleteUser(req.params.userId);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET /api/v1/users/:userId/dental-images - Get a specific user's image history / results
router.get('/api/v1/users/:userId/dental-images', async (req, res) => {
  try {
    const images = await getUserImages(req.params.userId);
    return res.status(200).json({ success: true, data: images });
  } catch (error) {
    console.error('Fetch user history error:', error);
    return res.status(500).json({ error: 'Failed to retrieve user history' });
  }
});

export default router;
