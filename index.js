'use strict';

var os = require('os');
const express = require('express')
const app = express()
const port = 3001
const https = require(`https`);
const fs = require(`fs`);
const options = {
    key: fs.readFileSync(`certs/private.key.pem`),
    cert: fs.readFileSync(`certs/domain.cert.pem`)
  };
const socketIO = require('socket.io');

const server = require('https').createServer(options, app);
const io = socketIO(server);

app.use(express.static(__dirname + '/'));
app.get('/', function (req, res, next) {
    res.sendFile(__dirname + '/index.html');
});



server.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})


io.on('connection', (socket) => {
    console.log('socket.io connected');

    socket.on('disconnect', () => {
        console.log('socket.io disconnected');
    });

    socket.on('message', (msg) => {
        console.log('message: '+ msg);
        socket.broadcast.emit('message', msg);
    });

    
    socket.on('candidate', function(data){
      "use strict";
      console.log(data);
      socket.broadcast.emit('candidate', data);
    });

    socket.on('sdp', function(data){
      "use strict";
      console.log(data);
      socket.broadcast.emit('sdp', data);
    });

    socket.on('create or join', (room) => {

        // FIXME
        var clientsInRoom = io.of("/").adapter.rooms.get(room);
        var numClients = clientsInRoom ? io.of("/").adapter.rooms.get(room).size : 0;
        console.log("room " + room + numClients + " people");
        //console.log("before join");
        //console.log(io.of("/").adapter.rooms.get(room));

        if (numClients === 0) {
            socket.join(room);
            console.log('Client ID ' + socket.id + ' created room ' + room);
            io.to(room).emit('created', room, socket.id);
            console.log(io.of("/").adapter.rooms.get(room));
        } else if (numClients === 1) {
            socket.join(room);
            console.log('Client ID ' + socket.id + ' joined room ' + room);
            io.to(socket.id).emit('joined', room, socket.id);
            console.log(io.of("/").adapter.rooms.get(room).size);
            io.sockets.in(room).emit('ready');
        } else {
            socket.emit('full', room);
        }

    })
    

    socket.on('ipaddr', function() {
        var ifaces = os.networkInterfaces();
        for (var dev in ifaces) {
          ifaces[dev].forEach(function(details) {
            if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
              socket.emit('ipaddr', details.address);
            }
          });
        }
      });

    socket.onAny((eventName, ...args) => {
        console.log("IN ", eventName, args); 
    });

    socket.onAnyOutgoing((eventName, ...args) => {
        console.log("OUT", eventName, args); 
      });
});
