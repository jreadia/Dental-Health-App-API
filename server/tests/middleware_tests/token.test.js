import { jest } from '@jest/globals';

jest.unstable_mockModule('../../config/firebase.js', () => ({
  auth: {
    verifyIdToken: jest.fn()
  }
}));

const { auth } = await import('../../config/firebase.js');
const { default: verifyFirebaseToken } = await import('../../middleware/token.js');

describe('verifyFirebaseToken Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      headers: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  test('should return 401 if authorization header is missing', async () => {
    await verifyFirebaseToken(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing authentication token' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should return 401 if authorization header does not start with Bearer ', async () => {
    mockReq.headers.authorization = 'Basic token123';

    await verifyFirebaseToken(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing authentication token' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should return 401 if token is invalid or expired', async () => {
    mockReq.headers.authorization = 'Bearer invalid-token';
    const mockError = new Error('auth/id-token-expired');
    auth.verifyIdToken.mockRejectedValueOnce(mockError);

    await verifyFirebaseToken(mockReq, mockRes, mockNext);

    expect(auth.verifyIdToken).toHaveBeenCalledWith('invalid-token');
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Invalid or expired token',
      details: mockError.message
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should call next() and set req.user if token is valid', async () => {
    mockReq.headers.authorization = 'Bearer valid-token';
    const mockDecodedToken = { uid: 'user123', email: 'test@example.com' };
    auth.verifyIdToken.mockResolvedValueOnce(mockDecodedToken);

    await verifyFirebaseToken(mockReq, mockRes, mockNext);

    expect(auth.verifyIdToken).toHaveBeenCalledWith('valid-token');
    expect(mockReq.user).toEqual({ uid: 'user123', email: 'test@example.com', admin: false });
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });
});
