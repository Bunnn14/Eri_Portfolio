/* ============================================================================
   ERIEN ARCADE CMS — admin panel
   ----------------------------------------------------------------------------
   Schema-driven editor for window.SITE (js/data.js).

   Mode 1  "SERVER"  — run `python serve.py`; Save writes js/data.js directly,
                       photos upload into assets/img/.
   Mode 2  "OFFLINE" — opened from file:// or a plain static host; Save gives
                       you a data.js file to drop into js/ yourself.
   Both modes are password gated.
   ============================================================================ */
(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var SCHEMA = window.CMS_SCHEMA || [];
  var AUTH = window.CMS_AUTH || {};
  var SITE = window.SITE || null;

  var state = {
    mode: "offline",
    token: "",
    via: "set",        /* which password unlocked this session: set | master */
    draft: null,
    dirty: false,
    tab: (SCHEMA[0] || {}).id || "",
    assets: [],
    saving: false
  };

  /* ============================== HELPERS ============================== */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function getPath(obj, path) {
    return path.split(".").reduce(function (o, k) { return o == null ? o : o[k]; }, obj);
  }
  function setPath(obj, path, val) {
    var keys = path.split("."), last = keys.pop();
    var target = keys.reduce(function (o, k) {
      if (o[k] == null || typeof o[k] !== "object") o[k] = {};
      return o[k];
    }, obj);
    if (val === undefined) delete target[last];
    else target[last] = val;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function toast(msg, kind) {
    var host = $("#cmsToasts");
    if (!host) return;
    var d = document.createElement("div");
    d.className = "ctoast" + (kind ? " ctoast--" + kind : "");
    d.textContent = msg;
    host.appendChild(d);
    setTimeout(function () {
      d.classList.add("is-out");
      setTimeout(function () { d.remove(); }, 400);
    }, 3200);
  }

  function markDirty() {
    if (state.dirty) return;
    state.dirty = true;
    var d = $("#dirtyDot");
    if (d) d.classList.add("is-on");
  }
  function clearDirty() {
    state.dirty = false;
    var d = $("#dirtyDot");
    if (d) d.classList.remove("is-on");
  }

  /* ============================ NETWORK / API ========================== */
  function api(path, opts) {
    opts = opts || {};
    var headers = { "Content-Type": "application/json" };
    if (state.token) headers.Authorization = "Bearer " + state.token;
    return fetch(path, {
      method: opts.method || (opts.body ? "POST" : "GET"),
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (res) {
      return res.json().then(function (json) {
        if (res.status === 401) { state.token = ""; sessionStorage.removeItem("erien_cms_token"); }
        return { status: res.status, json: json };
      });
    });
  }

  function detectServer() {
    return fetch("api/ping", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok) return false;
        state.mode = "server";
        if (state.token && j.auth) return true;      // session still valid
        state.token = "";
        return false;                                 // need to log in
      })
      .catch(function () { state.mode = "offline"; return null; });
  }

  /* ================================ GATE =============================== */
  function showGate(reason) {
    $("#gate").hidden = false;
    $("#app").hidden = true;
    $("#gateMode").textContent = state.mode === "server"
      ? "MODE: CMS SERVER (save + photo upload enabled)"
      : "MODE: OFFLINE — edits are saved as a file you drop into js/";
    $("#gateReason").textContent = reason || "";
    setTimeout(function () { $("#gatePass").focus(); }, 60);
  }

  function enter() {
    $("#gate").hidden = true;
    $("#app").hidden = false;
    sessionStorage.setItem("erien_cms_token", state.token || "offline");
    renderAll();
    setStatus();
  }

  function weakHash(text) {
    var h = 5381;
    for (var i = 0; i < text.length; i++) h = (((h * 33) + text.charCodeAt(i)) >>> 0);
    return ("00000000" + h.toString(16)).slice(-8);
  }

  function sha256(text) {
    if (!(window.crypto && crypto.subtle && crypto.subtle.digest) || !window.TextEncoder) {
      return Promise.resolve({ weak: weakHash(text) });
    }
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then(function (buf) {
      return { hex: Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return ("0" + b.toString(16)).slice(-2);
      }).join("") };
    });
  }

  /* Two passwords work offline too:
       'set'    — the editable password (CMS_AUTH.sha256 / .weak)
       'master' — the permanent universal superadmin key (.master / .masterWeak)
     Returns 'set' | 'master' | null. */
  function checkOffline(pw) {
    return sha256(pw).then(function (res) {
      if (res.hex) {
        if (AUTH.sha256 && res.hex === AUTH.sha256) return "set";
        if (AUTH.master && res.hex === AUTH.master) return "master";
        return null;
      }
      if (AUTH.weak && res.weak === AUTH.weak) return "set";
      if (AUTH.masterWeak && res.weak === AUTH.masterWeak) return "master";
      return null;
    });
  }

  function gateSubmit() {
    var pw = $("#gatePass").value;
    if (!pw) { $("#gateErr").textContent = "ENTER THE PASSWORD."; return; }
    $("#gateErr").textContent = "";

    if (state.mode === "server") {
      api("/api/login", { body: { password: pw } }).then(function (r) {
        if (r.status === 200 && r.json.token) {
          state.token = r.json.token;
          state.via = r.json.via || "set";
          $("#gatePass").value = "";
          enter();
          if (state.via === "master") toast("MASTER KEY USED — SET YOUR OWN PASSWORD (TOP BAR)", "warn");
        } else {
          $("#gateErr").textContent = "WRONG PASSWORD.";
        }
      }).catch(function () {
        state.mode = "offline";
        $("#gateMode").textContent = "MODE: OFFLINE (server unreachable)";
        $("#gateErr").textContent = "SERVER UNREACHABLE — TRY AGAIN.";
      });
      return;
    }

    /* offline gate */
    if (!AUTH.sha256 && !AUTH.weak && !AUTH.master && !AUTH.masterWeak) {
      $("#gateErr").textContent = "PASSWORD FILE MISSING — RUN `python serve.py` ONCE, THEN RELOAD.";
      return;
    }
    checkOffline(pw).then(function (which) {
      if (which) {
        state.token = "offline";
        state.via = which;
        $("#gatePass").value = "";
        enter();
        if (which === "master") toast("MASTER KEY USED — SET YOUR OWN PASSWORD (TOP BAR)", "warn");
      } else {
        $("#gateErr").textContent = "WRONG PASSWORD.";
      }
    });
  }

  /* ============================== RENDER =============================== */
  function setStatus() {
    var m = $("#modeChip");
    if (!m) return;
    m.textContent = state.mode === "server" ? "● SERVER" : "○ OFFLINE";
    m.className = "mode mode--" + state.mode;
  }

  function renderTabs() {
    var host = $("#tabs");
    host.innerHTML = "";
    SCHEMA.forEach(function (g) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tab" + (g.id === state.tab ? " is-on" : "");
      b.innerHTML = '<span class="tab__ico">' + esc(g.icon || "") + "</span>" + esc(g.label);
      b.addEventListener("click", function () { selectTab(g.id); });
      host.appendChild(b);
    });
  }

  function selectTab(id) {
    state.tab = id;
    $$(".tab").forEach(function (t, i) { t.classList.toggle("is-on", SCHEMA[i].id === id); });
    $$(".panel").forEach(function (p) { p.hidden = p.getAttribute("data-tab") !== id; });
    window.scrollTo({ top: 0, behavior: "auto" });
    if (id === "avatar") requestAnimationFrame(renderAvatarPreview);
  }

  function renderAll() {
    renderTabs();
    var host = $("#panels");
    host.innerHTML = "";
    SCHEMA.forEach(function (group) { host.appendChild(buildPanel(group)); });
    selectTab(state.tab);
    $("#dirtyDot").classList.toggle("is-on", state.dirty);
  }

  /* live avatar preview (AVATAR tab) — one static frame from the shared
     renderer in js/pixel.js, redrawn whenever any avatar field changes */
  function renderAvatarPreview() {
    var cv = $("#avPreview");
    if (!cv || !window.Chibi || typeof window.Chibi.render !== "function") return;
    try { window.Chibi.render(cv, getPath(state.draft, "hero.avatar") || {}); }
    catch (e) { /* preview is cosmetic — never block the editor */ }
  }

  function buildPanel(group) {
    var sec = document.createElement("section");
    sec.className = "panel";
    sec.setAttribute("data-tab", group.id);
    sec.innerHTML =
      '<header class="panel__head">' +
        '<h2 class="panel__title"><span class="tab__ico">' + esc(group.icon || "") + "</span>" + esc(group.label) + "</h2>" +
        (group.blurb ? '<p class="panel__blurb">' + esc(group.blurb) + "</p>" : "") +
      "</header>";

    if (group.id === "avatar") {
      var pv = document.createElement("div");
      pv.className = "avprev";
      pv.innerHTML =
        '<span class="fld__lab">LIVE PREVIEW <em>hero.avatar</em></span>' +
        '<canvas class="avprev__cv" id="avPreview" width="64" height="80"></canvas>' +
        '<p class="fld__help">Exactly how she looks on the homepage right now. Change the options below, then press SAVE and reload the site.</p>';
      sec.appendChild(pv);
      sec.addEventListener("change", function () { requestAnimationFrame(renderAvatarPreview); });
    }

    var body = document.createElement("div");
    body.className = "fields";
    group.fields.forEach(function (spec) { body.appendChild(buildField(spec)); });
    sec.appendChild(body);
    return sec;
  }

  /* one control, used for both top-level paths and object sub-fields */
  function buildControl(spec, getter, setter) {
    var wrap = document.createElement("div");
    var type = spec.type;

    if (type === "text" || type === "number") {
      var inp = document.createElement("input");
      inp.type = type === "number" ? "number" : "text";
      if (spec.min != null) inp.min = spec.min;
      if (spec.max != null) inp.max = spec.max;
      var v = getter();
      inp.value = (v == null) ? "" : v;
      inp.addEventListener("input", function () {
        if (type === "number") {
          if (inp.value === "") setter(undefined);
          else setter(Number(inp.value));
        } else setter(inp.value);
        markDirty();
      });
      wrap.appendChild(inp);

    } else if (type === "textarea" || type === "lines") {
      var ta = document.createElement("textarea");
      ta.rows = type === "lines" ? Math.min(9, (getter() || []).length + 2) : 5;
      var arr = getter();
      ta.value = type === "lines"
        ? (Array.isArray(arr) ? arr.join("\n") : "")
        : (arr == null ? "" : arr);
      ta.addEventListener("input", function () {
        if (type === "lines") {
          var lines = ta.value.split("\n").map(function (s) { return s.replace(/\s+$/, ""); });
          while (lines.length && lines[lines.length - 1] === "") lines.pop();
          setter(lines);
        } else setter(ta.value);
        markDirty();
      });
      wrap.appendChild(ta);

    } else if (type === "toggle") {
      var lab = document.createElement("label");
      lab.className = "toggle";
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!getter();
      cb.addEventListener("change", function () { setter(cb.checked); markDirty(); });
      var sp = document.createElement("span");
      sp.className = "toggle__track";
      sp.innerHTML = '<i></i>';
      var tx = document.createElement("span");
      tx.className = "toggle__txt";
      tx.textContent = spec.label || "";
      lab.appendChild(cb); lab.appendChild(sp); lab.appendChild(tx);
      wrap.appendChild(lab);
      return wrap;                       /* toggle draws its own label */

    } else if (type === "select") {
      var sel = document.createElement("select");
      var opts = spec.options || [];
      opts.forEach(function (o) {
        var op = document.createElement("option");
        var val = typeof o === "string" ? o : o.v;
        op.value = val;
        op.textContent = typeof o === "string" ? o : (o.l || o.v);
        sel.appendChild(op);
      });
      var cur = getter();
      var known = opts.some(function (o) { return (typeof o === "string" ? o : o.v) === cur; });
      if (known) sel.value = cur;
      else if (opts.length) sel.value = typeof opts[0] === "string" ? opts[0] : opts[0].v;
      sel.addEventListener("change", function () { setter(sel.value); markDirty(); });
      wrap.appendChild(sel);

    } else if (type === "image") {
      wrap.appendChild(buildImage(spec, getter, setter));
    }
    return wrap;
  }

  function buildImage(spec, getter, setter) {
    var box = document.createElement("div");
    box.className = "imgf";
    var path = getter() || "";

    var prev = document.createElement("div");
    prev.className = "imgf__prev";
    if (path) prev.style.backgroundImage = "url('" + path.replace(/'/g, "%27") + "')";
    box.appendChild(prev);

    var side = document.createElement("div");
    side.className = "imgf__side";

    var inp = document.createElement("input");
    inp.type = "text";
    inp.value = path;
    inp.placeholder = "assets/img/photo1.jpg";
    inp.addEventListener("input", function () {
      setter(inp.value.trim());
      prev.style.backgroundImage = inp.value ? "url('" + inp.value + "')" : "none";
      markDirty();
    });
    side.appendChild(inp);

    var row = document.createElement("div");
    row.className = "imgf__row";

    var pick = document.createElement("button");
    pick.type = "button";
    pick.className = "btn btn--sm";
    pick.textContent = "CHOOSE FILE";
    row.appendChild(pick);

    var file = document.createElement("input");
    file.type = "file";
    file.accept = "image/*";
    file.hidden = true;
    row.appendChild(file);

    pick.addEventListener("click", function () {
      if (state.mode !== "server") {
        toast("PHOTO UPLOAD NEEDS THE SERVER — RUN: python serve.py", "warn");
        return;
      }
      file.click();
    });
    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      if (!f) return;
      uploadImage(f).then(function (p) {
        setter(p);
        inp.value = p;
        prev.style.backgroundImage = "url('" + p + "')";
        markDirty();
        toast("UPLOADED → " + p, "ok");
      }).catch(function (e) { toast("UPLOAD FAILED — " + e, "err"); });
      file.value = "";
    });

    if (state.assets.length) {
      var sel = document.createElement("select");
      sel.innerHTML = '<option value="">— OR PICK AN EXISTING PHOTO —</option>' +
        state.assets.map(function (a) {
          return '<option value="' + esc(a.path) + '">' + esc(a.path.replace("assets/img/", "")) + "</option>";
        }).join("");
      sel.addEventListener("change", function () {
        if (!sel.value) return;
        setter(sel.value);
        inp.value = sel.value;
        prev.style.backgroundImage = "url('" + sel.value + "')";
        markDirty();
      });
      row.appendChild(sel);
    }

    side.appendChild(row);
    box.appendChild(side);
    return box;
  }

  function uploadImage(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onerror = function () { reject("could not read file"); };
      fr.onload = function () {
        api("/api/upload", { body: { filename: file.name, data: fr.result } })
          .then(function (r) {
            if (r.status === 200 && r.json.path) { refreshAssets(); resolve(r.json.path); }
            else reject(r.json && r.json.error ? r.json.error : ("http " + r.status));
          })
          .catch(function () { reject("server unreachable"); });
      };
      fr.readAsDataURL(file);
    });
  }

  function buildField(spec) {
    var row = document.createElement("div");
    row.className = "fld" + (spec.short ? " fld--short" : "");
    row.setAttribute("data-search", ((spec.label || "") + " " + (spec.path || spec.type || "")).toLowerCase());

    if (spec.type === "objects") return buildObjects(spec, row);

    if (spec.type === "toggle") {
      row.classList.add("fld--toggle");
      row.appendChild(buildControl(spec, function () { return getPath(state.draft, spec.path); },
        function (v) { setPath(state.draft, spec.path, v); }));
      return row;
    }

    var lab = document.createElement("label");
    lab.className = "fld__lab";
    lab.innerHTML = esc(spec.label) + (spec.path ? ' <em>' + esc(spec.path) + "</em>" : "");
    row.appendChild(lab);

    row.appendChild(buildControl(spec,
      function () { return getPath(state.draft, spec.path); },
      function (v) { setPath(state.draft, spec.path, v); }));

    if (spec.help) {
      var h = document.createElement("p");
      h.className = "fld__help";
      h.textContent = spec.help;
      row.appendChild(h);
    }
    return row;
  }

  function defaultItem(spec) {
    var o = {};
    (spec.fields || []).forEach(function (f) {
      if (f.type === "toggle") o[f.key] = false;
      else if (f.type === "number") o[f.key] = 0;
      else if (f.type === "lines") o[f.key] = [];
      else o[f.key] = "";
    });
    return o;
  }

  function buildObjects(spec, row) {
    var list = document.createElement("div");
    list.className = "obj";

    var head = document.createElement("div");
    head.className = "obj__head";
    head.innerHTML = '<span class="obj__lab">' + esc(spec.label) + "</span>";
    var add = document.createElement("button");
    add.type = "button";
    add.className = "btn btn--sm btn--primary";
    add.textContent = spec.add || "ADD ITEM";
    head.appendChild(add);
    list.appendChild(head);

    var body = document.createElement("div");
    body.className = "obj__body";
    list.appendChild(body);

    function arr() {
      var a = getPath(state.draft, spec.path);
      if (!Array.isArray(a)) { a = []; setPath(state.draft, spec.path, a); }
      return a;
    }

    function paint() {
      body.innerHTML = "";
      var items = arr();
      var count = document.createElement("p");
      count.className = "obj__count";
      count.textContent = items.length + (items.length === 1 ? " ITEM" : " ITEMS");
      body.appendChild(count);

      items.forEach(function (item, i) {
        var card = document.createElement("div");
        card.className = "ocard";

        var bar = document.createElement("div");
        bar.className = "ocard__bar";
        var title = item.title || item.label || item.name || item.day || item.code || ("#" + (i + 1));
        bar.innerHTML = '<span class="ocard__idx">' + (i + 1) + "</span><span class=\"ocard__title\">" + esc(title) + "</span>";

        var acts = document.createElement("span");
        acts.className = "ocard__acts";
        [["up", "↑", "Move up"], ["down", "↓", "Move down"], ["del", "✕", "Delete"]].forEach(function (a) {
          var b = document.createElement("button");
          b.type = "button";
          b.className = "icobtn" + (a[0] === "del" ? " icobtn--danger" : "");
          b.textContent = a[1];
          b.title = a[2];
          b.addEventListener("click", function () {
            var xs = arr();
            if (a[0] === "up" && i > 0) { xs.splice(i - 1, 0, xs.splice(i, 1)[0]); }
            if (a[0] === "down" && i < xs.length - 1) { xs.splice(i + 1, 0, xs.splice(i, 1)[0]); }
            if (a[0] === "del") {
              if (!window.confirm("DELETE “" + title + "”?")) return;
              xs.splice(i, 1);
            }
            markDirty();
            paint();
          });
          acts.appendChild(b);
        });
        bar.appendChild(acts);
        card.appendChild(bar);

        var fields = document.createElement("div");
        fields.className = "ocard__fields";
        (spec.fields || []).forEach(function (f) {
          var cell = document.createElement("div");
          cell.className = "fld" + (f.short ? " fld--short" : "");
          if (f.type !== "toggle") {
            var l = document.createElement("label");
            l.className = "fld__lab";
            l.textContent = f.label;
            cell.appendChild(l);
          }
          cell.appendChild(buildControl(f,
            function () { return item[f.key]; },
            function (v) {
              if (v === undefined) delete item[f.key];
              else item[f.key] = v;
              var t = item.title || item.label || item.name || item.day || item.code;
              if (t) $(".ocard__title", card).textContent = t;
            }));
          if (f.help) {
            var hp = document.createElement("p");
            hp.className = "fld__help";
            hp.textContent = f.help;
            cell.appendChild(hp);
          }
          fields.appendChild(cell);
        });
        card.appendChild(fields);
        body.appendChild(card);
      });
    }

    add.addEventListener("click", function () {
      arr().push(defaultItem(spec));
      markDirty();
      paint();
      toast("ITEM ADDED", "ok");
    });

    row.appendChild(list);
    paint();
    return row;
  }

  /* ============================== ASSETS =============================== */
  function refreshAssets() {
    if (state.mode !== "server") return;
    api("/api/assets").then(function (r) {
      if (r.status === 200 && Array.isArray(r.json.files)) state.assets = r.json.files;
    }).catch(function () {});
  }

  /* ================================ SAVE =============================== */
  function serialize() {
    return "/* Generated by the Erien Arcade CMS — edit by hand or in admin.html. */\n" +
      "window.SITE = " + JSON.stringify(state.draft, null, 2) + ";\n";
  }

  function save() {
    if (state.saving) return;
    state.saving = true;
    var btn = $("#btnSave");
    btn.disabled = true;

    if (state.mode === "server") {
      api("/api/content", { body: { content: state.draft } }).then(function (r) {
        state.saving = false;
        btn.disabled = false;
        if (r.status === 200 && r.json.ok) {
          clearDirty();
          $("#savedAt").textContent = "SAVED " + new Date().toLocaleTimeString();
          toast("SAVED TO js/data.js", "ok");
        } else if (r.status === 401) {
          toast("SESSION EXPIRED — LOG IN AGAIN", "warn");
          showGate("Session expired.");
        } else {
          toast("SAVE FAILED — " + ((r.json && r.json.error) || r.status), "err");
        }
      }).catch(function () {
        state.saving = false;
        btn.disabled = false;
        toast("SAVE FAILED — SERVER UNREACHABLE", "err");
      });
    } else {
      state.saving = false;
      btn.disabled = false;
      download(serialize(), "data.js");
      clearDirty();
      toast("DOWNLOADED data.js — REPLACE js/data.js WITH IT", "ok");
    }
  }

  function download(text, filename) {
    var blob = new Blob([text], { type: "text/javascript;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  /* ================================ SEARCH ============================= */
  function wireSearch() {
    var box = $("#search");
    if (!box) return;
    box.addEventListener("input", function () {
      var q = box.value.trim().toLowerCase();
      $$(".fld").forEach(function (f) {
        f.hidden = !!q && f.getAttribute("data-search").indexOf(q) === -1;
      });
      if (q) {
        $$(".panel").forEach(function (p) {
          var any = $$(".fld", p).some(function (f) { return !f.hidden; });
          p.hidden = !any;
        });
      } else {
        selectTab(state.tab);
      }
    });
  }

  /* ================================ BOOT =============================== */
  function fatal(msg) {
    $("#gate").hidden = false;
    $("#gateMode").textContent = msg;
    $("#gatePass").disabled = true;
    $("#gateGo").disabled = true;
  }

  function boot() {
    if (!SITE) { fatal("js/data.js could not be loaded — fix it first."); return; }
    if (!window.CMS_SCHEMA) { fatal("js/cms-schema.js missing."); return; }

    state.draft = clone(SITE);

    detectServer().then(function (loggedIn) {
      setStatus();
      if (loggedIn) { enter(); }
      else { showGate(); }
      refreshAssets();
    });
  }

  /* wiring */
  document.addEventListener("DOMContentLoaded", function () {
    $("#gateGo").addEventListener("click", gateSubmit);
    $("#gatePass").addEventListener("keydown", function (e) { if (e.key === "Enter") gateSubmit(); });

    $("#btnSave").addEventListener("click", save);
    $("#btnDownload").addEventListener("click", function () {
      download(serialize(), "data.js");
      toast("DOWNLOADED data.js", "ok");
    });
    $("#btnReload").addEventListener("click", function () {
      if (state.dirty && !window.confirm("Discard unsaved changes and reload from disk?")) return;
      location.reload();
    });
    $("#btnView").addEventListener("click", function () {
      if (state.dirty && !window.confirm("You have unsaved changes — they won't show on the site. Open anyway?")) return;
      window.open("index.html", "_blank", "noopener");
    });
    $("#btnLogout").addEventListener("click", function () {
      if (state.dirty && !window.confirm("Discard unsaved changes and log out?")) return;
      state.token = "";
      sessionStorage.removeItem("erien_cms_token");
      showGate();
    });

    /* ---- change SET password (master key is permanent) ---- */
    function closePw() {
      $("#pwModal").hidden = true;
      $("#pwNew").value = ""; $("#pwNew2").value = ""; $("#pwErr").textContent = "";
    }
    $("#btnPassword").addEventListener("click", function () {
      if (state.mode !== "server") { toast("PASSWORD CHANGE NEEDS THE SERVER (python serve.py)", "warn"); return; }
      $("#pwModal").hidden = false;
      setTimeout(function () { $("#pwNew").focus(); }, 50);
    });
    $("#pwCancel").addEventListener("click", closePw);
    $("#pwModal").addEventListener("click", function (e) { if (e.target === $("#pwModal")) closePw(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !$("#pwModal").hidden) closePw();
    });
    $("#pwGo").addEventListener("click", function () {
      var a = $("#pwNew").value, b = $("#pwNew2").value;
      if (a.length < 6) { $("#pwErr").textContent = "AT LEAST 6 CHARACTERS."; return; }
      if (a !== b) { $("#pwErr").textContent = "PASSWORDS DO NOT MATCH."; return; }
      $("#pwErr").textContent = "";
      api("/api/password", { body: { password: a } }).then(function (r) {
        if (r.status === 200 && r.json.ok) {
          closePw();
          toast("SET PASSWORD UPDATED — MASTER KEY UNCHANGED", "ok");
        } else if (r.status === 401) {
          closePw();
          toast("SESSION EXPIRED — LOG IN AGAIN", "warn");
          showGate("Session expired.");
        } else {
          $("#pwErr").textContent = ((r.json && r.json.error) || "FAILED").toUpperCase();
        }
      }).catch(function () { $("#pwErr").textContent = "SERVER UNREACHABLE."; });
    });
    [$("#pwNew"), $("#pwNew2")].forEach(function (el) {
      el.addEventListener("keydown", function (e) { if (e.key === "Enter") $("#pwGo").click(); });
    });

    wireSearch();
    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); }
    });
    window.addEventListener("beforeunload", function (e) {
      if (state.dirty) { e.preventDefault(); e.returnValue = ""; }
    });

    boot();
  });
})();
