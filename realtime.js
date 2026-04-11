/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   FRESHMART — REALTIME ENGINE  v2.0                             ║
 * ║   Supabase Realtime v2 · Simulation vues · Compteurs animés    ║
 * ║   Inclure APRÈS api.js : <script src="realtime.js"></script>   ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 *  PUBLIC API
 *  FMRealtime.init(storeId, callbacks, products)
 *  FMRealtime.destroy()
 *  FMRealtime.getViews(id) / getSales(id) / trackSale(id, qty)
 *  FMRealtime.syncProduct(id, views, sales)
 *  FMRealtime.animateCardAppear(el)
 *  FMRealtime.fmt(n) / isTrending(id)
 */
(function(window) {
  'use strict';

  var SIM = {
    BASE_INTERVAL_MS : 4000,
    MIN_INCREMENT    : 1,
    MAX_INCREMENT    : 3,
    TREND_THRESHOLD  : 15,
    TREND_WINDOW_MS  : 60000,
    ACCEL_FACTOR     : 1.08,
    MAX_ACCEL        : 3.5,
    BATCH_WRITE_MS   : 30000,
    POLL_INTERVAL_MS : 2000,  // ← CHANGER ICI pour ajuster la fréquence de polling (en millisecondes)
  };

  var _state = {
    storeId: null, views: {}, sales: {}, trendHistory: {}, accel: {},
    dirty: {}, callbacks: {}, timers: [], ws: null, wsConnected: false,
    initialized: false, _reconnectAttempts: 0, _ref: 1,
  };

  var _snap = {}; // snapshot pour polling fallback

  /* ─── Utilitaires ─── */
  function randInt(min, max) { return Math.floor(Math.random()*(max-min+1))+min; }
  function fmt(n) { if(n==null||isNaN(n))return'0'; return Math.floor(n).toLocaleString('fr-FR'); }
  function setTxt(el, t) { if(el && el.textContent!==t) el.textContent=t; }
  function addTimer(id) { _state.timers.push(id); return id; }
  function nextRef() { return String(++_state._ref); }
  function wsSend(o) { if(_state.ws && _state.ws.readyState===WebSocket.OPEN) _state.ws.send(JSON.stringify(o)); }

  /* ─── WebSocket Supabase Realtime v2 ─── */
  function buildWsUrl() {
    return (window.SUPABASE_URL||'').replace('https://','wss://').replace('http://','ws://')
      + '/realtime/v1/websocket?apikey=' + encodeURIComponent(window.SUPABASE_KEY||'') + '&vsn=1.0.0';
  }

  function connectRealtime() {
    if (!window.SUPABASE_URL || !window.SUPABASE_KEY) return;
    try {
      var ws = new WebSocket(buildWsUrl());
      _state.ws = ws;

      ws.onopen = function() {
        _state._reconnectAttempts = 0;
        _state.wsConnected = true;

        var joinPayload = {
          config: {
            broadcast: { self: false },
            presence: { key: '' },
            postgres_changes: [{ event: '*', schema: 'public', table: 'products' }]
          }
        };
        if (_state.storeId) {
          joinPayload.config.postgres_changes[0].filter = 'store_id=eq.' + _state.storeId;
        }

        wsSend({
          topic: 'realtime:fm-products-' + (_state.storeId || 'all'),
          event: 'phx_join',
          payload: joinPayload,
          ref: nextRef()
        });

        // Heartbeat 25 s
        addTimer(setInterval(function() {
          wsSend({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: nextRef() });
        }, 25000));
      };

      ws.onmessage = function(evt) {
        try { parseMsg(JSON.parse(evt.data)); } catch(e) {}
      };

      ws.onclose = function(evt) {
        _state.wsConnected = false;
        if (evt.code === 1000) return;
        var delay = Math.min(30000, 1000 * Math.pow(2, _state._reconnectAttempts));
        _state._reconnectAttempts = Math.min(_state._reconnectAttempts+1, 5);
        addTimer(setTimeout(connectRealtime, delay));
      };

      ws.onerror = function() {};

    } catch(e) {
      console.warn('[FMRealtime] WebSocket indisponible — polling actif.');
    }
  }

  /**
   * Parser le message Phoenix — 3 formats possibles selon version Supabase :
   * A) { event:"postgres_changes", payload:{ data:{ type, record, old_record } } }
   * B) { event:"INSERT"|"UPDATE"|"DELETE", payload:{ record, old_record } }
   * C) phx_reply / heartbeat → ignorer
   */
  function parseMsg(msg) {
    var e = msg.event, p = msg.payload || {};
    if (e === 'postgres_changes' && p.data) {
      handleChange(p.data); return;
    }
    if (e === 'INSERT' || e === 'UPDATE' || e === 'DELETE') {
      handleChange({ type: e, record: p.record || p.new || p, old_record: p.old_record || p.old || {} });
    }
  }

  function handleChange(d) {
    var type = d.type;
    var rec  = d.record || d.new || {};
    var old  = d.old_record || d.old || {};
    // Filtre côté client (sécurité double si WS filter non appliqué)
    if (_state.storeId && rec.store_id && rec.store_id !== _state.storeId) return;
    if (type==='INSERT')      onInserted(rec);
    else if (type==='UPDATE') onUpdated(rec, old);
    else if (type==='DELETE') onDeleted(old.id != null ? old : rec);
  }

  function onInserted(raw) {
    var p = adapt(raw);
    if (_state.views[p.id]==null) _state.views[p.id] = p.views || 0;
    if (_state.sales[p.id]==null) _state.sales[p.id] = p.salesCount || 0;
    if (!_state.accel[p.id])     _state.accel[p.id]  = 1.0;
    _snap[p.id] = raw;
    fire('onProductAdded', p);
  }

  function onUpdated(raw, old) {
    var p = adapt(raw);
    if (!_state.dirty[p.id]) {
      _state.views[p.id] = p.views    || _state.views[p.id] || 0;
      _state.sales[p.id] = p.salesCount || _state.sales[p.id] || 0;
    }
    _snap[p.id] = raw;
    fire('onProductUpdated', p);
  }

  function onDeleted(raw) {
    var id = raw.id; if (!id) return;
    delete _state.views[id]; delete _state.sales[id];
    delete _state.dirty[id]; delete _state.accel[id];
    delete _state.trendHistory[id]; delete _snap[id];
    fire('onProductDeleted', id);
  }

  function fire(name, arg) {
    if (typeof _state.callbacks[name] === 'function') _state.callbacks[name](arg);
  }

  function adapt(r) {
    return {
      id: r.id, name: r.name, nameEn: r.name_en,
      category: r.category, categoryEn: r.category_en,
      price: r.price, promo: r.promo_price, stock: r.stock,
      desc: r.description, descEn: r.description_en,
      emoji: r.emoji || '📦', img: r.image_base64 || null,
      new: r.is_new || false, storeId: r.store_id, createdAt: r.created_at,
      views: r.views || 0, salesCount: r.sales_count || 0,
    };
  }

  /* ─── Polling fallback (si WS inactif) ─── */
  function pollProducts() {
    if (_state.wsConnected || !_state.storeId || !window.FM) return;
    FM.getProducts(_state.storeId).then(function(rows) {
      rows.forEach(function(raw) {
        var key = String(raw.id);
        if (!_snap[key]) { onInserted(raw); }
        else if (JSON.stringify(raw) !== JSON.stringify(_snap[key])) { onUpdated(raw, _snap[key]); }
      });
      Object.keys(_snap).forEach(function(id) {
        if (!rows.find(function(r){ return String(r.id)===id; })) onDeleted({ id: id });
      });
    }).catch(function(){});
  }

  /* ─── Simulation de vues ─── */
  function simTick() {
    var ids = Object.keys(_state.views);
    if (!ids.length) return;
    ids.filter(function(){ return Math.random() < 0.6; }).forEach(function(id) {
      if (!_state.accel[id]) _state.accel[id] = 1.0;
      _state.accel[id] = Math.min(_state.accel[id] * SIM.ACCEL_FACTOR, SIM.MAX_ACCEL);
      if (Math.random() < 0.01) _state.accel[id] = 1.0;
      var inc = Math.ceil(randInt(SIM.MIN_INCREMENT, SIM.MAX_INCREMENT) * _state.accel[id]);
      _state.views[id] = (_state.views[id] || 0) + inc;
      _state.dirty[id] = true;
      if (!_state.trendHistory[id]) _state.trendHistory[id] = [];
      _state.trendHistory[id].push(Date.now());
      var cutoff = Date.now() - SIM.TREND_WINDOW_MS;
      _state.trendHistory[id] = _state.trendHistory[id].filter(function(ts){ return ts > cutoff; });
      updateCard(id);
    });
  }

  function isTrending(id) {
    var h = _state.trendHistory[id]; if (!h) return false;
    return h.filter(function(ts){ return Date.now()-ts < SIM.TREND_WINDOW_MS; }).length >= SIM.TREND_THRESHOLD;
  }

  /* ─── Flush Supabase ─── */
  function flushDirty() {
    Object.keys(_state.dirty).slice(0,5).forEach(function(id) {
      delete _state.dirty[id];
      if (window.SB) SB.update('products', id, { views: Math.floor(_state.views[id]||0) }).catch(function(){ _state.dirty[id]=true; });
    });
  }

  /* ─── Mise à jour DOM granulaire ─── */
  function updateCard(id) {
    var card = document.querySelector('[data-pid="' + id + '"]');
    if (!card) return;
    var vEl = card.querySelector('.fm-views');
    var sEl = card.querySelector('.fm-sales');
    var tEl = card.querySelector('.fm-trend');
    var hvEl= card.querySelector('.fm-hs-views');
    var hsEl= card.querySelector('.fm-hs-sales');
    var v = Math.floor(_state.views[id]||0), s = Math.floor(_state.sales[id]||0);
    if (vEl) animCounter(vEl, v, 'vues');
    if (sEl) setTxt(sEl, fmt(s)+' ventes');
    if (hvEl) setTxt(hvEl, fmt(v));
    if (hsEl) setTxt(hsEl, fmt(s));
    if (tEl) {
      var trending = isTrending(id);
      if (trending && !tEl.classList.contains('fm-trend-on')) { tEl.classList.add('fm-trend-on'); tEl.style.display='flex'; }
      else if (!trending && tEl.classList.contains('fm-trend-on')) { tEl.classList.remove('fm-trend-on'); tEl.style.display='none'; }
    }
  }

  /* ─── Animation compteur rAF ease-out ─── */
  function animCounter(el, target, unit) {
    var raw = el.textContent.replace(/[^0-9]/g, '');
    var start = parseInt(raw, 10) || 0;
    if (start === target) return;
    el.classList.add('counting');
    setTimeout(function(){ el.classList.remove('counting'); }, 650);
    var t0 = null, dur = 450;
    function step(ts) {
      if (!t0) t0 = ts;
      var prog = Math.min((ts-t0)/dur, 1);
      var eased = 1 - Math.pow(1-prog, 3);
      el.textContent = fmt(Math.round(start + (target-start)*eased)) + ' ' + (unit||'');
      if (prog < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ─── Animation apparition carte ─── */
  function animateCardAppear(el) {
    if (!el) return;
    el.style.opacity = '0'; el.style.transform = 'translateY(16px) scale(0.97)';
    el.style.transition = 'opacity 0.4s cubic-bezier(0.4,0,0.2,1), transform 0.4s cubic-bezier(0.4,0,0.2,1)';
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){ el.style.opacity='1'; el.style.transform='translateY(0) scale(1)'; });
    });
  }

  /* ─── API publique ─── */
  window.FMRealtime = {
    init: function(storeId, callbacks, products) {
      if (_state.initialized) this.destroy();
      _state.storeId = storeId; _state.callbacks = callbacks||{};
      _state.initialized = true; _state._reconnectAttempts = 0; _state._ref = 1;
      (products||[]).forEach(function(p) {
        _state.views[p.id] = p.views||0; _state.sales[p.id] = p.salesCount||0;
        _state.accel[p.id] = 1.0; _snap[String(p.id)] = p;
      });
      connectRealtime();
      addTimer(setInterval(pollProducts, SIM.POLL_INTERVAL_MS));
      addTimer(setInterval(simTick, SIM.BASE_INTERVAL_MS));
      addTimer(setInterval(flushDirty, SIM.BATCH_WRITE_MS));
      console.log('%c[FMRealtime] ✅ v2.0 — boutique: '+(storeId||'toutes'), 'color:#2D6A4F;font-weight:bold');
    },
    destroy: function() {
      _state.timers.forEach(function(id){ clearInterval(id); clearTimeout(id); });
      _state.timers = [];
      if (_state.ws) { try { _state.ws.close(1000,'destroy'); } catch(e){} _state.ws=null; }
      flushDirty();
      _state.wsConnected=false; _state.initialized=false; _snap={};
      console.log('[FMRealtime] 🛑 Détruit proprement.');
    },
    getViews : function(id) { return Math.floor(_state.views[id]||0); },
    getSales : function(id) { return Math.floor(_state.sales[id]||0); },
    trackSale: function(id, qty) {
      qty=qty||1; _state.sales[id]=(_state.sales[id]||0)+qty; updateCard(id);
      if (window.SB) SB.update('products', id, { sales_count: Math.floor(_state.sales[id]) }).catch(function(){});
    },
    syncProduct: function(id, views, sales) {
      if (views!=null) _state.views[id]=views;
      if (sales!=null) _state.sales[id]=sales;
      if (!_state.accel[id]) _state.accel[id]=1.0;
    },
    animateCardAppear: animateCardAppear,
    fmt      : fmt,
    isTrending: isTrending,
  };
})(window);
