const jQuery = require("jquery");
if (typeof window !== "undefined" && !window.jQuery) {
  window.jQuery = jQuery;
}
module.exports = jQuery;
