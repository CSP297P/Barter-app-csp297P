const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.fromEmail = process.env.GMAIL;
    console.log('Email service initialized with:', {
      fromEmail: this.fromEmail,
      hasAppPassword: !!process.env.GMAIL_APP_PASSWORD
    });
  }

  async initialize() {
    console.log('Initializing email service...');
    
    // Gmail SMTP configuration
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    // Verify connection configuration
    try {
      console.log('Verifying email service connection...');
      await this.transporter.verify();
      console.log('Email service is ready to send messages');
    } catch (error) {
      console.error('Email service configuration error:', error);
      throw new Error(`Failed to initialize email service: ${error.message}`);
    }
  }

  async sendVerificationEmail(to, verificationCode) {
    if (!this.transporter) {
      await this.initialize();
    }

    const mailOptions = {
      from: this.fromEmail,
      to,
      subject: 'Your Verification Code',
      html: `
        <h1>Email Verification</h1>
        <p>Your verification code is: <strong>${verificationCode}</strong></p>
        <p>This code will expire in 15 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Verification email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendPasswordResetEmail(to, resetToken) {
    if (!this.transporter) {
      await this.initialize();
    }

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: this.fromEmail,
      to,
      subject: 'Password Reset Request',
      html: `
        <h1>Password Reset</h1>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this reset, please ignore this email.</p>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent:', info.messageId);
      return info;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }
}

module.exports = new EmailService(); 