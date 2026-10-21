/* ============================================================================
   ERIEN AMAMIYA — SITE LOGIC
   arcade UI, gallery, schedule countdown, chiptune sfx, socials, easter eggs
   ========================================================================== */
(function () {
  "use strict";

  var S = window.SITE || {};
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ============================== SOUND ================================= */
  var Arcade = (function () {
    var ctx = null, muted = false;
    function ac() {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) ctx = new AC();
      }
      if (ctx && ctx.state === "suspended") ctx.resume();
      return ctx;
    }
    function tone(freq, dur, type, vol, slide) {
      if (muted) return;
      var a = ac(); if (!a) return;
      var o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
      o.type = type || "square";
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
      g.gain.setValueAtTime(vol || 0.05, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(a.destination);
      o.start(t); o.stop(t + dur + 0.02);
    }
    var SFX = {
      move:  function () { tone(520, .05, "square", .035); },
      coin:  function () { tone(880, .07, "square", .05); setTimeout(function(){ tone(1320, .11, "square", .05); }, 70); },
      hit:   function () { tone(180, .16, "sawtooth", .07, -120); },
      parry: function () { tone(1200, .06, "triangle", .05, 600); },
      err:   function () { tone(150, .2, "square", .06, -60); },
      good:  function () { tone(660, .08, "square", .05); setTimeout(function(){ tone(990, .1, "square", .05); }, 60); },
      bad:   function () { tone(220, .22, "sawtooth", .06, -140); },
      start: function () { [523,659,784,1046].forEach(function(f,i){ setTimeout(function(){ tone(f,.12,"square",.05); }, i*90); }); }
    };
    return {
      sfx: function (n) { if (SFX[n]) SFX[n](); },
      toggle: function () { muted = !muted; return muted; },
      isMuted: function () { return muted; }
    };
  })();
  window.Arcade = Arcade;

  /* ============================== TOASTS ================================ */
  var toasts = $("#toasts");
  function toast(msg, kind) {
    if (!toasts) return;
    var d = document.createElement("div");
    d.className = "toast" + (kind ? " toast--" + kind : "");
    d.textContent = msg;
    toasts.appendChild(d);
    setTimeout(function () {
      d.style.transition = "opacity .4s, transform .4s";
      d.style.opacity = "0"; d.style.transform = "translateX(120%)";
      setTimeout(function () { d.remove(); }, 420);
    }, 3400);
  }

  /* ============================ HUD FEEDBACK ============================ */
  var seen = {};
  function discover(id, label) {
    if (seen[id]) return;
    seen[id] = true;
    toast(label || (id.toUpperCase() + " UNLOCKED"), "cyan");
  }

  /* ============================== BOOT ================================== */
  (function boot() {
    var el = $("#boot"), bar = $("#bootBar"), line = $("#bootLine"), skip = $("#bootSkip");
    if (!el) return;
    var lines = ["LOADING ASUKA_KAZAMA.OBJ…", "PRESSING COSTUME…", "CALIBRATING HITBOXES…", "READY!"];
    var i = 0, p = 0, done = false;

    function finish() {
      if (done) return;
      done = true;
      el.classList.add("is-done");
      setTimeout(function () { el.remove(); }, 600);
      toast("WELCOME TO THE CULT", "cyan");
      startTypewriter();
    }
    if (reduced) { finish(); return; }

    var iv = setInterval(function () {
      p += 8 + Math.random() * 12;
      if (bar) bar.style.width = Math.min(100, p) + "%";
      if (line && p > (i + 1) * 24 && i < lines.length) line.textContent = lines[i++];
      if (p >= 100) { clearInterval(iv); setTimeout(finish, 320); }
    }, 170);

    window.addEventListener("keydown", finish, { once: true });
    el.addEventListener("click", finish);
    if (skip) skip.addEventListener("click", finish);
  })();

  /* ========================== SECTION HEADINGS =========================== */
  function setText(sel, val) {
    var el = $(sel);
    if (el && val != null && val !== "") el.textContent = val;
  }

  function fillSections() {
    var secs = S.sections || {};
    $$("[data-secnum]").forEach(function (el) {
      var s = secs[el.getAttribute("data-secnum")];
      if (s && s.num) el.textContent = s.num;
    });
    $$("[data-sectitle]").forEach(function (el) {
      var s = secs[el.getAttribute("data-sectitle")];
      if (s && s.title) el.textContent = s.title;
    });
    setText("#socialsSub", secs.socials && secs.socials.sub);

    var m = S.meta || {};
    if (m.title) document.title = m.title;
    if (m.description) {
      var md = document.querySelector('meta[name="description"]');
      if (md) md.setAttribute("content", m.description);
      var ogd = document.querySelector('meta[property="og:description"]');
      if (ogd) ogd.setAttribute("content", m.description);
      var ogt = document.querySelector('meta[property="og:title"]');
      if (ogt) ogt.setAttribute("content", m.title);
    }
  }

  /* =============================== CHROME ================================ */
  function fillChrome() {
    var hero = S.hero || {}, foot = S.footer || {}, a = S.about || {}, c = S.contact || {};

    $$("[data-nav]").forEach(function (l) {
      var k = l.getAttribute("data-nav");
      if (S.nav && S.nav[k]) l.textContent = S.nav[k];
    });

    setText("#heroHint", hero.hint);
    setText("#heroCtaPrimary", hero.ctaPrimary);
    setText("#heroCtaSecondary", hero.ctaSecondary);
    setText("#heroCtaFollow", hero.ctaFollow);
    if (hero.followUrl && $("#heroCtaFollow")) $("#heroCtaFollow").href = hero.followUrl;

    setText("#scheduleNote", S.schedule && S.schedule.note);
    setText("#portraitMeta", a.portraitMeta);
    setText("#bannerCaption", a.bannerCaption);
    if (a.portrait && $("#portrait")) $("#portrait").src = a.portrait;
    if (a.banner && $("#bannerImg")) $("#bannerImg").src = a.banner;

    setText("#footerBig", foot.big);
    setText("#footerLine", foot.line);
    setText("#footerSmall", foot.small);
  }

  /* =========================== HERO CONTENT ============================= */
  function fmt(n) {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
  }

  function fillHero() {
    if ($("#heroKicker")) $("#heroKicker").textContent = S.kicker || ("PLAYER 1 // " + S.handle);
    if ($("#heroIntro")) $("#heroIntro").textContent = S.intro || "";

    var stats = $("#heroStats");
    if (stats && S.stats) {
      S.stats.forEach(function (st) {
        var li = document.createElement("li");
        li.innerHTML = "<b>" + fmt(st.value) + "</b>" + st.label;
        stats.appendChild(li);
      });
    }

    var track = $("#tickerTrack");
    if (track && S.ticker) {
      var html = S.ticker.map(function (t) { return "<span>" + t + "</span>"; }).join("");
      track.innerHTML = html + html; /* doubled for a seamless marquee */
    }
  }

  var typeTimer = null;
  function startTypewriter() {
    var el = $("#typeLine");
    if (!el || !S.taglines) return;
    if (reduced) { el.textContent = S.taglines[0]; return; }
    var li = 0, ci = 0, del = false;
    clearInterval(typeTimer);
    typeTimer = setInterval(function () {
      var txt = S.taglines[li];
      ci += del ? -1 : 1;
      el.textContent = txt.slice(0, ci);
      if (!del && ci === txt.length) { del = true; return; }
      if (del && ci === 0) { del = false; li = (li + 1) % S.taglines.length; }
    }, del ? 30 : 62);
  }

  /* =============================== ABOUT ================================ */
  function fillAbout() {
    var a = S.about || {};
    if ($("#aboutLead")) $("#aboutLead").textContent = (a.bio && a.bio[0]) || "";
    var wrap = $("#aboutParas");
    if (wrap && a.bio) {
      a.bio.slice(1).forEach(function (p) {
        var el = document.createElement("p");
        el.textContent = p;
        wrap.appendChild(el);
      });
    }
    var facts = $("#aboutFacts");
    if (facts && a.facts) {
      a.facts.forEach(function (f) {
        var li = document.createElement("li");
        li.innerHTML = '<span class="fico">' + f.icon + '</span><span><span class="flab">' +
          f.label + '</span><span class="ftxt">' + f.text + "</span></span>";
        facts.appendChild(li);
      });
    }
    var sk = $("#skills");
    if (sk && a.skills) {
      a.skills.forEach(function (s) {
        var li = document.createElement("li");
        li.innerHTML = '<div class="skills__top"><span>' + s.name + "</span><span>" + s.value +
          '%</span></div><div class="skills__bar"><span class="skills__fill" data-v="' + s.value + '"></span></div>';
        sk.appendChild(li);
      });
    }
  }

  function animateSkills() {
    $$(".skills__fill").forEach(function (f, i) {
      setTimeout(function () { f.style.width = f.getAttribute("data-v") + "%"; }, i * 130);
    });
  }

  /* ============================== GALLERY =============================== */
  var grid = $("#grid"), filters = $("#filters"), current = [], lightbox = $("#lightbox"),
      lbImg = $("#lbImg"), lbTitle = $("#lbTitle"), lbCap = $("#lbCap"), lbIndex = 0, lastFocus = null;

  function renderGallery(tag) {
    if (!grid || !S.gallery) return;
    grid.innerHTML = "";
    current = S.gallery.filter(function (g) { return !tag || tag === "ALL" || g.tag === tag; });
    current.forEach(function (g, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "card" + (g.tall ? " card--wide" : "");
      b.setAttribute("data-reveal", "");
      b.innerHTML =
        '<img class="card__img" src="' + g.src + '" alt="' + g.title + '" loading="lazy">' +
        '<span class="card__scan"></span>' +
        '<span class="card__press">PRESS ENTER</span>' +
        '<span class="card__meta"><span class="card__tag">' + g.tag + "</span>" +
        '<span class="card__title">' + g.title + "</span>" +
        '<span class="card__cap">' + g.caption + "</span></span>";
      b.addEventListener("click", function () { openLb(i); });
      grid.appendChild(b);
      if (reduced) b.classList.add("is-in");
    });
    $("#gridEmpty").hidden = current.length > 0;
    observeReveals();
  }

  function fillFilters() {
    if (!filters || !S.galleryFilters) return;
    S.galleryFilters.forEach(function (f, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (i === 0 ? " is-on" : "");
      b.textContent = f;
      b.setAttribute("role", "tab");
      b.addEventListener("click", function () {
        $$(".chip", filters).forEach(function (c) { c.classList.remove("is-on"); });
        b.classList.add("is-on");
        renderGallery(f);
        Arcade.sfx("move");
      });
      filters.appendChild(b);
    });
  }

  function openLb(i) {
    if (!lightbox) return;
    lastFocus = document.activeElement;
    lbIndex = i;
    paintLb();
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    Arcade.sfx("coin");
    $("#lbClose").focus();
    discover("gallery", "GALLERY CLEARED");
  }
  function paintLb() {
    var g = current[lbIndex];
    if (!g) return;
    lbImg.src = g.src; lbImg.alt = g.title;
    lbTitle.textContent = g.title;
    lbCap.textContent = g.caption + "  (" + (lbIndex + 1) + "/" + current.length + ")";
  }
  function closeLb() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  function stepLb(d) { lbIndex = (lbIndex + d + current.length) % current.length; paintLb(); Arcade.sfx("move"); }

  function bindLightbox() {
    if (!lightbox) return;
    $("#lbClose").addEventListener("click", closeLb);
    $("#lbPrev").addEventListener("click", function () { stepLb(-1); });
    $("#lbNext").addEventListener("click", function () { stepLb(1); });
    lightbox.addEventListener("click", function (e) { if (e.target === lightbox) closeLb(); });
    document.addEventListener("keydown", function (e) {
      if (lightbox.hidden) return;
      if (e.key === "Escape") closeLb();
      if (e.key === "ArrowLeft") stepLb(-1);
      if (e.key === "ArrowRight") stepLb(1);
    });
  }

  /* =============================== VIDEOS =============================== */
  function fillVideos() {
    if ($("#videosNote") && S.videos) $("#videosNote").textContent = S.videos.note || "";
    var host = $("#cabs");
    if (!host || !S.videos) return;
    S.videos.items.forEach(function (v) {
      var a = document.createElement("a");
      a.className = "cab";
      a.href = v.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.setAttribute("data-reveal", "");
      a.innerHTML =
        '<span class="cab__ico">' + v.icon + "</span>" +
        '<span class="cab__title">' + v.title + "</span>" +
        '<span class="cab__meta">' + v.meta + "</span>" +
        '<span class="cab__txt">' + v.text + "</span>" +
        '<span class="cab__play">▶ PLAY</span>';
      a.addEventListener("mouseenter", function () { Arcade.sfx("move"); });
      a.addEventListener("click", function () { Arcade.sfx("coin"); });
      host.appendChild(a);
    });
  }

  /* ============================== SCHEDULE ============================== */
  var DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  function manilaNow() {
    var utc = new Date().getTime() + new Date().getTimezoneOffset() * 60000;
    return new Date(utc + 8 * 3600000); /* PHT = UTC+8 */
  }

  function fillSchedule() {
    var host = $("#week"), sc = S.schedule;
    if (!host || !sc) return;
    if ($("#tzLabel")) $("#tzLabel").textContent = sc.timezone || "";

    var today = DAYS[manilaNow().getDay()];
    sc.days.forEach(function (d) {
      var el = document.createElement("div");
      el.className = "day panel" + (d.off ? " is-off" : "") + (d.day === today ? " is-today" : "");
      el.innerHTML =
        '<span class="day__d">' + d.day + "</span>" +
        '<span class="day__label' + (d.off ? " day__off" : "") + '">' + d.label + "</span>" +
        '<span class="day__time">' + d.time + "</span>" +
        '<span class="day__game">' + d.game.trim() + "</span>";
      host.appendChild(el);
    });
  }

  /* next stream as a real Date (PHT wall-clock converted to local) */
  function nextStream() {
    var sc = S.schedule;
    if (!sc) return null;
    var now = manilaNow();
    for (var add = 0; add < 8; add++) {
      var probe = new Date(now.getTime() + add * 86400000);
      var d = sc.days.filter(function (x) { return x.day === DAYS[probe.getDay()]; })[0];
      if (!d || d.off) continue;
      var hm = (d.time.match(/(\d{2}):(\d{2})/) || [])[1];
      if (!hm) continue;
      var target = new Date(probe);
      target.setHours(parseInt(hm, 10), parseInt((d.time.match(/(\d{2}):(\d{2})/) || [])[2], 10), 0, 0);
      if (target.getTime() > now.getTime()) return target;
    }
    return null;
  }

  function tickCountdown() {
    var el = $("#countdown"), badge = $("#liveBadge"), txt = $("#liveText");
    if (!el) return;
    var target = nextStream();
    if (!target) { el.textContent = "--:--:--"; return; }

    var now = new Date().getTime() + new Date().getTimezoneOffset() * 60000; /* local ms */
    /* target is a PHT wall-clock Date; compare using PHT "now" */
    var phtNow = manilaNow();
    var diff = target.getTime() - phtNow.getTime();

    if (diff <= 0) {
      el.textContent = "ON AIR!";
      if (badge) badge.classList.remove("is-off");
      if (txt) txt.textContent = "SHE'S LIVE RIGHT NOW — GO GO GO";
      return;
    }
    var s = Math.floor(diff / 1000);
    var pad = function (n) { return ("0" + n).slice(-2); };
    el.textContent = pad(Math.floor(s / 3600)) + ":" + pad(Math.floor(s / 60) % 60) + ":" + pad(s % 60);

    if (badge && txt) {
      var liveNow = (function () {
        var t = S.schedule.days.filter(function (d) { return d.day === DAYS[phtNow.getDay()]; })[0];
        if (!t || t.off) return false;
        var m = t.time.match(/(\d{2}):(\d{2})\s*[–-]\s*(\d{2}):(\d{2})/);
        if (!m) return false;
        var mins = phtNow.getHours() * 60 + phtNow.getMinutes();
        return mins >= (+m[1] * 60 + +m[2]) && mins <= (+m[3] * 60 + +m[4]);
      })();
      badge.classList.toggle("is-off", !liveNow);
      txt.textContent = liveNow ? "LIVE NOW — CATCH HER ON STREAM" : "OFFLINE · NEXT STREAM SOON";
    }
  }

  /* =============================== SOCIALS ============================== */
  function fmtNum(n) { return fmt(n); }

  function copyText(txt) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(txt);
    }
    return new Promise(function (res, rej) {
      try {
        var ta = document.createElement("textarea");
        ta.value = txt;
        ta.setAttribute("readonly", "");
        ta.style.cssText = "position:fixed;top:-999px;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand("copy");
        ta.remove();
        ok ? res() : rej();
      } catch (e) { rej(e); }
    });
  }

  function fillSocials() {
    var host = $("#socialsGrid");
    if (!host || !S.socials) return;
    var list = S.socials, max = 0, total = 0, counted = 0;

    list.forEach(function (s) {
      var f = typeof s.followers === "number" ? s.followers : 0;
      if (f > max) max = f;
      if (f) { total += f; counted++; }
    });

    /* ---- reach panel ---- */
    setText("#reachTotal", total ? fmtNum(total) : "—");
    setText("#reachUnit", counted
      ? "FOLLOWERS ACROSS " + counted + " PLATFORMS"
      : "FOLLOWERS ACROSS PLATFORMS");

    var email = (S.contact && S.contact.email) || "";
    if (email) {
      var open = $("#reachMail");
      if (open) open.href = "mailto:" + email;
      var cp = $("#copyMail");
      if (cp) cp.addEventListener("click", function () {
        copyText(email).then(function () {
          toast("EMAIL COPIED — " + email, "cyan");
          Arcade.sfx("good");
        }).catch(function () {
          toast("COPY BLOCKED — SELECT IT MANUALLY", "pink");
          Arcade.sfx("err");
        });
      });
    }

    /* ---- platform cards ---- */
    list.forEach(function (s) {
      var a = document.createElement("a");
      var url = s.url || "#";
      var f = typeof s.followers === "number" ? s.followers : 0;
      a.className = "soc" + (f >= 5000 ? " soc--big" : "");
      a.href = url;
      a.target = url.indexOf("mailto:") === 0 ? "_self" : "_blank";
      a.rel = "noopener";
      a.setAttribute("data-reveal", "");
      a.innerHTML =
        '<span class="soc__code">' + (s.code || s.label.slice(0, 2)) + "</span>" +
        '<span class="soc__label">' + s.label + "</span>" +
        '<span class="soc__handle">' + s.handle + "</span>" +
        (f
          ? '<span class="soc__foot"><span class="soc__fol">' + fmtNum(f) +
            ' <i>' + (s.unit || "FOLLOWERS") + '</i></span>' +
            '<span class="soc__bar"><span style="width:' +
            Math.max(4, Math.round((f / max) * 100)) + '%"></span></span></span>'
          : '<span class="soc__foot"><span class="soc__fol soc__fol--none">SAY HI →</span></span>') +
        '<span class="soc__go">↗</span>' +
        (s.real ? "" : '<span class="soc__wip">PLACEHOLDER — CONFIRM HANDLE</span>');
      host.appendChild(a);
    });
  }

  /* =============================== CONTACT ============================== */
  function fillContact() {
    var c = S.contact || {};
    setText("#contactBlurb", c.blurb);
    setText("#directTitle", c.directTitle);
    if (c.partner) {
      setText("#partnerTitle", c.partner.title);
      setText("#partnerName", c.partner.name);
      setText("#partnerBlurb", c.partner.blurb);
    }
    if (c.support) {
      setText("#supportTitle", c.support.title);
      setText("#supportBlurb", c.support.blurb);
      var sl = $("#supportLink");
      if (sl) {
        setText("#supportLink", c.support.label);
        if (c.support.url) { sl.href = c.support.url; }
      }
    }
    if ($("#contactMail") && c.email) {
      var m = $("#contactMail");
      m.textContent = c.email;
      m.href = "mailto:" + c.email;
    }
    var sel = $("#contactSubject");
    if (sel && c.subjects) {
      c.subjects.forEach(function (s) {
        var o = document.createElement("option");
        o.textContent = s;
        sel.appendChild(o);
      });
    }
    var form = $("#contactForm"), msg = $("#formMsg");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = new FormData(form);
      var name = (f.get("name") || "").toString().trim();
      var mail = (f.get("email") || "").toString().trim();
      var body = (f.get("message") || "").toString().trim();
      if (!name || !mail || !body) {
        msg.className = "field__msg is-err";
        msg.textContent = "ERROR: FILL IN ALL FIELDS!";
        Arcade.sfx("err");
        return;
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) {
        msg.className = "field__msg is-err";
        msg.textContent = "ERROR: THAT EMAIL LOOKS BROKEN.";
        Arcade.sfx("err");
        return;
      }
      var subj = (f.get("subject") || "Collab").toString();
      var href = "mailto:" + (c.email || "eriamamiya@gmail.com") +
        "?subject=" + encodeURIComponent("[PORTFOLIO] " + subj + " — " + name) +
        "&body=" + encodeURIComponent(body + "\n\n— " + name + " (" + mail + ")");
      window.location.href = href;
      msg.className = "field__msg";
      msg.textContent = "TRANSMISSION READY — CHECK YOUR MAIL APP!";
      Arcade.sfx("good");
      toast("MESSAGE SENT", "cyan");
    });
  }

  /* ============================ NAV / SCROLL ============================ */
  function bindNav() {
    var toggle = $("#menuToggle"), nav = $("#nav");
    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        var open = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(open));
        Arcade.sfx("move");
      });
      $$(".nav__link").forEach(function (l) {
        l.addEventListener("click", function () {
          nav.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
        });
      });
    }

    var links = $$(".nav__link");
    var secs = links.map(function (l) { return $(l.getAttribute("href")); });

    function onScroll() {
      var y = window.scrollY + 120, idx = 0;
      secs.forEach(function (s, i) { if (s && s.offsetTop <= y) idx = i; });
      links.forEach(function (l, i) { l.classList.toggle("is-active", i === idx); });

      var h = document.documentElement;
      var pct = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
      var bar = $("#scrollHealth");
      if (bar) bar.style.width = (pct * 100).toFixed(1) + "%";

      var top = $("#topbar");
      if (top) top.style.background = h.scrollTop > 40 ? "rgba(6,6,13,.96)" : "rgba(9,9,18,.88)";

      /* section achievements */
      secs.forEach(function (s, i) {
        if (!s) return;
        var r = s.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.6 && r.bottom > 0) discover(s.id, s.id.toUpperCase() + " UNLOCKED");
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    $("#toTop") && $("#toTop").addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      Arcade.sfx("coin");
    });
  }

  /* reveal-on-scroll */
  var io = null;
  function observeReveals() {
    if (reduced) { $$("[data-reveal]").forEach(function (e) { e.classList.add("is-in"); }); return; }
    if (!("IntersectionObserver" in window)) { $$("[data-reveal]").forEach(function (e) { e.classList.add("is-in"); }); return; }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            if (en.target.id === "about" || en.target.querySelector && en.target.querySelector(".skills")) animateSkills();
            io.unobserve(en.target);
          }
        });
      }, { threshold: 0.12 });
    }
    $$("[data-reveal]:not(.is-in)").forEach(function (e) { io.observe(e); });
  }

  /* ============================ SOUND TOGGLE ============================ */
  function bindSound() {
    var b = $("#soundToggle");
    if (!b) return;
    b.addEventListener("click", function () {
      var m = Arcade.toggle();
      b.setAttribute("aria-pressed", String(m));
      b.textContent = m ? "✕" : "♪";
      if (!m) Arcade.sfx("coin");
    });
    /* first interaction unlocks audio */
    window.addEventListener("pointerdown", function once() {
      Arcade.sfx("move");
      window.removeEventListener("pointerdown", once);
    }, { once: true });
  }

  /* ============================== KONAMI ================================ */
  (function konami() {
    var seq = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    var i = 0;
    document.addEventListener("keydown", function (e) {
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      i = (k === seq[i]) ? i + 1 : (k === seq[0] ? 1 : 0);
      if (i === seq.length) {
        i = 0;
        document.body.setAttribute("data-palette", "heihachi");
        toast("CHEAT ENABLED — HEIHACHI PALETTE!", "cyan");
        Arcade.sfx("start");
        if (window.Chibi) window.Chibi.cyclePose();
      }
    });
  })();

  /* ========================= PORTRAIT EASTER EGG ======================== */
  (function portraitEgg() {
    var p = $("#portrait");
    if (!p) return;
    var taps = 0, t0 = 0;
    p.addEventListener("click", function () {
      var now = Date.now();
      taps = (now - t0 < 900) ? taps + 1 : 1;
      t0 = now;
      Arcade.sfx("parry");
      if (taps >= 4) {
        taps = 0;
        p.style.animation = "none";
        void p.offsetWidth;
        p.style.animation = "jitter .28s steps(3) 3";
        toast("PERFECT PARRY!", "cyan");
        if (window.Chibi) window.Chibi.kiss();
      }
    });
  })();

  /* ============================ HERO BUTTONS ============================ */
  function bindHero() {
    var pose = $("#btnPose");
    if (pose) pose.addEventListener("click", function () {
      var name = window.Chibi ? window.Chibi.cyclePose() : "";
      if (name) toast("POSE: " + name, "cyan");
    });
    var cta = $$(".hero__cta .btn");
    cta.forEach(function (b) {
      b.addEventListener("mouseenter", function () { Arcade.sfx("move"); });
      b.addEventListener("click", function () { Arcade.sfx("coin"); });
    });
  }

  /* ================================ INIT ================================ */
  function init() {
    fillSections();
    fillChrome();
    fillHero();
    fillAbout();
    fillFilters();
    renderGallery("ALL");
    bindLightbox();
    fillVideos();
    fillSchedule();
    tickCountdown();
    setInterval(tickCountdown, 1000);
    fillSocials();
    fillContact();
    bindNav();
    bindSound();
    bindHero();
    observeReveals();

    if (window.Chibi) window.Chibi.start();

    var y = $("#year");
    if (y) y.textContent = new Date().getFullYear();

    /* hover sfx on the arcade-y bits */
    $$(".btn, .chip, .soc, .day, .cab").forEach(function (el) {
      el.addEventListener("mouseenter", function () { Arcade.sfx("move"); });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
