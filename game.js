var p2 = require('p2');
var EventEmitter = require('events');
var uuid = require('uuid').v4;
var clamp = require('clamp');
var constants = require('./constants');
var ACTIONS = constants.ACTIONS;
var GAME_SETTINGS = constants.GAME_SETTINGS;
var ENTITY_TYPES = constants.ENTITY_TYPES;

var Bullet = require('./bullet');

var BULLET = 'BULLET';
var PLAYER = 'PLAYER';
var PLANET = 'PLANET';
var SPRING = 'SPRING';

function Game(width, height) {
  this.width = width;
  this.height = height;

  this.es = [];
  this.events = new EventEmitter.EventEmitter();
  this.world = new p2.World({
    gravity: [0, 0]
  });

  for(var i = 0; i < this.width * this.height / 10000; i++) {
    this.addPlanet(Math.random() * this.width, Math.random() * this.height);
  }

  var self = this;
  this.world.on('impact', function(evt) {
    var bodyA = evt.bodyA;
    var bodyB = evt.bodyB;

    if(!bodyA.__game || !bodyB.__game) return;

    if(bodyA.__game.type === BULLET || bodyB.__game.type === BULLET){
      var bulletBody = bodyA.__game.type === BULLET ? bodyA : bodyB;
      var otherBody = bodyB === bulletBody ? bodyA : bodyB;

      if(otherBody.__game.type === PLAYER && otherBody.__game.id !== bulletBody.__game.ownerId){
        otherBody.__game.health -= GAME_SETTINGS.BASE_PLAYER_BULLET_DAMAGE;
        otherBody.__game.lastShotBy = bulletBody.__game.ownerId;
        for(var i = 0; i < self.es.length; i++) {
          if(self.es[i].id === bulletBody.__game.id) {
            self.es.splice(i, 1);
            self.world.removeBody(bulletBody);
            break;
          }
        }
      }
    }
  });

  this.setWorldBounds();
}

var proto = Game.prototype;

proto.setWorldBounds = function() {
  var self = this;
  var plane = new p2.Body({
    mass: 0,
    position : [0,0]
  });
  plane.addShape(new p2.Plane());
  self.world.addBody(plane);
  var plane = new p2.Body({
    angle: -Math.PI,
    mass: 0,
    position : [0,self.height]
  });
  plane.addShape(new p2.Plane());
  self.world.addBody(plane);
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
    entities[e.id] = {
      id: e.id,
      type: e.type,
      x: e.body.position[0],
      y: e.body.position[1],
      radius: e.shape.radius,
      angle: e.body.angle,
      width: e.shape.width,
      height: e.shape.height,
      points: e.points,
      name: e.name,
      color: e.color,
      health: e.health
    };
  });

  this.world.springs.forEach(function(e) {
    entities[e.id] = {
      id: e.id,
      type: SPRING,
      ax: e.bodyA.position[0],
      ay: e.bodyA.position[1],
      bx: e.bodyB.position[0],
      by: e.bodyB.position[1]
    };
  });
  var self = this;
  return {
    entities: entities,
    width: self.width,
    height: self.height
  };
};

proto.addSpring = function(player, planet) {
  if(player.spring) return;
  var spring = new p2.LinearSpring(player.body, planet.body, {
    stiffness: 2,
    restLength: 0,
    damping : 0
  });
  spring.id = uuid();
  player.spring = spring;
  this.world.addSpring(spring);
};

proto.addPlayer = function(x, y, name, color) {
  var self = this;
  var shape = new p2.Box({
    width: 5,
    height: 1
  });
  var body = new p2.Body({
    mass:1.0,
    position:[x, y],
    angularVelocity:1
  });
  turnOffDamping(body);
  body.addShape(shape);
  self.world.addBody(body);
  var player = {
    id: uuid(),
    body: body,
    shape: shape,
    type: PLAYER,
    isAlive: true,
    spring: false,
    health: 100,
    actions: {},
    lastShotBy: 0,
    points: 0,
    color: color,
    name: name
  };
  body.__game = player;
  self.es.push(player);
  return player;
};

