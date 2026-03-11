// ESM Build - export MathQuill as default export
// Use Interface 3 (jQuery-free) since ESM build includes the shim
var MQ1 = getInterface(3);
for (var key in MQ1) (function(key, val) {
  if (typeof val === 'function') {
    MathQuill[key] = function() {
      insistOnInterVer();
      return val.apply(this, arguments);
    };
    MathQuill[key].prototype = val.prototype;
  }
  else MathQuill[key] = val;
}(key, MQ1[key]));

// Export for ESM
export default MathQuill;
export { MathQuill };
