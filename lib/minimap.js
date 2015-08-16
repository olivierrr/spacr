const {ENTITY_TYPES} = require('./constants');
var clamp = require('clamp');

function Minimap() {
  this.ctx = document.createElement('canvas').getContext('2d');
  this.ctx.canvas.width = 200;
  this.ctx.canvas.height = 200;
  document.body.appendChild(this.ctx.canvas);
  this.ctx.canvas.style.position = 'absolute';
  this.ctx.canvas.style.zIndex = 5;
  this.ctx.canvas.style.opacity = 0.5;
  this.ctx.canvas.style.border = '1px solid white';;

  this.ctx.canvas.addEventListener('mouseover', e  => {
    this.ctx.canvas.style.opacity = 1.0;
    this.ctx.canvas.width = 400;
    this.ctx.canvas.height = 400;
  });

  this.ctx.canvas.addEventListener('mouseout', e => {
    this.ctx.canvas.style.opacity = 0.5;
    this.ctx.canvas.width = 200;
    this.ctx.canvas.height = 200;
  });
}

var proto = Minimap.prototype;

proto.render = function(worldState) {
  var ctx = this.ctx;

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for(var id in worldState.entities) {
    var entity = worldState.entities[id];

    if(entity.type === ENTITY_TYPES.BULLET || entity.type === ENTITY_TYPES.PLAYER) {
      var minSize = entity.type === ENTITY_TYPES.PLAYER ? 5 : 2;
      ctx.fillStyle = entity.color.replace('0x', '#');
      var scale = worldState.width / this.ctx.canvas.width;
      var clampedWidth = clamp(Math.ceil(entity.width / scale), minSize, Infinity);
      var clampedHeight = clamp(Math.ceil(entity.height / scale), minSize, Infinity);
      ctx.fillRect(
        Math.round(entity.x / scale) - (clampedWidth / 2),
        ctx.canvas.height - Math.round(entity.y / scale) - (clampedWidth / 2),
        clampedWidth,
        clampedHeight
      );
    } else if(entity.type === ENTITY_TYPES.PLANET) {
      var minSize = 5;
      ctx.fillStyle = '#d68442';
      var scale = worldState.width / ctx.canvas.width;
      ctx.beginPath();
      ctx.arc(
        Math.round(entity.x / scale),
        ctx.canvas.height - Math.round(entity.y / scale),
        clamp(entity.radius / scale, minSize, Infinity),
        0,
        2 * Math.PI, 2,
        false
      );
      ctx.fill();
    } else if(entity.type === ENTITY_TYPES.SPRING) {
      ctx.beginPath();
      ctx.strokeStyle = '#d68442';
      var scale = worldState.width / ctx.canvas.width;
      ctx.moveTo(entity.ax / scale, ctx.canvas.height - entity.ay / scale);
      ctx.lineTo(entity.bx / scale, ctx.canvas.height - entity.by / scale);
      ctx.stroke();
    }
  }
}

module.exports = Minimap;