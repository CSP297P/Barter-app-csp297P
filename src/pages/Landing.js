import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Container,
  Typography,
  Box,
  Grid,
  Paper,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Search as SearchIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';
import styled from 'styled-components';
import { AuthContext } from '../contexts/AuthContext';

const HeroSection = styled(Box)`
  text-align: center;
  padding: 80px 0;
  background: linear-gradient(45deg, #4285f4 30%, #34a853 90%);
  color: white;
`;

const FeatureCard = styled(Paper)`
  padding: 32px;
  text-align: center;
  height: 100%;
  transition: transform 0.2s;
  &:hover {
    transform: translateY(-5px);
  }
`;

const IconWrapper = styled(Box)`
  margin-bottom: 16px;
  svg {
    font-size: 48px;
    color: ${props => props.theme.palette.primary.main};
  }
`;

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  return (
    <Box>
      <HeroSection>
        <Container maxWidth="md">
          <Typography variant="h2" component="h1" gutterBottom>
            Trade What You Have, Get What You Want
          </Typography>
          <Typography variant="h5" paragraph>
            A cashless, community-first way to exchange preowned items.
          </Typography>
          <Box mt={4}>
            {!user && (
              <Button
                variant="contained"
                color="secondary"
                size="large"
                onClick={() => navigate('/signup')}
                sx={{ mr: 2 }}
              >
                Sign Up with @uci.edu Email
              </Button>
            )}
            <Button
              variant="outlined"
              color="inherit"
              size="large"
              onClick={() => navigate('/marketplace')}
            >
              Explore Listings
            </Button>
          </Box>
        </Container>
      </HeroSection>

      <Container maxWidth="lg" sx={{ my: 8 }}>
        <Typography variant="h3" component="h2" align="center" gutterBottom>
          How It Works
        </Typography>
        <Grid container spacing={4} sx={{ mt: 4 }}>
          <Grid item xs={12} md={4}>
            <FeatureCard elevation={2}>
              <IconWrapper>
                <UploadIcon />
              </IconWrapper>
              <Typography variant="h5" component="h3" gutterBottom>
                Upload Your Item
              </Typography>
              <Typography color="text.secondary">
                Share items you no longer need. Add photos and details to help others find what they're looking for.
              </Typography>
            </FeatureCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <FeatureCard elevation={2}>
              <IconWrapper>
                <SearchIcon />
              </IconWrapper>
              <Typography variant="h5" component="h3" gutterBottom>
                Browse Listings
              </Typography>
              <Typography color="text.secondary">
                Discover items available for exchange. Filter by categories and conditions to find exactly what you need.
              </Typography>
            </FeatureCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <FeatureCard elevation={2}>
              <IconWrapper>
                <ChatIcon />
              </IconWrapper>
              <Typography variant="h5" component="h3" gutterBottom>
                Chat and Barter
              </Typography>
              <Typography color="text.secondary">
                Connect with other users, discuss exchange terms, and arrange meetups to complete your barter.
              </Typography>
            </FeatureCard>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Landing; 