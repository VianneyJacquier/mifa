/* Mifa : synchronisation entre téléphones via Firebase Firestore, avec un code famille. */
(function () {
  'use strict';
  var ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', KEY = 'mifaFamily', LEN = 10;
  var cfg = window.MIFA_FIREBASE || {};

  function configured() {
    var s = String(cfg.apiKey || '') + String(cfg.projectId || '');
    return !!(cfg.apiKey && cfg.projectId && !/COLLEZ|VOTRE|YOUR|XXXX/i.test(s)) && typeof firebase !== 'undefined';
  }
  function norm(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function valid(c) {
    if (!c || c.length !== LEN) return false;
    for (var i = 0; i < c.length; i++) if (ALPHA.indexOf(c[i]) < 0) return false;
    return true;
  }
  function pretty(c) { return c.slice(0, 5) + '-' + c.slice(5); }
  function getCode() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function setCode(c) { try { localStorage.setItem(KEY, c); } catch (e) {} }
  function gen() {
    var a = new Uint8Array(LEN), s = '';
    (window.crypto || window.msCrypto).getRandomValues(a);
    for (var i = 0; i < LEN; i++) s += ALPHA[a[i] % ALPHA.length];
    return s;
  }
  function inviteUrl() {
    return location.origin + location.pathname.replace(/index\.html$/, '') + '?f=' + getCode();
  }
  function share() {
    var url = inviteUrl();
    if (navigator.share) {
      navigator.share({ title: 'Mifa', text: 'Rejoins notre famille sur Mifa', url: url }).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(function () { alert('Lien d’invitation copié.'); });
    } else { prompt('Copiez ce lien :', url); }
  }
  function leave() {
    if (confirm('Quitter cette famille sur ce téléphone ?\nLes données restent en ligne : vous pourrez la rejoindre avec le code.')) {
      try { localStorage.removeItem(KEY); } catch (e) {}
      location.reload();
    }
  }

  // Lien d'invitation : ?f=CODE
  try {
    var p = new URLSearchParams(location.search).get('f');
    if (p) {
      var n = norm(p), cur = getCode();
      if (valid(n) && (!valid(cur) || cur === n || confirm('Rejoindre une nouvelle famille sur ce téléphone ?'))) setCode(n);
      history.replaceState(null, '', location.pathname);
    }
  } catch (e) {}

  window.famBlock = function () {
    if (!configured()) return '';
    var c = getCode();
    if (valid(c)) {
      return '<label>Famille synchronisée</label><div class="m">Code famille : <b>' + pretty(c) +
        '</b><br>Toute personne qui a ce code voit vos listes, tâches et événements.</div>' +
        '<div class="chips"><button class="chip" id="fam-share">📤 Inviter quelqu’un</button>' +
        '<button class="chip" id="fam-leave">🚪 Quitter cette famille</button></div>';
    }
    if (c === 'local') {
      return '<label>Synchronisation</label><div class="chips"><button class="chip" id="fam-leave">🔄 Activer la synchronisation famille</button></div>';
    }
    return '';
  };
  window.MifaFamily = { share: share, leave: leave };

  function ask() {
    return new Promise(function (resolve) {
      var o = document.createElement('div');
      o.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#fff;color:#1b2b2b;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto';
      document.body.appendChild(o);
      var B = 'display:block;width:100%;box-sizing:border-box;padding:14px;margin:10px 0;border-radius:14px;font-size:17px;border:0;cursor:pointer;';
      var P = B + 'background:#1f8a87;color:#fff;', S = B + 'background:#e8f1f0;color:#1b2b2b;';
      function box(inner) { o.innerHTML = '<div style="max-width:420px;width:100%">' + inner + '</div>'; }
      function $(id) { return o.querySelector('#' + id); }
      function home() {
        box('<h1 style="font-size:26px;margin:0 0 10px">👋 Bienvenue dans Mifa</h1>' +
          '<p style="line-height:1.4;margin:0 0 14px">Mifa synchronise vos listes, tâches et événements entre les téléphones de la famille grâce à un <b>code famille</b>.</p>' +
          '<button id="m-new" style="' + P + '">➕ Créer ma famille</button>' +
          '<button id="m-join" style="' + S + '">🔗 J’ai déjà un code</button>' +
          '<button id="m-solo" style="background:none;border:0;color:#1f8a87;text-decoration:underline;font-size:15px;margin-top:8px;cursor:pointer">Utiliser sans synchronisation (ce téléphone seul)</button>');
        $('m-new').onclick = created; $('m-join').onclick = join;
        $('m-solo').onclick = function () { o.remove(); resolve(null); };
      }
      function created() {
        var c = gen(); setCode(c);
        box('<h1 style="font-size:24px;margin:0 0 10px">✅ Famille créée</h1>' +
          '<p style="margin:0 0 6px">Votre code famille :</p>' +
          '<div style="font-size:30px;font-weight:700;letter-spacing:2px;margin:6px 0 12px;color:#1f8a87">' + pretty(c) + '</div>' +
          '<p style="line-height:1.4;margin:0 0 10px">Envoyez le lien d’invitation à votre famille : ils rejoindront automatiquement. Vous retrouverez ce code dans ⚙️.</p>' +
          '<button id="m-share" style="' + S + '">📤 Inviter (partager le lien)</button>' +
          '<button id="m-go" style="' + P + '">Continuer</button>');
        $('m-share').onclick = share;
        $('m-go').onclick = function () { o.remove(); resolve(c); };
      }
      function join() {
        box('<h1 style="font-size:24px;margin:0 0 10px">🔗 Rejoindre une famille</h1>' +
          '<p style="margin:0 0 8px">Saisissez le code famille (10 caractères) :</p>' +
          '<input id="m-code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXXX-XXXXX" style="width:100%;box-sizing:border-box;padding:14px;font-size:22px;letter-spacing:2px;text-transform:uppercase;border:2px solid #cfdad9;border-radius:12px">' +
          '<div id="m-err" style="color:#d33;min-height:22px;margin-top:6px"></div>' +
          '<button id="m-ok" style="' + P + '">Rejoindre</button>' +
          '<button id="m-back" style="' + S + '">Retour</button>');
        $('m-ok').onclick = function () {
          var c = norm($('m-code').value);
          if (!valid(c)) { $('m-err').textContent = 'Code invalide : 10 lettres ou chiffres.'; return; }
          setCode(c); o.remove(); resolve(c);
        };
        $('m-back').onclick = home;
      }
      home();
    });
  }

  function makeDb(fs, code) {
    var base = fs.collection('families').doc(code);
    var clean = function (o) { return JSON.parse(JSON.stringify(o)); };
    var noop = function () {};
    var ref = function (p) { var a = p.split('/'); return base.collection(a[0]).doc(a.slice(1).join('/')); };
    // Les écritures sont optimistes : on n'attend pas la confirmation du serveur (utile hors connexion).
    var fire = function (pr) { pr.catch(function (e) { console.error(e); }); return Promise.resolve(); };
    return {
      doc: function (p) {
        var r = ref(p);
        return {
          onSnapshot: function (a, b) { return r.onSnapshot(a, b || noop); },
          set: function (o) { return fire(r.set(clean(o))); },
          update: function (o) { return fire(r.update(clean(o))); },
          delete: function () { return fire(r.delete()); },
          get: function () { return r.get(); }
        };
      },
      collection: function (n) {
        var c = base.collection(n);
        return {
          onSnapshot: function (a, b) { return c.onSnapshot(a, b || noop); },
          add: function (o) { var r = c.doc(); return fire(r.set(clean(o))).then(function () { return r; }); }
        };
      }
    };
  }

  async function getDb() {
    if (!configured()) return null;
    var code = getCode();
    if (code === 'local') return null;
    if (!valid(code)) {
      code = await ask();
      if (!code) { setCode('local'); return null; }
    }
    try {
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      var fs = firebase.firestore();
      try { fs.enablePersistence({ synchronizeTabs: true }).catch(function () {}); } catch (e) {}
      return makeDb(fs, code);
    } catch (e) { console.error(e); return null; }
  }

  if (typeof window.claude === 'undefined') {
    window.claude = { use: function (n) { return n === 'db' ? getDb() : Promise.resolve(null); } };
  }
})();
