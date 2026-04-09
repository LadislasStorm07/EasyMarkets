/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         FRESHMART — API SUPABASE (100% cloud)               ║
 * ║  Inclure EN PREMIER dans chaque HTML :                      ║
 * ║  <script src="api.js"></script>                             ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 *  ⚙️  CONFIGURATION : remplacer les 2 valeurs ci-dessous
 *  Supabase > Settings > API > Project URL + anon public key
 */

var SUPABASE_URL = 'https://nnlnttczrzusleusthxm.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubG50dGN6cnp1c2xldXN0aHhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MDQ1NzYsImV4cCI6MjA5MDQ4MDU3Nn0.6LjeORnbNraLhkszoVmDWr1vsLERmMaAgv6dwMeD5Uk';
// ══════════════════════════════════════

/* ════════════════════════════════════════
   CLIENT HTTP SUPABASE LÉGER
════════════════════════════════════════ */
var SB = {
  _h: function() {
    return {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer':        'return=representation'
    };
  },

  get: async function(table, filters, opts) {
    var url = SUPABASE_URL + '/rest/v1/' + table + '?select=*';
    if (filters) Object.keys(filters).forEach(function(k){ url += '&' + k + '=eq.' + encodeURIComponent(filters[k]); });
    if (opts && opts.order) url += '&order=' + opts.order;
    if (opts && opts.limit) url += '&limit=' + opts.limit;
    var r = await fetch(url, { headers: SB._h() });
    if (!r.ok) throw new Error('[SB] ' + table + ' GET: ' + await r.text());
    return r.json();
  },

  getOne: async function(table, filters) {
    var rows = await SB.get(table, filters, { limit: 1 });
    return rows[0] || null;
  },

  query: async function(table, qs) {
    var r = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?' + qs, { headers: SB._h() });
    if (!r.ok) throw new Error('[SB] ' + table + ' QUERY: ' + await r.text());
    return r.json();
  },

  insert: async function(table, data) {
    var r = await fetch(SUPABASE_URL + '/rest/v1/' + table, { method: 'POST', headers: SB._h(), body: JSON.stringify(data) });
    if (!r.ok) throw new Error('[SB] ' + table + ' INSERT: ' + await r.text());
    var res = await r.json();
    return Array.isArray(res) ? res[0] : res;
  },

  update: async function(table, id, data, idField) {
    idField = idField || 'id';
    var r = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?' + idField + '=eq.' + encodeURIComponent(id), { method: 'PATCH', headers: SB._h(), body: JSON.stringify(data) });
    if (!r.ok) throw new Error('[SB] ' + table + ' UPDATE: ' + await r.text());
    var res = await r.json();
    return Array.isArray(res) ? res[0] : res;
  },

  upsert: async function(table, data) {
    var h = Object.assign({}, SB._h(), { 'Prefer': 'resolution=merge-duplicates,return=representation' });
    var r = await fetch(SUPABASE_URL + '/rest/v1/' + table, { method: 'POST', headers: h, body: JSON.stringify(data) });
    if (!r.ok) throw new Error('[SB] ' + table + ' UPSERT: ' + await r.text());
    var res = await r.json();
    return Array.isArray(res) ? res[0] : res;
  },

  del: async function(table, id, idField) {
    idField = idField || 'id';
    var r = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?' + idField + '=eq.' + encodeURIComponent(id), { method: 'DELETE', headers: SB._h() });
    if (!r.ok) throw new Error('[SB] ' + table + ' DELETE: ' + await r.text());
    return true;
  }
};

