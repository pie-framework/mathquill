# jQuery Shim Migration – Code Review & Documentation

This document describes the changes made to the pie-framework mathquill fork to remove the jQuery dependency and use a minimal jQuery-compatible shim, enabling pie-elements and pie-lib to use math input without requiring jQuery.

---

## 1. Overview of Changes

### 1.1 Build & Package Configuration

| File | Change |
|------|--------|
| `package.json` | `main`, `module`, and `exports` point to `build/mathquill.esm.js`; jQuery moved to optional `peerDependencies` |
| `scripts/build-esm.js` | Skips P.js extension of `$` in tree.js (shim provides `insDirOf`/`insAtDirEnd`); prepends CSS import |
| `src/outro.esm.js` | Switched `getInterface(1)` to `getInterface(3)` for jQuery-free ESM interface |

### 1.2 jQuery Shim (`src/jquery-shim.js`)

A minimal jQuery-like API (~2–3KB vs jQuery’s ~30KB) that implements only the methods used by MathQuill.

### 1.3 MathQuill Core Fixes

| File | Change |
|------|--------|
| `src/cursor.js` | Defensive guards and graceful handling of edge cases |
| `src/services/mouse.js` | Fallback when `Node.byId` lookup fails |
| `src/tree.js` | Repair step in `prayWellFormed` for broken tree links |

---

## 2. Issues Encountered & Solutions

### 2.1 `replaceWith` Not Implemented

**Error:** `Cannot read properties of undefined (reading 'childNodes')` at `_.clear`  
**Location:** `cursor.js` – `this.jQ.replaceWith(this.jQ[0].childNodes)`

**Cause:** The shim did not implement `replaceWith`. The code replaces the selection wrapper with its child nodes.

**Solution:**
- Implemented `replaceWith` on `DOMCollection.prototype` to support DOMCollections, NodeLists (e.g. `childNodes`), and single nodes
- Added a guard in `_.clear` so `this.jQ[0]` is only used when it exists (avoids crash when selection is empty)

---

### 2.2 `filter` Not Implemented

**Error:** `self.jQ.contents().filter is not a function`  
**Location:** `commands/text.js` – `fuseChildren`

**Cause:** `contents()` returned a DOMCollection, but `filter` was not implemented.

**Solution:** Implemented `filter(fn)` on `DOMCollection.prototype` with jQuery-style callback `fn(index, element)`.

---

### 2.3 `width` / `height` Not Implemented

**Error:** `this.jQ.width is not a function`  
**Location:** `commands/text.js` – `_.seek` (positioning cursor in text block)

**Cause:** jQuery’s `width()` and `height()` were not in the shim.

**Solution:** Implemented `width()` and `height()` using `getComputedStyle` for content-box dimensions, with fallback to `getBoundingClientRect()`.

---

### 2.4 `:eq(n)` Pseudo-Selector Invalid

**Error:** `':scope > :eq(1)' is not a valid selector`  
**Location:** `jquery-shim.js` – `children()` passed to `querySelectorAll`

**Cause:** `:eq(n)` is jQuery-specific; native `querySelectorAll` does not support it.

**Solution:** In `children()`, added special handling for `:eq(n)`: parse the index and return the child at that position instead of using `querySelectorAll`.

---

### 2.5 `insertBefore` / `insertAfter` Target Undefined

**Error:** `Cannot read properties of undefined (reading 'parentNode')`  
**Location:** `jquery-shim.js` – `DOMCollection.insertBefore`

**Cause:** `this.jQ.insertBefore(this[R].jQ.first())` could receive an empty collection (e.g. after `$()`), so `first()` yielded `undefined`.

**Solution:** Added guards in `insertBefore` and `insertAfter` to return early when the target element is undefined.

---

### 2.6 `appendTo` / `prependTo` Parent Undefined

