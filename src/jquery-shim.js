/**
 * Minimal jQuery Shim for MathQuill
 * Only implements methods actually used by MathQuill
 * ~2KB vs jQuery's 30KB+
 * ES5 compatible - no modern syntax
 */

function DOMCollection(elements) {
  this.elements = Array.isArray(elements) ? elements : [elements].filter(Boolean);
  this.length = this.elements.length;

  // Make it array-like
  for (var i = 0; i < this.elements.length; i++) {
    this[i] = this.elements[i];
  }
}

// Core DOM methods
DOMCollection.prototype.addClass = function(className) {
  this.elements.forEach(function(el) { el.classList.add(className); });
  return this;
};

DOMCollection.prototype.removeClass = function(className) {
  this.elements.forEach(function(el) { el.classList.remove(className); });
  return this;
};

DOMCollection.prototype.attr = function(name, value) {
  if (value === undefined) {
    return this.elements[0] ? this.elements[0].getAttribute(name) : undefined;
  }
  this.elements.forEach(function(el) { el.setAttribute(name, value); });
  return this;
};

DOMCollection.prototype.html = function(content) {
  if (content === undefined) {
    return this.elements[0] ? this.elements[0].innerHTML : '';
  }
  this.elements.forEach(function(el) { el.innerHTML = content; });
  return this;
};

DOMCollection.prototype.append = function(child) {
  var childEl = child instanceof DOMCollection ? child.elements[0] : child;
  this.elements.forEach(function(el) { el.appendChild(childEl); });
  return this;
};

DOMCollection.prototype.appendTo = function(parent) {
  var parentEl = parent instanceof DOMCollection ? parent.elements[0] : parent;
  var self = this;
  this.elements.forEach(function(el) { parentEl.appendChild(el); });
  return this;
};

DOMCollection.prototype.children = function(selector) {
  var children = [];
  this.elements.forEach(function(el) {
    var elChildren = selector
      ? Array.from(el.querySelectorAll(':scope > ' + selector))
      : Array.from(el.children);
    children.push.apply(children, elChildren);
  });
  return new DOMCollection(children);
};

DOMCollection.prototype.find = function(selector) {
  var found = [];
  this.elements.forEach(function(el) {
    var results = Array.from(el.querySelectorAll(selector));
    found.push.apply(found, results);
  });
  return new DOMCollection(found);
};

DOMCollection.prototype.closest = function(selector) {
  var results = this.elements.map(function(el) {
    return el.closest(selector);
  }).filter(Boolean);
  return new DOMCollection(results);
};

DOMCollection.prototype.contents = function() {
  var nodes = [];
  this.elements.forEach(function(el) {
    var childNodes = Array.from(el.childNodes);
    nodes.push.apply(nodes, childNodes);
  });
  return new DOMCollection(nodes);
};

DOMCollection.prototype.detach = function() {
  this.elements.forEach(function(el) {
    if (el.parentNode) el.parentNode.removeChild(el);
  });
  return this;
};

DOMCollection.prototype.remove = function() {
  this.elements.forEach(function(el) { el.remove(); });
  return this;
};

DOMCollection.prototype.empty = function() {
  this.elements.forEach(function(el) { el.innerHTML = ''; });
  return this;
};

// Event handling
DOMCollection.prototype.on = function(event, handler) {
  this.elements.forEach(function(el) { el.addEventListener(event, handler); });
  return this;
};

DOMCollection.prototype.off = function(event, handler) {
  this.elements.forEach(function(el) { el.removeEventListener(event, handler); });
  return this;
};

DOMCollection.prototype.unbind = function(event) {
  // For backwards compat - removes all listeners for event
  if (event && event.includes('.')) {
    var eventName = event.split('.')[0];
    this.elements.forEach(function(el) {
      var clone = el.cloneNode(true);
      if (el.parentNode) el.parentNode.replaceChild(clone, el);
    });
  }
  return this;
};

DOMCollection.prototype.trigger = function(eventName) {
  var event = new Event(eventName, { bubbles: true, cancelable: true });
  this.elements.forEach(function(el) { el.dispatchEvent(event); });
  return this;
};

