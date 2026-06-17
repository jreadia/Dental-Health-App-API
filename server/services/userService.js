import { db, auth } from '../config/firebase.js';

// Signup: Create Firebase Auth user and store profile in Firestore
const signupUser = async (email, password, userData) => {
  try {
    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
    });

    const uid = userRecord.uid;

    // Store user profile in Firestore
    await db.collection('users').doc(uid).set({
      firstName: userData.firstName,
      lastName: userData.lastName,
      phoneNumber: userData.phoneNumber,
      address: userData.address,
      birthday: userData.birthday,
      email,
      status: 'ACTIVE',
      createdAt: new Date(),
    });

    // Get Firebase ID token (return to client to use for authentication)
    // Note: Frontend will need to sign in and get token
    return { 
      success: true, 
      uid, 
      email, 
      firstName: userData.firstName, 
      lastName: userData.lastName,
      phoneNumber: userData.phoneNumber,
      address: userData.address,
      birthday: userData.birthday
    };
  } catch (error) {
    throw new Error(`Failed to sign up user: ${error.message}`, { cause: error });
  }
};

// Get user by ID
const getUser = async (userId) => {
  try {
    const doc = await db.collection('users').doc(userId).get();
    if (!doc.exists) {
      throw new Error('User not found');
    }
    return { userId: doc.id, ...doc.data() };
  } catch (error) {
    throw new Error(`Failed to retrieve user: ${error.message}`, { cause: error });
  }
};

// Get all users with pagination and search
const getAllUsers = async (limitNum = 10, cursorId = null, searchQuery = '') => {
  try {
    let query = db.collection('users');

    if (searchQuery) {
      // Basic prefix search on email
      query = query
        .where('email', '>=', searchQuery)
        .where('email', '<=', searchQuery + '\uf8ff')
        .orderBy('email');
    } else {
      query = query.orderBy('createdAt', 'desc');
    }

    query = query.limit(parseInt(limitNum, 10));

    if (cursorId) {
      const cursorDoc = await db.collection('users').doc(cursorId).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    const users = [];
    snapshot.forEach((doc) => {
      users.push({ userId: doc.id, ...doc.data() });
    });

    const lastVisible = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
    return {
      users,
      nextCursor: lastVisible ? lastVisible.id : null,
      hasMore: users.length === parseInt(limitNum, 10)
    };
  } catch (error) {
    throw new Error(`Failed to retrieve users: ${error.message}`, { cause: error });
  }
};

// Get User Stats
const getUserStats = async () => {
  try {
    const [totalSnap, inactiveSnap, bannedSnap] = await Promise.all([
      db.collection('users').count().get(),
      db.collection('users').where('status', '==', 'INACTIVE').count().get(),
      db.collection('users').where('status', '==', 'BANNED').count().get()
    ]);

    const totalCount = totalSnap.data().count;
    const inactiveCount = inactiveSnap.data().count;
    const bannedCount = bannedSnap.data().count;
    // Calculate active by subtracting inactive & banned from total
    const activeCount = totalCount - inactiveCount - bannedCount;

    return {
      total: totalCount,
      active: activeCount,
      inactive: inactiveCount,
      banned: bannedCount
    };
  } catch (error) {
    throw new Error(`Failed to retrieve user stats: ${error.message}`, { cause: error });
  }
};

// Update user
const updateUser = async (userId, userData) => {
  try {
    await db.collection('users').doc(userId).update(userData);
    return { success: true, userId };
  } catch (error) {
    throw new Error(`Failed to update user: ${error.message}`, { cause: error });
  }
};

// Delete user
const deleteUser = async (userId) => {
  try {
    // Delete from Firestore
    await db.collection('users').doc(userId).delete();

    // Delete from Firebase Auth
    await auth.deleteUser(userId);

    return { success: true, userId };
  } catch (error) {
    throw new Error(`Failed to delete user: ${error.message}`, { cause: error });
  }
};

export {
  signupUser,
  getUser,
  getAllUsers,
  getUserStats,
  updateUser,
  deleteUser,
};

