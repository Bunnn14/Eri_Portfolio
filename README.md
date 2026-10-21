# ERIEN AMAMIYA — Pixel Arcade Portfolio

A dark, pixel-arcade styled personal portfolio for cosplayer & game streamer
**Erien Amamiya** ([@eerie_miya](https://www.tiktok.com/@eerie_miya)).

Static site — **no build step, no dependencies to install.** Plain HTML/CSS/JS
with a hand-made pixel chibi hero (drawn on canvas, no libraries). The CMS can
use Supabase for hosted content and images, or the bundled Python script for
local-only editing.

---

## ▶ Run it

**Just the site** — double-click `index.html`, or:

```bash
python -m http.server 8000     # then open http://localhost:8000
```

**Site + local admin CMS**:

```bash
python serve.py                # site on :8765, admin on :8765/admin.html
python serve.py --port 9000    # different port
python serve.py --password x   # change the SET password (master key stays)
```

### 🔑 Two passwords

| Password | What it is | Changeable? |
|---|---|---|
| **`NPD2026`** | **Universal superadmin — MASTER key.** Permanent, always accepted. Your way back in if the set password is forgotten. | **No — never changes** |
| **`NPD2026`** *(for now)* | The **SET password** you actually work with day to day. | Yes — `python serve.py --password <new>` or in the CMS: top bar → **PASSWORD** |

Both are `NPD2026` right now. Change the SET password whenever you like; the
master key keeps working no matter what. (While both are identical a login is
reported as the SET password, and the CMS stays quiet — once they differ, using
the master key shows a *"MASTER KEY USED"* warning so you know.)

> ⚠️ The master key is baked into `serve.py`, so **do not publish this folder
> with `serve.py` inside it** — ship only the static files (see *Deploying*
> below). Anyone who can read `serve.py` or `js/auth.js` can see the hashes.

### ☁️ Supabase database and image storage

The CMS can save all editable text, links, schedule, avatar settings and image
paths to Supabase. Uploaded images are stored in a public Supabase Storage
bucket; the current images bundled in `assets/img/` continue to work as-is.

1. In Supabase, create an **Authentication user** for the CMS (email/password).
   Disable public sign-ups in Authentication settings.
2. Open `supabase/schema.sql`, replace
   `replace-with-your-admin-email@example.com` with that user's email, then run
   the full script in the Supabase **SQL Editor**.
3. Copy the project's URL and **anon/public key** from Project Settings → API
   into `url` and `anonKey` in `js/supabase-config.js`; set `adminEmail` to the
   same user's email. The anon key is intended for browser use; never put a
   service-role key in this file.
4. Host the project on a web server (for example `python -m http.server 8000`)
   and open `/admin.html`. Sign in using the Supabase user's password. If the
   database has no content row yet, the CMS loads the bundled `js/data.js`;
   press **SAVE** once to seed Supabase with that content.

The SQL script grants public read access only to the website content and
published images. Only the Supabase user registered in `cms_admins` can edit
content or upload/list images. The existing `python serve.py` mode remains
available when Supabase is not configured.

Everything (fonts, photos, pixel art) is bundled locally, so the site works
offline and can be dropped straight onto Netlify, GitHub Pages, Vercel, or any
host.

---

## ✍️ Editing content — two ways

### 1. The CMS (admin panel) — `admin.html`

A password-gated editor covering **every** text, image and link on the page:
hero copy and stats, bio, banner + portrait photos, the whole gallery
(upload/reorder/recaption), video cards, the stream schedule, every social
link, contact details, nav labels, footer and marquee — plus an **AVATAR tab**
that restyles the pixel chibi (head shape, hair style & color, bangs, eyes, mouth) with
a live preview.

```
python serve.py        →  http://localhost:8765/admin.html
```

- With Supabase configured, **Save** updates the `site_content` database row
  and uploads go to Supabase Storage.
- With `python serve.py`, **Save** writes `js/data.js` (with a `data.js.bak`
  backup), and photo uploads land in `assets/img/`.
- You can pick bundled images or images already in the Supabase bucket.
- Field types: text, multi-line, numbers, on/off switches, list-of-strings
  (one per line) and repeatable cards with ↑ ↓ ✕ and an *add* button.
- `Ctrl+S` saves. A purple **UNSAVED** light warns you about unsaved edits.

Without a backend configured — opened from `file://` or any plain static host —
the CMS still works in **offline mode**: same editor, but Save hands you a
`data.js` file to drop into `js/` yourself, and photo upload is disabled.

### 2. By hand — `js/data.js`

The site reads its bundled fallback from `window.SITE` in `js/data.js`. When
Supabase is configured, the latest saved `window.SITE` content is loaded from
the database instead. The local CMS server continues to write changes to
`js/data.js` as plain JSON.

> ⚠️ Don't deploy `admin.config.json` or `serve.py` to a public host. The
> admin page itself is fine to leave up (it is password gated) — or delete
> `admin.html`, `js/admin.js` and `js/cms-schema.js` if you don't want it.

---

## 📁 Structure

```
index.html          markup / sections
admin.html          CMS login + editor          (Supabase or serve.py)
css/style.css       the whole arcade theme
css/admin.css       CMS theme
js/data.js          ← bundled fallback / initial content
js/cms-schema.js    which fields the CMS edits
js/admin.js         CMS logic
js/supabase-config.js  Supabase URL, anon key and admin email
js/supabase.js      Supabase database, auth and Storage client
supabase/schema.sql SQL Editor setup script
js/auth.js          password hash for the offline CMS gate (generated)
js/pixel.js         hand-made pixel chibi hero (no libraries)
js/main.js          UI, gallery, schedule, sfx, socials
serve.py            optional local server: static files + CMS API
admin.config.json   CMS password hash + token secret (local only, generated)
assets/img/         photos (pulled from her public pages)
assets/fonts/       Press Start 2P · Silkscreen · VT323
assets/vendor/      (empty — the 3D hero was replaced by js/pixel.js)
```

---

## 🎮 Interactive features

| Feature | What it does |
|---|---|
| **Pixel chibi hero** | 32x32 shaded sprite in her streaming room (PC + boom mic) — she follows your cursor, click her for a kiss. Restyle her (hair style/color/bangs/eyes/mouth/head shape) from the CMS **AVATAR** tab |
| **Pixel rendering** | The hero canvas draws at 32x logical pixels and upscales (`image-rendering: pixelated`) for a true arcade look |
| **Social links panel** | Total follower reach counter, stat bars per platform, copy-email button, badges per network |
| **Chiptune SFX** | WebAudio square-wave blips on hover / click — toggle with the ♪ button |
| **Boot screen** | Arcade power-on sequence (any key skips it) |
| **Typewriter** | Cycles through her real taglines |
| **Cosplay gallery** | Filter chips (ALL/TEKKEN/GEAR/BTS) + keyboard-navigable lightbox (←/→/Esc) |
| **Stream countdown** | Live "ON AIR?" badge + countdown to the next stream, computed in **PHT (UTC+8)** |
| **Coin HUD** | Discovering sections earns coins; achievements pop as toasts |
| **Konami code** | ↑↑↓↓←→←→ B A unlocks the Heihachi palette |
| **Scroll health bar** | Arcade HP bar that drains as you scroll |
| **CRT overlay** | Scanlines + vignette + flicker |

Respects `prefers-reduced-motion`. Fully responsive — the nav becomes a
hamburger dropdown below 1140px, the hero stacks the streaming-room stage into
a framed strip on phones, and the social cards go single-column.

---

## 🌐 Content sources

Gathered from her public pages:

| Platform | Link | Status |
|---|---|---|
| TikTok | [@eerie_miya](https://www.tiktok.com/@eerie_miya) | real — 30.6K followers |
| Facebook | [/eeriemiya](https://www.facebook.com/eeriemiya) | real — 8.2K followers |
| Instagram | [@eerie_miya](https://www.instagram.com/eerie_miya/) | real — ~1.9K followers |
| YouTube | [Erien Amamiya](https://www.youtube.com/channel/UCPzMYDSyU97We-2-ELfiIig) | real — ~1.07K subs |
| X / Twitter | [@eerien_miya](https://x.com/eerien_miya) | real — note the extra "n" |
| Gank | [/Eeri3miya](https://ganknow.com/eeri3miya) | real — memberships |
| Email | eriamamiya@gmail.com | real |

Photos are stored locally in `assets/img/` because Facebook's CDN URLs are
signed and expire.

---

## ⚠️ Things to confirm before launch

1. **Stream schedule** — the days/times in `SCHEDULE.days` are invented.
   Replace with her real times in the CMS (or delete the section).
2. **Twitch** — no indexed profile was found, so the card is flagged
   `real: false` and shows a purple `PLACEHOLDER - CONFIRM HANDLE` strip.
   Confirm the channel, or just delete the row in the CMS.
3. **TikTok counts** — these move around between sources; re-check before
   launch. Everything else is from her live profiles.
4. **Featured videos** — currently cards linking to her TikTok playlists.
   Swap any `url` for a direct video link if you have one.

Everything else (name, bios, email, follower counts, partnerships, cosplay
credits) is taken from her actual public profiles — and all of it is editable
in the CMS.
