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
  var classes = (className || '').split(/\s+/).filter(Boolean);
  this.elements.forEach(function(el) {
    classes.forEach(function(c) { el.classList.add(c); });
  });
  return this;
};

DOMCollection.prototype.removeClass = function(className) {
  this.elements.forEach(function(el) {
    if (!className) {
      el.className = '';
    } else {
      (className || '').split(/\s+/).filter(Boolean).forEach(function(c) {
        el.classList.remove(c);
      });
    }
  });
  return this;
};

// jQuery: .toggleClass(name) flips; .toggleClass(name, state) forces on/off.
// MathQuill relies on the two-arg form in Letter.italicize (mq-operator-name)
// and elsewhere; ignoring `state` broke operator vs variable styling (ESM build).
DOMCollection.prototype.toggleClass = function(className, state) {
  var classes = (className || '').split(/\s+/).filter(Boolean);
  var force = arguments.length > 1 ? !!state : null;
  this.elements.forEach(function(el) {
    classes.forEach(function(c) {
      if (force === null) {
        el.classList.toggle(c);
      } else {
        el.classList.toggle(c, force);
      }
    });
  });
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

DOMCollection.prototype.prepend = function(child) {
  var childEl = child instanceof DOMCollection ? child.elements[0] : child;
  this.elements.forEach(function(el, i) {
    var toInsert = i === 0 ? childEl : childEl.cloneNode(true);
    el.insertBefore(toInsert, el.firstChild);
  });
  return this;
};

DOMCollection.prototype.wrapAll = function(wrapper) {
  if (!this.elements.length) return this;
  var wrapperEl;
  if (typeof wrapper === 'string' && wrapper.trim().indexOf('<') === 0) {
    var temp = document.createElement('div');
    temp.innerHTML = wrapper.trim();
    wrapperEl = temp.firstChild;
  } else if (wrapper instanceof DOMCollection) {
    wrapperEl = wrapper.elements[0];
  } else if (wrapper && wrapper.nodeType) {
    wrapperEl = wrapper;
  } else {
    return this;
  }
  var first = this.elements[0];
  var parent = first.parentNode;
  if (parent) {
    parent.insertBefore(wrapperEl, first);
    this.elements.forEach(function(el) {
      wrapperEl.appendChild(el);
    });
  }
  return this;
};

DOMCollection.prototype.appendTo = function(parent) {
  var parentEl = parent instanceof DOMCollection ? parent.elements[0] : parent;
  if (!parentEl) return this;
  this.elements.forEach(function(el) { parentEl.appendChild(el); });
  return this;
};

DOMCollection.prototype.prependTo = function(parent) {
  var parentEl = parent instanceof DOMCollection ? parent.elements[0] : parent;
  if (!parentEl) return this;
  var firstChild = parentEl.firstChild;
  this.elements.forEach(function(el) {
    parentEl.insertBefore(el, firstChild);
    firstChild = el;
  });
  return this;
};

DOMCollection.prototype.insertBefore = function(target) {
  var targetEl = target instanceof DOMCollection ? target.elements[0] : target;
  if (!targetEl) return this;
  var parent = targetEl.parentNode;
  if (parent) {
    this.elements.forEach(function(el) { parent.insertBefore(el, targetEl); });
  }
  return this;
};

DOMCollection.prototype.insertAfter = function(target) {
  var targetEl = target instanceof DOMCollection ? target.elements[0] : target;
  if (!targetEl) return this;
  var parent = targetEl.parentNode;
  var next = targetEl.nextSibling;
  if (parent) {
    this.elements.forEach(function(el) {
      parent.insertBefore(el, next);
      next = el;
    });
  }
  return this;
};

DOMCollection.prototype.replaceWith = function(newContent) {
  var nodes = [];
  if (newContent instanceof DOMCollection) {
    nodes = newContent.elements.slice();
  } else if (newContent && typeof newContent.length === 'number' && !newContent.tagName) {
    nodes = Array.from(newContent);
  } else if (newContent && newContent.nodeType) {
    nodes = [newContent];
  }
  this.elements.forEach(function(el) {
    var parent = el.parentNode;
    if (parent) {
      nodes.forEach(function(node) {
        parent.insertBefore(node, el);
      });
      parent.removeChild(el);
    }
  });
  return this;
};

// MathQuill tree.js extends $ with these - add directly to avoid P.js complexity
DOMCollection.prototype.insDirOf = function(dir, el) {
  var L = -1, R = 1;
  return dir === L ?
    this.insertBefore(el.first()) : this.insertAfter(el.last());
};
DOMCollection.prototype.insAtDirEnd = function(dir, el) {
  var L = -1, R = 1;
  return dir === L ? this.prependTo(el) : this.appendTo(el);
};

DOMCollection.prototype.children = function(selector) {
  var children = [];
  this.elements.forEach(function(el) {
    var elChildren;
    if (!selector) {
      elChildren = Array.from(el.children);
    } else if (selector === ':first') {
      elChildren = el.firstElementChild ? [el.firstElementChild] : [];
    } else if (selector === ':last') {
      elChildren = el.lastElementChild ? [el.lastElementChild] : [];
    } else {
      var eqMatch = /^:eq\((\d+)\)$/.exec(selector);
      if (eqMatch) {
        var idx = parseInt(eqMatch[1], 10);
        var all = Array.from(el.children);
        elChildren = all[idx] ? [all[idx]] : [];
      } else {
        elChildren = Array.from(el.querySelectorAll(':scope > ' + selector));
      }
    }
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

DOMCollection.prototype.filter = function(fn) {
  var filtered = this.elements.filter(function(el, i) {
    return fn(i, el);
  });
  return new DOMCollection(filtered);
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

// Event handling - strip jQuery namespace (e.g. 'mousedown.mathquill' -> 'mousedown')
function eventName(evt) {
  return (evt || '').split('.')[0];
}

DOMCollection.prototype.on = function(event, handler) {
  var name = eventName(event);
  this.elements.forEach(function(el) { el.addEventListener(name, handler); });
  return this;
};

DOMCollection.prototype.bind = function(event, dataOrHandler, handler) {
  var self = this;
  if (typeof event === 'object') {
    // bind({ keydown: fn, keypress: fn, ... })
    for (var evt in event) {
      if (event.hasOwnProperty(evt)) {
        self.bind(evt, event[evt]);
      }
    }
    return this;
  }
  var h = typeof dataOrHandler === 'function' ? dataOrHandler : handler;
  if (h === false) {
    h = function(e) { e.preventDefault(); };
  }
  var events = (event || '').split(/\s+/).filter(Boolean);
  events.forEach(function(evt) {
    var name = eventName(evt);
    self.elements.forEach(function(el) {
      el.addEventListener(name, h);
    });
  });
  return this;
};

DOMCollection.prototype.off = function(event, handler) {
  var name = eventName(event);
  this.elements.forEach(function(el) { el.removeEventListener(name, handler); });
  return this;
};

DOMCollection.prototype.unbind = function(event, handler) {
  // Namespaced events (e.g. '.mathquill') - clone to remove all listeners
  if (event && event.includes('.')) {
    this.elements.forEach(function(el) {
      var clone = el.cloneNode(true);
      if (el.parentNode) el.parentNode.replaceChild(clone, el);
    });
  } else if (event && handler) {
    var name = eventName(event);
    this.elements.forEach(function(el) { el.removeEventListener(name, handler); });
  }
  return this;
};

DOMCollection.prototype.trigger = function(evtName) {
  var evt = new Event(eventName(evtName), { bubbles: true, cancelable: true });
  this.elements.forEach(function(el) { el.dispatchEvent(evt); });
  return this;
};

DOMCollection.prototype.focus = function(handler) {
  if (typeof handler === 'function') {
    return this.on('focus', handler);
  }
  this.elements.forEach(function(el) { if (el.focus) el.focus(); });
  return this;
};

DOMCollection.prototype.blur = function(handler) {
  if (typeof handler === 'function') {
    return this.on('blur', handler);
  }
  this.elements.forEach(function(el) { if (el.blur) el.blur(); });
  return this;
};

// jQuery event shorthand methods (e.g. .mousemove(fn) -> .on('mousemove', fn))
['mousemove', 'mouseup', 'mousedown', 'mouseover', 'mouseout', 'click', 'keydown', 'keypress', 'keyup', 'focusout', 'paste', 'cut', 'copy', 'input', 'load'].forEach(function(evt) {
  DOMCollection.prototype[evt] = function(handler) {
    return this.on(evt, handler);
  };
});

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
    top: rect.top + (window.pageYOffset || document.documentElement.scrollTop),
    left: rect.left + (window.pageXOffset || document.documentElement.scrollLeft)
  };
};

DOMCollection.prototype.width = function() {
  var el = this.elements[0];
  if (!el) return 0;
  var cs = window.getComputedStyle(el);
  return parseFloat(cs.width) || el.getBoundingClientRect().width;
};

DOMCollection.prototype.height = function() {
  var el = this.elements[0];
  if (!el) return 0;
  var cs = window.getComputedStyle(el);
  return parseFloat(cs.height) || el.getBoundingClientRect().height;
};

DOMCollection.prototype.outerWidth = function() {
  return this.elements[0] ? this.elements[0].offsetWidth : 0;
};

DOMCollection.prototype.outerHeight = function() {
  return this.elements[0] ? this.elements[0].offsetHeight : 0;
};

DOMCollection.prototype.innerWidth = function() {
  return this.elements[0] ? this.elements[0].clientWidth : 0;
};

DOMCollection.prototype.innerHeight = function() {
  return this.elements[0] ? this.elements[0].clientHeight : 0;
};

DOMCollection.prototype.css = function(prop, value) {
  if (value === undefined) {
    if (typeof prop === 'string') {
      var el = this.elements[0];
      return el ? window.getComputedStyle(el).getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase()) : undefined;
    }
  } else {
    this.elements.forEach(function(el) {
      el.style[prop] = value;
    });
  }
  return this;
};

DOMCollection.prototype.scrollTop = function(value) {
  var el = this.elements[0];
  if (value === undefined) {
    return el ? (el === window ? (window.pageYOffset || document.documentElement.scrollTop) : el.scrollTop) : 0;
  }
  if (el === window) window.scrollTo(window.pageXOffset || 0, value);
  else this.elements.forEach(function(e) { e.scrollTop = value; });
  return this;
};

DOMCollection.prototype.scrollLeft = function(value) {
  var el = this.elements[0];
  if (value === undefined) {
    return el ? (el === window ? (window.pageXOffset || document.documentElement.scrollLeft) : el.scrollLeft) : 0;
  }
  if (el === window) window.scrollTo(value, window.pageYOffset || 0);
  else this.elements.forEach(function(e) { e.scrollLeft = value; });
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

DOMCollection.prototype.get = function(index) {
  if (index === undefined) return this.elements;
  return index < 0 ? this.elements[this.elements.length + index] : this.elements[index];
};

DOMCollection.prototype.add = function(other) {
  var combined = this.elements.slice();
  if (other instanceof DOMCollection) {
    combined.push.apply(combined, other.elements);
  } else if (Array.isArray(other)) {
    // Fragment() accumulates raw elements then does this.jQ.add(accum); jQuery accepts
    // an array of nodes. Without this branch, LiveFraction (/) never moves the wrapped
    // operand into the numerator in the DOM.
    combined.push.apply(combined, other);
  } else if (other && other.nodeType) {
    combined.push(other);
  }
  return new DOMCollection(combined);
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

DOMCollection.prototype.val = function(value) {
  var el = this.elements[0];
  if (!el) return undefined;
  if (value === undefined) {
    return el.value !== undefined ? el.value : el.textContent;
  }
  this.elements.forEach(function(e) {
    if (e.value !== undefined) e.value = value;
    else e.textContent = value;
  });
  return this;
};

// Main jQuery function - use var (not function decl) so esbuild-loader
// won't create a conflicting declaration when tree.js does $ = P(jQuery,...)
function createCollection(elements) {
  var arr = Array.isArray(elements) ? elements : [elements].filter(Boolean);
  var coll = Object.create(DOMCollection.prototype);
  coll.elements = arr;
  coll.length = arr.length;
  for (var i = 0; i < arr.length; i++) coll[i] = arr[i];
  return coll;
}

var $ = function(selector, context) {
  var elements;

  if (!selector) {
    elements = [];
  } else if (selector === window || selector === document) {
    elements = [selector];
  } else if (selector.nodeType) {
    elements = [selector];
  } else if (selector && selector.current && selector.current.nodeType) {
    // React ref object
    elements = [selector.current];
  } else if (typeof selector === 'string' && selector[0] === '<') {
    var temp = document.createElement('div');
    temp.innerHTML = selector.trim();
    elements = Array.from(temp.children);
  } else if (typeof selector === 'string') {
    var root = context instanceof DOMCollection ? context.elements[0] : (context || document);
    elements = Array.from(root.querySelectorAll(selector));
  } else if (selector instanceof DOMCollection) {
    elements = selector.elements;
  } else if (selector.length !== undefined) {
    elements = Array.from(selector);
  } else {
    elements = [];
  }

  return createCollection(elements);
};

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
