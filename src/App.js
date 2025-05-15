import React, { useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import styled from 'styled-components';


// Pages
import Landing from './pages/Landing';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import ItemDetail from './pages/Items/ItemDetail';
import UserProfile from './pages/Profile/UserProfile';
import ItemUpload from './pages/Items/ItemUpload';
import Marketplace from './pages/Items/Marketplace';
import EditItem from './pages/Items/EditItem';
import Messages from './pages/Messages/Messages';

// Components
import Navbar from './components/Navbar';

// Context
import { AuthContext, AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';

const getTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: {
      main: '#4285f4',
    },
    secondary: {
      main: '#34a853',
    },
    background: {
      default: mode === 'dark' ? '#181a1b' : '#ffffff',
      paper: mode === 'dark' ? '#23272f' : '#ffffff',
    },
    text: {
      primary: mode === 'dark' ? '#f4f6fa' : '#1a237e',
      secondary: mode === 'dark' ? '#b0b8c1' : '#666',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: mode === 'dark' ? '#181a1b' : '#ffffff',
          color: mode === 'dark' ? '#f4f6fa' : '#1a237e',
          transition: 'background-color 0.3s, color 0.3s',
        },
      },
    },
  },
});

const AppContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: ${props => props.theme.palette.background.default};
  color: ${props => props.theme.palette.text.primary};
  transition: background-color 0.3s, color 0.3s;
`;

const MainContent = styled.main`
  flex: 1;
  padding: 20px;
`;

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
};

function App() {
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('themeMode');
    return savedMode || 'light';
  });

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
    document.body.classList.toggle('dark', mode === 'dark');
  }, [mode]);

  const theme = getTheme(mode);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  return (
    <MuiThemeProvider theme={theme}>
      <StyledThemeProvider theme={theme}>
        <AuthProvider>
          <SocketProvider>
            <AppContainer>
              <Router>
                <Navbar onThemeToggle={toggleTheme} />
                <MainContent>
                  <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/marketplace" element={<Marketplace />} />
                    <Route path="/item/:id" element={<ItemDetail />} />
                    <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
                    <Route path="/upload" element={<ProtectedRoute><ItemUpload /></ProtectedRoute>} />
                    <Route path="/edit/:id" element={<ProtectedRoute><EditItem /></ProtectedRoute>} />
                  </Routes>
                </MainContent>
              </Router>
            </AppContainer>
          </SocketProvider>
        </AuthProvider>
      </StyledThemeProvider>
    </MuiThemeProvider>
  );
}

export default App; 