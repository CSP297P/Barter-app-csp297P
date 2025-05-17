import React, { useState, useContext } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Paper,
  Alert,
  useTheme,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import './Auth.css';
import axios from 'axios';
import config from '../../config';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1); // 1: signup, 2: verify
  const [verifEmail, setVerifEmail] = useState('');
  const [code, setCode] = useState('');
  const { signUp, verifySignup } = useContext(AuthContext);
  const navigate = useNavigate();
  const theme = useTheme();
  const [resendMessage, setResendMessage] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      setError('');
      const result = await signUp(formData.email, formData.password, formData.name);
      setVerifEmail(result.email);
      setStep(2);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to sign up');
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    try {
      setError('');
      await verifySignup(verifEmail, code);
      navigate('/');
    } catch (error) {
      setError(error.response?.data?.message || 'Verification failed');
    }
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleToggleConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleResend = async () => {
    setError('');
    setResendMessage('');
    try {
      const api = axios.create({ baseURL: config.API_BASE_URL });
      await api.post('/auth/resend-verification-code', { email: verifEmail });
      setResendMessage('Verification code resent! Please check your email.');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to resend code');
    }
  };

  return (
    <Container maxWidth="sm" className="auth-container">
      <Paper elevation={3} className="auth-form">
        <Typography variant="h4" component="h2" gutterBottom sx={{ 
          fontWeight: 700,
          background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
          textAlign: 'center',
          mb: 4
        }}>
          {step === 1 ? 'Create Account' : 'Verify Your Email'}
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {step === 1 ? (
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="name"
              label="Full Name"
              name="name"
              autoComplete="name"
              autoFocus
              value={formData.name}
              onChange={handleChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '& fieldset': {
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)',
                  },
                  '&:hover fieldset': {
                    borderColor: theme.palette.primary.main,
                  },
                },
              }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '& fieldset': {
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)',
                  },
                  '&:hover fieldset': {
                    borderColor: theme.palette.primary.main,
                  },
                },
              }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleTogglePassword}
                      edge="end"
                      size="small"
                      sx={{
                        padding: '2px',
                        minWidth: '24px',
                        width: '24px',
                        height: '24px',
                        '& .MuiSvgIcon-root': {
                          fontSize: '1rem'
                        }
                      }}
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '& fieldset': {
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)',
                  },
                  '&:hover fieldset': {
                    borderColor: theme.palette.primary.main,
                  },
                },
              }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={handleToggleConfirmPassword}
                      edge="end"
                      size="small"
                      sx={{
                        padding: '2px',
                        minWidth: '24px',
                        width: '24px',
                        height: '24px',
                        '& .MuiSvgIcon-root': {
                          fontSize: '1rem'
                        }
                      }}
                    >
                      {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '& fieldset': {
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)',
                  },
                  '&:hover fieldset': {
                    borderColor: theme.palette.primary.main,
                  },
                },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                mt: 2,
                mb: 3,
                py: 1.5,
                fontSize: '1.1rem',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                '&:hover': {
                  background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
                },
              }}
            >
              Create Account
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Already have an account?{' '}
                <Link 
                  component={RouterLink} 
                  to="/login" 
                  sx={{ 
                    color: theme.palette.primary.main,
                    fontWeight: 600,
                    '&:hover': {
                      color: theme.palette.secondary.main,
                    }
                  }}
                >
                  Sign in
                </Link>
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleVerify} noValidate>
            <Typography variant="body1" sx={{ mb: 2 }}>
              A verification code has been sent to <b>{verifEmail}</b>. Please enter it below to complete your registration.
            </Typography>
            <TextField
              margin="normal"
              required
              fullWidth
              id="verificationCode"
              label="Verification Code"
              name="verificationCode"
              autoFocus
              value={code}
              onChange={e => setCode(e.target.value)}
              sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 2, '& fieldset': { borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)' }, '&:hover fieldset': { borderColor: theme.palette.primary.main } } }}
            />
            <Button type="submit" fullWidth variant="contained" sx={{ mt: 2, mb: 3, py: 1.5, fontSize: '1.1rem', textTransform: 'none', fontWeight: 600, borderRadius: 2, background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`, '&:hover': { background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`, transform: 'translateY(-2px)', boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)' } }}>
              Verify & Complete Signup
            </Button>
            {resendMessage && (
              <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{resendMessage}</Alert>
            )}
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Didn't receive the code? Check your spam folder or <span style={{ color: theme.palette.primary.main, fontWeight: 600, cursor: 'pointer' }} onClick={handleResend}>resend</span>.
              </Typography>
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default Signup; 