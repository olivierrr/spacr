var io = require('socket.io-client');
var fit = require('canvas-fit');
var loop = require('raf-loop');
var socket = io();
var xtend = require('xtend');
var keyDown = require('key-pressed');

const {ACTIONS, EVENTS, KEY_BINDINGS} = require('./constants');
var Minimap = require('./minimap');
var Renderer = require('./renderer');
var Statusbar = require('./statusbar');
var lerpObject = require('./lerp-object');

var renderer = new Renderer();
var minimap = new Minimap();
var statusbar = new Statusbar(socket);
var frames = [];
var delay = 40;

var avgPing = 0;
var pingArr = [];
var maxPingArrSize = 100;

var avgGameStep = 0;
var gameStepArr = [];
var maxGameStepArr = [];

socket.on('step', function(worldState) {
  frames.push(worldState);
  if (frames.length > 10) {
    frames.shift();
  }

  pingArr.push(Date.now() - worldState.timestamp);
  avgPing = pingArr.reduce((a, b) => a + b) / pingArr.length;
  if (pingArr.length > maxPingArrSize) {
    pingArr.shift();
  }

  gameStepArr.push(worldState.delta);
  avgGameStep = gameStepArr.reduce((a, b) => a + b) / gameStepArr.length;
  if (gameStepArr.length > maxGameStepArr) {
    gameStepArr.shift();
  }

  delay = avgPing + (avgGameStep * 1.5)
});

window.addEventListener('keydown', emitActions);
window.addEventListener('keyup', emitActions);

var engine = loop(step).start();

function step(dt) {
  statusbar.setLatestRenderStep(dt);
  statusbar.setTargetDelay(delay);
  var targetTime = Date.now() - delay;
  var foo = findFramesBetweenTime(targetTime);
  var frameA = xtend(foo[0]);
  var frameB = xtend(foo[1]);

  if (!frameA || !frameB) {
    console.warn('skipping frame');
    return;
  };

  var lerpScale = Math.abs((1/frameB.delta) * (frameA.timestamp - targetTime));
  var worldState = lerpObject(frameA, frameB, lerpScale);

  minimap.render(worldState);
  renderer.render(worldState);
}

function findFramesBetweenTime(time) {
  for(var i = 0; i < frames.length; i++) {
    var frame = frames[i];
    if (frame.timestamp >= time && (frame.timestamp - frame.delta) <= time) {
      return [frames[i - 1], frames[i]];
    }
  }
  return [];
}

function emitActions () {  var actions = {};
  Object.keys(KEY_BINDINGS)
    .filter(function(action) {
      return KEY_BINDINGS[action].some(pressed);
    })
    .forEach(function(action) {
      actions[action] = true;
    });
  socket.emit('action', actions);
}

function pressed(vkey) {
  return vkey.split('+')
    .every(function(key) {
      return key[0] === '!' ? !keyDown(key.slice(1)) : keyDown(key);
    });
}
