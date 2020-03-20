// Inspired by https://www.html5rocks.com/en/tutorials/webrtc/infrastructure/

require('debug').enable('*,-socket*,-engine*')

const PORT = 2020
const MAX = 50

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
  logLocal('Connection', socket)
  const socketID = socket.id

  // convenience function to log server messages to the client
  function log() {
    const array = ['>>> Message from server: ']
    for (let i = 0; i < arguments.length; i++) {
      array.push(arguments[i].toString())
    }
    logLocal(array.join(' '))
    socket.emit('log', array)
  }

  function socketByID(id) {
    return io.sockets.connected[id]
  }

  function socketIDsInRoom(room) {
    let sockets = io.sockets.adapter.rooms[room]
    logLocal('sockets in room', room, sockets)
    if (sockets && sockets.length > 0) {
      return Object.entries(sockets.sockets).filter((k, v) => v === true).map(k => k)
    }
    return []
  }

  socket.on('message', (message) => {
    log('Got message:', message)
    // for a real app, would be room only (not broadcast)
    socket.broadcast.emit('message', message)
  })

  socket.on('create or join', (room) => {
    const peers = socketIDsInRoom(room)
    const numClients = peers.length

    log('Room ' + room + ' has ' + numClients + ' client(s)')
    log('Request to create or join room ' + room)

    if (numClients === 0) {
      socket.join(room)
      socket.emit('created', room)
    } else if (numClients >= 1 && numClients < MAX) {
      io.sockets.in(room).emit('join', room)
      socket.join(room)
      socket.emit('joined', {
        room,
        peers,
      })
    } else { // max MAX clients
      socket.emit('full', room)
    }

    // socket.emit('emit(): client ' + socket.id + ' joined room ' + room)
    // socket.broadcast.emit('broadcast(): client ' + socket.id + ' joined room ' + room)
  })

  // Establish a direct conntection between two peers
  socket.on('signal', data => {
    log('signal', data.from, data.to)
    if (data.from !== socketID) {
      log('*** error, wrong from', data.from)
    }
    if (data.to) {
      const toSocket = socketByID(data.to)
      if (toSocket) {
        toSocket.emit('signal', {
          ...data,
          // from: socket.id,
        })
      } else {
        log('Cannot find socket for %s', data.to)
      }
    }
  })

})
