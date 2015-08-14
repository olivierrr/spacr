
function Statusbar(socket) {
  this.socket = socket;

  this.div = document.createElement('div');
  this.div.style.position = 'absolute';
  this.div.style.left = 0;
  this.div.style.bottom = 0;
  this.div.style.color = 'white';
  document.body.appendChild(this.div);

  this.latestPing = 0;
  this.latestServerStep = 0;
  this.latestRenderStep = 0;
  this.latestTargetDelay = 0;

  socket.on('connect', () => {
    this.latestPing = 0;
    this.render();
  });

  socket.on('disconnect', () => {
    this.latestPing = 0;
    this.render();
  });

  socket.on('step',(worldState) => {
    this.latestPing = Date.now() - worldState.timestamp;
    this.latestServerStep = worldState.delta;
    this.render();
  });
}

var proto = Statusbar.prototype;

proto.render = function() {
  this.div.innerHTML = '[server status: ' + (this.socket.connected ? 'ONLINE' : 'OFFLINE') + '] [ping: ' + this.latestPing + '] [server step: ' + this.latestServerStep + '] [render step: ' + this.latestRenderStep + '] [target delay: ' + this.latestTargetDelay + ']';
};

proto.setLatestRenderStep = function(num) {
  this.latestRenderStep = ~~num;
  this.render();
};

proto.setTargetDelay = function(num) {
  this.latestTargetDelay = ~~num;
  this.render();
}

module.exports = Statusbar;