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

  socket.on("profile/join", function(username, x, y) {
    console.log("SOMEBODY JOINED");
    //Double Checking to make sure one socket cannot create more than one student
    if (people[socket.id] != undefined) {
      io.emit("info/removePlayer", socket.id);
    }
    //FORMAT: Username, Current X, Current Y
    people[socket.id] = [username, x, y];
    socket.emit("info/message", "You have connected.");
    io.emit("info/chatmessage", username + " has connected");
    io.emit("info/addPlayer", socket.id, people[socket.id]);
  });

  socket.on("disconnect", function() {
    if (people[socket.id] != undefined) {
      io.emit("info/chatmessage", people[socket.id][0] + " has left.");
      io.emit("info/removePlayer", socket.id);
      delete people[socket.id];
    }
  });

  socket.on("info/getPlayerList", function() {
    console.log("GETTING");
    socket.emit("info/playerList", people);
  });

  socket.on("movement/goto", function(x, y) {
    people[socket.id][1] = x;
    people[socket.id][2] = y;
    io.emit("movement/update", socket.id, people[socket.id]);
  });

  socket.on('message', function(msg) {
    io.emit('message', "Guest", new Date().toTimeString(), msg);
  });

});

//setInterval(() => io.emit('time', new Date().toTimeString()), 1000);

app.get('/', (req, res) => res.render('pages/app.ejs'));
app.get('/credits', (req, res) => res.render('pages/credits'));
