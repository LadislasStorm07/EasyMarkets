/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   FRESHMART — LOCATION ENGINE  v1.0                             ║
 * ║   Géolocalisation précise · Leaflet Maps · Supabase sync       ║
 * ║   Inclure APRÈS api.js : <script src="location.js"></script>   ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 *  PUBLIC API
 *  ──────────
 *  FMLocation.init(role, entityId)        — démarrer le tracking
 *  FMLocation.stop()                      — arrêter proprement
 *  FMLocation.getCurrent()                — coords actuelles { lat, lng, accuracy }
 *  FMLocation.showMap(containerId, opts)  — afficher carte Leaflet
 *  FMLocation.showAdminMap(containerId)   — carte SA toutes entités
 *
 *  ROLES : 'client' | 'vendor' | 'admin'
 */
(function(window) {
  'use strict';

  var CFG = {
    HIGH_ACCURACY    : true,
    TIMEOUT_MS       : 10000,
    MAX_AGE_MS       : 5000,
    UPDATE_INTERVAL  : 30000,   // sync Supabase toutes les 30s
    LEAFLET_CSS      : 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    LEAFLET_JS       : 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    DEFAULT_LAT      : 6.3703,  // Cotonou, Bénin
    DEFAULT_LNG      : 2.3912,
    DEFAULT_ZOOM     : 13,
  };

  var _state = {
    role      : null,
    entityId  : null,
    coords    : null,      // { lat, lng, accuracy, timestamp }
    watchId   : null,
    syncTimer : null,
    maps      : {},        // { containerId: L.Map }
    markers   : {},        // { containerId: L.Marker }
    leafletReady: false,
    listeners : [],        // callbacks onChange
  };

  /* ─── Leaflet loader ─── */
  function loadLeaflet(cb) {
    if (window.L) { _state.leafletReady = true; cb(); return; }
    // CSS
    if (!document.getElementById('fm-leaflet-css')) {
      var link = document.createElement('link');
      link.id  = 'fm-leaflet-css';
      link.rel = 'stylesheet';
      link.href = CFG.LEAFLET_CSS;
      document.head.appendChild(link);
    }
    // JS
    var s = document.createElement('script');
    s.src = CFG.LEAFLET_JS;
    s.onload = function() { _state.leafletReady = true; cb(); };
    s.onerror = function() { console.error('[FMLocation] Leaflet non disponible'); };
    document.head.appendChild(s);
  }

  /* ─── Icônes personnalisées ─── */
  function makeIcon(color, emoji) {
    if (!window.L) return null;
    var html = '<div style="width:38px;height:38px;border-radius:50% 50% 50% 0;background:' + color +
      ';border:2.5px solid white;box-shadow:0 3px 10px rgba(0,0,0,.25);display:flex;align-items:center;' +
      'justify-content:center;font-size:16px;transform:rotate(-45deg)">' +
      '<span style="transform:rotate(45deg)">' + emoji + '</span></div>';
    return L.divIcon({ html: html, iconSize: [38, 38], iconAnchor: [19, 38], popupAnchor: [0, -42], className: '' });
  }

  var ICONS = {
    client : function() { return makeIcon('#1B4332', '🛒'); },
    vendor : function() { return makeIcon('#2D6A4F', '🏪'); },
    admin  : function() { return makeIcon('#7C3AED', '⚙️'); },
    store  : function() { return makeIcon('#40916C', '📍'); },
  };

  /* ─── Géolocalisation ─── */
  function startWatch() {
    if (!navigator.geolocation) {
      console.warn('[FMLocation] Géolocalisation non disponible sur ce navigateur.');
      return;
    }

    var opts = {
      enableHighAccuracy: CFG.HIGH_ACCURACY,
      timeout           : CFG.TIMEOUT_MS,
      maximumAge        : CFG.MAX_AGE_MS,
    };

    _state.watchId = navigator.geolocation.watchPosition(
      onPosition,
      onError,
      opts
    );
  }

  function onPosition(pos) {
    var coords = {
      lat      : pos.coords.latitude,
      lng      : pos.coords.longitude,
      accuracy : Math.round(pos.coords.accuracy),
      timestamp: pos.timestamp,
    };
    _state.coords = coords;

    // Mettre à jour tous les marqueurs ouverts
    Object.keys(_state.maps).forEach(function(id) {
      updateSelfMarker(id);
    });

    // Notifier les listeners
    _state.listeners.forEach(function(fn) { try { fn(coords); } catch(e) {} });
  }

  function onError(err) {
    var msgs = {
      1: 'Accès à la localisation refusé. Activez-la dans les paramètres de votre navigateur.',
      2: 'Position indisponible. Vérifiez votre GPS.',
      3: 'Délai de localisation dépassé. Réessayez.',
    };
    console.warn('[FMLocation]', msgs[err.code] || 'Erreur inconnue');
    showLocationError(msgs[err.code] || 'Erreur de localisation');
  }

  function showLocationError(msg) {
    var el = document.getElementById('fm-loc-error');
    if (!el) return;
    el.textContent = '📍 ' + msg;
    el.style.display = 'block';
    setTimeout(function() { el.style.display = 'none'; }, 5000);
  }

  /* ─── Sync Supabase ─── */
  function syncToSupabase() {
    if (!_state.coords || !_state.entityId || !_state.role || !window.SB) return;

    var table = _state.role === 'client' ? 'clients'
              : _state.role === 'vendor' ? 'admins'
              : 'admins'; // admin = super admin → on ne track pas leur position en DB

    if (_state.role === 'admin') return; // SA pas trackés en DB

    SB.update(table, _state.entityId, {
      latitude       : _state.coords.lat,
      longitude      : _state.coords.lng,
      loc_accuracy   : _state.coords.accuracy,
      loc_updated_at : new Date().toISOString(),
    }).catch(function(e) { console.warn('[FMLocation] Sync Supabase échoué:', e); });
  }

  /* ─── Carte Leaflet — affichage propre ─── */
  function buildMap(containerId) {
    var el = document.getElementById(containerId);
    if (!el || !window.L) return null;

    // Supprimer l'ancienne instance si existante
    if (_state.maps[containerId]) {
      _state.maps[containerId].remove();
    }

    var lat = _state.coords ? _state.coords.lat : CFG.DEFAULT_LAT;
    var lng = _state.coords ? _state.coords.lng : CFG.DEFAULT_LNG;

    var map = L.map(containerId, {
      center          : [lat, lng],
      zoom            : CFG.DEFAULT_ZOOM,
      zoomControl     : true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom    : 19,
    }).addTo(map);

    _state.maps[containerId] = map;
    return map;
  }

  function updateSelfMarker(containerId) {
    if (!_state.coords || !_state.maps[containerId] || !window.L) return;
    var map = _state.maps[containerId];
    var lat = _state.coords.lat, lng = _state.coords.lng;
    var icon = ICONS[_state.role] ? ICONS[_state.role]() : null;

    if (_state.markers[containerId + '_self']) {
      _state.markers[containerId + '_self'].setLatLng([lat, lng]);
    } else {
      var m = L.marker([lat, lng], icon ? { icon: icon } : {})
        .addTo(map)
        .bindPopup(
          '<div style="font-family:Outfit,sans-serif;font-size:13px">' +
          '<strong>📍 Vous êtes ici</strong><br>' +
          '<span style="font-size:11px;color:#666">Précision : ' + _state.coords.accuracy + ' m</span>' +
          '</div>'
        );
      _state.markers[containerId + '_self'] = m;
    }

    // Cercle de précision
    if (_state.markers[containerId + '_circle']) {
      _state.markers[containerId + '_circle'].setLatLng([lat, lng])
        .setRadius(_state.coords.accuracy);
    } else {
      _state.markers[containerId + '_circle'] = L.circle([lat, lng], {
        radius     : _state.coords.accuracy,
        color      : '#40916C',
        fillColor  : '#40916C',
        fillOpacity: 0.08,
        weight     : 1,
      }).addTo(map);
    }
  }

  /* ─── Carte Super Admin — toutes les entités ─── */
  async function buildAdminMap(containerId) {
    if (!window.FM || !window.L) return;
    var map = buildMap(containerId);
    if (!map) return;

    try {
      var [stores, admins, clients] = await Promise.all([
        FM.getStores(),
        FM.getAdmins(),
        FM.getClients(),
      ]);

      var bounds = [];

      // Boutiques / vendeurs
      stores.forEach(function(s) {
        var adapted = FM.adaptStore(s);
        if (adapted.latitude && adapted.longitude) {
          var icon = ICONS.store();
          var m = L.marker([adapted.latitude, adapted.longitude], icon ? { icon: icon } : {})
            .addTo(map)
            .bindPopup(
              '<div style="font-family:Outfit,sans-serif;min-width:160px">' +
              '<div style="font-size:15px;margin-bottom:4px">' + (s.emoji||'🏪') + ' <strong>' + s.name + '</strong></div>' +
              '<div style="font-size:11px;color:#666">' + (s.city||'') + (s.country?', '+s.country:'') + '</div>' +
              '<div style="font-size:10px;color:#999;margin-top:2px">Type : ' + (s.store_type||'Épicerie') + '</div>' +
              '<div style="font-size:10px;color:#999">' + (s.owner_name||'') + '</div>' +
              '</div>'
            );
          bounds.push([adapted.latitude, adapted.longitude]);
        }
      });

      // Admins avec position
      admins.forEach(function(a) {
        if (a.latitude && a.longitude) {
          var icon = ICONS.vendor();
          L.marker([a.latitude, a.longitude], icon ? { icon: icon } : {})
            .addTo(map)
            .bindPopup(
              '<div style="font-family:Outfit,sans-serif;min-width:160px">' +
              '<div style="font-size:13px;font-weight:600">🏪 ' + (a.first_name||'') + ' ' + (a.last_name||'') + '</div>' +
              '<div style="font-size:11px;color:#666">' + (a.store_name||'Vendeur') + '</div>' +
              '<div style="font-size:10px;color:#999">' + (a.email||'') + '</div>' +
              '<div style="font-size:10px;color:#2D6A4F;margin-top:3px">Précision : ' + Math.round(a.loc_accuracy||0) + ' m</div>' +
              '</div>'
            );
          bounds.push([a.latitude, a.longitude]);
        }
      });

      // Clients avec position
      clients.forEach(function(c) {
        if (c.latitude && c.longitude) {
          var icon = ICONS.client();
          L.marker([c.latitude, c.longitude], icon ? { icon: icon } : {})
            .addTo(map)
            .bindPopup(
              '<div style="font-family:Outfit,sans-serif;min-width:160px">' +
              '<div style="font-size:13px;font-weight:600">🛒 ' + (c.first_name||'') + ' ' + (c.last_name||'') + '</div>' +
              '<div style="font-size:11px;color:#666">' + (c.city||'') + '</div>' +
              '<div style="font-size:10px;color:#999">' + (c.email||'') + '</div>' +
              '<div style="font-size:10px;color:#2D6A4F;margin-top:3px">Précision : ' + Math.round(c.loc_accuracy||0) + ' m</div>' +
              '</div>'
            );
          bounds.push([c.latitude, c.longitude]);
        }
      });

      // Ajuster le zoom pour montrer toutes les entités
      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], CFG.DEFAULT_ZOOM);
      }

      // Légende
      var legend = L.control({ position: 'bottomright' });
      legend.onAdd = function() {
        var div = L.DomUtil.create('div');
        div.style.cssText = 'background:white;padding:8px 12px;border-radius:8px;font-family:Outfit,sans-serif;font-size:11px;box-shadow:0 2px 8px rgba(0,0,0,.15);line-height:1.8';
        div.innerHTML =
          '<div style="font-weight:600;margin-bottom:4px">Légende</div>' +
          '<div>📍 Boutique</div>' +
          '<div>🏪 Vendeur actif</div>' +
          '<div>🛒 Client</div>';
        return div;
      };
      legend.addTo(map);

    } catch(e) {
      console.error('[FMLocation] Erreur carte admin:', e);
    }
  }

  /* ─── API publique ─── */
  window.FMLocation = {

    /**
     * Initialiser la géolocalisation
     * @param {string} role     — 'client' | 'vendor' | 'admin'
     * @param {string} entityId — ID de l'entité (client.id ou admin.id)
     */
    init: function(role, entityId) {
      this.stop();
      _state.role     = role;
      _state.entityId = entityId;

      // Démarrer le tracking GPS
      startWatch();

      // Sync Supabase périodique
      _state.syncTimer = setInterval(syncToSupabase, CFG.UPDATE_INTERVAL);

      // Injecter CSS de base
      injectCSS();

      console.log('%c[FMLocation] ✅ Démarré — rôle: ' + role, 'color:#2D6A4F;font-weight:bold');
    },

    /** Arrêter proprement */
    stop: function() {
      if (_state.watchId != null) {
        navigator.geolocation.clearWatch(_state.watchId);
        _state.watchId = null;
      }
      if (_state.syncTimer) {
        clearInterval(_state.syncTimer);
        _state.syncTimer = null;
      }
      // Nettoyage cartes
      Object.keys(_state.maps).forEach(function(id) {
        try { _state.maps[id].remove(); } catch(e) {}
      });
      _state.maps    = {};
      _state.markers = {};
    },

    /** Coords actuelles */
    getCurrent: function() { return _state.coords; },

    /**
     * Afficher une carte de l'utilisateur courant
     * @param {string} containerId — ID de l'élément HTML cible
     * @param {object} opts        — { zoom, showAccuracy }
     */
    showMap: function(containerId, opts) {
      var self = this;
      loadLeaflet(function() {
        var map = buildMap(containerId);
        if (!map) return;
        if (_state.coords) {
          updateSelfMarker(containerId);
          map.setView([_state.coords.lat, _state.coords.lng], (opts && opts.zoom) || CFG.DEFAULT_ZOOM);
        } else {
          // En attente du GPS — centrer sur Cotonou par défaut
          map.setView([CFG.DEFAULT_LAT, CFG.DEFAULT_LNG], 12);
          var waiting = L.popup()
            .setLatLng([CFG.DEFAULT_LAT, CFG.DEFAULT_LNG])
            .setContent('<div style="font-family:Outfit,sans-serif;font-size:12px">📡 Acquisition du signal GPS...</div>')
            .openOn(map);
          // Fermer le popup dès qu'on a la position
          self.onChange(function(coords) {
            waiting.remove();
            updateSelfMarker(containerId);
            map.setView([coords.lat, coords.lng], CFG.DEFAULT_ZOOM);
          });
        }
      });
    },

    /**
     * Afficher la carte Super Admin (toutes entités)
     */
    showAdminMap: function(containerId) {
      var self = this;
      loadLeaflet(function() {
        buildAdminMap(containerId);
      });
    },

    /** S'abonner aux changements de position */
    onChange: function(fn) {
      if (typeof fn === 'function') {
        _state.listeners.push(fn);
        // Appel immédiat si on a déjà une position
        if (_state.coords) try { fn(_state.coords); } catch(e) {}
      }
    },

    /** Forcer une sync immédiate vers Supabase */
    syncNow: function() { syncToSupabase(); },

    /** Rafraîchir la carte admin */
    refreshAdminMap: function(containerId) {
      if (_state.maps[containerId]) {
        // Vider les markers existants sauf le fond
        _state.maps[containerId].eachLayer(function(layer) {
          if (layer instanceof L.Marker || layer instanceof L.Circle) {
            _state.maps[containerId].removeLayer(layer);
          }
        });
        _state.markers = {};
      }
      buildAdminMap(containerId);
    },
  };

  /* ─── CSS injecté ─── */
  function injectCSS() {
    if (document.getElementById('fm-location-css')) return;
    var style = document.createElement('style');
    style.id = 'fm-location-css';
    style.textContent = [
      '.fm-map{width:100%;height:340px;border-radius:12px;overflow:hidden;border:1px solid var(--ln,#E3EAE5);position:relative}',
      '.fm-map-lg{height:480px}',
      '@media(max-width:640px){.fm-map{height:240px}.fm-map-lg{height:320px}}',
      '.fm-loc-bar{display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--gf,#F0FAF2);border:1px solid var(--gp,#D8F3DC);border-radius:10px;margin-bottom:12px;font-size:12px;color:var(--ink2,#3D4940)}',
      '.fm-loc-dot{width:8px;height:8px;border-radius:50%;background:#40916C;flex-shrink:0;animation:fm-loc-pulse 2s ease-in-out infinite}',
      '@keyframes fm-loc-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.4)}}',
      '.fm-loc-error{display:none;padding:8px 12px;background:var(--rb,#FDF0EF);border:1px solid rgba(192,57,43,.2);border-radius:8px;font-size:12px;color:var(--red,#C0392B);margin-bottom:10px}',
      '.fm-loc-btn{padding:7px 14px;background:var(--gr,#40916C);color:white;border:none;border-radius:8px;font-family:inherit;font-size:12px;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:background .15s}',
      '.fm-loc-btn:hover{background:#2D6A4F}',
      '.fm-loc-coords{font-size:10px;color:var(--ink3,#7A8C80);font-family:monospace}',
    ].join('\n');
    document.head.appendChild(style);
  }

})(window);
