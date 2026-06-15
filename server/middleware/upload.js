import multer from 'multer';

// Use memory storage to avoid saving files to disk (Render free tier limit).
// The file buffer will be available at req.file.buffer for streaming to Cloudinary.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // limit to 5MB
  },
  fileFilter,
});

export default upload;
