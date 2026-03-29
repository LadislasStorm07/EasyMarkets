/**
 * FreshMart DB — Couche base de données
 * ======================================
 * Utilise IndexedDB pour la persistance réelle des données.
 * Fallback automatique vers localStorage si IndexedDB indisponible.
 * 
 * USAGE : inclure ce script AVANT tout autre script dans chaque page HTML
 * <script src="db.js"></script>
 * 
 * API publique synchrone (via cache en mémoire) :
 *   FMdb.get(store)          → array ou {}
 *   FMdb.set(store, value)   → void
 *   FMdb.push(store, item)   → void (push dans un array)
 *   FMdb.update(store, id, patch) → void
 *   FMdb.remove(store, id)   → void
 *   FMdb.clear(store)        → void
 *   FMdb.ready               → Promise (résout quand DB prête)
 * 
 * STORES disponibles :
 *   fm_stores, fm_admins, fm_products, fm_all_orders,
 *   fm_all_reservations, fm_users, fm_premium, fm_activity,
 *   fm_announcements, fm_vendor_reviews, fm_client_reviews,
 *   fm_cnotifs, fm_me, fm_client_me, fm_sa, fm_selstore
 */

(function(window) {
  'use strict';

  var DB_NAME    = 'FreshMartDB';
  var DB_VERSION = 1;
  var STORES = [
    'fm_stores','fm_admins','fm_products','fm_all_orders',
    'fm_all_reservations','fm_users','fm_premium','fm_activity',
    'fm_announcements','fm_vendor_reviews','fm_client_reviews',
    'fm_cnotifs','fm_me','fm_client_me','fm_sa','fm_selstore',
    'fm_last_role'
  ];

  // ─── Cache mémoire (accès synchrone) ───
  var _cache = {};
  var _idb   = null;
  var _ready = false;

  // ─── Sérialisation ───
  function encode(v) { try { return JSON.stringify(v); } catch(e) { return ''; } }
  function decode(s) { if(s===null||s===undefined) return null; try { return JSON.parse(s); } catch(e) { return s; } }

  // ─── localStorage bridge ───
  function lsGet(k)    { return decode(localStorage.getItem(k)); }
  function lsSet(k, v) { try { localStorage.setItem(k, encode(v)); } catch(e) { console.warn('FMdb lsSet quota:', e); } }

  // ─── Charger tout le LS en cache ───
  function loadAllFromLS() {
    STORES.forEach(function(k) {
      var v = lsGet(k);
      _cache[k] = (v !== null) ? v : getDefaultValue(k);
    });
    // Charger aussi les clés fm_orders_* et fm_res_* (par client)
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && (key.startsWith('fm_orders_') || key.startsWith('fm_res_'))) {
        _cache[key] = decode(localStorage.getItem(key)) || [];
      }
    }
  }

  function getDefaultValue(k) {
    if (k === 'fm_premium') return {};
    if (k === 'fm_sa') return null;
    if (k === 'fm_me' || k === 'fm_client_me' || k === 'fm_selstore' || k === 'fm_last_role') return null;
    return [];
  }

  // ─── IndexedDB init ───
  function initIDB() {
    return new Promise(function(resolve) {
      if (!window.indexedDB) { resolve(false); return; }
      try {
        var req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function(e) {
          var db = e.target.result;
          // Un seul object store "kv" avec clé = nom du store
          if (!db.objectStoreNames.contains('kv')) {
            db.createObjectStore('kv', { keyPath: 'k' });
          }
        };
        req.onsuccess = function(e) {
          _idb = e.target.result;
          // Charger IDB en cache
          var tx = _idb.transaction('kv', 'readonly');
          var store = tx.objectStore('kv');
          var all = store.getAll();
          all.onsuccess = function() {
            (all.result || []).forEach(function(row) { _cache[row.k] = row.v; });
            resolve(true);
          };
          all.onerror = function() { resolve(true); }; // IDB ouvert mais lecture échouée
        };
        req.onerror = function() { resolve(false); };
        req.onblocked = function() { resolve(false); };
      } catch(e) { resolve(false); }
    });
  }

  // ─── Écrire en IDB ───
  function idbSet(k, v) {
    if (!_idb) return;
    try {
      var tx = _idb.transaction('kv', 'readwrite');
      tx.objectStore('kv').put({ k: k, v: v });
    } catch(e) {}
  }

  // ─── Écrire en IDB + LS (double écriture pour compatibilité) ───
  function persist(k, v) {
    _cache[k] = v;
    lsSet(k, v);
    idbSet(k, v);
  }

  // ─── Migrer LS → IDB au premier démarrage ───
  function migrateLS() {
    if (!_idb) return;
    // Si IDB est vide mais LS a des données, on migre
    var hasIDB = Object.keys(_cache).some(function(k) {
      var v = _cache[k];
      return Array.isArray(v) ? v.length > 0 : (v !== null && v !== undefined);
    });
    if (!hasIDB) {
      // Charger depuis LS et pousser vers IDB
      STORES.forEach(function(k) {
        var v = lsGet(k);
        if (v !== null) { _cache[k] = v; idbSet(k, v); }
      });
    }
  }

  // ─── Promise de readiness ───
  var readyPromise = initIDB().then(function(ok) {
    if (!ok) {
      // Pas d'IDB, utiliser uniquement LS
      loadAllFromLS();
    } else {
      // IDB dispo, charger LS en fallback pour les clés manquantes
      STORES.forEach(function(k) {
        if (_cache[k] === undefined || _cache[k] === null) {
          var v = lsGet(k);
          if (v !== null) { _cache[k] = v; idbSet(k, v); }
          else { _cache[k] = getDefaultValue(k); }
        }
      });
      // Charger clés dynamiques depuis LS
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && (key.startsWith('fm_orders_') || key.startsWith('fm_res_'))) {
          if (_cache[key] === undefined) {
            _cache[key] = decode(localStorage.getItem(key)) || [];
          }
        }
      }
    }
    _ready = true;
    return true;
  });

  // ─── API publique ───
  var FMdb = {
    ready: readyPromise,

    /** Lire une valeur (synchrone via cache) */
    get: function(k) {
      if (_cache[k] === undefined) {
        // Tentative LS
        var v = lsGet(k);
        _cache[k] = (v !== null) ? v : getDefaultValue(k);
      }
      return _cache[k];
    },

    /** Écrire une valeur */
    set: function(k, v) {
      persist(k, v);
    },

    /** Ajouter un élément à un array */
    push: function(k, item) {
      var arr = this.get(k);
      if (!Array.isArray(arr)) arr = [];
      arr.push(item);
      persist(k, arr);
    },

    /** Mettre à jour un élément par id dans un array */
    update: function(k, id, patch) {
      var arr = this.get(k);
      if (!Array.isArray(arr)) return;
      var idx = arr.findIndex(function(x) { return x.id === id; });
      if (idx >= 0) arr[idx] = Object.assign({}, arr[idx], patch);
      persist(k, arr);
    },

    /** Supprimer un élément par id */
    remove: function(k, id) {
      var arr = this.get(k);
      if (!Array.isArray(arr)) return;
      persist(k, arr.filter(function(x) { return x.id !== id; }));
    },

    /** Vider un store */
    clear: function(k) {
      persist(k, getDefaultValue(k));
    },

    /** Vider TOUTE la base (utile pour debug/reset) */
    clearAll: function() {
      var self = this;
      STORES.forEach(function(k) { self.clear(k); });
      if (_idb) {
        try { _idb.transaction('kv','readwrite').objectStore('kv').clear(); } catch(e) {}
      }
    },

    /** Export JSON de toute la base */
    export: function() {
      var data = {};
      STORES.forEach(function(k) { data[k] = _cache[k]; });
      // Inclure clés dynamiques
      Object.keys(_cache).forEach(function(k) {
        if (k.startsWith('fm_orders_') || k.startsWith('fm_res_')) data[k] = _cache[k];
      });
      return JSON.stringify(data, null, 2);
    },

    /** Import JSON */
    import: function(jsonStr) {
      try {
        var data = JSON.parse(jsonStr);
        var self = this;
        Object.keys(data).forEach(function(k) { self.set(k, data[k]); });
        return true;
      } catch(e) { return false; }
    },

    /** Stats de la base */
    stats: function() {
      var stats = {};
      STORES.forEach(function(k) {
        var v = _cache[k];
        stats[k] = Array.isArray(v) ? v.length + ' entrées' : (v ? '1 valeur' : 'vide');
      });
      return stats;
    }
  };

  // ─── Compatibilité : surcharger localStorage pour les clés fm_ ───
  // (les anciens appels localStorage.getItem/setItem continuent de fonctionner
  //  ET les données sont aussi dans IDB)
  var _origSetItem = localStorage.setItem.bind(localStorage);
  var _origGetItem = localStorage.getItem.bind(localStorage);

  try {
    Object.defineProperty(window, 'localStorage', {
      get: function() {
        return {
          setItem: function(k, v) {
            _origSetItem(k, v);
            if (k.startsWith('fm_')) {
              _cache[k] = decode(v);
              idbSet(k, decode(v));
            }
          },
          getItem: function(k) {
            if (k.startsWith('fm_') && _cache[k] !== undefined) {
              return encode(_cache[k]);
            }
            return _origGetItem(k);
          },
          removeItem: function(k) {
            localStorage.removeItem(k);
            if (k.startsWith('fm_')) { delete _cache[k]; if(_idb){ try{_idb.transaction('kv','readwrite').objectStore('kv').delete(k);}catch(e){} } }
          },
          get length() { return window.localStorage.length; },
          key: function(i) { return window.localStorage.key(i); },
          clear: function() { window.localStorage.clear(); _cache = {}; }
        };
      },
      configurable: true
    });
  } catch(e) {
    // Certains navigateurs n'autorisent pas la redéfinition — pas grave, LS seul suffit
  }

  // Exposer globalement
  window.FMdb = FMdb;

})(window);
