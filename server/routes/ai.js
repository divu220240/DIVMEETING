const express = require('express');
const { chatWithMeetingAssistant, generateMeetingInsights } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/meeting-insights', protect, generateMeetingInsights);
router.post('/meeting-chat', protect, chatWithMeetingAssistant);

module.exports = router;
