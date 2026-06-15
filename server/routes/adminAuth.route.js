import express from 'express';
import { adminSignupSchema, adminLoginSchema } from '../schemas/adminSchema.js';
import { signupAdmin, getAdmin } from '../services/adminService.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// POST /api/v1/auth/admins/register - Admin signup
router.post('/api/v1/auth/admins/register', authLimiter, async (req, res) => {
  try {
    const validated = adminSignupSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({
        error: 'Invalid Input',
        details: validated.error.errors,
      });
    }

    const { firstName, lastName, email, password } = validated.data;

    const result = await signupAdmin(email, password, { firstName, lastName });

    return res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      admin: {
        uid: result.uid,
        firstName: result.firstName,
        lastName: result.lastName,
        email: result.email,
      },
    });
  } catch (error) {
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('email-already-exists')) {
      return res.status(400).json({ error: 'Email already registered', details: error.message });
    }

    if (errorMessage.includes('password')) {
      return res.status(400).json({ error: 'Invalid password', details: error.message });
    }

    return res.status(500).json({ error: 'Signup failed', details: error.message });
  }
});

// POST /api/v1/auth/admins/login - Admin login
router.post('/api/v1/auth/admins/login', authLimiter, async (req, res) => {
  try {
    const validated = adminLoginSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({
        error: 'Invalid Input',
        details: validated.error.errors,
      });
    }

    const { email, password } = validated.data;

    // Use Firebase REST API for authentication
    const firebaseWebApiKey = process.env.FIREBASE_API_KEY;
    if (!firebaseWebApiKey) {
      return res.status(500).json({ error: 'Firebase configuration error' });
    }

    const response = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + firebaseWebApiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const firebaseError = data.error?.message;

      if (firebaseError === 'INVALID_PASSWORD') {
        return res.status(400).json({ error: 'Invalid password' });
      }
      if (firebaseError === 'EMAIL_NOT_FOUND') {
        return res.status(400).json({ error: 'Email not found' });
      }

      return res.status(400).json({ error: 'Login failed', details: firebaseError });
    }

    const { idToken, localId: uid } = data;

    // Fetch admin profile from Firestore
    const adminProfile = await getAdmin(uid);

    // Set HTTP-only cookie
    res.cookie('token', idToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 3600000 // 1 hour
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      admin: {
        uid,
        firstName: adminProfile.firstName,
        lastName: adminProfile.lastName,
        email: adminProfile.email,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// POST /api/v1/auth/admins/logout - Admin logout
router.post('/api/v1/auth/admins/logout', (req, res) => {
  res.clearCookie('token');
  return res.status(200).json({ success: true, message: 'Logged out successfully' });
});

export default router;