**Error:** `Cannot read properties of undefined (reading 'appendChild')`  
**Location:** `jquery-shim.js` – `DOMCollection.appendTo`  
**Call stack:** `insAtDirEnd` → `appendTo` → `seek`

**Cause:** Parent was sometimes an empty DOMCollection (e.g. `el.jQ` from `$()`).

**Solution:** Added guards in `appendTo` and `prependTo` to return early when the parent element is undefined.

---

### 2.7 Cursor and Anticursor in Different Trees

**Error:** `prayer failed: cursor and anticursor in the same tree`  
**Location:** `cursor.js` – `_.select`

**Cause:** Cross-field drag or multiple instances could cause the cursor and anticursor to be in different trees.

**Solution:** Replaced the `pray()` assertion with a check: if `lca` is undefined, return `false` instead of throwing.

---

### 2.8 Stale Node ID Lookup

**Error:** `prayer failed: nodeId is the id of some Node that exists`  
**Location:** `services/mouse.js` – `_.seek`

**Cause:** `Node.byId[nodeId]` could be undefined when the element had a mathquill ID from a destroyed/unmounted instance or after React re-renders.

**Solution:** Fall back to `this.root` when `nodeId` exists but `Node.byId[nodeId]` is undefined.

---

### 2.9 Anticursor Without `ancestors`

**Error:** `Cannot use 'in' operator to search for '239' in undefined`  
**Location:** `cursor.js` – `_.select` – `anticursor.ancestors`

**Cause:** TextBlock’s `seek` could replace the anticursor with `Point.copy(cursor)` or `Point(...)`, which do not set `ancestors`.

**Solution:** Added a guard at the start of `select()`: if `anticursor` or `anticursor.ancestors` is undefined, return `false`.

---

### 2.10 Selection Fragment Edge Cases

**Errors:**
- `prayer failed: no half-empty fragments` (Fragment init)
- `Cannot read properties of undefined (reading 'jQ')` at `_.insDirOf`

**Cause:** `selectChildren` could be called with undefined `leftEnd`/`rightEnd` when the selection boundary was empty; `insDirOf` could receive `undefined` for `el` or `el.jQ`.

**Solution:**
- Guard before `selectChildren`: if `!leftEnd || !rightEnd`, return `false`
- Guard in `insDirOf`: if `!el || !el.jQ`, return `this` (no-op)

---

### 2.11 Cursor Visible on All Editors

**Issue:** Multiple math editors showed cursors and focus at the same time.

**Cause:** `$(window)` was not supported and produced an empty collection, so `$(window).bind('blur', windowBlur)` and `$(window).unbind('blur', windowBlur)` in `focusBlur.js` had no effect. The blur handler was never attached correctly.

**Solution:**
- Added handling for `window` and `document` in the `$()` function so `$(window)` returns `[window]`
- Extended `unbind(event, handler)` to support removing a specific handler via `removeEventListener`
- Added `scrollLeft`/`scrollTop` support for `window` (using `pageXOffset`/`pageYOffset`)
- Added `load` event shorthand for `$(window).load(...)`

---

### 2.12 Tree Structure Corruption

**Error:** `prayer failed: leftward is properly set up`  
**Location:** `tree.js` – `prayWellFormed` (called from `adopt` and `disown`)

**Cause:** The doubly-linked tree could get out of sync when the shim returned early or during rapid updates.

**Solution:** Added a repair step in `prayWellFormed` before the checks:

- If `leftward[R] !== rightward`, set `leftward[R] = rightward`
- If `rightward[L] !== leftward`, set `rightward[L] = leftward`
- If `leftward.parent !== parent`, set `leftward.parent = parent`
- If `rightward.parent !== parent`, set `rightward.parent = parent`

---

## 3. jQuery Shim API Reference

### Methods Implemented

