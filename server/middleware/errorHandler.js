// Error handling middleware for Express.js
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.message === 'Only image files are allowed!') {
    return res.status(400).json({ error: err.message });
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: 'Internal Server Error' });
};

export default errorHandler;
