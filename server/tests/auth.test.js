const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User');
const VerificationService = require('../services/verificationService');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  // Clear any stored verification codes
  await VerificationService.clearAllCodes();
});

describe('Authentication System', () => {
  const testUser = {
    email: 'test@uci.edu',
    password: 'Test123!@#',
    displayName: 'Test User'
  };

  describe('Signup', () => {
    it('should create a new user with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('email', testUser.email);
      expect(res.body.user).toHaveProperty('displayName', testUser.displayName);
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should reject signup with non-UCI email', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          ...testUser,
          email: 'test@gmail.com'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message', 'Please use a valid UCI email address');
    });

    it('should reject signup with existing email', async () => {
      // First signup
      await request(app)
        .post('/api/auth/signup')
        .send(testUser);

      // Try to signup again with same email
      const res = await request(app)
        .post('/api/auth/signup')
        .send(testUser);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message', 'User already exists with this email');
    });
  });

  describe('Login with 2FA', () => {
    beforeEach(async () => {
      // Create a test user
      await request(app)
        .post('/api/auth/signup')
        .send(testUser);
    });

    it('should send verification code on valid login attempt', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Verification code sent to your email');
      expect(res.body).toHaveProperty('email', testUser.email);
    });

    it('should reject login with invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message', 'Invalid credentials');
    });

    it('should complete login with valid verification code', async () => {
      // First, get the verification code
      await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      // Get the stored code (in a real scenario, this would come from the email)
      const code = await VerificationService.getStoredCode(testUser.email, 'login');

      // Verify the code
      const res = await request(app)
        .post('/api/auth/verify-login')
        .send({
          email: testUser.email,
          code
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('email', testUser.email);
    });

    it('should reject login with invalid verification code', async () => {
      // First, get the verification code
      await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      // Try with invalid code
      const res = await request(app)
        .post('/api/auth/verify-login')
        .send({
          email: testUser.email,
          code: '000000'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message', 'Invalid or expired verification code');
    });
  });

  describe('Password Reset', () => {
    beforeEach(async () => {
      // Create a test user
      await request(app)
        .post('/api/auth/signup')
        .send(testUser);
    });

    it('should send reset code for existing user', async () => {
      const res = await request(app)
        .post('/api/auth/request-password-reset')
        .send({
          email: testUser.email
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'If your email is registered, you will receive a password reset code');
    });

    it('should not reveal if email exists or not', async () => {
      const res = await request(app)
        .post('/api/auth/request-password-reset')
        .send({
          email: 'nonexistent@uci.edu'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'If your email is registered, you will receive a password reset code');
    });

    it('should reset password with valid code', async () => {
      // Request reset code
      await request(app)
        .post('/api/auth/request-password-reset')
        .send({
          email: testUser.email
        });

      // Get the stored code
      const code = await VerificationService.getStoredCode(testUser.email, 'password-reset');
      const newPassword = 'NewPassword123!@#';

      // Reset password
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          email: testUser.email,
          code,
          newPassword
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Password has been reset successfully');

      // Verify can login with new password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: newPassword
        });

      expect(loginRes.status).toBe(200);
    });

    it('should reject password reset with invalid code', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          email: testUser.email,
          code: '000000',
          newPassword: 'NewPassword123!@#'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message', 'Invalid or expired verification code');
    });
  });
}); 