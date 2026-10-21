(function () {
  "use strict";

  var config = window.SUPABASE_CONFIG || {};
  var baseUrl = String(config.url || "").replace(/\/+$/, "");
  var bucket = config.imageBucket || "site-images";
  var maxImageSize = 15 * 1024 * 1024;
  var allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"];

  function isConfigured() {
    return !!(baseUrl && config.anonKey);
  }

  function request(path, options, accessToken) {
    options = options || {};
    var headers = {
      apikey: config.anonKey,
      Authorization: "Bearer " + (accessToken || config.anonKey)
    };
    if (options.body && !(options.body instanceof Blob)) {
      headers["Content-Type"] = "application/json";
    }
    Object.keys(options.headers || {}).forEach(function (key) {
      headers[key] = options.headers[key];
    });

    return fetch(baseUrl + path, {
      method: options.method || "GET",
      cache: "no-store",
      headers: headers,
      body: options.body instanceof Blob
        ? options.body
        : (options.body == null ? undefined : JSON.stringify(options.body))
    }).then(function (response) {
      return response.text().then(function (text) {
        var data = null;
        if (text) {
          try { data = JSON.parse(text); }
          catch (error) { data = { message: text }; }
        }
        if (!response.ok) {
          var message = data && (data.msg || data.message || data.error_description || data.error);
          var failure = new Error(message || ("Supabase request failed (" + response.status + ")"));
          failure.status = response.status;
          throw failure;
        }
        return data;
      });
    });
  }

  function publicUrl(path) {
    var encodedPath = path.split("/").map(encodeURIComponent).join("/");
    return baseUrl + "/storage/v1/object/public/" + encodeURIComponent(bucket) + "/" + encodedPath;
  }

  function readContent() {
    if (!isConfigured()) return Promise.resolve(null);
    return request("/rest/v1/site_content?id=eq.main&select=content&limit=1")
      .then(function (rows) {
        if (!Array.isArray(rows) || !rows.length) return null;
        if (!rows[0].content || typeof rows[0].content !== "object" || Array.isArray(rows[0].content)) {
          throw new Error("The site_content row does not contain a valid content object.");
        }
        return rows[0].content;
      });
  }

  function login(password) {
    if (!config.adminEmail) {
      return Promise.reject(new Error("Set adminEmail in js/supabase-config.js before signing in."));
    }
    return request("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: { email: config.adminEmail, password: password }
    }).then(function (session) {
      if (!session || !session.access_token) throw new Error("Supabase did not return an access token.");
      return session;
    });
  }

  function saveContent(content, accessToken) {
    return request("/rest/v1/site_content?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: { id: "main", content: content }
    }, accessToken);
  }

  function updatePassword(password, accessToken) {
    return request("/auth/v1/user", {
      method: "PUT",
      body: { password: password }
    }, accessToken);
  }

  function listImages(accessToken) {
    var bundled = ["cover.jpg", "profile.jpg", "photo1.jpg", "photo2.jpg", "photo3.jpg",
      "photo4.jpg", "photo5.jpg", "photo6.jpg", "photo7.jpg", "photo8.jpg"]
      .map(function (name) {
        return { path: "assets/img/" + name, size: 0, bundled: true };
      });

    return request("/storage/v1/object/list/" + encodeURIComponent(bucket), {
      method: "POST",
      body: { prefix: "uploads", limit: 1000, offset: 0, sortBy: { column: "name", order: "asc" } }
    }, accessToken).then(function (items) {
      if (!Array.isArray(items)) throw new Error("Supabase returned an invalid image list.");
      var uploaded = items.filter(function (item) {
        return item && item.name && item.name !== ".emptyFolderPlaceholder";
      }).map(function (item) {
        var path = "uploads/" + item.name;
        return {
          path: publicUrl(path),
          size: item.metadata && item.metadata.size ? item.metadata.size : 0
        };
      });
      return bundled.concat(uploaded);
    });
  }

  function uploadImage(file, accessToken) {
    if (!allowedTypes.includes(file.type)) {
      return Promise.reject(new Error("Use a JPEG, PNG, GIF, WebP, or AVIF image."));
    }
    if (!file.size || file.size > maxImageSize) {
      return Promise.reject(new Error("Image must be smaller than 15 MB."));
    }
    var extension = (file.name.match(/\.([a-z0-9]+)$/i) || [])[1];
    if (!extension) extension = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
    var safeName = file.name.replace(/\.[^.]*$/, "").replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "image";
    var id = window.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);
    var path = "uploads/" + id + "-" + safeName + "." + extension.toLowerCase();

    return request("/storage/v1/object/" + encodeURIComponent(bucket) + "/" +
      path.split("/").map(encodeURIComponent).join("/"), {
      method: "POST",
      headers: {
        "Content-Type": file.type,
        "x-upsert": "false"
      },
      body: file
    }, accessToken).then(function () {
      return publicUrl(path);
    });
  }

  window.SupabaseCMS = {
    isConfigured: isConfigured,
    readContent: readContent,
    login: login,
    saveContent: saveContent,
    updatePassword: updatePassword,
    listImages: listImages,
    uploadImage: uploadImage
  };
})();
