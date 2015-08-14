var app = require('http').createServer(handle);
var os = require('os');
var randomName = require('node-random-name');
var randomColor = require('./random-color');

const PORT = 4002;
app.listen(PORT, function(){
  console.log("Server listening on: http://localhost:%s", PORT);
});

var io = require('socket.io')(app);

var constants = require('./constants');
const SERVER_SETTINGS = constants.SERVER_SETTINGS;
var Game = require('./game');
var game = new Game(500, 500);

var lastFrameTime = Date.now();
setInterval(tick, SERVER_SETTINGS.STEP_INTERVAL);

io.on('connection', function(socket) {
  var me = game.addPlayer(Math.random() * game.width, Math.random() * game.height, randomName(), randomColor());
  socket.me = me;

  socket.on('action', function(action) {
    me.actions = action;
  });
  socket.on('disconnect', function() {
    game.world.removeBody(me.body);
    for(var i = 0; i < game.es.length; i++) {
      if(game.es[i].id === me.id) {
        game.es.splice(i, 1);
        return;
      }
    }
  });
  socket.on('spawn', function() {
    if(!me.isAlive) {
      
    }
  });
});

function tick() {
  game.step();
  var worldState = game.serialize();
  worldState.timestamp = Date.now();
  worldState.delta = Date.now() - lastFrameTime;
  lastFrameTime = worldState.timestamp;

  io.sockets.sockets.forEach(function(socket) {
    worldState.focus = socket.me.id;
    socket.emit('step', worldState);
  })
}

function handle(req, res) {
  //
}

var interfaces = os.networkInterfaces();
var addresses = [];
for (var k in interfaces) {
  for (var k2 in interfaces[k]) {
    var address = interfaces[k][k2];
    if (address.family === 'IPv4' && !address.internal) {
      addresses.push(address.address);
    }
  }
}
console.log('local network ip is: http://%s:%s', addresses[0], PORT);