| Category | Methods |
|----------|---------|
| **Class** | `addClass`, `removeClass`, `toggleClass` (space-separated) |
| **DOM** | `append`, `prepend`, `appendTo`, `prependTo`, `insertBefore`, `insertAfter`, `wrapAll`, `replaceWith`, `detach`, `remove`, `empty`, `children`, `contents`, `find`, `closest`, `filter` |
| **Events** | `on`, `off`, `bind`, `unbind`, `trigger`, `focus`, `blur`, and shorthands: `mousemove`, `mouseup`, `mousedown`, `mouseover`, `mouseout`, `click`, `keydown`, `keypress`, `keyup`, `focusout`, `paste`, `cut`, `copy`, `input`, `load` |
| **Traversal** | `next`, `prev`, `parent`, `first`, `last`, `eq`, `add` |
| **Dimensions** | `offset`, `width`, `height`, `outerWidth`, `outerHeight`, `innerWidth`, `innerHeight`, `scrollTop`, `scrollLeft` |
| **Other** | `attr`, `html`, `text`, `val`, `css`, `get`, `each`, `is`, `index` |

### Special Handling

- **`$()`** – Supports: `undefined`, `window`, `document`, DOM nodes, React refs, HTML strings, CSS selectors, DOMCollections
- **`children(selector)`** – Supports: `:first`, `:last`, `:eq(n)` (jQuery pseudo-selectors not supported by `querySelectorAll`)
- **Event names** – Namespaces (e.g. `mousedown.mathquill`) are stripped by `eventName()` for `addEventListener`/`removeEventListener`

---

## 4. Code Review Notes

### 4.1 Strengths

1. **Minimal surface area** – Only methods used by MathQuill are implemented.
2. **Defensive guards** – Early returns avoid crashes when collections are empty or targets are undefined.
3. **Graceful degradation** – Selection and cursor operations return `false` instead of throwing in edge cases.
4. **Tree repair** – `prayWellFormed` repairs broken links before validation, improving robustness.

### 4.2 Potential Risks

1. **Silent no-ops** – Early returns (e.g. `insertBefore`, `appendTo`, `insDirOf`) may leave the cursor or DOM in an inconsistent state. The tree repair step mitigates some of this.
2. **No full jQuery audit** – Only methods that surfaced during testing are implemented; other jQuery usage may still exist.
3. **`eventName` scope** – `eventName` is a local function; `trigger` uses it correctly. Ensure it is not overwritten or shadowed.

### 4.3 Recommendations

1. **Testing** – Add tests for:
   - Multiple math editors on the same page
   - Rapid typing and switching focus
   - Mouse selection across editors
   - React re-mounts and cleanup
2. **Monitoring** – Watch for any remaining `pray` failures or unexpected behavior in production.
3. **Documentation** – Keep this document updated when new shim methods or fixes are added.

---

## 5. Build & Usage

```bash
# Build ESM bundle
npm run build:esm

# Local install in pie-lib
npm install ../mathquill
```

The ESM build outputs `build/mathquill.esm.js` (~233KB) and includes the CSS import.

---

## 6. Files Modified

| File | Lines Changed | Description |
|------|---------------|-------------|
| `src/jquery-shim.js` | +378 / -72 | jQuery shim implementation and extensions |
| `src/cursor.js` | +11 / -4 | Guards and graceful handling in selection/cursor |
| `src/tree.js` | +9 | Tree repair in `prayWellFormed` |
| `src/services/mouse.js` | +1 / -2 | Fallback for stale `Node.byId` lookup |
| `scripts/build-esm.js` | +14 / -1 | Skip P.js extension; prepend CSS import |
| `src/outro.esm.js` | +2 / -1 | Use jQuery-free interface (3) |
| `package.json` | — | ESM exports; optional jQuery peer |
| `Makefile` | — | Build script updates |

---

## 7. Changelog Summary

| Version | Date | Change |
|---------|------|--------|
| 1.2.0-beta.4 | — | jQuery shim migration; defensive guards; tree repair; focus/blur fixes |
