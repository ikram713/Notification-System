const express = require('express');
const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const User = require('./models/User');
const Notification = require('./models/Notification');
const SocketSession = require('./models/SocketSession'); 

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/realtime-notifications')
.then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory map to track connected users (use Redis for scalability)
const connectedUsers = new Map();

// Example login endpoint using DB
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.json({ success: false });

  if (user.password !== password) return res.json({ success: false });

  return res.json({ success: true, role: user.role, email: user.email });
});

// Serve frontend pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/user', (req, res) => res.sendFile(path.join(__dirname, 'public', 'user.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// Socket.IO communication
io.on('connection', socket => {
  console.log('A user connected');

  socket.on('register', async email => {
    connectedUsers.set(email, socket.id); 
    await SocketSession.findOneAndUpdate({ email }, { socketId: socket.id, connected: true, lastSeen: new Date() }, { upsert: true });
    console.log(`${email} registered with socket ${socket.id}`);
  });

  socket.on('send-notification', async ({ recipientEmail, message, senderEmail }) => {
    const notification = new Notification({ senderEmail, recipientEmail, message, status: 'pending' });

    const recipientSocketId = connectedUsers.get(recipientEmail);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('notification', message);
      notification.status = 'delivered';
      console.log(`Notification sent to ${recipientEmail}: ${message}`);
    } else {
      console.log(`User ${recipientEmail} not connected`);
    }

    await notification.save(); // Save notification to DB
  });

  socket.on('disconnect', () => {
    for (let [email, id] of connectedUsers.entries()) {
      if (id === socket.id) {
        connectedUsers.delete(email);
        console.log(`${email} disconnected`);
      }
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
