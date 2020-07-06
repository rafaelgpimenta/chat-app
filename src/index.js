const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words');
const { generateMessage, generateLocationMessage } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users');
const { Socket } = require('dgram');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public');

app.use(express.static(publicDirectoryPath));

io.on('connection', socket => {
  console.log('new webSocket connection');

  socket.on('join', (options, callback) => {
    const { error, user } = addUser({ id: socket.id, ...options })
    if (error) return callback(error);

    socket.join(user.room);

    // emit to single connection
    socket.emit('message', generateMessage('Admin', 'Welcome!'));
    // emit to everybody in the room except client who triggered
    socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))
    // emit to everybody except client who triggered
    // socket.broadcast.emit('message', generateMessage('New user has joined!'))

    callback();
  });

  socket.on('sendMessage', (msg, callback) => {
    const user = getUser(socket.id);
    const filter = new Filter();
    if (filter.isProfane(msg))
      return callback('Profanity is not allowed!');

    // emit to everyone
    // io.emit('message', generateMessage(msg));
    // emit to everyone in room
    io.to(user.room).emit('message', generateMessage(user.username, msg));
    callback();
  });

  socket.on('sendLocation', (coords, callback) => {
    const user = getUser(socket.id);
    io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, coords));
    callback();
  });

  socket.on('disconnect', () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left`));
    }
  });
});

server.listen(port, () => {
  console.log(`Server is up on port ${port}`)
})
