import express from 'express';
import upload from '../middleware/upload.js';
import verifyFirebaseToken from '../middleware/token.js';
import { mlLimiter } from '../middleware/rateLimiter.js';
import cloudinary from '../config/cloudinary.js';
import { createDentalImage, getUserImages, getDentalImage } from '../services/dentalImageService.js';
import { dentalImageCreateSchema } from '../schemas/dentalImageSchema.js';
import axios from 'axios';
import FormData from 'form-data';

const router = express.Router();

// POST /api/v1/dental-images - Upload image (Requires Authentication)
router.post('/api/v1/dental-images', verifyFirebaseToken, mlLimiter, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Get userId from the decoded Firebase token
    const userId = req.user.uid;

    // --- ML GATEKEEPER START ---
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname || 'image.jpg',
      contentType: req.file.mimetype || 'image/jpeg',
    });

    // Use the deployed Render URL or allow override via environment variable
    const mlApiUrl = process.env.ML_API_URL || 'https://calculus-model.onrender.com/predict';

    let mlResponse;
    try {
      mlResponse = await axios.post(mlApiUrl, formData, {
        headers: {
          ...formData.getHeaders(),
        }
      });
    } catch (mlErr) {
      console.error('Error connecting to ML API. Message:', mlErr.message);
      if (mlErr.response) {
        console.error('ML API Error Response Status:', mlErr.response.status);
        console.error('ML API Error Response Data:', mlErr.response.data);
      }
      return res.status(503).json({ error: 'ML Service is currently unavailable', details: mlErr.message });
    }

    // Extract YOLOv8n data from the ML response
    const { 
      annotated_image_base64, 
      annotated_image, // Fallback key just in case
      calculus_detected,
      calculus_amount,
      oral_health_status,
      average_confidence,
      highest_confidence, // fallback for backwards compatibility
      detections
    } = mlResponse.data;

    // Check both possible keys for the base64 image
    const base64ImageString = annotated_image_base64 || annotated_image;
    if (!base64ImageString) {
      console.error('ML API Response missing base64 annotated image. Keys received:', Object.keys(mlResponse.data));
      return res.status(500).json({ error: 'Invalid response format from ML Service' });
    }

    const annotatedImageBuffer = Buffer.from(base64ImageString, 'base64');
    
    // Map the flat ML response structure back to the expected metadata object format
    const metadata = {
      calculusDetected: calculus_detected === "Yes" || calculus_detected === true,
      calculusAmount: calculus_amount || 0,
      overall_diagnosis: oral_health_status || "Unknown",
      averageConfidence: average_confidence !== undefined ? average_confidence : (highest_confidence || 0),
      boxes: Array.isArray(detections) ? detections.map(d => ({
        confidence: d.confidence,
        bbox: d.bbox
      })) : []
    };
    // --- ML GATEKEEPER END ---

    // Helper to upload buffer to Cloudinary
    const uploadBufferToCloudinary = (buffer) => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { 
            folder: 'dental_images',
            format: 'webp', // Convert to WebP to save storage and bandwidth
            quality: 'auto' // Automatically compress without noticeable quality loss
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        uploadStream.end(buffer);
      });
    };

    try {
      // Upload BOTH images to Cloudinary in parallel to save time
      const [originalUpload, annotatedUpload] = await Promise.all([
        uploadBufferToCloudinary(req.file.buffer),
        uploadBufferToCloudinary(annotatedImageBuffer)
      ]);

      const originalImageUrl = originalUpload.secure_url;
      const annotatedImageUrl = annotatedUpload.secure_url;
      // Generate a unique image ID from the original upload
      const imageId = originalUpload.public_id.split('/').pop() || Date.now().toString();

      // Prepare data for Firestore
      const rawImageData = {
        userId,
        originalImageUrl,
        annotatedImageUrl,
        mlResults: metadata,
      };

      // Validate data using Zod before saving
      const validated = dentalImageCreateSchema.safeParse(rawImageData);
      if (!validated.success) {
        console.error('Validation failed:', validated.error);
        return res.status(500).json({ error: 'Data validation failed after upload' });
      }

      // Add the upload date
      const imageData = {
        ...validated.data,
        uploadDate: new Date().toISOString(),
      };

      // Save to Firestore using existing service
      const dbResult = await createDentalImage(imageId, imageData);

      return res.status(201).json({
        success: true,
        message: 'Image uploaded and processed successfully',
        data: {
          imageId: dbResult.imageId,
          originalImageUrl,
          annotatedImageUrl,
          mlResults: metadata
        },
      });
    } catch (uploadOrDbError) {
      console.error('Cloudinary or Firestore error:', uploadOrDbError);
      return res.status(500).json({ error: 'Failed to process image and save data' });
    }

  } catch (error) {
    console.error('Upload route error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred during upload' });
  }
});

// GET /api/v1/dental-images - Get user's image history
router.get('/api/v1/dental-images', verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const limit = req.query.limit;
    const images = await getUserImages(userId, limit);
    return res.status(200).json({ success: true, data: images });
  } catch (error) {
    console.error('Fetch history error:', error);
    return res.status(500).json({ error: 'Failed to retrieve history' });
  }
});

// GET /api/v1/dental-images/:imageId - Get specific image details
router.get('/api/v1/dental-images/:imageId', verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { imageId } = req.params;
    
    const image = await getDentalImage(imageId);
    
    // Security check: ensure the image belongs to the requesting user
    if (image.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to access this image' });
    }
    
    return res.status(200).json({ success: true, data: image });
  } catch (error) {
    console.error('Fetch specific image error:', error);
    if (error.message === 'Dental image not found') {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Failed to retrieve image details' });
  }
});

export default router;
