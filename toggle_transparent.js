// toggle_transparent.js
//
// Toggles `color: transparent` on whatever text is currently selected
// inside Anki's note editor. Injected and run on demand (button click or
// shortcut) via editor.web.evalWithCallback() - see __init__.py.
//
//   - If the selection sits entirely inside a span this add-on made,
//     that span is removed and the text becomes visible again.
//   - Otherwise, the selection is wrapped in a new
//     <span style="color: transparent;"> element.
//
// Anki's editor fields are <anki-editable> custom elements rendered
// inside shadow DOM, so document.getSelection() at the top of the page
// will not see into them. We first walk down through shadowRoot.activeElement
// to find the element that is really focused, then ask that element's own
// root (its shadow root) for the selection.
//
// The whole thing is one expression - (function () { ... })() - so its
// return value becomes the result Python's evalWithCallback() receives.
// __init__.py uses that to show a tooltip on every outcome that isn't a
// visible change (no field focused, nothing selected, or an unexpected
// error) instead of failing silently. The entire body runs inside a
// try/catch for that last case: if anything here throws for a reason
// this file's author didn't anticipate, the error is reported back
// instead of vanishing into the QtWebEngine void.
//
// DEBUG_BUILD: the "no-field"/"no-selection" outcomes currently carry
// extra bracketed diagnostic detail because prior fixes did not
// resolve a reported selection-detection failure. CONFIRMED CAUSE (see
// the "no selection" check below): selection.isCollapsed can report
// true for a real, non-empty selection when the focused field sits in
// a shadow root, even though toString() correctly returns the
// selected text in that same case - so the emptiness check no longer
// uses isCollapsed at all. This diagnostic wrapper is kept for one
// more round to confirm the fix in the wild; trim back to the plain
// "no-field"/"no-selection" strings once confirmed.
var DEBUG_VERSION = "debug-6";

(function () {
    "use strict";

    try {
        // Matches a style attribute containing "color: transparent" with any
        // spacing, regardless of what other declarations sit next to it, but
        // NOT "background-color: transparent" (the (^|;) anchor rules that out).
        var TRANSPARENT_RE = /(^|;)\s*color\s*:\s*transparent\s*(;|$)/i;

        // --- 1. Find the element that is really focused, through shadow DOM ---
        var getDeepActiveElement = function () {
            var el = document.activeElement;
            while (el && el.shadowRoot && el.shadowRoot.activeElement) {
                el = el.shadowRoot.activeElement;
            }
            return el;
        };

        var field = getDeepActiveElement();
        if (!field || !field.isContentEditable) {
            var activeTag = document.activeElement ? document.activeElement.tagName : "none";
            var deepTag = field ? field.tagName : "none";
            return (
                "no-field [" + DEBUG_VERSION +
                "; docActiveElement=" + activeTag +
                ", deepActiveElement=" + deepTag +
                "]"
            );
        }

        // --- 2. Get the Selection scoped to that field's own (shadow) root ----
        var root = field.getRootNode();
        var rootIsDocument = root === document;
        var shadowGetSelectionFn = root && typeof root.getSelection === "function";
        var shadowSelection = shadowGetSelectionFn ? root.getSelection() : null;
        var windowSelection = window.getSelection();
        var selection = shadowSelection || windowSelection;

        if (!selection || selection.rangeCount === 0) {
            return (
                "no-selection [" + DEBUG_VERSION +
                "; fieldTag=" + field.tagName +
                ", rootIsDocument=" + rootIsDocument +
                ", shadowGetSelectionFn=" + shadowGetSelectionFn +
                ", reason=rangeCount0" +
                "]"
            );
        }

        var range = selection.getRangeAt(0);

        // NOTE: selection.isCollapsed/range.collapsed are NOT used here.
        // Confirmed in the wild: for a selection whose focused field sits
        // inside a shadow root, isCollapsed can report true even though a
        // real, non-empty selection exists - toString() still returns the
        // correct selected text in that same case. So "is anything
        // selected" is decided from the range's actual text content
        // instead of trusting that boolean.
        if (range.toString().length === 0) {
            return (
                "no-selection [" + DEBUG_VERSION +
                "; fieldTag=" + field.tagName +
                ", rootIsDocument=" + rootIsDocument +
                ", shadowGetSelectionFn=" + shadowGetSelectionFn +
                ", reason=emptyRangeText" +
                ", isCollapsed=" + selection.isCollapsed +
                "]"
            );
        }

        // --- 3. Helpers for finding/making our transparent span ---------------
        var isOwnSpan = function (node) {
            return (
                !!node &&
                node.nodeType === Node.ELEMENT_NODE &&
                node.tagName === "SPAN" &&
                TRANSPARENT_RE.test(node.getAttribute("style") || "")
            );
        };

        var findOwnSpan = function (node) {
            while (node && node !== field) {
                if (isOwnSpan(node)) {
                    return node;
                }
                node = node.parentNode;
            }
            return null;
        };

        var startSpan = findOwnSpan(range.startContainer);
        var endSpan = findOwnSpan(range.endContainer);
        var outcome;

        if (startSpan && startSpan === endSpan) {
            // --- 4a. TOGGLE OFF -------------------------------------------
            // Selection is entirely inside one of our spans: unwrap it by
            // moving its children out and dropping the (now empty) span.
            var parent = startSpan.parentNode;
            var firstChild = startSpan.firstChild;
            var lastChild = startSpan.lastChild;
            while (startSpan.firstChild) {
                parent.insertBefore(startSpan.firstChild, startSpan);
            }
            parent.removeChild(startSpan);

            // Re-select the text that just became visible again, so the
            // button/shortcut can be pressed a second time immediately.
            if (firstChild && lastChild) {
                var restored = document.createRange();
                restored.setStartBefore(firstChild);
                restored.setEndAfter(lastChild);
                selection.removeAllRanges();
                selection.addRange(restored);
            }
            outcome = "shown";
        } else {
            // --- 4b. TOGGLE ON ---------------------------------------------
            // Wrap the current selection in a new transparent span.
            var span = document.createElement("span");
            span.setAttribute("style", "color: transparent;");
            span.appendChild(range.extractContents());
            range.insertNode(span);

            // Re-select the now-hidden text.
            var wrapped = document.createRange();
            wrapped.selectNodeContents(span);
            selection.removeAllRanges();
            selection.addRange(wrapped);
            outcome = "hidden";
        }

        // --- 5. Tell Anki the field changed, so it saves + reindexes search ---
        field.dispatchEvent(new Event("input", { bubbles: true, composed: true }));

        return outcome;
    } catch (err) {
        return "error [" + DEBUG_VERSION + "]: " + (err && err.message ? err.message : String(err));
    }
})();
