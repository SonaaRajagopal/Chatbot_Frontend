import React, { useState, useEffect, useRef } from 'react';
import {
  AppBar, Toolbar, Typography, Container, TextField, Button, Box, IconButton, Snackbar, Alert
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import cdacLogo from './image/CDAC.jpg';

// Individual Message Bubble Component
function MessageBubble({ message, darkTheme }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
        marginBottom: 1,
      }}
    >
      <Box
        sx={{
          backgroundColor: message.sender === 'user'
            ? 'rgb(25, 118, 210)'
            : darkTheme ? '#999' : '#fff',
          color: message.sender === 'user'
            ? '#ddd'
            : darkTheme ? '#000' : 'rgb(25, 118, 210)',
          padding: 2,
          borderRadius: 2,
          maxWidth: '80%',
          wordWrap: 'break-word',
          boxShadow: darkTheme ? 'none' : '0px 3px 6px #00000029',
        }}
      >
        <Typography variant="body1">{message.text}</Typography>
      </Box>
    </Box>
  );
}

// Chat Container Component
function ChatContainer({ messages, isBotTyping, darkTheme, chatContainerRef }) {
  return (
    <Box
      ref={chatContainerRef}
      sx={{
        flexGrow: 1,
        overflowY: 'auto',
        padding: 2,
        borderRadius: '10px',
        mb: 2,
        background: darkTheme ? 'rgb(34, 34, 34)' : '#fff',
        boxShadow: darkTheme ? '0 8px 32px 0 #00000029' : '0px 3px 6px #00000029',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: darkTheme
          ? '1px solid rgba(255, 255, 255, 0.18)'
          : '1px solid rgba(0, 0, 0, 0.12)',
      }}
    >
      {messages.map((msg, idx) => (
        <MessageBubble key={idx} message={msg} darkTheme={darkTheme} />
      ))}
      {isBotTyping && (
        <Box sx={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="body1">Bot typing<span className="typing-dots">...</span></Typography>
        </Box>
      )}
    </Box>
  );
}

// Message Input + Action Buttons Component
function MessageInput({
  inputValue, setInputValue, handleSendMessage, handleUploadButtonClick,
  handleDownloadExcel, fileInputRef
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
      <Box sx={{ width: '100%', mb: 2 }}>
        <TextField
          id="chat-input"
          label="Type your message..."
          variant="outlined"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') handleSendMessage();
          }}
          fullWidth
        />
      </Box>
      <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
        <Button variant="contained" color="primary" onClick={handleSendMessage} sx={{ flex: '1 0 auto', mr: 1 }}>
          Send
        </Button>
        <Button variant="outlined" color="primary" startIcon={<CloudUploadIcon />} onClick={handleUploadButtonClick} sx={{ flex: '1 0 auto', mr: 1 }}>
          Upload
        </Button>
        <Button variant="outlined" color="primary" endIcon={<CloudDownloadIcon />} onClick={handleDownloadExcel} sx={{ flex: '1 0 auto' }}>
          Download
        </Button>
      </Box>
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} />
    </Box>
  );
}

// Main Chat UI
function ChatUI() {
  const [messages, setMessages] = useState([{ sender: 'bot', text: 'Welcome to CDAC-ChatBot application.' }]);
  const [inputValue, setInputValue] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [darkTheme, setDarkTheme] = useState(true);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const fileInputRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    document.getElementById('chat-input').focus();
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (inputValue.trim() === '') return;

    const newMessages = [...messages, { sender: 'user', text: inputValue }];
    setMessages(newMessages);
    setInputValue('');

    try {
      setIsBotTyping(true);
      const response = await fetch('http://localhost:8000/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
          })),
          max_tokens: 50
        }),
      });

      const data = await response.json();
      const botResponse = data.choices[0].message.content;
      setMessages([...newMessages, { sender: 'bot', text: botResponse }]);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsBotTyping(false);
    }
  };

  const handleUploadButtonClick = () => fileInputRef.current?.click();

  const handleUploadDocument = async (event) => {
    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('document', file);

    try {
      await fetch('https://ca14-14-139-109-7.ngrok-free.app/api/run_ingest', { method: 'POST', body: formData });
      setAlertMessage('Document uploaded successfully!');
      setAlertOpen(true);
    } catch (err) {
      setAlertMessage('Error uploading document.');
      setAlertOpen(true);
    }
  };

  const handleDownloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(messages);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ChatOutput');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'ChatOutput.xlsx');
  };

  const toggleDarkTheme = () => setDarkTheme(!darkTheme);

  const theme = createTheme({ palette: { mode: darkTheme ? 'dark' : 'light' } });

  return (
    <ThemeProvider theme={theme}>
      <div style={{ height: '100vh', background: darkTheme ? '#111' : '#fff', color: darkTheme ? '#fff' : '#000' }}>
        <AppBar position="static" style={{ background: darkTheme ? '#222' : '#1976d2' }}>
          <Toolbar>
            <Box><img src={cdacLogo} alt="CDAC Logo" style={{ width: 50, height: 50, borderRadius: '50%' }} /></Box>
            <Typography variant="h6" sx={{ flex: 1, textAlign: 'center' }}>CDAC-CHATBOT</Typography>
            <IconButton onClick={toggleDarkTheme} color="inherit"><Brightness4Icon /></IconButton>
          </Toolbar>
        </AppBar>

        <Container sx={{ padding: 2, width: '100%', height: 580, display: 'flex', flexDirection: 'column', mt: 5 }}>
          <ChatContainer messages={messages} isBotTyping={isBotTyping} darkTheme={darkTheme} chatContainerRef={chatContainerRef} />
          <MessageInput
            inputValue={inputValue}
            setInputValue={setInputValue}
            handleSendMessage={handleSendMessage}
            handleUploadButtonClick={handleUploadButtonClick}
            handleDownloadExcel={handleDownloadExcel}
            fileInputRef={fileInputRef}
          />
          <input type="file" style={{ display: 'none' }} onChange={handleUploadDocument} ref={fileInputRef} />
        </Container>

        <Snackbar open={alertOpen} autoHideDuration={3000} onClose={() => setAlertOpen(false)}>
          <Alert severity="info">{alertMessage}</Alert>
        </Snackbar>
      </div>
    </ThemeProvider>
  );
}

export default ChatUI;
