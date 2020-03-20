// Inspired by https://www.html5rocks.com/en/tutorials/webrtc/infrastructure/

require('debug').enable('*,-socket*,-engine*')

const PORT = 2020
const nodeStatic = require('node-static')
const http = require('http')
const file = new (nodeStatic.Server)()

const app = http.createServer(function (req, res) {
  file.serve(req, res)
}).listen(PORT)

const logLocal = require('debug')('app:server')

const io = require('socket.io').listen(app)

logLocal('Start on port', PORT)

io.sockets.on('connection', (socket) => {

  // convenience function to log server messages to the client
  function log() {
    const array = ['>>> Message from server: ']
    for (let i = 0; i < arguments.length; i++) {
      array.push(arguments[i].toString())
    }
    logLocal(array.join(' '))
    socket.emit('log', array)
  }

  log('Connection')

  socket.on('message', (message) => {
    log('Got message:', message)
    // for a real app, would be room only (not broadcast)
    socket.broadcast.emit('message', message)
  })

  socket.on('create or join', (room) => {
    logLocal('sock')

    let socketRoom = io.sockets.adapter.rooms[room];
    // let socketRoom = io.sockets.clients(room)
    logLocal('sockriin', socketRoom)
    const numClients = socketRoom ? socketRoom.length : 0

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
