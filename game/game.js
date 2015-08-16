var p2 = require('p2');
var uuid = require('uuid').v4;
var clamp = require('clamp');
var constants = require('./../lib/constants');
var ACTIONS = constants.ACTIONS;
var GAME_SETTINGS = constants.GAME_SETTINGS;
var ENTITY_TYPES = constants.ENTITY_TYPES;

var Bullet = require('./bullet');
var Player = require('./player');
var Planet = require('./planet');
var Spring = require('./spring');

var BULLET = ENTITY_TYPES.BULLET;
var PLAYER = ENTITY_TYPES.PLAYER;
var PLANET = ENTITY_TYPES.PLANET;
var SPRING = ENTITY_TYPES.SPRING;

function Game(width, height) {
  this.width = width;
  this.height = height;
  this.es = [];
  this.world = new p2.World({
    gravity: [0, 0]
  });

  for(var i = 0; i < this.width * this.height / 10000; i++) {
    this.addPlanet(Math.random() * this.width, Math.random() * this.height);
  }

  this.world.on('impact', function(evt) {
    var bodyA = evt.bodyA;
    var bodyB = evt.bodyB;

    if(!bodyA.__game || !bodyB.__game) return;

    if(bodyA.__game.type === BULLET || bodyB.__game.type === BULLET){
      var bulletBody = bodyA.__game.type === BULLET ? bodyA : bodyB;
      var otherBody = bodyB === bulletBody ? bodyA : bodyB;

      if(otherBody.__game.type === PLAYER && otherBody.__game.id !== bulletBody.__game.ownerId){
        otherBody.__game.health -= GAME_SETTINGS.BASE_PLAYER_BULLET_DAMAGE;
        otherBody.__game.health = clamp(otherBody.__game.health, 0, 100);
        otherBody.__game.lastShotBy = bulletBody.__game.ownerId;
        bulletBody.__game.removeFromGame();
      }
    }
  });

  this.setWorldBounds();
}

var proto = Game.prototype;

proto.setWorldBounds = function() {
  var self = this;
  var planeTop = new p2.Body({
    mass: 0,
    position : [0,0]
  });
  planeTop.addShape(new p2.Plane());
  self.world.addBody(planeTop);
  var planeBottom = new p2.Body({
    angle: -Math.PI,
    mass: 0,
    position : [0,self.height]
  });
  planeBottom.addShape(new p2.Plane());
  self.world.addBody(planeBottom);
  var planeLeft = new p2.Body({
    mass: 0,
    angle: -Math.PI/2,
    position: [0, 0]
  });
  planeLeft.addShape(new p2.Plane());
  self.world.addBody(planeLeft);
  var planeRight = new p2.Body({
    mass: 0,
    angle: Math.PI/2,
    position: [self.width, 0]
  });
  planeRight.addShape(new p2.Plane());
  self.world.addBody(planeRight);
};

proto.serialize = function() {
  var entities = {};
  this.es.forEach(function(e) {
    if(typeof e.serialize === 'function') {
      entities[e.id] = e.serialize();
    }
  });

  return {
    entities: entities,
    width: this.width,
    height: this.height
  };
};

proto.addSpring = function(player, planet) {
  var spring = new Spring(this, player, planet);
  return spring;
};

proto.addPlayer = function(x, y, name, color) {
  var player = new Player(this, x, y, name, color);
  return player;
};

proto.addBullet = function(aPlayer) {
  var bullet = new Bullet(this, aPlayer);
  return bullet;
};

proto.addPlanet = function(x, y) {
  var planet = new Planet(this, x, y);
  return planet;
};

proto.step = function(dt) {
  var self = this;
  var dt = dt || (1/60);

  self.es.forEach(function(e) {
    if(e.type !== PLAYER) return;

    var down = e.actions || {};

    if(down[ACTIONS.SHOOT_MAIN_BEGIN]) {
      self.addBullet(e);
    }

    if(down[ACTIONS.THRUST_FORWARD_BEGIN]) {
      e.body.applyForceLocal([0, GAME_SETTINGS.BASE_PLAYER_THRUST_ACCELERATION]);
    }

    if(down[ACTIONS.THRUST_BACKWARD_BEGIN]) {
      e.body.applyForceLocal([0, -GAME_SETTINGS.BASE_PLAYER_THRUST_ACCELERATION]);
    }

    if(down[ACTIONS.TURN_RIGHT_BEGIN]) {
      e.body.angularVelocity  = -GAME_SETTINGS.BASE_PLAYER_TURN_ACCELERATION;
    }

    if(down[ACTIONS.TURN_LEFT_BEGIN]) {
      e.body.angularVelocity = GAME_SETTINGS.BASE_PLAYER_TURN_ACCELERATION;
    }

    if(!down[ACTIONS.TURN_RIGHT_BEGIN] && !down[ACTIONS.TURN_LEFT_BEGIN]) {
      e.body.angularVelocity = GAME_SETTINGS.BASE_DEFAULT_TURN_ACCELERATION;
    }

    if(down[ACTIONS.GRAPPLE_GUN_RELEASE] && e.spring) {
      e.removeSpring();
    }

    if(down[ACTIONS.GRAPPLE_GUN_START] && !e.spring) {
      var closestPlanetSoFar;
      var closestDistanceSoFar;
      for(var i = 0; i < self.es.length; i++) {
        var e2 = self.es[i];
        if(e2.type !== PLANET) {
          continue;
        }
        var dx = e2.body.position[0] - e.body.position[0];
        var dy = e2.body.position[1] - e.body.position[1];
        var d = Math.sqrt(dx * dx + dy * dy);

        if (!closestPlanetSoFar || d < closestDistanceSoFar) {
          closestDistanceSoFar = d;
          closestPlanetSoFar = e2;
        }
      }
      self.addSpring(e, closestPlanetSoFar);
    }

    var vx = e.body.velocity[0];
    var vy = e.body.velocity[1];
    var maxSpeed = GAME_SETTINGS.PLAYER_MAX_SPEED;
    if (Math.pow(vx, 2) + Math.pow(vy, 2) > Math.pow(maxSpeed, 2)) {
      var a = Math.atan2(vy, vx);
      vx = Math.cos(a) * maxSpeed;
      vy = Math.sin(a) * maxSpeed;
      e.body.velocity[0] = vx;
      e.body.velocity[1] = vy;
    }
  });

  self.es.forEach(function(e, i) {
    // player dies
    if(e.type === PLAYER && e.health <= 0) {

      // give a 'point' to the player that last shot this player
      if(e.lastShotBy) {
        for(var i = 0; i < self.es.length; i++) {
          if(self.es[i].id === e.lastShotBy) {
            self.es[i].points += 1;
          }
        }
      }

      // clean up and new assign spawn properties
      e.body.position = [Math.random() * self.width, Math.random() * self.height];
      e.health = 100;
      e.removeSpring();
    }

    if(e.type === BULLET && e.dieTime <= self.world.time) {
      e.removeFromGame();
    }
  });

  this.world.step(dt);
};

function turnOffDamping(body){
  body.damping = body.angularDamping = 0;
}

module.exports = Game;