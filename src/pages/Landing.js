import React, { useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  IconButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  Chat as ChatIcon,
  Security as SecurityIcon,
  ArrowForward,
  ArrowBack,
} from '@mui/icons-material';
import { AuthContext } from '../contexts/AuthContext';
import './Landing.css';

const CountingNumber = ({ end, duration = 2000, label }) => {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.1 }
    );

    const element = document.querySelector('.stats-grid');
    if (element) observer.observe(element);

    return () => {
      if (element) observer.unobserve(element);
    };
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    const steps = 50;
    const stepValue = end / steps;
    const stepDuration = duration / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += 1;
      setCount(Math.min(Math.floor(current * stepValue), end));
      
      if (current >= steps) {
        clearInterval(timer);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [end, duration, hasStarted]);

  return (
    <div className="stat-item">
      <div className="stat-number">{count}+</div>
      <div className="stat-label">{label}</div>
    </div>
  );
};

const steps = [
  {
    title: "Browse & Filter",
    description: "Easily find what you need with powerful search and filter options. Browse by categories, condition, or type to discover the perfect items for trade.",
    icon: <SearchIcon sx={{ fontSize: 48, color: '#1976d2' }} />,
    color: "#bbdefb",
    bgColor: "#e3f2fd"
  },
  {
    title: "Connect & Chat",
    description: "Found something you like? Connect with fellow UCI students directly through our platform and discuss trade possibilities in real-time.",
    icon: <ChatIcon sx={{ fontSize: 48, color: '#2e7d32' }} />,
    color: "#c8e6c9",
    bgColor: "#e8f5e9"
  },
  {
    title: "Trade Safely",
    description: "Meet at designated safe spots on campus to complete your trades. Our verified UCI-only community ensures secure and trustworthy exchanges.",
    icon: <SecurityIcon sx={{ fontSize: 48, color: '#f57c00' }} />,
    color: "#ffecb3",
    bgColor: "#fff8e1"
  }
];

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [animateStats, setAnimateStats] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => (prev + 1) % steps.length);
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => (prev - 1 + steps.length) % steps.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(nextStep, 5000); // Auto advance every 5 seconds
    return () => clearInterval(timer);
  }, [nextStep]);

  useEffect(() => {
    const handleScroll = () => {
      const statsSection = document.querySelector('.stats-section');
      if (statsSection) {
        const rect = statsSection.getBoundingClientRect();
        if (rect.top < window.innerHeight && !animateStats) {
          setAnimateStats(true);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [animateStats]);

  return (
    <Box className="landing-container">
      <section className="hero-section">
        <div className="hero-background"></div>
        <Container maxWidth="lg" className="section-content">
          <Grid 
            container 
            spacing={2} 
            alignItems="center" 
            justifyContent="center"
            sx={{ minHeight: '90vh' }}
          >
            <Grid 
              item 
              xs={12} 
              md={6} 
              sx={{ 
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              <Typography 
                variant="h2" 
                component="h1" 
                sx={{ 
                  color: 'white', 
                  fontWeight: 'bold',
                  fontSize: { xs: '2.25rem', md: '3rem' },
                  maxWidth: '600px',
                  margin: '0 auto',
                  lineHeight: 1.2,
                  mb: 2
                }}
              >
                Trade What You Have,<br />Get What You Want
              </Typography>
              <Typography 
                variant="h5" 
                sx={{ 
                  color: 'white', 
                  opacity: 0.9, 
                  maxWidth: '500px',
                  margin: '0 auto 1.5rem',
                  fontSize: { xs: '1.1rem', md: '1.25rem' }
                }}
              >
                Join UCI's premier student marketplace for sustainable item exchange
              </Typography>
              <Box 
                sx={{
                  display: 'flex',
                  gap: 2,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  mb: { xs: 3, md: 4 }
                }}
              >
                {!user && (
                  <Button
                    variant="contained"
                    color="secondary"
                    size="large"
                    onClick={() => navigate('/signup')}
                    className="cta-button"
                  >
                    Join with @uci.edu Email
                  </Button>
                )}
                <Button
                  variant="outlined"
                  color="inherit"
                  size="large"
                  onClick={() => navigate('/marketplace')}
                  sx={{ 
                    color: 'white', 
                    borderColor: 'white',
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                >
                  Explore Listings
                </Button>
              </Box>
            </Grid>
            <Grid 
              item 
              xs={12} 
              md={6} 
              sx={{ 
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <Box 
                className="stats-grid" 
                sx={{ 
                  width: '100%',
                  maxWidth: '600px',
                  mt: { xs: 1, md: 2 }
                }}
              >
                <Grid 
                  container 
                  spacing={2} 
                  justifyContent="center"
                >
                  <Grid item xs={12} sm={4}>
                    <CountingNumber end={500} label="Active Listings" />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <CountingNumber end={1000} label="Successful Trades" />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <CountingNumber end={2000} label="UCI Students" />
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </section>

      <section className="demo-section">
        <Container maxWidth="lg" className="section-content">
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography 
              variant="h2" 
              component="h2" 
              sx={{ 
                fontWeight: 600,
                fontSize: { xs: '2rem', md: '2.5rem' },
                mb: 1
              }}
            >
              How It Works
            </Typography>
            <Typography 
              variant="h6" 
              color="text.secondary" 
              sx={{ 
                fontSize: { xs: '1rem', md: '1.125rem' },
                maxWidth: '600px',
                margin: '0 auto'
              }}
            >
              Experience our seamless trading platform
            </Typography>
          </Box>

          <Box sx={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
            <Box className="steps-carousel" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: { xs: '400px', md: '450px' }, position: 'relative' }}>
              {steps.map((step, index) => (
                <Paper
                  key={index}
                  className={`step-card ${index === currentStep ? 'active' : ''}`}
                  elevation={3}
                  sx={{
                    position: 'absolute',
                    width: '100%',
                    maxWidth: '800px',
                    p: 4,
                    opacity: index === currentStep ? 1 : 0,
                    transform: `translateX(${(index - currentStep) * 100}%)`,
                    transition: 'transform 0.5s ease, opacity 0.5s ease',
                    bgcolor: step.bgColor,
                    textAlign: 'center'
                  }}
                >
                  <Grid container spacing={2} alignItems="center" direction="column">
                    <Grid item xs={12}>
                      <Box 
                        className="step-icon-wrapper"
                        sx={{
                          width: { xs: 140, md: 180 },
                          height: { xs: 140, md: 180 },
                          borderRadius: '50%',
                          backgroundColor: step.bgColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 1.5rem',
                          position: 'relative',
                          '&::after': {
                            content: '""',
                            position: 'absolute',
                            top: -4,
                            left: -4,
                            right: -4,
                            bottom: -4,
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${step.color}, ${step.bgColor})`,
                            zIndex: -1,
                            opacity: 0.5,
                          }
                        }}
                      >
                        {step.icon}
                      </Box>
                    </Grid>
                    <Grid item xs={12} sx={{ maxWidth: 600, mx: 'auto', px: { xs: 2, md: 4 } }}>
                      <Typography 
                        variant="h4" 
                        component="h3" 
                        color="primary"
                        sx={{ 
                          mb: 2,
                          fontSize: { xs: '1.5rem', md: '2rem' },
                          fontWeight: 600
                        }}
                      >
                        {step.title}
                      </Typography>
                      <Typography 
                        variant="body1"
                        sx={{ 
                          fontSize: { xs: '1rem', md: '1.125rem' },
                          color: 'text.secondary',
                          lineHeight: 1.6
                        }}
                      >
                        {step.description}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Box>
            
            <IconButton
              className="carousel-nav prev"
              onClick={prevStep}
              sx={{
                position: 'absolute',
                left: { xs: 8, md: 16 },
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            >
              <ArrowBack />
            </IconButton>
            
            <IconButton
              className="carousel-nav next"
              onClick={nextStep}
              sx={{
                position: 'absolute',
                right: { xs: 8, md: 16 },
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            >
              <ArrowForward />
            </IconButton>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              {steps.map((_, index) => (
                <Box
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  sx={{
                    width: 10,
                    height: 10,
                    mx: 0.75,
                    borderRadius: '50%',
                    bgcolor: index === currentStep ? 'primary.main' : 'grey.300',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s ease',
                  }}
                />
              ))}
            </Box>
          </Box>
        </Container>
      </section>

      <section className="cta-section">
        <Container maxWidth="lg" className="section-content">
          <Grid 
            container 
            spacing={4} 
            direction="column"
            alignItems="center"
            sx={{ textAlign: 'center' }}
          >
            <Grid item xs={12}>
              <Typography 
                variant="h2" 
                sx={{ 
                  color: 'white',
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  fontWeight: 500,
                  lineHeight: 1.2,
                  mb: { xs: 2, md: 3 }
                }}
              >
                Ready to Start Trading?
              </Typography>
            </Grid>
            <Grid item xs={12} sx={{ width: '100%', maxWidth: '600px' }}>
              <Typography 
                variant="h5" 
                sx={{ 
                  color: 'white',
                  opacity: 0.9,
                  fontSize: { xs: '1.25rem', md: '1.5rem' },
                  mb: 3,
                  textAlign: 'center'
                }}
              >
                Join thousands of UCI students who are already trading smart
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/marketplace')}
                className="cta-button"
                sx={{
                  bgcolor: 'white',
                  color: '#1a237e',
                  fontSize: { xs: '1.1rem', md: '1.25rem' },
                  py: 1.5,
                  px: 4,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    bgcolor: 'white'
                  },
                  minWidth: { xs: '80%', sm: '400px' }
                }}
              >
                Browse Available Items
              </Button>
            </Grid>
          </Grid>
        </Container>
      </section>
    </Box>
  );
};

export default Landing; 