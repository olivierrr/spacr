var p2 = require('p2');
var constants = require('./constants');
var uuid = require('uuid').v4;
var GAME_SETTINGS = constants.GAME_SETTINGS;
var ENTITY_TYPES = constants.ENTITY_TYPES;

function Bullet(world, aPlayer) {
  this.shape = new p2.Box({
    width: 0.3,
    height: 0.3
  });

  this.body = new p2.Body({
    mass: 0.01,
    position: aPlayer.body.position
  });

  var magnitude = GAME_SETTINGS.BASE_PLAYER_BULLET_SPEED;
  var angle = aPlayer.body.angle + Math.PI / 2;

  // give bullet initial velocity
  this.body.velocity[0] += magnitude * Math.cos(angle) + aPlayer.body.velocity[0];
  this.body.velocity[1] += magnitude * Math.sin(angle) + aPlayer.body.velocity[1];

  //var m = 0.1;
  //aPlayer.body.velocity[0] -= body.velocity[0] * m;
  //aPlayer.body.velocity[1] -= body.velocity[1] * m;

  this.body.damping = this.body.angularDamping = 0;
  this.body.addShape(this.shape);
  world.addBody(this.body);

  this.type = ENTITY_TYPES.BULLET;
  this.id = uuid();
  this.dieTime = world.time + GAME_SETTINGS.BASE_PLAYER_BULLET_LIFETIME;
  this.ownerId = aPlayer.id;
  this.color = aPlayer.color;
  this.body.__game = this;
};

var proto = Bullet.prototype;
module.exports = Bullet;