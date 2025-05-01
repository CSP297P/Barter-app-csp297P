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

// Root container to take full viewport width
const RootContainer = styled('div')({
  width: '100vw',
  position: 'relative',
  left: '50%',
  right: '50%',
  marginLeft: '-50vw',
  marginRight: '-50vw',
  height: 'calc(100vh - 64px)', // Adjust based on your navbar height
  overflow: 'hidden'
});

const ChatContainer = styled(Box)({
  height: '100%',
  display: 'flex'
});

const ConversationsList = styled(Paper)({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
});

const ConversationsListContent = styled(List)({
  overflowY: 'auto',
  flex: 1
});

const ChatBox = styled(Paper)({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
});

const MessagesList = styled(Box)({
  flex: 1,
  overflowY: 'auto',
  padding: '16px'
});

const MessageInputContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  padding: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
  gap: theme.spacing(2),
  backgroundColor: theme.palette.background.paper
}));

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
  flexDirection: 'column'
});

const TradePanelContent = styled('div')({
  flex: 1,
  overflowY: 'auto',
  padding: '16px'
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
        <Grid container spacing={2} style={{ height: '100%', margin: 0, width: '100%' }}>
          {/* Conversations List - 25% width */}
          <Grid item style={{ width: '25%', height: '100%', padding: '8px' }}>
            <ConversationsList elevation={2}>
              <Box p={2}>
                <Typography variant="h6">Messages</Typography>
              </Box>
              <Divider />
              <ConversationsListContent>
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
              </ConversationsListContent>
            </ConversationsList>
          </Grid>

          {/* Chat Area - 50% width */}
          <Grid item style={{ width: '50%', height: '100%', padding: '8px' }}>
            <ChatBox elevation={2}>
              {selectedConversation ? (
                <>
                  <Box p={2}>
                    <Typography variant="h6">{selectedConversation.user.name}</Typography>
                  </Box>
                  <Divider />
                  <MessagesList>
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
                  </MessagesList>
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
          </Grid>

          {/* Trade Panel - 25% width */}
          <Grid item style={{ width: '25%', height: '100%', padding: '8px' }}>
            <TradePanel elevation={2}>
              <Box p={2}>
                <Typography variant="h6">Trade Details</Typography>
              </Box>
              <Divider />
              <TradePanelContent>
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
                </Box>
              </TradePanelContent>
            </TradePanel>
          </Grid>
        </Grid>
      </ChatContainer>
    </RootContainer>
  );
}

export default Messages; 