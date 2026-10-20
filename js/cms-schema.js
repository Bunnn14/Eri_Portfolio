/* ============================================================================
   ERIEN ARCADE CMS — CONTENT SCHEMA
   ----------------------------------------------------------------------------
   Describes every editable piece of the site so admin.js can build the form.
   `path` is dotted into the SITE object (js/data.js). Types:

     text      single line          textarea  multi line
     number    numeric              toggle    checkbox (true/false)
     lines     array of strings     image     image path + upload
     objects   repeatable list of objects (sub-fields declared with `fields`)

   Add a field here and it appears in the admin panel on next reload.
   ============================================================================ */

window.CMS_SCHEMA = [

  /* ------------------------------------------------ HERO / IDENTITY ----- */
  {
    id: "identity",
    label: "HERO",
    icon: "P1",
    blurb: "Browser title, name, the typewriter taglines and the follower stats.",
    fields: [
      { path: "meta.title", type: "text", label: "PAGE TITLE", help: "Shown in the browser tab and by search engines." },
      { path: "meta.description", type: "textarea", label: "META DESCRIPTION" },
      { path: "name", type: "text", label: "NAME" },
      { path: "handle", type: "text", label: "HANDLE" },
      { path: "kicker", type: "text", label: "KICKER LINE", help: "Small line above your name." },
      { path: "taglines", type: "lines", label: "TAGLINES", help: "Typed out one after another. One per line." },
      { path: "intro", type: "textarea", label: "INTRO PARAGRAPH" },
      { path: "hero.hint", type: "text", label: "3D MODEL HINT" },
      { path: "hero.ctaPrimary", type: "text", label: "BUTTON 1" },
      { path: "hero.ctaSecondary", type: "text", label: "BUTTON 2" },
      { path: "hero.ctaFollow", type: "text", label: "BUTTON 3 (FOLLOW)" },
      { path: "hero.followUrl", type: "text", label: "FOLLOW LINK" },
      {
        path: "stats", type: "objects", label: "STAT TILES UNDER THE TITLE",
        add: "ADD STAT",
        fields: [
          { key: "label", type: "text", label: "LABEL" },
          { key: "value", type: "number", label: "NUMBER" },
          { key: "suffix", type: "text", label: "SUFFIX" }
        ]
      },
      { path: "ticker", type: "lines", label: "MARQUEE TICKER", help: "Scrolling strip at the bottom of the hero." }
    ]
  },

  /* ------------------------------------------------------- ABOUT --------- */
  {
    id: "about",
    label: "ABOUT",
    icon: "01",
    blurb: "Banner, portrait, bio paragraphs, stat bars and the fact list.",
    fields: [
      { path: "sections.about.num", type: "text", label: "SECTION NUMBER", short: true },
      { path: "sections.about.title", type: "text", label: "SECTION TITLE" },
      { path: "about.banner", type: "image", label: "BANNER IMAGE", help: "Wide image at the top of the section." },
      { path: "about.bannerCaption", type: "text", label: "BANNER CAPTION" },
      { path: "about.portrait", type: "image", label: "PORTRAIT" },
      { path: "about.portraitMeta", type: "text", label: "PORTRAIT CAPTION" },
      { path: "about.bio", type: "lines", label: "BIO PARAGRAPHS", help: "First paragraph becomes the large lead text." },
      {
        path: "about.skills", type: "objects", label: "STAT BARS",
        add: "ADD BAR",
        fields: [
          { key: "name", type: "text", label: "NAME" },
          { key: "value", type: "number", label: "0-100", min: 0, max: 100 }
        ]
      },
      {
        path: "about.facts", type: "objects", label: "FACT LIST",
        add: "ADD FACT",
        fields: [
          { key: "icon", type: "text", label: "ICON", short: true },
          { key: "label", type: "text", label: "LABEL", short: true },
          { key: "text", type: "text", label: "TEXT" }
        ]
      }
    ]
  },

  /* ----------------------------------------------------- GALLERY --------- */
  {
    id: "gallery",
    label: "GALLERY",
    icon: "02",
    blurb: "Photos shown in the cosplay gallery. Drop a file to upload it.",
    fields: [
      { path: "sections.gallery.num", type: "text", label: "SECTION NUMBER", short: true },
      { path: "sections.gallery.title", type: "text", label: "SECTION TITLE" },
      { path: "galleryFilters", type: "lines", label: "FILTER BUTTONS", help: "First one must be ALL." },
      {
        path: "gallery", type: "objects", label: "PHOTOS",
        add: "UPLOAD / ADD PHOTO",
        fields: [
          { key: "src", type: "image", label: "PHOTO" },
          { key: "title", type: "text", label: "TITLE" },
          { key: "caption", type: "text", label: "CAPTION" },
          { key: "tag", type: "text", label: "FILTER TAG", short: true, help: "Must match a filter button." },
          { key: "tall", type: "toggle", label: "WIDE TILE" }
        ]
      }
    ]
  },

  /* ------------------------------------------------------ VIDEOS --------- */
  {
    id: "videos",
    label: "VIDEOS",
    icon: "03",
    blurb: "Featured content cards — link each one at a video or playlist.",
    fields: [
      { path: "sections.videos.num", type: "text", label: "SECTION NUMBER", short: true },
      { path: "sections.videos.title", type: "text", label: "SECTION TITLE" },
      { path: "videos.note", type: "text", label: "SUB LINE" },
      {
        path: "videos.items", type: "objects", label: "CARDS",
        add: "ADD CARD",
        fields: [
          { key: "icon", type: "text", label: "ICON", short: true },
          { key: "title", type: "text", label: "TITLE" },
          { key: "meta", type: "text", label: "META BADGE", short: true },
          { key: "url", type: "text", label: "LINK" },
          { key: "text", type: "text", label: "DESCRIPTION" }
        ]
      }
    ]
  },

  /* ---------------------------------------------------- SCHEDULE --------- */
  {
    id: "schedule",
    label: "SCHEDULE",
    icon: "04",
    blurb: "Weekly stream schedule. Times are read as Manila time (UTC+8).",
    fields: [
      { path: "sections.schedule.num", type: "text", label: "SECTION NUMBER", short: true },
      { path: "sections.schedule.title", type: "text", label: "SECTION TITLE" },
      { path: "schedule.timezone", type: "text", label: "TIMEZONE LABEL" },
      { path: "schedule.note", type: "textarea", label: "FOOTNOTE" },
      {
        path: "schedule.days", type: "objects", label: "DAYS",
        add: "ADD DAY",
        fields: [
          { key: "day", type: "text", label: "DAY", short: true, help: "MON, TUE…" },
          { key: "label", type: "text", label: "LABEL" },
          { key: "time", type: "text", label: "TIME", short: true, help: "20:00 – 23:00" },
          { key: "game", type: "text", label: "DETAIL" },
          { key: "off", type: "toggle", label: "REST DAY" }
        ]
      }
    ]
  },

  /* ---------------------------------------------------- SOCIALS --------- */
  {
    id: "socials",
    label: "SOCIAL LINKS",
    icon: "05",
    blurb: "Every platform card. Turn off “CONFIRMED” while a handle is still unverified.",
    fields: [
      { path: "sections.socials.num", type: "text", label: "SECTION NUMBER", short: true },
      { path: "sections.socials.title", type: "text", label: "SECTION TITLE" },
      { path: "sections.socials.sub", type: "text", label: "SUB LINE" },
      {
        path: "socials", type: "objects", label: "PLATFORMS",
        add: "ADD PLATFORM",
        fields: [
          { key: "code", type: "text", label: "BADGE", short: true, help: "Two letters, e.g. IG" },
          { key: "label", type: "text", label: "NAME" },
          { key: "handle", type: "text", label: "HANDLE" },
          { key: "url", type: "text", label: "LINK" },
          { key: "followers", type: "number", label: "FOLLOWERS", min: 0, help: "Leave empty if unknown." },
          { key: "unit", type: "text", label: "UNIT", short: true, help: "FOLLOWERS / SUBSCRIBERS" },
          { key: "real", type: "toggle", label: "CONFIRMED", help: "Off shows a PLACEHOLDER strip." }
        ]
      }
    ]
  },

  /* ----------------------------------------------------- CONTACT -------- */
  {
    id: "contact",
    label: "CONTACT",
    icon: "06",
    blurb: "Collab form details and the three side panels.",
    fields: [
      { path: "sections.contact.num", type: "text", label: "SECTION NUMBER", short: true },
      { path: "sections.contact.title", type: "text", label: "SECTION TITLE" },
      { path: "contact.email", type: "text", label: "EMAIL" },
      { path: "contact.directTitle", type: "text", label: "EMAIL PANEL TITLE" },
      { path: "contact.blurb", type: "textarea", label: "BLURB" },
      { path: "contact.subjects", type: "lines", label: "FORM DROPDOWN OPTIONS" },
      { path: "contact.partner.title", type: "text", label: "PARTNER PANEL TITLE" },
      { path: "contact.partner.name", type: "text", label: "PARTNER NAME" },
      { path: "contact.partner.blurb", type: "text", label: "PARTNER BLURB" },
      { path: "contact.support.title", type: "text", label: "SUPPORT PANEL TITLE" },
      { path: "contact.support.blurb", type: "text", label: "SUPPORT BLURB" },
      { path: "contact.support.label", type: "text", label: "SUPPORT BUTTON" },
      { path: "contact.support.url", type: "text", label: "SUPPORT LINK" }
    ]
  },

  /* -------------------------------------------------- NAV / FOOTER ------ */
  {
    id: "page",
    label: "NAV & FOOTER",
    icon: "UI",
    blurb: "Menu labels and the footer wording.",
    fields: [
      { path: "nav.home", type: "text", label: "MENU: HOME", short: true },
      { path: "nav.about", type: "text", label: "MENU: ABOUT", short: true },
      { path: "nav.gallery", type: "text", label: "MENU: GALLERY", short: true },
      { path: "nav.videos", type: "text", label: "MENU: VIDEOS", short: true },
      { path: "nav.schedule", type: "text", label: "MENU: SCHEDULE", short: true },
      { path: "nav.socials", type: "text", label: "MENU: SOCIALS", short: true },
      { path: "nav.contact", type: "text", label: "MENU: CONTACT", short: true },
      { path: "footer.big", type: "text", label: "FOOTER HEADLINE" },
      { path: "footer.line", type: "text", label: "FOOTER LINE" },
      { path: "footer.small", type: "text", label: "FOOTER SMALL PRINT" }
    ]
  }
];
