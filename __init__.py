from __future__ import annotations

# Created by Adel Aitah
# GitHub: https://github.com/Doummar/Transparent_Text
# Copyright (c) 2026 Adel Aitah — All rights reserved

"""
Transparent Text
================

A minimal Anki editor add-on that toggles ``color: transparent`` on the
current text selection.

Created by Adel Aitah
GitHub: https://github.com/Doummar/Transparent_Text
"""

ADDON_NAME = "Transparent Text"
ADDON_AUTHOR = "Adel Aitah"
ADDON_VERSION = "1.0.0"
ADDON_URL = "https://github.com/Doummar/Transparent_Text"

import os

from aqt import gui_hooks
from aqt.editor import Editor
from aqt.qt import QKeySequence, QShortcut
from aqt.utils import tooltip

# --------------------------------------------------------------------------
# Configuration
#
# This is the add-on's one setting. There is no settings dialog by
# design (see README) - to use a different shortcut, edit the string
# below and restart Anki. Anki's own QKeySequence syntax applies, e.g.
# "Ctrl+Shift+T", "Alt+H", "Meta+H" (macOS Cmd).
# --------------------------------------------------------------------------
SHORTCUT = "Ctrl+Shift+T"

_ADDON_DIR = os.path.dirname(__file__)
_ICON_PATH = os.path.join(_ADDON_DIR, "icons", "eye_off.svg")
_JS_PATH = os.path.join(_ADDON_DIR, "toggle_transparent.js")

# The button and the shortcut both run this script inside the editor's
# web page. It is read once at start-up and reused on every trigger, so
# no file I/O happens while the user is typing.
with open(_JS_PATH, encoding="utf-8") as _js_file:
    _TOGGLE_JS = _js_file.read()


def _on_toggle_result(result: str | None) -> None:
    """Show a tooltip for every outcome except a successful toggle.

    toggle_transparent.js returns "hidden" or "shown" on success - both
    are already visible in the field, so nothing more needs to be said.
    Everything else is surfaced with a tooltip instead of failing
    silently.

    DEBUG BUILD: "no-field"/"no-selection"/"error" results currently
    arrive with bracketed diagnostic detail appended (e.g.
    "no-selection [debug-5; ...]") rather than as bare strings, because
    prior fixes did not resolve a reported selection-detection failure.
    Matching is done with startswith() for this reason, and the raw
    diagnostic text is included in the tooltip so it can be read back
    directly. Once the real cause is found, this should go back to a
    plain dict lookup on the exact "no-field"/"no-selection" strings
    with no diagnostic suffix, matching the add-on's normal minimal style.
    """
    if result in ("hidden", "shown"):
        return
    result = result or ""
    if result.startswith("no-field"):
        tooltip(f"Click into a note field first.\n{result}", period=10000)
    elif result.startswith("no-selection"):
        tooltip(f"Select some text first, then press the button again.\n{result}", period=10000)
    elif result.startswith("error"):
        tooltip(f"Transparent Text ran into a problem:\n{result}", period=10000)
    elif result:
        tooltip(f"Transparent Text: unrecognized result:\n{result}", period=10000)
    else:
        tooltip(
            "Transparent Text: the toggle script produced no result at all.",
            period=10000,
        )


def _toggle_transparent(editor: Editor) -> None:
    """Button/shortcut callback: run the toggle script in the editor page.

    All the actual wrap/unwrap/detect logic lives in toggle_transparent.js
    since it has to inspect and edit the field's live DOM (including the
    text selection), which is only reachable from JavaScript running
    inside the editor's web page - see that file for details.

    evalWithCallback (rather than plain eval) is used so the script's
    reported outcome can drive _on_toggle_result above.
    """
    editor.web.evalWithCallback(_TOGGLE_JS, _on_toggle_result)


def _add_toggle_button(buttons: list[str], editor: Editor) -> None:
    """editor_did_init_buttons hook: add our single toolbar button.

    Icon loading is defensive on purpose. addButton() reads the icon
    file from disk and raises FileNotFoundError if it is missing or
    unreadable (this has been observed in the wild - e.g. antivirus or
    a sync tool removing just that one file from an installed add-on).
    A decorative icon failing to load should never be able to break
    the editor/Browser, so: check first, and fall back to a plain text
    label if anything about the icon still goes wrong.

    The button and shortcut are then rewired to call
    _toggle_transparent() directly (see below addButton()) instead of
    going through addButton()'s own click/shortcut handling. That
    matters: addButton() funnels every activation through
    call_after_note_saved(), which runs Anki's own saveNow() JS
    function before calling back into Python. saveNow() blurs the
    currently focused field to flush it, and that collapses the
    browser's text selection - so by the time our code ran, there was
    nothing left to act on (confirmed: the shortcut reliably reported
    "no selection" even when text was selected first). This add-on
    only ever manipulates the live DOM directly and never reads
    editor.note, so it doesn't need that pre-save step, and skipping
    it is what lets the selection survive long enough to matter.
    """
    icon = _ICON_PATH if os.path.isfile(_ICON_PATH) else None
    try:
        button = editor.addButton(
            icon=icon,
            cmd="transparentText",
            func=_toggle_transparent,
            tip=f"Transparent Text ({SHORTCUT})",
            label="" if icon else "Transparent",
        )
    except Exception:
        button = editor.addButton(
            icon=None,
            cmd="transparentText",
            func=_toggle_transparent,
            tip=f"Transparent Text ({SHORTCUT})",
            label="Transparent",
        )

    # Re-point the button's click handler at our callback directly,
    # replacing the save-first-wrapped version addButton() just set.
    editor._links["transparentText"] = _toggle_transparent

    # Wire the shortcut the same way Anki wires its own editor
    # shortcuts internally (see aqt.editor.Editor.addButton), but call
    # straight through instead of via addButton()'s keys= parameter,
    # for the same reason as the _links override above.
    QShortcut(
        QKeySequence(SHORTCUT),
        editor.widget,
        activated=lambda: _toggle_transparent(editor),
    )

    buttons.append(button)


gui_hooks.editor_did_init_buttons.append(_add_toggle_button)
