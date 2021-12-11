const path = require('path')

const PORT = process.env.PORT || 5000
const express = require('express')
const app = express()

const http = require('http')
const server = http.Server(app)
//const server = http.createServer(app)

let people = {};

const io = require('socket.io')(server, { cors: { origin: "*" }})

app.use(express.static(path.join(__dirname, 'public')))
.set('views', path.join(__dirname, 'views'))
.set('view engine', 'ejs');

server.listen(PORT, () => console.log(`Listening on ${ PORT }`));

io.on('connection', (socket) => {
  
  console.log("User connected: " + socket.id);

  socket.on("profile/join", function(username) {
    console.log("SOMEBODY JOINED");
    people[socket.id] = username;
    socket.emit("info/message", "You have connected.");
    io.emit("info/chatmessage", username + " has connected");
  });

  socket.on("disconnect", function() {
    io.emit("info/chatmessage", people[socket.id] + " has left.");
    delete people[socket.id];
  })

  socket.on('message', function(msg) {
    io.emit('message', "Guest", new Date().toTimeString(), msg);
  })

});

//setInterval(() => io.emit('time', new Date().toTimeString()), 1000);

app.get('/', (req, res) => res.render('pages/app.ejs'));
app.get('/credits', (req, res) => res.render('pages/credits'));
