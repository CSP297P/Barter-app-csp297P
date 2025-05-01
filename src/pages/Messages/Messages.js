import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  TextField,
  IconButton,
  Divider,
  Button,
  styled,
  Card,
  CardMedia,
  CardContent,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { AuthContext } from '../../contexts/AuthContext';

const RootContainer = styled('div')({
  position: 'fixed',
  top: '64px', // Height of navbar
  left: 0,
  right: 0,
  bottom: 0,
  overflow: 'hidden'
});

const ChatContainer = styled('div')({
  display: 'flex',
  height: '100%',
  width: '100%',
  gap: '16px',
  padding: '16px',
  boxSizing: 'border-box'
});

const LeftPane = styled('div')({
  width: '25%',
  height: '100%',
  flexShrink: 0
});

const MiddlePane = styled('div')({
  width: '50%',
  height: '100%',
  flexShrink: 0
});

const RightPane = styled('div')({
  width: '25%',
  height: '100%',
  flexShrink: 0
});

const ConversationsList = styled(Paper)({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
});

const ScrollableContent = styled('div')({
  flex: 1,
  overflowY: 'auto',
  '&::-webkit-scrollbar': {
    width: '6px'
  },
  '&::-webkit-scrollbar-track': {
    background: '#f1f1f1'
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#888',
    borderRadius: '3px'
  }
});

const ChatBox = styled(Paper)({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
});

const MessageInputContainer = styled('div')({
  display: 'flex',
  padding: '16px',
  borderTop: '1px solid rgba(0, 0, 0, 0.12)',
  gap: '16px',
  backgroundColor: '#fff'
});

const StyledTextField = styled(TextField)({
  flex: 1
});

const SendButton = styled(IconButton)({
  width: '40px',
  height: '40px',
  flexShrink: 0
});

const TradePanel = styled(Paper)({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
});

const Message = styled(Box)(({ theme, isOwn }) => ({
  display: 'flex',
  justifyContent: isOwn ? 'flex-end' : 'flex-start',
  marginBottom: theme.spacing(1),
}));

const MessageContent = styled(Paper)(({ theme, isOwn }) => ({
  padding: theme.spacing(1, 2),
  maxWidth: '70%',
  backgroundColor: isOwn ? theme.palette.primary.main : theme.palette.grey[100],
  color: isOwn ? theme.palette.primary.contrastText : 'inherit',
  borderRadius: theme.spacing(2),
}));

const TradeStatusButton = styled(Button)(({ theme, confirmed }) => ({
  backgroundColor: confirmed ? theme.palette.success.main : theme.palette.grey[300],
  color: confirmed ? theme.palette.common.white : theme.palette.text.primary,
  '&:hover': {
    backgroundColor: confirmed ? theme.palette.success.dark : theme.palette.grey[400],
  },
}));

