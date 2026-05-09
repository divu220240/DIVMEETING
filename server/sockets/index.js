const Meeting = require('../models/Meeting');

const rooms = {};

const createNotesState = () => ({
  content: '',
  lastEditedBy: null,
  lastEditedAt: null,
  actionItems: [],
});

const buildParticipant = (socket) => ({
  socketId: socket.id,
  id: socket.user.id,
  name: socket.user.name,
  muted: false,
  videoOn: true,
});

const syncRoomState = async (roomId) => {
  if (!rooms[roomId]) return;
  const meeting = await Meeting.findOne({ roomId });
  if (!meeting) return;
  meeting.locked = rooms[roomId].locked;
  await meeting.save();
};

module.exports = (io) => {
  io.on('connection', (socket) => {
    socket.on('join_room', async ({ roomId }) => {
      if (!roomId) {
        return socket.emit('error_message', { message: 'Room ID is required' });
      }

      if (!rooms[roomId]) {
        rooms[roomId] = {
          users: [],
          locked: false,
          hostId: socket.user.id,
          notes: createNotesState(),
        };
      }

      if (rooms[roomId].locked && rooms[roomId].hostId !== socket.user.id) {
        return socket.emit('room_locked', { message: 'Meeting is locked by the host' });
      }

      const existingUser = rooms[roomId].users.find((u) => u.socketId === socket.id);
      if (!existingUser) {
        rooms[roomId].users.push(buildParticipant(socket));
      }

      socket.join(roomId);
      socket.roomId = roomId;

      const otherUsers = rooms[roomId].users.filter((user) => user.socketId !== socket.id);
      socket.emit('room_users', { users: otherUsers, hostId: rooms[roomId].hostId, locked: rooms[roomId].locked });
      socket.emit('room_notes_state', rooms[roomId].notes);
      if (!existingUser) {
        const joinedUser = buildParticipant(socket);
        socket.to(roomId).emit('user_joined', { user: joinedUser });
        io.in(roomId).emit('participant_joined_message', {
          user: joinedUser,
          message: `${joinedUser.name} has joined the meeting`,
          timestamp: new Date().toISOString(),
        });
      }
    });

    socket.on('signal_offer', ({ target, sdp, caller }) => {
      io.to(target).emit('receive_offer', { sdp, caller, sender: socket.id });
    });

    socket.on('signal_answer', ({ target, sdp }) => {
      io.to(target).emit('receive_answer', { sdp, sender: socket.id });
    });

    socket.on('ice_candidate', ({ target, candidate }) => {
      io.to(target).emit('ice_candidate', { candidate, sender: socket.id });
    });

    socket.on('chat_message', ({ roomId, message }) => {
      io.in(roomId).emit('new_chat_message', {
        message,
        sender: { id: socket.user.id, name: socket.user.name },
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('host_toggle_mute', ({ roomId, target, muted }) => {
      const room = rooms[roomId];
      if (!room || socket.user.id !== room.hostId) return;
      io.in(roomId).emit('participant_muted', { target, muted });
    });

    socket.on('host_remove_user', ({ roomId, target }) => {
      const room = rooms[roomId];
      if (!room || socket.user.id !== room.hostId) return;
      const removed = room.users.find((u) => u.socketId === target);
      if (removed) {
        room.users = room.users.filter((u) => u.socketId !== target);
        io.to(target).emit('removed_from_room', { message: 'You have been removed by the host' });
        io.in(roomId).emit('user_removed', { target });
        io.sockets.sockets.get(target)?.leave(roomId);
      }
    });

    socket.on('host_lock_room', async ({ roomId, locked }) => {
      const room = rooms[roomId];
      if (!room || socket.user.id !== room.hostId) return;
      room.locked = locked;
      await syncRoomState(roomId);
      io.in(roomId).emit('room_locked_state', { locked });
    });

    socket.on('raise_hand', ({ roomId }) => {
      io.in(roomId).emit('user_raised_hand', {
        user: { id: socket.user.id, name: socket.user.name },
      });
    });

    socket.on('meeting_notes_update', ({ roomId, content }) => {
      const room = rooms[roomId];
      if (!room || typeof content !== 'string') return;

      room.notes.content = content.slice(0, 8000);
      room.notes.lastEditedBy = { id: socket.user.id, name: socket.user.name };
      room.notes.lastEditedAt = new Date().toISOString();

      io.in(roomId).emit('room_notes_state', room.notes);
    });

    socket.on('action_item_add', ({ roomId, text }) => {
      const room = rooms[roomId];
      const trimmed = typeof text === 'string' ? text.trim() : '';
      if (!room || !trimmed) return;

      room.notes.actionItems.unshift({
        id: `${Date.now()}-${socket.id}`,
        text: trimmed.slice(0, 240),
        done: false,
        createdBy: { id: socket.user.id, name: socket.user.name },
        createdAt: new Date().toISOString(),
      });

      io.in(roomId).emit('room_notes_state', room.notes);
    });

    socket.on('action_item_toggle', ({ roomId, itemId }) => {
      const room = rooms[roomId];
      if (!room || !itemId) return;

      room.notes.actionItems = room.notes.actionItems.map((item) => (
        item.id === itemId ? { ...item, done: !item.done } : item
      ));

      io.in(roomId).emit('room_notes_state', room.notes);
    });

    socket.on('action_item_delete', ({ roomId, itemId }) => {
      const room = rooms[roomId];
      if (!room || !itemId) return;

      room.notes.actionItems = room.notes.actionItems.filter((item) => item.id !== itemId);
      io.in(roomId).emit('room_notes_state', room.notes);
    });

    socket.on('disconnect', () => {
      const roomId = socket.roomId;
      if (!roomId || !rooms[roomId]) return;

      rooms[roomId].users = rooms[roomId].users.filter((user) => user.socketId !== socket.id);
      io.in(roomId).emit('user_left', { socketId: socket.id, userId: socket.user.id });
      if (rooms[roomId].users.length === 0) {
        delete rooms[roomId];
      } else if (rooms[roomId].hostId === socket.user.id) {
        rooms[roomId].hostId = rooms[roomId].users[0].id;
        io.in(roomId).emit('host_changed', { hostId: rooms[roomId].hostId });
      }
    });
  });
};
