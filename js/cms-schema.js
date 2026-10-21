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
    label: "HOME PAGE",
    icon: "P1",
    blurb: "Edit the main heading, introduction, messages and numbers shown at the top of the page.",
    fields: [
      { path: "meta.title", type: "text", label: "Page title", help: "The name shown in the browser tab." },
      { path: "meta.description", type: "textarea", label: "Short page summary", help: "A short summary of the site." },
      { path: "name", type: "text", label: "Name" },
      { path: "handle", type: "text", label: "Social name" },
      { path: "kicker", type: "text", label: "Small line above your name" },
      { path: "taglines", type: "lines", label: "Rotating messages", help: "Add one message per line." },
      { path: "intro", type: "textarea", label: "Introduction" },
      { path: "hero.hint", type: "text", label: "Small hint under the buttons" },
      { path: "hero.ctaPrimary", type: "text", label: "First button" },
      { path: "hero.ctaSecondary", type: "text", label: "Second button" },
      { path: "hero.ctaFollow", type: "text", label: "Follow button" },
      { path: "hero.followUrl", type: "text", label: "Follow page address" },
      {
        path: "stats", type: "objects", label: "Numbers under the heading",
        add: "Add number",
        fields: [
          { key: "label", type: "text", label: "What this number is for" },
          { key: "value", type: "number", label: "Number" },
          { key: "suffix", type: "text", label: "Extra text after the number" }
        ]
      },
      { path: "ticker", type: "lines", label: "Scrolling messages", help: "Add one message per line." }
    ]
  },

  /* ------------------------------------------------------- AVATAR -------- */
  {
    id: "avatar",
    label: "CHARACTER",
    icon: "32",
    blurb: "Change how the pixel character looks. Save your changes, then reload the site to see them.",
    fields: [
      { path: "hero.avatar.headShape", type: "select", label: "Head shape", options: [
        { v: "wide", l: "Wide" },
        { v: "round", l: "Round" },
        { v: "slim", l: "Slim" }
      ] },
      { path: "hero.avatar.hairStyle", type: "select", label: "Hair style", options: [
        { v: "bob", l: "Bob" },
        { v: "blunt", l: "Short and straight" },
        { v: "long", l: "Long" },
        { v: "pixie", l: "Pixie cut" },
        { v: "buns", l: "Space buns" },
        { v: "twin", l: "Twin tails" },
        { v: "asym", l: "Uneven, longer on the right" },
        { v: "wavy", l: "Wavy" }
      ] },
      { path: "hero.avatar.hairColor", type: "select", label: "Hair color", options: [
        { v: "ash", l: "Ash grey" },
        { v: "silver", l: "Silver" },
        { v: "black", l: "Black" },
        { v: "blonde", l: "Blonde" },
        { v: "ginger", l: "Ginger" },
        { v: "brown", l: "Brown" },
        { v: "pink", l: "Pink" },
        { v: "lilac", l: "Lilac" },
        { v: "blue", l: "Blue" },
        { v: "red", l: "Red" }
      ] },
      { path: "hero.avatar.bangs", type: "select", label: "Bangs", options: [
        { v: "jagged", l: "Jagged" },
        { v: "straight", l: "Straight" },
        { v: "side", l: "Side-swept" },
        { v: "wispy", l: "Wispy" },
        { v: "curtain", l: "Curtain" },
        { v: "bowl", l: "Bowl cut" },
        { v: "baby", l: "Short" },
        { v: "zigzag", l: "Zigzag" }
      ] },
      { path: "hero.avatar.eyes", type: "select", label: "Eyes", options: [
        { v: "sleepy", l: "Sleepy" },
        { v: "round", l: "Round" },
        { v: "sparkle", l: "Sparkling" },
        { v: "dot", l: "Small dots" },
        { v: "half", l: "Half-closed" },
        { v: "heart", l: "Hearts" },
        { v: "star", l: "Stars" }
      ] },
      { path: "hero.avatar.mouth", type: "select", label: "Mouth", options: [
        { v: "tiny", l: "Small line" },
        { v: "smile", l: "Smile" },
        { v: "cat", l: "Cat mouth" },
        { v: "open", l: "Open" }
      ] }
    ]
  },

  /* ------------------------------------------------------- ABOUT --------- */
  {
    id: "about",
    label: "ABOUT",
    icon: "01",
    blurb: "Edit the photos and information in the About section.",
    fields: [
      { path: "sections.about.num", type: "text", label: "Section number", short: true },
      { path: "sections.about.title", type: "text", label: "Section heading" },
      { path: "about.banner", type: "image", label: "Wide photo", help: "The large photo at the top of this section." },
      { path: "about.bannerCaption", type: "text", label: "Text on the wide photo" },
      { path: "about.portrait", type: "image", label: "Portrait photo" },
      { path: "about.portraitMeta", type: "text", label: "Text under the portrait" },
      { path: "about.bio", type: "lines", label: "About paragraphs", help: "Add one paragraph per line." },
      {
        path: "about.skills", type: "objects", label: "Skills",
        add: "Add skill",
        fields: [
          { key: "name", type: "text", label: "Skill name" },
          { key: "value", type: "number", label: "Amount (0 to 100)", min: 0, max: 100 }
        ]
      },
      {
        path: "about.facts", type: "objects", label: "Quick facts",
        add: "Add fact",
        fields: [
          { key: "icon", type: "text", label: "Symbol", short: true },
          { key: "label", type: "text", label: "Short heading", short: true },
          { key: "text", type: "text", label: "Details" }
        ]
      }
    ]
  },

  /* ----------------------------------------------------- GALLERY --------- */
  {
    id: "gallery",
    label: "GALLERY",
    icon: "02",
    blurb: "Add, remove or rearrange the photos in the gallery.",
    fields: [
      { path: "sections.gallery.num", type: "text", label: "Section number", short: true },
      { path: "sections.gallery.title", type: "text", label: "Section heading" },
      { path: "galleryFilters", type: "lines", label: "Photo categories", help: "Add one category per line. Keep ALL as the first one." },
      {
        path: "gallery", type: "objects", label: "Gallery photos",
        add: "Add photo",
        fields: [
          { key: "src", type: "image", label: "Photo" },
          { key: "title", type: "text", label: "Photo heading" },
          { key: "caption", type: "text", label: "Photo description" },
          { key: "tag", type: "text", label: "Category", short: true, help: "Use one of the photo categories above." },
          { key: "tall", type: "toggle", label: "Use a wider photo tile" }
        ]
      }
    ]
  },

  /* ------------------------------------------------------ VIDEOS --------- */
  {
    id: "videos",
    label: "VIDEOS",
    icon: "03",
    blurb: "Edit the featured video and playlist links.",
    fields: [
      { path: "sections.videos.num", type: "text", label: "Section number", short: true },
      { path: "sections.videos.title", type: "text", label: "Section heading" },
      { path: "videos.note", type: "text", label: "Small line under the heading" },
      {
        path: "videos.items", type: "objects", label: "Featured links",
        add: "Add link",
        fields: [
          { key: "icon", type: "text", label: "Symbol", short: true },
          { key: "title", type: "text", label: "Heading" },
          { key: "meta", type: "text", label: "Small label", short: true },
          { key: "url", type: "text", label: "Video or playlist address" },
          { key: "text", type: "text", label: "Short description" }
        ]
      }
    ]
  },

  /* ---------------------------------------------------- SCHEDULE --------- */
  {
    id: "schedule",
    label: "SCHEDULE",
    icon: "04",
    blurb: "Set the weekly stream times. Times use Manila time.",
    fields: [
      { path: "sections.schedule.num", type: "text", label: "Section number", short: true },
      { path: "sections.schedule.title", type: "text", label: "Section heading" },
      { path: "schedule.timezone", type: "text", label: "Time zone text" },
      { path: "schedule.note", type: "textarea", label: "Note under the schedule" },
      {
        path: "schedule.days", type: "objects", label: "Weekly schedule",
        add: "Add day",
        fields: [
          { key: "day", type: "text", label: "Day", short: true, help: "For example, MON or TUE." },
          { key: "label", type: "text", label: "Stream name" },
          { key: "time", type: "text", label: "Time", short: true, help: "For example, 20:00 to 23:00." },
          { key: "game", type: "text", label: "What you'll be doing" },
          { key: "off", type: "toggle", label: "Day off" }
        ]
      }
    ]
  },

  /* ---------------------------------------------------- SOCIALS --------- */
  {
    id: "socials",
    label: "SOCIAL LINKS",
    icon: "05",
    blurb: "Edit the social media links and follower counts.",
    fields: [
      { path: "sections.socials.num", type: "text", label: "Section number", short: true },
      { path: "sections.socials.title", type: "text", label: "Section heading" },
      { path: "sections.socials.sub", type: "text", label: "Small line under the heading" },
      {
        path: "socials", type: "objects", label: "Social media links",
        add: "Add social link",
        fields: [
          { key: "code", type: "text", label: "Short name", short: true, help: "For example, IG or FB." },
          { key: "label", type: "text", label: "Platform name" },
          { key: "handle", type: "text", label: "Username or page name" },
          { key: "url", type: "text", label: "Page address" },
          { key: "followers", type: "number", label: "Followers or subscribers", min: 0, help: "Leave blank if you don't want to show a number." },
          { key: "unit", type: "text", label: "Number label", short: true, help: "For example, FOLLOWERS or SUBSCRIBERS." },
          { key: "real", type: "toggle", label: "This page is confirmed", help: "Turn off to mark this link as not yet confirmed." }
        ]
      }
    ]
  },

  /* ----------------------------------------------------- CONTACT -------- */
  {
    id: "contact",
    label: "CONTACT",
    icon: "06",
    blurb: "Update the contact form and the information beside it.",
    fields: [
      { path: "sections.contact.num", type: "text", label: "Section number", short: true },
      { path: "sections.contact.title", type: "text", label: "Section heading" },
      { path: "contact.email", type: "text", label: "Contact email" },
      { path: "contact.directTitle", type: "text", label: "Email box heading" },
      { path: "contact.blurb", type: "textarea", label: "Contact message" },
      { path: "contact.subjects", type: "lines", label: "Contact form choices", help: "Add one choice per line." },
      { path: "contact.partner.title", type: "text", label: "Partner box heading" },
      { path: "contact.partner.name", type: "text", label: "Partner name" },
      { path: "contact.partner.blurb", type: "text", label: "Partner details" },
      { path: "contact.support.title", type: "text", label: "Support box heading" },
      { path: "contact.support.blurb", type: "text", label: "Support details" },
      { path: "contact.support.label", type: "text", label: "Support button text" },
      { path: "contact.support.url", type: "text", label: "Support page address" }
    ]
  },

  /* -------------------------------------------------- NAV / FOOTER ------ */
  {
    id: "page",
    label: "MENU & FOOTER",
    icon: "UI",
    blurb: "Change the menu names and the text at the bottom of the page.",
    fields: [
      { path: "nav.home", type: "text", label: "Home menu name", short: true },
      { path: "nav.about", type: "text", label: "About menu name", short: true },
      { path: "nav.gallery", type: "text", label: "Gallery menu name", short: true },
      { path: "nav.videos", type: "text", label: "Videos menu name", short: true },
      { path: "nav.schedule", type: "text", label: "Schedule menu name", short: true },
      { path: "nav.socials", type: "text", label: "Social links menu name", short: true },
      { path: "nav.contact", type: "text", label: "Contact menu name", short: true },
      { path: "footer.big", type: "text", label: "Large footer text" },
      { path: "footer.line", type: "text", label: "Footer line" },
      { path: "footer.small", type: "text", label: "Small footer text" }
    ]
  }
];
