var p2 = require('p2');
var constants = require('./../lib/constants');
var uuid = require('uuid').v4;
var GAME_SETTINGS = constants.GAME_SETTINGS;
var ENTITY_TYPES = constants.ENTITY_TYPES;

function Bullet(game, aPlayer) {
  var shape, body, type, id, dieTime, ownerId, color, magnitude, angle;

  shape = new p2.Box({
    width: 0.3,
    height: 0.3
  });
  body = new p2.Body({
    mass: 0.01,
    position: aPlayer.body.position
  });
  body.addShape(shape);

  magnitude = GAME_SETTINGS.BASE_PLAYER_BULLET_SPEED;
  angle = aPlayer.body.angle + Math.PI / 2;
  body.velocity[0] += magnitude * Math.cos(angle) + aPlayer.body.velocity[0];
  body.velocity[1] += magnitude * Math.sin(angle) + aPlayer.body.velocity[1];
  body.damping = body.angularDamping = 0;

  type = ENTITY_TYPES.BULLET;
  id = uuid();
  dieTime = game.world.time + GAME_SETTINGS.BASE_PLAYER_BULLET_LIFETIME;
  ownerId = aPlayer.id;
  color = aPlayer.color;
  aPlayer.lastTimeShot = game.world.time + GAME_SETTINGS.BASE_PLAYER_FIRERATE;
  body.__game = this;

  this.game = game;
  this.body = body;
  this.shape = shape;
  this.type = type;
  this.id = id;
  this.dieTime = dieTime;
  this.ownerId = ownerId;
  this.color = color;

  game.world.addBody(body);
  game.es.push(this);
}

var proto = Bullet.prototype;

proto.serialize = function() {
  return {
    id: this.id,
    type: this.type,
    x: this.body.position[0],
    y: this.body.position[1],
    angle: this.body.angle,
    width: this.shape.width,
    height: this.shape.height,
    color: this.color
  }
};

proto.removeFromGame = function() {
  this.game.world.removeBody(this.body);
  for(var i = 0; i < this.game.es.length; i++) {
    if(this.game.es[i].id === this.id) {
      this.game.es.splice(i, 1);
      return;
    }
  }
};

module.exports = Bullet;