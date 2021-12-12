const path = require('path')

const PORT = process.env.PORT || 5000
const express = require('express')
const app = express()

const http = require('http')
const server = http.Server(app)
const personSize = 40
//const server = http.createServer(app)

let people = {};

//Region Input

function region(x1, y1, x2, y2, name) {
  this.x1 = parseInt(x1);
  this.y1 = parseInt(y1);
  this.x2 = parseInt(x2);
  this.y2 = parseInt(y2);
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
  this.width = parseInt(w) * personSize;
  this.height = parseInt(h) * personSize;
  this.x = parseInt(x);
  this.y = parseInt(y);
  this.name = name;
  this.region = new region(this.x-personSize, this.y-personSize, this.x + (this.width + personSize), this.y + (this.height + personSize), name + "TableRegion");
}

table.prototype.toString = function() {
  return `T: [${this.width},${this.height},${this.x},${this.y},${this.name}]`;
}


let tl = new table(3, 2, personSize*3, personSize*3, "TLT");
let tr = new table(3, 2, personSize*11, personSize*3, "TRT");
let bl = new table(3, 2, personSize*3, personSize*7, "BLT");
let br = new table(3, 2, personSize*11, personSize*7, "BRT");
let sr = new region(personSize*7, personSize, personSize*10, personSize*2, "SRegion");

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
    console.log("A user has joined.");
    //Double Checking to make sure one socket cannot create more than one student
    if (people[socket.id] != undefined) {
      io.emit("info/removePlayer", socket.id);
    }
    //FORMAT: Username, Current X, Current Y, Region, Seat X, Seat Y
    people[socket.id] = [username, x, y, region, null, null];
    socket.emit("info/message", "[INFO]", "You have connected.");
    io.emit("info/message", "[INFO]", username + " has connected.");
    io.emit("info/addPlayer", socket.id, people[socket.id]);
  });

  socket.on("disconnect", function() {
    if (people[socket.id] != undefined) {
      io.emit("info/message", "[INFO]", people[socket.id][0] + " has disconnected.");
      io.emit("info/removePlayer", socket.id);
      delete people[socket.id];
    }
  });

  socket.on("info/getPlayerList", function() {
    console.log("Sending Player Info...");
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

  socket.on("movement/requestSit", function (x, y) {
    let ret = true;
    for (let p in people) {
      if (people[p][4] == x && people[p][5] == y) {
        ret = false;
      }
    }
    if (ret == true) {
      people[socket.id][4] = x;
      people[socket.id][5] = y;
      socket.emit("movement/sitAccept", x, y);
    }
  });

  socket.on("movement/unsit", function() {
    people[socket.id][4] = null;
    people[socket.id][5] = null;
  });

  socket.on("info/setRegion", function(region) {
    if (people[socket.id][3] != region) {
      if (people[socket.id][3] != null) {
        io.emit("info/regionMessage", people[socket.id][3], "[INFO]", `${people[socket.id][0]} has left your table.`);
      }
      people[socket.id][3] = region;
      if (region != null) {
        io.emit("info/regionMessage", region, "[INFO]", `${people[socket.id][0]} has joined table ${people[socket.id][3]}.`);
      }
    }
  });

  socket.on('info/sendMessage', function(scope, msg) {
    switch (scope) {
      case "region":
        if (people[socket.id][3] == null) {
          socket.emit("info/message", "[INFO]", "You cannot send a table message when you are not at a table");
          break;
        }
        if (people[socket.id][3] == "SRegion") {
          io.emit("info/message", `[PRESENTER] ${people[socket.id][0]}`, msg);
          break;
        }
        io.emit("info/regionMessage", people[socket.id][3], people[socket.id][0], msg);
        break;
        case "global":
          io.emit("info/message", people[socket.id][0], msg);
        break;
        default:
          socket.emit("info/message", "[INFO]", "Invalid message scope.");
    }
  });

});

//setInterval(() => io.emit('time', new Date().toTimeString()), 1000);

app.get('/', (req, res) => res.render('pages/app.ejs'));
app.get('/credits', (req, res) => res.render('pages/credits'));
