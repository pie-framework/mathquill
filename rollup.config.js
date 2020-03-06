/**
 * Test mathquill is working w/ rollup
 * @see ./test/demo-module.html
 */
const resolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const postcss = require("rollup-plugin-postcss");

module.exports = {
  input: "./build/index.js",
  output: {
    format: "esm",
    file: "./build/mq-bundle-test.js"
  },
  plugins: [resolve({ browser: true }), commonjs(), postcss()]
};
