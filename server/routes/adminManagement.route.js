import express from 'express';
import verifyFirebaseToken from '../middleware/token.js';
import { getAllAdmins, updateAdmin, deleteAdmin, getAdmin } from '../services/adminService.js';
import { adminUpdateSchema } from '../schemas/adminSchema.js';

const router = express.Router();

// Middleware to verify the user is an admin
const verifyAdmin = async (req, res, next) => {
  try {
    if (req.user && req.user.admin === true) {
      next();
    } else {
      console.error('Admin verification error: Missing admin claim');
      return res.status(403).json({ error: 'Access denied: Admin privileges required' });
    }
  } catch (err) {
    console.error('Admin verification error:', err);
    return res.status(403).json({ error: 'Access denied: Admin privileges required' });
  }
};

router.use('/api/v1/admins', verifyFirebaseToken, verifyAdmin);

// GET /api/v1/admins - Get all admins
router.get('/api/v1/admins', async (req, res) => {
  try {
    const admins = await getAllAdmins();
    return res.status(200).json({ success: true, admins });
  } catch (err) {
    console.error('Retrieve admins error:', err);
    return res.status(500).json({ error: 'Failed to retrieve admins' });
  }
});

// PUT /api/v1/admins/:id - Update an admin
router.put('/api/v1/admins/:id', async (req, res) => {
  try {
    const validated = adminUpdateSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({ error: 'Invalid Input', details: validated.error.errors });
    }

    const result = await updateAdmin(req.params.id, validated.data);
    return res.status(200).json({ success: true, message: 'Admin updated successfully', adminId: result.adminId });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update admin', details: error.message });
  }
});

// DELETE /api/v1/admins/:id - Delete an admin
router.delete('/api/v1/admins/:id', async (req, res) => {
  try {
    // Prevent deleting oneself
    if (req.user.uid === req.params.id) {
      return res.status(400).json({ error: 'Cannot delete your own admin account' });
    }

    const result = await deleteAdmin(req.params.id);
    return res.status(200).json({ success: true, message: 'Admin deleted successfully', adminId: result.adminId });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete admin', details: error.message });
  }
});

export default router;
