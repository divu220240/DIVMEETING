const crypto = require('crypto');
const Meeting = require('../models/Meeting');

exports.createMeeting = async (req, res, next) => {
  try {
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Meeting title is required' });
    }

    const roomId = crypto.randomBytes(4).toString('hex');
    const meeting = await Meeting.create({
      title,
      roomId,
      host: req.user.id,
      participants: [{ user: req.user.id, name: req.user.name }],
    });

    res.status(201).json({
      meeting: {
        id: meeting._id,
        title: meeting.title,
        roomId: meeting.roomId,
        locked: meeting.locked,
        createdAt: meeting.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const meetings = await Meeting.find({ host: req.user.id })
      .sort({ createdAt: -1 })
      .select('title roomId createdAt locked');
    res.json({ meetings });
  } catch (error) {
    next(error);
  }
};

exports.getMeetingById = async (req, res, next) => {
  try {
    const meeting = await Meeting.findOne({ roomId: req.params.roomId }).populate('host', 'name email');
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    res.json({ meeting });
  } catch (error) {
    next(error);
  }
};