proto.addBullet = function(aPlayer) {
  var bullet = new Bullet(this.world, aPlayer);
  this.es.push(bullet);
  return bullet;
};

proto.addPlanet = function(x, y) {
  var self = this;
  var shape = new p2.Circle({
    radius: Math.random() * 10 + 5
  });
  var body = new p2.Body({
    mass: 50,
    position: [x, y]
  });

  turnOffDamping(body);
  body.addShape(shape);
  self.world.addBody(body);

  var planet = {
    shape: shape,
    body: body,
    type: PLANET,
    id: uuid()
  };

  body.__game = planet;
  self.events.emit('addingE', planet);
  self.es.push(planet);
  return planet;
};

proto.step = function(dt) {
  var self = this;
  var dt = dt || (1/60);

  // process entity actions
  self.es.forEach(function(e) {
    var down = e.actions || {};

    if(down[ACTIONS.SHOOT_MAIN_BEGIN]) {
      self.addBullet(e);
    }

    if(down[ACTIONS.THRUST_FORWARD_BEGIN]) {
      e.body.applyForceLocal([0, GAME_SETTINGS.BASE_PLAYER_THRUST_ACCELERATION]);
    }

    if(down[ACTIONS.TURN_RIGHT_BEGIN]) {
      e.body.angularVelocity  = -GAME_SETTINGS.BASE_PLAYER_TURN_ACCELERATION
    }

    if(down[ACTIONS.TURN_LEFT_BEGIN]) {
      e.body.angularVelocity = GAME_SETTINGS.BASE_PLAYER_TURN_ACCELERATION
    }

    if(!down[ACTIONS.TURN_RIGHT_BEGIN] && !down[ACTIONS.TURN_LEFT_BEGIN]) {
      e.body.angularVelocity = GAME_SETTINGS.BASE_DEFAULT_TURN_ACCELERATION;
    }

    if(down[ACTIONS.GRAPPLE_GUN_RELEASE] && e.spring) {
      self.world.removeSpring(e.spring);
      e.spring = false;
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
  });

  // gravity
  //self.es.forEach(function(e1) {
  //  //if(e1.type === BULLET) return;
  //  self.es.forEach(function(e2) {
  //    if(e2.type === BULLET) return;
  //    if(e1 == e2) return;
  //
  //    // fix to not be step dependent...
  //    var dx, dy, a, d;
  //    var treshold = 100;
  //    dx = e2.body.position[0] - e1.body.position[0];
  //    dy = e2.body.position[1] - e1.body.position[1];
  //    d = Math.sqrt(dx*dx + dy*dy);
  //
  //    //if(d > treshold) return;
  //
  //    a = Math.atan2(dx, dy) * (180 / Math.PI);
  //
  //    var accel = (e2.body.mass / Math.pow(e1.body.mass, 2)) * (1 - d/100);
  //    accel = clamp(accel, 0, 5);
  //    var fx = Math.sin(a * (Math.PI / 180)) * accel * 0.1;
  //    var fy = Math.cos(a * (Math.PI / 180)) * accel * 0.1;
  //
  //    e1.body.force[0] += fx;
  //    e1.body.force[1] += fy;
  //  });
  //});


  self.es.forEach(function(e) {
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
      console.log('respawn!');
      if(e.spring) {
        self.world.removeSpring(e.spring);
        e.spring = false;
      }
    }
  });

  self.es.forEach(function(e, i) {

    //if(e.type === PLAYER) {
    //  var maxvelocity = 50;
    //  e.body.velocity[0] = clamp(e.body.velocity[0], -maxvelocity, maxvelocity);
    //  e.body.velocity[1] = clamp(e.body.velocity[1], -maxvelocity, maxvelocity);
    //}

    // bullet removal
    if(e.type === BULLET && e.dieTime <= self.world.time) {
      self.es.splice(i, 1);
      self.world.removeBody(e.body);
    }
  });

  this.world.step(dt);
};

function turnOffDamping(body){
  body.damping = body.angularDamping = 0;
}

module.exports = Game;