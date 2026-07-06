# Transparent Text

Hide helper text inside your Anki notes without deleting it.

Transparent Text is a tiny editor add-on that makes selected text invisible using CSS while keeping it fully searchable, editable, synchronized, and stored inside the note.

Originally built for my own study workflow and shared with the Anki community.

---

# Preview

### Hide text instantly

![Preview](https://i.postimg.cc/XqFVs4WJ/1.png)

---

### Clean notes while keeping helper text

![Example](https://i.postimg.cc/dtPQLkRy/2.png)

---

# Features

- One-click hide/reveal toggle
- Keyboard shortcut
- Hidden text stays searchable
- Fully editable
- Syncs normally
- No extra note fields
- No settings
- Lightweight
- Light & Dark mode support

---

# Perfect For

- Mnemonics
- Hidden hints
- Personal reminders
- Search keywords
- Vocabulary notes
- Study helpers
- Teacher notes
- Clean card layouts

---

# How It Works

1. Select text in the editor.
2. Click the eye-off button.
3. The text becomes invisible.
4. Click again to restore it.

Internally the add-on simply wraps the selection with:

```html
<span style="color: transparent;">Hidden text</span>
```

The content remains part of the note and can still be searched, synchronized, copied, and edited.

---

# Installation

Install from AnkiWeb or clone this repository into your `addons21` folder.

---

# Why I Built It

While studying, I often wanted to keep helper words, mnemonics, or personal notes inside my cards without displaying them during review.

Transparent Text provides a simple one-click solution without adding extra fields or changing your card templates. Because it uses transparent text instead of fixed colours, your hidden notes remain invisible in both Light and Dark mode without any extra work.

---

# Support

Found a bug or have an idea?

Open an issue on GitHub.

---

**Hide what you need, remember what matters! — Adel**
