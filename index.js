const path = require('path')

const PORT = process.env.PORT || 5000
const express = require('express')
const app = express()

const http = require('http')
const server = http.Server(app)
const personSize = 30
//const server = http.createServer(app)

let people = {};

//Region Input

function region(x1, y1, x2, y2, name) {
  this.x1 = x1;
  this.y1 = y1;
  this.x2 = x2;
  this.y2 = y2;
  this.width = x2-x1;
  this.height = y2-y1;
  this.name = name;
}

region.prototype.isIn = function(x, y) {
  return ((Math.sign(this.x1 - x) != Math.sign(this.x2 - x)) && (Math.sign(this.y1 - y) != Math.sign(this.y2 - y)));
}

region.prototype.toString = function() {
  return `R: [${this.x1},${this.y1},${this.x2},${this.y2},${this.name}]`;
}

//Width and Height parameters are in person-sized units

function table(w, h, x, y, name) {
  this.width = w;
  this.height = h;
  this.x = x;
  this.y = y;
  this.name = name;
  this.region = new region(x-personSize, y-personSize, x + (w + 1) * personSize, y + (h + 1) * personSize, name + "TableRegion");
}

table.prototype.toString = function() {
  return `T: [${this.width},${this.height},${this.x},${this.y},${this.name}]`;
}


let tl = new table(3, 2, 60, 60, "TLT");
let tr = new table(3, 2, 300, 60, "TRT");
let bl = new table(3, 2, 60, 180, "BLT");
let br = new table(3, 2, 300, 180, "BRT");
let sr = new region(180, 0, 270, 30, "SR");

let tables = [
  tl.toString(),
  tr.toString(),
  bl.toString(),
  br.toString(),
  sr.toString()
];

const io = require('socket.io')(server, { cors: { origin: "*" }})

app.use(express.static(path.join(__dirname, 'public')))
.set('views', path.join(__dirname, 'views'))
.set('view engine', 'ejs');

server.listen(PORT, () => console.log(`Listening on ${ PORT }`));

io.on('connection', (socket) => {
  
  console.log("User connected: " + socket.id);

  socket.on("profile/join", function(username, x, y, region) {
    console.log("SOMEBODY JOINED");
    //Double Checking to make sure one socket cannot create more than one student
    if (people[socket.id] != undefined) {
      io.emit("info/removePlayer", socket.id);
    }
    //FORMAT: Username, Current X, Current Y
    people[socket.id] = [username, x, y, region];
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

  socket.on("info/getObjects", function() {
    socket.emit('info/objectList', tables);
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
