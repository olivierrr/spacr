var lerp = require('lerp');

module.exports = lerpObject;

function lerpObject(a,b,scale,prop) {
  if(typeof a === 'number' && typeof b === 'number') {
    return lerp(a, b, scale);
  }
  prop = prop || {};
  for(var key in a) {
    if(a && b && typeof a[key] === 'number' && typeof b[key] === 'number') {
      prop[key] = lerp(a[key], b[key], scale);
    } else if (Array.isArray(a[key]) && Array.isArray(b[key])) {
      prop[key] = a[key].map(function(item, i) { return lerpObject(a[key][i], b[key][i], scale, []) });
    } else if (typeof a[key] === 'object' && typeof a[key] !== null && typeof b[key] === 'object' && typeof b[key] !== null) {
      lerpObject(a[key], b[key], scale, (prop[key] = {}));
    } else if (key && a && b && key in a && key in b) {
      prop[key] = b[key];
    }
  }
  return prop;
}