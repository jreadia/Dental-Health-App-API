import express from 'express';
import { userSignupSchema, userLoginSchema } from '../schemas/userSchema.js';
import { signupUser, getUser } from '../services/userService.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// POST /api/v1/auth/users/register - User signup
router.post('/api/v1/auth/users/register', authLimiter, async (req, res) => {
  try {
    const validated = userSignupSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({
        error: 'Invalid Input',
        details: validated.error.errors,
      });
    }

    const { firstName, lastName, phoneNumber, address, birthday, email, password } = validated.data;

    const result = await signupUser(email, password, { firstName, lastName, phoneNumber, address, birthday });

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        uid: result.uid,
        firstName: result.firstName,
        lastName: result.lastName,
        phoneNumber: result.phoneNumber,
        address: result.address,
        birthday: result.birthday,
        email: result.email,
        wasExistingUser: result.wasExistingUser,
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

// POST /api/v1/auth/users/login - User login
router.post('/api/v1/auth/users/login', authLimiter, async (req, res) => {
  try {
    const validated = userLoginSchema.safeParse(req.body);
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

    // Fetch user profile from Firestore
    const userProfile = await getUser(uid);
    
    // Block inactive or banned users
    if (userProfile.status === 'INACTIVE' || userProfile.status === 'BANNED') {
      return res.status(403).json({ error: 'Account disabled', details: 'Your account has been deactivated by an administrator.' });
    }

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
      user: {
        uid,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        phoneNumber: userProfile.phoneNumber,
        address: userProfile.address,
        birthday: userProfile.birthday,
        email: userProfile.email,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// POST /api/v1/auth/users/logout - User logout
router.post('/api/v1/auth/users/logout', (req, res) => {
  res.clearCookie('token');
  return res.status(200).json({ success: true, message: 'Logged out successfully' });
});

export default router;
