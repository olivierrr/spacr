var uuid = require('uuid').v4;
var ENTITY_TYPES = require('./../lib/constants').ENTITY_TYPES;
var PLAYER = ENTITY_TYPES.PLAYER;
var p2 = require('p2');

function Player(game, x, y, name, color) {
  var shape, body, id, type, isAlive, spring, health, actions, lastShotBy, points;

  shape = new p2.Box({
    width: 5,
    height: 1
  });
  body = new p2.Body({
    mass:0.01,
    position:[x, y],
    angularVelocity:0
  });

  body.damping = body.angularDamping = 0;
  body.addShape(shape);
  body.__game = this;

  id = uuid();
  type = PLAYER;
  isAlive = true;
  spring = false;
  health = 100;
  actions = {};
  lastShotBy = undefined;
  points = 0;

  this.game = game;
  this.body = body;
  this.shape = shape;
  this.id = id;
  this.type = type;
  this.isAlive = isAlive;
  this.spring = spring;
  this.health = health;
  this.actions = actions;
  this.lastShotBy = lastShotBy;
  this.points = points;
  this.color = color;
  this.name = name;

  game.world.addBody(body);
  game.es.push(this);
}

var proto = Player.prototype;

proto.serialize = function() {
  return {
    id: this.id,
    type: this.type,
    x: this.body.position[0],
    y: this.body.position[1],
    angle: this.body.angle,
    width: this.shape.width,
    height: this.shape.height,
    points: this.points,
    name: this.name,
    color: this.color,
    health: this.health
  }
};

proto.removeSpring = function() {
  if(this.spring) {
    this.spring.removeFromGame();
    this.spring = false;
  }
};

proto.removeFromGame = function() {
  this.removeSpring();
  this.game.world.removeBody(this.body);
  for(var i = 0; i < this.game.es.length; i++) {
    if(this.game.es[i].id === this.id) {
      this.game.es.splice(i, 1);
      return;
    }
  }
};

module.exports = Player;