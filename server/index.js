const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const os = require('os');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const initSocketHandlers = require('./sockets');
const aiRoutes = require('./routes/ai');
const authRoutes = require('./routes/auth');
const meetingRoutes = require('./routes/meetings');
const { errorHandler } = require('./middleware/errorHandler');
const { verifySocketToken } = require('./middleware/authMiddleware');

dotenv.config();
const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(cors({ origin: true, credentials: true }));

connectDB();

const getLanAddress = () => {
  const interfaces = os.networkInterfaces();

  for (const addresses of Object.values(interfaces)) {
    const address = addresses?.find((item) => item.family === 'IPv4' && !item.internal);
    if (address) return address.address;
  }

  return 'localhost';
};

app.get('/api/config', (req, res) => {
  const appUrl = process.env.PUBLIC_APP_URL || `${req.protocol}://${getLanAddress()}:3000`;
  res.json({ appUrl });
});

app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/meetings', meetingRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Screen sharing webinar backend is running' });
});

app.use(errorHandler);

const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.use(async (socket, next) => {
  try {
    await verifySocketToken(socket);
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

initSocketHandlers(io);

const PORT = process.env.PORT || 5000;
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the existing backend process or set PORT to a different value.`);
    process.exit(1);
  }

  console.error('Server failed to start:', error);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
