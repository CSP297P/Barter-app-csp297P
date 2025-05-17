const emailService = require('../services/emailService');

describe('EmailService', () => {
  beforeEach(async () => {
    await emailService.initialize();
  });

  it('should send verification email', async () => {
    const testEmail = 'test@uci.edu';
    const verificationCode = '123456';
    
    const result = await emailService.sendVerificationEmail(testEmail, verificationCode);
    
    expect(result).toBeDefined();
    expect(result.messageId).toBeDefined();
    expect(result.accepted).toContain(testEmail);
  });

  it('should send password reset email', async () => {
    const testEmail = 'test@uci.edu';
    const resetToken = 'test-reset-token';
    
    const result = await emailService.sendPasswordResetEmail(testEmail, resetToken);
    
    expect(result).toBeDefined();
    expect(result.messageId).toBeDefined();
    expect(result.accepted).toContain(testEmail);
  });

  it('should handle invalid email addresses', async () => {
    const invalidEmail = 'invalid-email';
    const verificationCode = '123456';
    
    await expect(emailService.sendVerificationEmail(invalidEmail, verificationCode))
      .rejects
      .toThrow('Failed to send verification email');
  });
}); 