/* ════════════════════════════════════════
   API FRESHMART — fonctions métier
════════════════════════════════════════ */
var FM = {

  /* BOUTIQUES */
  getStores:    function()       { return SB.get('stores', null, { order: 'created_at.asc' }); },
  getStore:     function(id)     { return SB.getOne('stores', { id: id }); },
  deleteStore:  function(id)     { return SB.del('stores', id); },
  toggleStore:  function(id, v)  { return SB.update('stores', id, { active: v }); },
  createStore:  function(d) {
    return SB.insert('stores', {
      id: d.id || ('store_' + Date.now()), name: d.name, emoji: d.emoji || '🏪',
      owner_name: d.ownerName, owner_email: d.ownerEmail, owner_phone: d.ownerPhone,
      city: d.city, country: d.country || 'Bénin', address: d.addr,
      store_type: d.storeType || 'Épicerie', active: true
    });
  },
  updateStore: function(id, d) { return SB.update('stores', id, d); },

  /* SUPER ADMINS */
  loginSuperAdmin: async function(email, pw) {
    var rows = await SB.query('super_admins', 'email=eq.' + encodeURIComponent(email) + '&password=eq.' + encodeURIComponent(pw) + '&select=*&limit=1');
    return rows[0] || null;
  },
  createSuperAdmin: function(d) {
    return SB.insert('super_admins', { first_name: d.fn, last_name: d.ln, email: d.email, password: d.password });
  },
  getSuperAdmins: function() { return SB.get('super_admins', null, { order: 'created_at.asc' }); },

  /* ADMINS VENDEURS */
  loginAdmin: async function(email, pw) {
    var rows = await SB.query('admins', 'email=eq.' + encodeURIComponent(email) + '&password=eq.' + encodeURIComponent(pw) + '&select=*&limit=1');
    return rows[0] || null;
  },
  createAdmin: function(d) {
    return SB.insert('admins', {
      id: d.id || ('adm_' + Date.now()), first_name: d.fn, last_name: d.ln,
      email: d.email, password: d.password, phone: d.phone,
      store_id: d.storeId, store_name: d.storeName
    });
  },
  getAdmins:        function()     { return SB.get('admins', null, { order: 'created_at.asc' }); },
  getAdminByStore:  function(sid)  { return SB.getOne('admins', { store_id: sid }); },
  deleteAdmin:      function(id)   { return SB.del('admins', id); },

  /* CLIENTS */
  loginClient: async function(email, pw) {
    var rows = await SB.query('clients', 'email=eq.' + encodeURIComponent(email) + '&password=eq.' + encodeURIComponent(pw) + '&select=*&limit=1');
    return rows[0] || null;
  },
  createClient: function(d) {
    return SB.insert('clients', {
      id: 'cli_' + Date.now(), first_name: d.fn, last_name: d.ln,
      email: d.email, password: d.password, phone: d.phone,
      address: d.addr, city: d.city, country: d.country || 'Bénin'
    });
  },
  getClients: function() { return SB.get('clients', null, { order: 'created_at.asc' }); },

  /* PRODUITS */
  getProducts: function(storeId) {
    return storeId
      ? SB.get('products', { store_id: storeId }, { order: 'created_at.asc' })
      : SB.get('products', null, { order: 'created_at.asc' });
  },
  saveProduct: async function(d, editId) {
    var p = {
      store_id: d.storeId || d.store_id, name: d.name, name_en: d.nameEn,
      category: d.category, category_en: d.categoryEn,
      price: d.price, promo_price: d.promo || null, stock: d.stock,
      description: d.desc, description_en: d.descEn,
      emoji: d.emoji, image_base64: d.img || null, is_new: d.new || false
    };
    if (editId) return SB.update('products', editId, p);
    p.id = Date.now();
    return SB.insert('products', p);
  },
  deleteProduct: function(id)        { return SB.del('products', id); },
  updateStock:   function(id, stock) { return SB.update('products', id, { stock: stock }); },

  /* COMMANDES */
  getOrders: function(storeId) {
    return storeId
      ? SB.get('orders', { store_id: storeId }, { order: 'created_at.desc' })
      : SB.get('orders', null, { order: 'created_at.desc' });
  },
  getClientOrders: function(email) {
    return SB.query('orders', 'client_email=eq.' + encodeURIComponent(email) + '&order=created_at.desc&select=*');
  },
  createOrder: async function(d) {
    var id = 'FM-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    var row = await SB.insert('orders', {
      id: id,
      store_id:     d.storeId || d.store_id,
      client_id:    d.clientId || null,
      client_name:  d.customer ? d.customer.name  : d.client_name,
      client_phone: d.customer ? d.customer.phone : d.client_phone,
      client_email: d.customer ? d.customer.email : d.client_email || null,
      client_addr:  d.addr || null,
      items:        d.items, total: d.total,
      status:       'pending',
      delivery_type: d.delType || 'pickup',
      note:         d.note || null,
      qr_code:      id
    });
    FM.logActivity('Nouvelle commande : ' + id, 'success');
    return row;
  },
  updateOrderStatus: async function(id, status) {
    var row = await SB.update('orders', id, { status: status });
    if (row && row.client_email) {
      var msgs = { pending:'En attente ⏳', confirmed:'Confirmée ✓', delivered:'Livrée 📦', cancelled:'Annulée ✗' };
      SB.insert('notifications', {
        client_email: row.client_email, order_id: id,
        message: 'Commande ' + id + ' : ' + (msgs[status] || status),
        status: status, is_read: false
      });
    }
    return row;
  },

  /* RÉSERVATIONS */
  getReservations: function(storeId) {
    return storeId
      ? SB.get('reservations', { store_id: storeId }, { order: 'created_at.desc' })
      : SB.get('reservations', null, { order: 'created_at.desc' });
  },
  getClientReservations: function(email) {
    return SB.query('reservations', 'client_email=eq.' + encodeURIComponent(email) + '&order=created_at.desc&select=*');
  },
  createReservation: function(d) {
    return SB.insert('reservations', {
      id: 'RES-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      store_id: d.storeId, client_id: d.clientId || null,
      client_name: d.customer, client_phone: d.phone || null,
      client_email: d.email || null,
      product_id: d.pid, product_name: d.pName,
      quantity: d.qty || 1, date: d.date, note: d.note || null, status: 'pending'
    });
  },
  confirmReservation: function(id) { return SB.update('reservations', id, { status: 'confirmed' }); },

  /* ANNONCES */
  getAnnouncements: async function(storeId) {
    var all = await SB.get('announcements', null, { order: 'created_at.desc' });
    if (storeId) return all.filter(function(a){ return a.target === 'all' || a.target === storeId; });
    return all;
  },
  createAnnouncement: function(d) {
    return SB.insert('announcements', { title: d.title, message: d.msg || d.message, type: d.type || 'info', target: d.target || 'all' });
  },
  deleteAnnouncement: function(id) { return SB.del('announcements', id); },

  /* PREMIUM */
  getPremium: function(storeId) {
    return SB.getOne('premium', { store_id: storeId }).then(function(r){ return r || {}; });
  },
  setPremium: function(storeId, features) {
    return SB.upsert('premium', Object.assign({ store_id: storeId }, features));
  },

  /* AVIS */
  getVendorReviews: function() { return SB.get('vendor_reviews', null, { order: 'created_at.desc' }); },
  saveVendorReview: function(d) {
    return SB.upsert('vendor_reviews', {
      id: 'vr_' + (d.email||'').replace(/\W/g,'_'),
      admin_email: d.email, store_name: d.storeName || null,
      rating: d.rating, title: d.title, comment: d.comment
    });
  },
  getClientReviews: function(storeId) {
    return storeId
      ? SB.get('client_reviews', { store_id: storeId }, { order: 'created_at.desc' })
      : SB.get('client_reviews', null, { order: 'created_at.desc' });
  },
  saveClientReview: function(d) {
    return SB.upsert('client_reviews', {
      id: 'cr_' + (d.email||'').replace(/\W/g,'_') + '_' + d.storeId,
      client_email: d.email, client_name: d.name,
      store_id: d.storeId, store_name: d.storeName || null,
      rating: d.rating, title: d.title, comment: d.comment
    });
  },

  /* NOTIFICATIONS */
  getNotifications: function(email) {
    return SB.query('notifications', 'client_email=eq.' + encodeURIComponent(email) + '&is_read=eq.false&order=created_at.desc&select=*');
  },
  markRead: function(id) { return SB.update('notifications', id, { is_read: true }); },

  /* ACTIVITÉ */
  logActivity: function(msg, type) {
    return SB.insert('activity', { message: msg, type: type || 'info' });
  },
  getActivity: function() {
    return SB.get('activity', null, { order: 'created_at.desc', limit: 200 });
  },

  /* ADAPTATEURS Supabase → format interne */
  adaptProduct: function(r) {
    return { id:r.id, name:r.name, nameEn:r.name_en, category:r.category, categoryEn:r.category_en, price:r.price, promo:r.promo_price, stock:r.stock, desc:r.description, descEn:r.description_en, emoji:r.emoji, img:r.image_base64, new:r.is_new, storeId:r.store_id, createdAt:r.created_at };
  },
  adaptOrder: function(r) {
    return { id:r.id, storeId:r.store_id, customer:{name:r.client_name,phone:r.client_phone,email:r.client_email}, addr:r.client_addr, items:r.items||[], total:r.total, status:r.status, delType:r.delivery_type, note:r.note, qr:r.qr_code, createdAt:r.created_at };
  },
  adaptClient: function(r) {
    return { id:r.id, fn:r.first_name, ln:r.last_name, email:r.email, phone:r.phone, addr:r.address, city:r.city, country:r.country, createdAt:r.created_at };
  },
  adaptAdmin: function(r) {
    return { id:r.id, fn:r.first_name, ln:r.last_name, email:r.email, phone:r.phone, storeId:r.store_id, storeName:r.store_name, createdAt:r.created_at };
  },
  adaptStore: function(r) {
    return { id:r.id, name:r.name, emoji:r.emoji, ownerName:r.owner_name, ownerEmail:r.owner_email, ownerPhone:r.owner_phone, city:r.city, country:r.country, addr:r.address, storeType:r.store_type||'Épicerie', active:r.active, createdAt:r.created_at };
  }
};

/* Vérification config */
(function(){
  if (SUPABASE_URL.includes('VOTRE_PROJECT_ID')) {
    console.warn('%c[FreshMart] ⚠️  Configurer SUPABASE_URL et SUPABASE_KEY dans api.js', 'color:orange;font-weight:bold');
  } else {
    console.log('%c[FreshMart] ✅ Supabase: ' + SUPABASE_URL, 'color:#2D6A4F;font-weight:bold');
  }
})();
