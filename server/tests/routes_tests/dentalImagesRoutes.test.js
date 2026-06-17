import { jest } from '@jest/globals';
import request from 'supertest';
import { Writable } from 'stream';

// Mock token middleware to simulate an authenticated user
jest.unstable_mockModule('../../middleware/token.js', () => ({
  default: jest.fn((req, res, next) => {
    req.user = { uid: 'test-uid' };
    next();
  })
}));

// Mock Cloudinary SDK
jest.unstable_mockModule('../../config/cloudinary.js', () => ({
  default: {
    uploader: {
      upload_stream: jest.fn((options, callback) => {
        // Return a mock writable stream that instantly calls the callback with a mock response
        const mockStream = new Writable({
          write(chunk, encoding, next) {
            next();
          },
          final(next) {
            callback(null, {
              secure_url: 'https://res.cloudinary.com/test-url.jpg',
              public_id: 'dental_images/test1234'
            });
            next();
          }
        });
        return mockStream;
      })
    }
  }
}));

// 3. Mock dentalImageService and schema
jest.unstable_mockModule('../../services/dentalImageService.js', () => ({
  createDentalImage: jest.fn().mockResolvedValue({ success: true, imageId: 'test1234' }),
  getUserImages: jest.fn().mockResolvedValue([]),
  getDentalImage: jest.fn().mockResolvedValue({}),
  updateDiagnosis: jest.fn().mockResolvedValue({ success: true }),
  deleteDentalImage: jest.fn().mockResolvedValue({ success: true })
}));

// 4. Mock axios
jest.unstable_mockModule('axios', () => ({
  default: {
    post: jest.fn().mockResolvedValue({
      status: 200,
      data: {
        annotated_image_base64: Buffer.from('fake annotated image').toString('base64'),
        calculus_detected: "No",
        calculus_amount: 0,
        oral_health_status: "Healthy",
        average_confidence: 0.95,
        detections: []
      }
    })
  }
}));

// Dynamically import app AFTER mocks are established
const app = (await import('../../app.js')).default;
const cloudinary = (await import('../../config/cloudinary.js')).default;
const { createDentalImage } = await import('../../services/dentalImageService.js');

describe('Dental Images Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error during tests to keep output clean
    jest.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('POST /api/v1/dental-images', () => {
    test('should return 400 when no image is provided', async () => {
      const response = await request(app)
        .post('/api/v1/dental-images');
      // No .attach() call, meaning no file is sent

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No image file provided');
    });

    test('should upload image and return 201 on success', async () => {
      const response = await request(app)
        .post('/api/v1/dental-images')
        .attach('image', Buffer.from('fake image content'), 'test.jpg');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.originalImageUrl).toBe('https://res.cloudinary.com/test-url.jpg');
      expect(response.body.data.annotatedImageUrl).toBe('https://res.cloudinary.com/test-url.jpg');
      expect(response.body.data.imageId).toBe('test1234');

      // Now it's called twice (once for original, once for annotated)
      expect(cloudinary.uploader.upload_stream).toHaveBeenCalledTimes(2);

      // Ensure the service was called with the correct mock data structure
      expect(createDentalImage).toHaveBeenCalledWith('test1234', expect.objectContaining({
        userId: 'test-uid',
        originalImageUrl: 'https://res.cloudinary.com/test-url.jpg',
        annotatedImageUrl: 'https://res.cloudinary.com/test-url.jpg',
        mlResults: {
          calculusDetected: false,
          calculusAmount: 0,
          overall_diagnosis: 'Healthy',
          averageConfidence: 0.95,
          boxes: []
        }
      }));
    });

    test('should return 500 when Cloudinary upload fails', async () => {
      // Override the Cloudinary mock specifically for this test
      cloudinary.uploader.upload_stream.mockImplementationOnce((options, callback) => {
        const mockStream = new Writable({
          write(chunk, encoding, next) { next(); },
          final(next) {
            callback(new Error('Mock Cloudinary error'));
            next();
          }
        });
        return mockStream;
      });

      const response = await request(app)
        .post('/api/v1/dental-images')
        .attach('image', Buffer.from('fake image content'), 'test.jpg');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to process image and save data');
    });

    test('should return 500 when Firestore saving fails', async () => {
      // Override the database mock to simulate a failure
      createDentalImage.mockRejectedValueOnce(new Error('Mock Database error'));

      const response = await request(app)
        .post('/api/v1/dental-images')
        .attach('image', Buffer.from('fake image content'), 'test.jpg');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to process image and save data');
    });
  });
});
