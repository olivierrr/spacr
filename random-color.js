var COLORS = ['0x2ecc71', '0x3498db', '0x9b59b6', '0x1abc9c', '0xe67e22',
  '0xD24D57', '0x674172', '0xD2527F', '0xBE90D4', '0x4183D7', '0x336E7B',
  '0x2574A9', '0x26A65B', '0x1BA39C', '0x4DAF7C', '0xF2784B', '0xF5AB35']

module.exports = function () {
  return COLORS[~~(Math.random()*COLORS.length)]
}