// Inspired by https://www.html5rocks.com/en/tutorials/webrtc/infrastructure/

const PORT = 2020
const nodeStatic = require('node-static')
const http = require('http')
const file = new (nodeStatic.Server)()

const app = http.createServer(function (req, res) {
  file.serve(req, res)
}).listen(PORT)

const io = require('socket.io').listen(app)

io.sockets.on('connection', (socket) => {

  // convenience function to log server messages to the client
  function log() {
    const array = ['>>> Message from server: ']
    for (const i = 0; i < arguments.length; i++) {
      array.push(arguments[i])
    }
    socket.emit('log', array)
  }

  socket.on('message', (message) => {
    log('Got message:', message)
    // for a real app, would be room only (not broadcast)
    socket.broadcast.emit('message', message)
  })

  socket.on('create or join', (room) => {
    const numClients = io.sockets.clients(room).length

    log('Room ' + room + ' has ' + numClients + ' client(s)')
    log('Request to create or join room ' + room)

    if (numClients === 0) {
      socket.join(room)
      socket.emit('created', room)
    } else if (numClients === 1) {
      io.sockets.in(room).emit('join', room)
      socket.join(room)
      socket.emit('joined', room)
    } else { // max two clients
      socket.emit('full', room)
    }
    socket.emit('emit(): client ' + socket.id +
      ' joined room ' + room)
    socket.broadcast.emit('broadcast(): client ' + socket.id +
      ' joined room ' + room)

  })

})
