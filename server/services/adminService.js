import { db, auth } from '../config/firebase.js';

// Signup: Create Firebase Auth admin and store profile in Firestore
const signupAdmin = async (email, password, adminData) => {
  try {
    // Create admin in Firebase Auth
    const adminRecord = await auth.createUser({
      email,
      password,
    });

    const uid = adminRecord.uid;

    // Attach custom claim to designate this user as an admin
    await auth.setCustomUserClaims(uid, { admin: true });

    // Store admin profile in Firestore
    await db.collection('admins').doc(uid).set({
      firstName: adminData.firstName,
      lastName: adminData.lastName,
      email,
      createdAt: new Date(),
    });

    return { success: true, uid, email, firstName: adminData.firstName, lastName: adminData.lastName };
  } catch (error) {
    throw new Error(`Failed to sign up admin: ${error.message}`, { cause: error });
  }
};

// Get admin by ID
const getAdmin = async (adminId) => {
  try {
    const doc = await db.collection('admins').doc(adminId).get();
    if (!doc.exists) {
      throw new Error('Admin not found');
    }
    return { adminId: doc.id, ...doc.data() };
  } catch (error) {
    throw new Error(`Failed to retrieve admin: ${error.message}`, { cause: error });
  }
};

// Get all admins
const getAllAdmins = async () => {
  try {
    const snapshot = await db.collection('admins').get();
    const admins = [];
    snapshot.forEach((doc) => {
      admins.push({ adminId: doc.id, ...doc.data() });
    });
    return admins;
  } catch (error) {
    throw new Error(`Failed to retrieve admins: ${error.message}`, { cause: error });
  }
};

// Update admin
const updateAdmin = async (adminId, adminData) => {
  try {
    await db.collection('admins').doc(adminId).update(adminData);
    return { success: true, adminId };
  } catch (error) {
    throw new Error(`Failed to update admin: ${error.message}`, { cause: error });
  }
};

// Delete admin
const deleteAdmin = async (adminId) => {
  try {
    // Delete from Firestore
    await db.collection('admins').doc(adminId).delete();

    // Delete from Firebase Auth
    await auth.deleteUser(adminId);

    return { success: true, adminId };
  } catch (error) {
    throw new Error(`Failed to delete admin: ${error.message}`, { cause: error });
  }
};

export {
  signupAdmin,
  getAdmin,
  getAllAdmins,
  updateAdmin,
  deleteAdmin,
};