// Traversal
DOMCollection.prototype.next = function(selector) {
  var nexts = this.elements
    .map(function(el) { return el.nextElementSibling; })
    .filter(function(el) { return !selector || (el && el.matches(selector)); });
  return new DOMCollection(nexts);
};

DOMCollection.prototype.prev = function(selector) {
  var prevs = this.elements
    .map(function(el) { return el.previousElementSibling; })
    .filter(function(el) { return !selector || (el && el.matches(selector)); });
  return new DOMCollection(prevs);
};

DOMCollection.prototype.parent = function() {
  var parents = this.elements.map(function(el) { return el.parentElement; }).filter(Boolean);
  return new DOMCollection(parents);
};

// Position/Dimensions
DOMCollection.prototype.offset = function() {
  if (!this.elements[0]) return { top: 0, left: 0 };
  var rect = this.elements[0].getBoundingClientRect();
  return {
    top: rect.top + window.pageYOffset,
    left: rect.left + window.pageXOffset
  };
};

DOMCollection.prototype.scrollTop = function(value) {
  if (value === undefined) {
    return this.elements[0] ? this.elements[0].scrollTop : 0;
  }
  this.elements.forEach(function(el) { el.scrollTop = value; });
  return this;
};

DOMCollection.prototype.scrollLeft = function(value) {
  if (value === undefined) {
    return this.elements[0] ? this.elements[0].scrollLeft : 0;
  }
  this.elements.forEach(function(el) { el.scrollLeft = value; });
  return this;
};

// Utilities
DOMCollection.prototype.each = function(callback) {
  this.elements.forEach(function(el, i) { callback.call(el, i, el); });
  return this;
};

DOMCollection.prototype.eq = function(index) {
  return new DOMCollection([this.elements[index]]);
};

DOMCollection.prototype.first = function() {
  return new DOMCollection([this.elements[0]]);
};

DOMCollection.prototype.last = function() {
  return new DOMCollection([this.elements[this.elements.length - 1]]);
};

DOMCollection.prototype.index = function(elem) {
  if (!elem) {
    var parent = this.elements[0] && this.elements[0].parentElement;
    return parent ? Array.from(parent.children).indexOf(this.elements[0]) : -1;
  }
  var el = elem instanceof DOMCollection ? elem.elements[0] : elem;
  return this.elements.indexOf(el);
};

DOMCollection.prototype.is = function(selector) {
  return this.elements.some(function(el) { return el.matches(selector); });
};

DOMCollection.prototype.text = function(content) {
  if (content === undefined) {
    return this.elements.map(function(el) { return el.textContent; }).join('');
  }
  this.elements.forEach(function(el) { el.textContent = content; });
  return this;
};

// Main jQuery function
function $(selector, context) {
  if (!selector) {
    return new DOMCollection([]);
  }

  // Already a DOM element
  if (selector.nodeType) {
    return new DOMCollection([selector]);
  }

  // HTML string
  if (typeof selector === 'string' && selector[0] === '<') {
    var temp = document.createElement('div');
    temp.innerHTML = selector.trim();
    return new DOMCollection(Array.from(temp.children));
  }

  // Selector string
  if (typeof selector === 'string') {
    var root = context instanceof DOMCollection ? context.elements[0] : (context || document);
    var elements = Array.from(root.querySelectorAll(selector));
    return new DOMCollection(elements);
  }

  // DOMCollection
  if (selector instanceof DOMCollection) {
    return selector;
  }

  // Array-like
  if (selector.length !== undefined) {
    return new DOMCollection(Array.from(selector));
  }

  return new DOMCollection([]);
}

// Static methods used by MathQuill
$.contains = function(container, contained) {
  return container !== contained && container.contains(contained);
};

// Export for ESM
if (typeof module !== 'undefined' && module.exports) {
  module.exports = $;
  module.exports.default = $;
}
if (typeof exports !== 'undefined') {
  exports.default = $;
  exports.$ = $;
}
