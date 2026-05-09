const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, email: decoded.email, name: decoded.name };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token invalid or expired' });
  }
};

exports.verifySocketToken = async (socket) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    throw new Error('Token missing');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  socket.user = { id: decoded.id, name: decoded.name, email: decoded.email };
};
