(function () {
  "use strict";

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = function () { reject(new Error("Could not load " + src)); };
      document.body.appendChild(script);
    });
  }

  var cms = window.SupabaseCMS;
  var content = cms && cms.isConfigured()
    ? cms.readContent().catch(function (error) {
      console.error("Could not load site content from Supabase; using bundled content.", error);
      return null;
    })
    : Promise.resolve(null);

  content.then(function (remoteContent) {
    if (remoteContent) window.SITE = remoteContent;
    return loadScript("js/pixel.js?v=20261021f")
      .then(function () { return loadScript("js/main.js?v=20261021e"); });
  }).catch(function (error) {
    console.error("The site could not finish loading its scripts.", error);
  });
})();
