import { auth } from '../config/firebase.js';

const verifyFirebaseToken = async (req, res, next) => {
  try {
    let token = req.cookies?.token;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return res.status(401).json({ error: 'Missing authentication token' });
    }

    try {
      const decodedToken = await auth.verifyIdToken(token);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        admin: decodedToken.admin === true,
      };
      next();
    } catch (tokenError) {
      return res.status(401).json({ error: 'Invalid or expired token', details: tokenError.message });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Token verification failed', details: error.message });
  }
};

export default verifyFirebaseToken;
