const express = require('express');
const router = express.Router();
const { createMeeting, getHistory, getMeetingById } = require('../controllers/meetingController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createMeeting);
router.get('/history', protect, getHistory);
router.get('/:roomId', protect, getMeetingById);

module.exports = router;