function Messages() {
  const { user } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [tradeConfirmed, setTradeConfirmed] = useState(false);
  const [userConfirmed, setUserConfirmed] = useState(false);
  const [otherUserConfirmed, setOtherUserConfirmed] = useState(false);

  // Placeholder trade items data
  const tradeItems = {
    offering: {
      id: 1,
      title: "Vintage Camera",
      image: "https://placeholder.com/150",
      description: "Classic film camera in excellent condition"
    },
    receiving: {
      id: 2,
      title: "Mountain Bike",
      image: "https://placeholder.com/150",
      description: "21-speed mountain bike, recently serviced"
    }
  };

  // Fetch conversations
  useEffect(() => {
    // TODO: Implement API call to fetch user's conversations
    setConversations([
      { id: 1, user: { name: 'John Doe', avatar: '' }, lastMessage: 'Hey, is this still available?' },
      { id: 2, user: { name: 'Jane Smith', avatar: '' }, lastMessage: 'Would you trade for my bike?' },
    ]);
  }, []);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (selectedConversation) {
      // TODO: Implement API call to fetch messages for the selected conversation
      setMessages([
        { id: 1, sender: 'other', text: 'Hey, is this still available?', timestamp: new Date() },
        { id: 2, sender: 'user', text: 'Yes, it is!', timestamp: new Date() },
      ]);
    }
  }, [selectedConversation]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // TODO: Implement API call to send message
    const message = {
      id: messages.length + 1,
      sender: 'user',
      text: newMessage,
      timestamp: new Date(),
    };
    setMessages([...messages, message]);
    setNewMessage('');
  };

  const handleConfirmTrade = () => {
    setUserConfirmed(true);
    // TODO: Send confirmation to server
  };

  const handleCancelTrade = () => {
    setUserConfirmed(false);
    setOtherUserConfirmed(false);
    // TODO: Send cancellation to server
  };

  const TradeItemCard = ({ item, type }) => (
    <Card sx={{ mb: 2 }}>
      <CardMedia
        component="img"
        height="140"
        image={item.image}
        alt={item.title}
      />
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {type === 'offering' ? 'You are offering:' : 'You will receive:'}
        </Typography>
        <Typography variant="body1">{item.title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {item.description}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <RootContainer>
      <ChatContainer>
        {/* Left Pane - Conversations */}
        <LeftPane>
          <ConversationsList elevation={2}>
            <Box p={2}>
              <Typography variant="h6">Messages</Typography>
            </Box>
            <Divider />
            <ScrollableContent>
              <List>
                {conversations.map((conversation) => (
                  <React.Fragment key={conversation.id}>
                    <ListItem
                      button
                      selected={selectedConversation?.id === conversation.id}
                      onClick={() => setSelectedConversation(conversation)}
                    >
                      <ListItemAvatar>
                        <Avatar src={conversation.user.avatar}>
                          {conversation.user.name[0]}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={conversation.user.name}
                        secondary={conversation.lastMessage}
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            </ScrollableContent>
          </ConversationsList>
        </LeftPane>

        {/* Middle Pane - Chat */}
        <MiddlePane>
          <ChatBox elevation={2}>
            {selectedConversation ? (
              <>
                <Box p={2}>
                  <Typography variant="h6">{selectedConversation.user.name}</Typography>
                </Box>
                <Divider />
                <ScrollableContent>
                  <Box p={2}>
                    {messages.map((message) => (
                      <Message key={message.id} isOwn={message.sender === 'user'}>
                        <MessageContent isOwn={message.sender === 'user'}>
                          <Typography variant="body1">{message.text}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </Typography>
                        </MessageContent>
                      </Message>
                    ))}
                  </Box>
                </ScrollableContent>
                <MessageInputContainer>
                  <StyledTextField
                    variant="outlined"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    size="small"
                  />
                  <SendButton
                    onClick={handleSendMessage}
                    color="primary"
                    sx={{
                      backgroundColor: theme => theme.palette.primary.main,
                      color: 'white',
                      '&:hover': {
                        backgroundColor: theme => theme.palette.primary.dark,
                      }
                    }}
                  >
                    <SendIcon />
                  </SendButton>
                </MessageInputContainer>
              </>
            ) : (
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                height="100%"
              >
                <Typography variant="body1" color="textSecondary">
                  Select a conversation to start messaging
                </Typography>
              </Box>
            )}
          </ChatBox>
        </MiddlePane>

        {/* Right Pane - Trade */}
        <RightPane>
          <TradePanel elevation={2}>
            <Box p={2}>
              <Typography variant="h6">Trade Details</Typography>
            </Box>
            <Divider />
            <ScrollableContent>
              <Box p={2}>
                <TradeItemCard item={tradeItems.offering} type="offering" />
                <TradeItemCard item={tradeItems.receiving} type="receiving" />
                <Box mt={2}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Trade Status:
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <TradeStatusButton
                        fullWidth
                        variant="contained"
                        confirmed={userConfirmed}
                        startIcon={<CheckCircleIcon />}
                        onClick={handleConfirmTrade}
                        disabled={userConfirmed}
                      >
                        {userConfirmed ? 'Confirmed' : 'Confirm'}
                      </TradeStatusButton>
                    </Grid>
                    <Grid item xs={6}>
                      <Button
                        fullWidth
                        variant="contained"
                        color="error"
                        startIcon={<CancelIcon />}
                        onClick={handleCancelTrade}
                      >
                        Cancel
                      </Button>
                    </Grid>
                  </Grid>
                  {otherUserConfirmed && (
                    <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                      Other user has confirmed the trade
                    </Typography>
                  )}
                  {userConfirmed && otherUserConfirmed && (
                    <Typography variant="body1" color="success.main" sx={{ mt: 2, textAlign: 'center' }}>
                      Trade Complete! 🎉
                    </Typography>
                  )}
                </Box>
              </Box>
            </ScrollableContent>
          </TradePanel>
        </RightPane>
      </ChatContainer>
    </RootContainer>
  );
}

export default Messages; 