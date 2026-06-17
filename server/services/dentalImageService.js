import { db } from '../config/firebase.js';

// Create a new dental image (with optional diagnosis)
const createDentalImage = async (imageId, imageData) => {
  try {
    const imageDoc = {
      userId: imageData.userId,
      imageUrl: imageData.originalImageUrl || imageData.imageUrl, // Fallback for backwards compatibility
      originalImageUrl: imageData.originalImageUrl || null,
      annotatedImageUrl: imageData.annotatedImageUrl || null,
      mlResults: imageData.mlResults || null,
      uploadDate: new Date(imageData.uploadDate),
    };

    // Add diagnosis if provided
    if (imageData.diagnosis) {
      imageDoc.diagnosis = {
        calculusDetected: imageData.diagnosis.calculusDetected,
        calculusAmount: imageData.diagnosis.calculusAmount,
        oralHealthStatus: imageData.diagnosis.oralHealthStatus,
        diagnosisDate: new Date(imageData.diagnosis.diagnosisDate),
      };
    }

    await db.collection('dental_images').doc(imageId).set(imageDoc);
    return { success: true, imageId };
  } catch (error) {
    throw new Error(`Failed to create dental image: ${error.message}`, { cause: error });
  }
};

// Get dental image by ID
const getDentalImage = async (imageId) => {
  try {
    const doc = await db.collection('dental_images').doc(imageId).get();
    if (!doc.exists) {
      throw new Error('Dental image not found');
    }
    return { imageId: doc.id, ...doc.data() };
  } catch (error) {
    throw new Error(`Failed to retrieve dental image: ${error.message}`, { cause: error });
  }
};

// Get all images for a user
const getUserImages = async (userId) => {
  try {
    const snapshot = await db.collection('dental_images')
      .where('userId', '==', userId)
      .orderBy('uploadDate', 'desc')
      .get();

    const images = [];
    snapshot.forEach((doc) => {
      images.push({ imageId: doc.id, ...doc.data() });
    });
    return images;
  } catch (error) {
    throw new Error(`Failed to retrieve user images: ${error.message}`, { cause: error });
  }
};

// Update diagnosis for an image
const updateDiagnosis = async (imageId, diagnosisData) => {
  try {
    await db.collection('dental_images').doc(imageId).update({
      diagnosis: {
        calculusDetected: diagnosisData.calculusDetected,
        calculusAmount: diagnosisData.calculusAmount,
        oralHealthStatus: diagnosisData.oralHealthStatus,
        diagnosisDate: new Date(diagnosisData.diagnosisDate),
      },
    });
    return { success: true, imageId };
  } catch (error) {
    throw new Error(`Failed to update diagnosis: ${error.message}`, { cause: error });
  }
};

// Delete dental image
const deleteDentalImage = async (imageId) => {
  try {
    await db.collection('dental_images').doc(imageId).delete();
    return { success: true, imageId };
  } catch (error) {
    throw new Error(`Failed to delete dental image: ${error.message}`, { cause: error });
  }
};

export {
  createDentalImage,
  getDentalImage,
  getUserImages,
  updateDiagnosis,
  deleteDentalImage,
};
