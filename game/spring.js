var p2 = require('p2');
var constants = require('./../lib/constants');
var uuid = require('uuid').v4;
var SPRING = constants.ENTITY_TYPES.SPRING;

function Spring(game, player, planet) {
  var spring, id;

  if(player.spring) {
    return;
  }

  spring = new p2.LinearSpring(player.body, planet.body, {
    stiffness: 0.01,
    restLength: 0,
    damping : 0
  });
  player.spring = this;
  spring.__game = this;

  id = uuid();

  this.game = game;
  this.body = spring;
  this.type = SPRING;
  this.id = id;

  game.world.addSpring(spring);
  game.es.push(this);
}

var proto = Spring.prototype;

proto.serialize = function() {
  return {
    id: this.id,
    type: SPRING,
    ax: this.body.bodyA.position[0],
    ay: this.body.bodyA.position[1],
    bx: this.body.bodyB.position[0],
    by: this.body.bodyB.position[1]
  }
};

proto.removeFromGame = function() {
  this.game.world.removeSpring(this.body);
  for(var i = 0; i < this.game.es.length; i++) {
    if(this.game.es[i].id === this.id) {
      this.game.es.splice(i, 1);
      return;
    }
  }
};

module.exports = Spring;