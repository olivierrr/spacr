var PIXI = require('pixi.js');
var fit = require('canvas-fit');
var mousewheel = require('mouse-wheel');
var clamp = require('clamp');
const {ENTITY_TYPES} = require('./constants');

function Renderer() {
  this.renderer = PIXI.autoDetectRenderer(window.innerWidth, window.innerHeight);
  this.stage = new PIXI.Container();
  this.zoom = 10;
  this.entities = {};

  var self = this;
  mousewheel(function (dx, dy) {
    self.zoom = ~~clamp(self.zoom + dy, 10, 1000);
  });

  // scoreboard
  var scoreboard = document.createElement('div');
  scoreboard.style.position = 'absolute';
  scoreboard.style.right = 0;
  scoreboard.style.top = 10;
  scoreboard.style.width = 200;
  scoreboard.style.color = 'white';
  scoreboard.style.zIndex = 5;
  document.body.appendChild(scoreboard);
  this.scoreboard = scoreboard;

  // attach to dom
  document.body.appendChild(this.renderer.view);
  var resizeView = fit(this.renderer.view);
  var self = this;
  window.addEventListener('resize', function(e) {
    resizeView();
    self.renderer.resize(self.renderer.view.width, self.renderer.view.height);
    self.stage.position.x = self.renderer.width / 2;
    self.stage.position.y = self.renderer.height / 2;
  });
  this.stage.position.x = this.renderer.width / 2;
  this.stage.position.y = this.renderer.height / 2;

  // render background grid
  var graphics = new PIXI.Graphics();
  var bw = 500;
  var bh = 500;
  var cellSize = 50;
  graphics.lineStyle(0.1, 0x457000, 1.0);
  for (var x = 0; x <= bw; x += cellSize) {
    graphics.moveTo(x, 0);
    graphics.lineTo(x, bh);
  }
  for (var x = 0; x <= bh; x += cellSize) {
    graphics.moveTo(0, x);
    graphics.lineTo(bw, x);
  }
  this.stage.addChild(graphics);
}

var proto = Renderer.prototype;

proto.render = function(worldState) {
  var self = this;

  if(!worldState || !worldState.entities) {
    console.warn('skipping frame');
    return;
  }

  var entityIdArr = Object.keys(worldState.entities);
  var graphicsIdArr = Object.keys(this.entities);
  for(var i = 0; i < graphicsIdArr.length; i++) {
    var graphicsId = graphicsIdArr[i];
    if(entityIdArr.indexOf(graphicsId) === -1) {
      this.stage.removeChild(this.entities[graphicsId]);
      delete this.entities[graphicsId];
    }
  }

  for(var id in worldState.entities) {
    var entity = worldState.entities[id];

    if (entity.type === ENTITY_TYPES.PLAYER) {
      if (!self.entities[entity.id]) {
        var container = new PIXI.Container();

        var graphics = new PIXI.Graphics();
        graphics.beginFill(entity.color);
        graphics.drawRect(-entity.width / 2, -entity.height / 2, entity.width, entity.height);

        var healthbar = new PIXI.Graphics();
        healthbar.beginFill('0xffffff');
        healthbar.drawRect(-entity.width / 2, -entity.height / 2, entity.width, 0.2);

        var health = new PIXI.Graphics();

        //var style = {
        //  font : '50px Arial',
        //  fill : '#F7EDCA'
        //};
        //var playerName = new PIXI.Text(entity.name, style);
        //playerName.position.x += 2.5;
        //playerName.position.y -= 2;
        //playerName.scale = new PIXI.Point(.3, -.03);

        container.HEALTHBAR = health;
        container.SHIP = graphics;
        container.HEALTHBAR_CONTAINER = healthbar;
        container.addChild(graphics);
        container.addChild(healthbar);
        container.addChild(health);
        self.stage.addChild(container);

        self.entities[entity.id] = container;
      }
      var me = self.entities[entity.id];

      me.position.x = entity.x;
      me.position.y = entity.y;
      me.rotation = entity.angle;

      me.HEALTHBAR.clear();
      me.HEALTHBAR.beginFill('0xff0000');
      me.HEALTHBAR.drawRect(-entity.width / 2, -entity.height / 2, entity.width - (entity.width * entity.health / 100), 0.2);

    } else if (entity.type === ENTITY_TYPES.PLANET) {
      if (!self.entities[entity.id]) {
        var graphics = new PIXI.Graphics();
        graphics.beginFill(0xd68442);
        graphics.drawCircle(-entity.width / 2, -entity.height / 2, entity.radius);
        self.stage.addChild(graphics);
        self.entities[entity.id] = graphics;
      }
      var me = self.entities[entity.id];
      me.position.x = entity.x;
      me.position.y = entity.y;
      me.rotation = entity.angle;
      me.radius = entity.radius;

    } else if (entity.type === ENTITY_TYPES.BULLET) {
      if (!self.entities[entity.id]) {
        var graphics = new PIXI.Graphics();
        graphics.beginFill(entity.color);
        graphics.drawRect(-entity.width / 2, -entity.height / 2, entity.width, entity.height);
        self.stage.addChild(graphics);
        self.entities[entity.id] = graphics;
      };
      var me = self.entities[entity.id];
      me.position.x = entity.x;
      me.position.y = entity.y;
      me.rotation = entity.angle;
      me.width = entity.width;
      me.height = entity.height;

    } else if (entity.type === ENTITY_TYPES.SPRING) {
      var randomId = Math.random();
      if (!self.entities[Math.random()]) {
        var graphics = new PIXI.Graphics();
        graphics.lineStyle(0.2, 0x457000, 1);
        graphics.moveTo(entity.ax, entity.ay);
        graphics.lineTo(entity.bx, entity.by);
        self.stage.addChild(graphics);
        self.entities[randomId] = graphics;
      };
    }
  };

  if(worldState && worldState.entities && worldState.focus && worldState.entities[worldState.focus]) {
    var focus = worldState.entities[worldState.focus];
    this.stage.position.x = (focus.x * -this.zoom) + (this.renderer.width / 2);
    this.stage.position.y = (focus.y * this.zoom) + (this.renderer.height / 2);
  }
  this.stage.scale.x = this.zoom;
  this.stage.scale.y = -this.zoom;

  this.renderer.render(this.stage);

  //scoreboard
  var players = [];
  for(var id in worldState.entities) {
    var entity = worldState.entities[id];
    if(entity.type === ENTITY_TYPES.PLAYER) {
      players.push(entity);
    }
  }
  players = players.sort(function(p1, p2) {
    return p2.points - p1.points;
  }).map(function(p) {
    return '<span style="color:' + p.color.replace('0x', '#') + '"><b>' + p.points + '</b> ' + p.name + '</span>';
  });
  this.scoreboard.innerHTML = players.join('<br>');
};

module.exports = Renderer;