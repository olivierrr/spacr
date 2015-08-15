var p2 = require('p2');
var constants = require('./constants');
var uuid = require('uuid').v4;
var PLANET = constants.ENTITY_TYPES.PLANET;

function Planet(game, x, y) {
  var shape, body, id;

  shape = new p2.Circle({
    radius: Math.random() * 20 + 10
  });
  body = new p2.Body({
    mass: 500,
    position: [x, y]
  });
  body.addShape(shape);
  body.__game = this;
  body.damping = body.angularDamping = 0;

  id = uuid();

  this.game = game;
  this.shape = shape;
  this.body = body;
  this.type = PLANET;
  this.id = id;

  game.world.addBody(body);
  game.es.push(this);
}

var proto = Planet.prototype;

proto.serialize = function() {
  return {
    id: this.id,
    type: this.type,
    x: this.body.position[0],
    y: this.body.position[1],
    radius: this.shape.radius,
    angle: this.body.angle
  }
};

module.exports = Planet;