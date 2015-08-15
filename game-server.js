var ecstatic = require('ecstatic');
var app = require('http').createServer(ecstatic({ root: __dirname }));
var os = require('os');
var randomName = require('node-random-name');
var randomColor = require('./random-color');

var http = require('http');
var ecstatic = require('ecstatic');

var PORT = +process.argv[2] || 4200;
console.log(PORT);
app.listen(PORT, function(){
  console.log("Server listening on: http://localhost:%s", PORT);
});

var io = require('socket.io')(app);

var constants = require('./constants');
var SERVER_SETTINGS = constants.SERVER_SETTINGS;
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
  game.step((Date.now() - lastFrameTime) / 1000);
  var worldState = game.serialize();
  worldState.timestamp = Date.now();
  worldState.delta = Date.now() - lastFrameTime;
  lastFrameTime = worldState.timestamp;

  io.sockets.sockets.forEach(function(socket) {
    worldState.focus = socket.me.id;
    socket.emit('step', worldState);
  })
}