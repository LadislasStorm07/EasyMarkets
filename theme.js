/**
 * FreshMart — Thème & Traduction
 * ================================
 * Inclure dans chaque page : <script src="theme.js"></script>
 * Ajoute automatiquement le bouton flottant Dark/Light + FR/EN
 */

(function(){
'use strict';

// ══════════════════════════════════════════
//  SYSTÈME DE THÈME
// ══════════════════════════════════════════

var THEME_KEY = 'fm_theme';
var LANG_KEY  = 'fm_lang';

// Variables CSS pour le mode sombre (injectées sur [data-theme="dark"])
var DARK_VARS = `
  [data-theme="dark"] {
    --bg:#0F1410 !important;--wh:#161C18 !important;--cr:#0F1410 !important;
    --bg2:#111510 !important;--bg3:#181C16 !important;
    --surf:#1E2420 !important;--surf2:#262D25 !important;
    --ink:#E8F0E9 !important;--ink2:#B8CCB8 !important;
    --ink3:#7A9A7E !important;--ink4:#4A6A4E !important;
    --ln:rgba(255,255,255,.08) !important;--ln2:rgba(255,255,255,.05) !important;
    --gf:rgba(27,67,50,.35) !important;--gp:rgba(27,67,50,.4) !important;
    --rb:rgba(192,57,43,.15) !important;--ob:rgba(180,83,9,.12) !important;
    --bb:rgba(30,64,175,.15) !important;--pb:rgba(124,58,237,.15) !important;
  }
  [data-theme="dark"] body {
    background: #0F1410;
    color: #E8F0E9;
  }
  [data-theme="dark"] .wbox,
  [data-theme="dark"] .card,
  [data-theme="dark"] .modal,
  [data-theme="dark"] .pbox,
  [data-theme="dark"] .rfm,
  [data-theme="dark"] .ocard,
  [data-theme="dark"] .inv-card,
  [data-theme="dark"] .rcard,
  [data-theme="dark"] .ann-item,
  [data-theme="dark"] .prem-card,
  [data-theme="dark"] nav,
  [data-theme="dark"] .sb,
  [data-theme="dark"] .topbar,
  [data-theme="dark"] .auth-right,
  [data-theme="dark"] .ar,
  [data-theme="dark"] .mob-nav {
    background: #161C18 !important;
    border-color: rgba(255,255,255,.08) !important;
  }
  [data-theme="dark"] .a-right,
  [data-theme="dark"] .auth-right {
    background: #161C18 !important;
  }
  [data-theme="dark"] .fld input,
  [data-theme="dark"] .fld select,
  [data-theme="dark"] .fld textarea,
  [data-theme="dark"] .s-inp,
  [data-theme="dark"] .d-inp {
    background: #1E2420 !important;
    border-color: rgba(255,255,255,.1) !important;
    color: #E8F0E9 !important;
  }
  [data-theme="dark"] .fld input:focus,
  [data-theme="dark"] .fld select:focus,
  [data-theme="dark"] .fld textarea:focus {
    border-color: var(--gm) !important;
    background: #262D25 !important;
  }
  [data-theme="dark"] table { color: #E8F0E9 !important; }
  [data-theme="dark"] th { background: #1E2420 !important; color: #7A9A7E !important; }
  [data-theme="dark"] tr:hover td { background: #1E2420 !important; }
  [data-theme="dark"] td { border-color: rgba(255,255,255,.06) !important; }
  [data-theme="dark"] .pgrid { background: rgba(255,255,255,.05) !important; }
  [data-theme="dark"] .pcard { background: #161C18 !important; }
  [data-theme="dark"] .pcard:hover { background: #1E2420 !important; }
  [data-theme="dark"] .step { color: #E8F0E9 !important; }
  [data-theme="dark"] .w-tab { color: #7A9A7E !important; }
  [data-theme="dark"] .w-tab.active { color: #52D68A !important; border-bottom-color: #52D68A !important; }
  [data-theme="dark"] .w-top { background: #0A1A0F !important; }
  [data-theme="dark"] .w-logo, [data-theme="dark"] .al-logo, [data-theme="dark"] .ar-logo { color: #52D68A !important; }
  [data-theme="dark"] .si { color: #7A9A7E !important; }
  [data-theme="dark"] .si:hover { background: #1E2420 !important; color: #E8F0E9 !important; }
  [data-theme="dark"] .si.active { background: rgba(27,67,50,.4) !important; color: #52D68A !important; }
  [data-theme="dark"] .kpi { background: #161C18 !important; }
  [data-theme="dark"] .pill.pg { background: rgba(27,99,50,.3) !important; }
  [data-theme="dark"] .pill.px { background: rgba(255,255,255,.08) !important; color: #7A9A7E !important; }
  [data-theme="dark"] .pill.po { background: rgba(180,83,9,.2) !important; }
  [data-theme="dark"] .pill.pr { background: rgba(192,57,43,.2) !important; }
  [data-theme="dark"] .pill.pb { background: rgba(30,64,175,.2) !important; }
  [data-theme="dark"] .pill.pp { background: rgba(124,58,237,.2) !important; }
  [data-theme="dark"] .btn-g { background: #1B4332 !important; }
  [data-theme="dark"] .btn-g:hover { background: #2D6A4F !important; }
  [data-theme="dark"] .rc, [data-theme="dark"] .role-card { background: #161C18 !important; border-color: rgba(255,255,255,.08) !important; }
  [data-theme="dark"] .summ-box, [data-theme="dark"] .summ { background: rgba(27,67,50,.25) !important; border-color: rgba(27,67,50,.5) !important; }
  [data-theme="dark"] .ai-box { background: rgba(27,67,50,.25) !important; }
  [data-theme="dark"] .on { background: #161C18 !important; border-color: #2D6A4F !important; }
  [data-theme="dark"] .vn { background: #161C18 !important; border-color: #2D6A4F !important; }
  [data-theme="dark"] .ov { background: rgba(0,0,0,.7) !important; }
  [data-theme="dark"] .so { background: #161C18 !important; border-color: rgba(255,255,255,.08) !important; }
  [data-theme="dark"] .so.sel { border-color: #2D6A4F !important; background: rgba(27,67,50,.25) !important; }
  [data-theme="dark"] .hero { background: linear-gradient(135deg, #0A1A0F, #0F1A12) !important; }
  [data-theme="dark"] .n-logo, [data-theme="dark"] .pick-logo, [data-theme="dark"] .r-logo { color: #52D68A !important; }
  [data-theme="dark"] .nl { color: #7A9A7E !important; }
  [data-theme="dark"] .nl.active, [data-theme="dark"] .nl:hover { color: #52D68A !important; }
  [data-theme="dark"] .cart-btn { background: #1B4332 !important; color: white !important; }
  [data-theme="dark"] .add-btn { background: #1B4332 !important; color: white !important; }
  [data-theme="dark"] .add-btn:hover { background: #2D6A4F !important; }
  [data-theme="dark"] .cc.active { background: #1B4332 !important; color: white !important; border-color: #1B4332 !important; }
  [data-theme="dark"] .pick-head, [data-theme="dark"] .r-header { filter: brightness(1.2); }
  [data-theme="dark"] .lbox { background: #161C18 !important; border-color: rgba(255,255,255,.1) !important; }
  [data-theme="dark"] .carousel-overlay { background: linear-gradient(to top, rgba(0,0,0,.85), transparent) !important; }
  [data-theme="dark"] .mn-btn { color: #7A9A7E !important; }
  [data-theme="dark"] .mn-btn.active { color: #52D68A !important; }
  [data-theme="dark"] .pb-top { border-color: rgba(255,255,255,.08) !important; }
  [data-theme="dark"] .ir { border-color: rgba(255,255,255,.06) !important; }
  [data-theme="dark"] .sc-tab { color: #7A9A7E !important; }
  [data-theme="dark"] .scan-area { background: #0A1A0F !important; }
  [data-theme="dark"] #s-roles { background: #0F1410 !important; }
  [data-theme="dark"] .auth-left.cl-green { background: #0A1A0F !important; }
  [data-theme="dark"] .auth-left.cl-blue { background: #0A0F1A !important; }
  [data-theme="dark"] .auth-left.cl-purple { background: #0F0A1A !important; }
`;

// ══════════════════════════════════════════
//  DICTIONNAIRE DE TRADUCTIONS
// ══════════════════════════════════════════

var T = {
  fr: {
    // Navigation
    'dashboard':       'Vue d\'ensemble',
    'products':        'Produits',
    'orders':          'Commandes',
    'reservations':    'Réservations',
    'invoices':        'Factures',
    'clients':         'Clients',
    'history':         'Historique ventes',
    'reviews':         'Avis & Notes',
    'announcements':   'Annonces',
    'premium':         'Premium',
    'scanner':         'Scanner QR',
    'report':          'Rapport PDF',
    'logout':          'Déconnexion',
    // Auth
    'login':           'Connexion',
    'register':        'Créer un compte',
    'email':           'Email',
    'password':        'Mot de passe',
    'login_btn':       'Accéder au dashboard →',
    'login_client':    'Se connecter',
    'firstname':       'Prénom',
    'lastname':        'Nom',
    'phone':           'Téléphone',
    'address':         'Adresse de livraison',
    'city':            'Ville',
    'country':         'Pays',
    // Produits
    'add_product':     '+ Ajouter',
    'edit':            'Modifier',
    'delete':          'Suppr.',
    'save':            'Enregistrer',
    'cancel':          'Annuler',
    'search':          'Rechercher...',
    'name_fr':         'Nom (FR)',
    'name_en':         'Nom (EN)',
    'cat_fr':          'Catégorie (FR)',
    'cat_en':          'Catégorie (EN)',
    'price':           'Prix normal (FCFA)',
    'promo':           'Prix promo',
    'stock':           'Stock',
    'desc_fr':         'Description (FR)',
    'desc_en':         'Description (EN)',
    'emoji':           'Emoji',
    'gen_ai':          '✦ Générer les descriptions avec l\'IA',
    'in_stock':        'En stock',
    'low_stock':       'restants',
    'out_stock':       'Rupture',
    // Commandes
    'status':          'Statut',
    'pending':         'En attente',
    'confirmed':       'Confirmée',
    'delivered':       'Livrée',
    'cancelled':       'Annulée',
    'all':             'Toutes',
    'date':            'Date',
    'total':           'Total',
    'customer':        'Client',
    'items':           'Articles',
    // Général
    'welcome':         'Bienvenue',
    'no_data':         'Aucune donnée',
    'saved':           'Enregistré ✓',
    'deleted':         'Supprimé',
    'confirm_delete':  'Supprimer ce produit ?',
    'dark_mode':       'Mode sombre',
    'light_mode':      'Mode clair',
    'lang_switch':     'EN',
    // Portail
    'who_are_you':     'Qui êtes-vous ?',
    'choose_profile':  'Choisissez votre profil pour accéder à votre espace',
    'client_title':    'Je fais mes\ncourses',
    'vendor_title':    'Je gère ma\nboutique',
    'admin_title':     'J\'administre\nla plateforme',
    'client_btn':      'Faire mes courses →',
    'vendor_btn':      'Gérer ma boutique →',
    'admin_btn':       'Accéder au panneau →',
    // Client
    'catalogue':       'Catalogue',
    'cart':            'Panier',
    'my_orders':       'Mes commandes',
    'my_invoices':     'Mes factures',
    'profile':         'Profil',
    'add_cart':        '+ Panier',
    'unavailable':     'Indisponible',
    'checkout':        'Commander',
    'delivery':        'Livraison',
    'pickup':          'Retrait',
  },

  en: {
    // Navigation
    'dashboard':       'Overview',
    'products':        'Products',
    'orders':          'Orders',
    'reservations':    'Reservations',
    'invoices':        'Invoices',
    'clients':         'Customers',
    'history':         'Sales History',
    'reviews':         'Reviews',
    'announcements':   'Announcements',
    'premium':         'Premium',
    'scanner':         'QR Scanner',
    'report':          'PDF Report',
    'logout':          'Sign out',
    // Auth
    'login':           'Sign in',
    'register':        'Create account',
    'email':           'Email',
    'password':        'Password',
    'login_btn':       'Access dashboard →',
    'login_client':    'Sign in',
    'firstname':       'First name',
    'lastname':        'Last name',
    'phone':           'Phone',
    'address':         'Delivery address',
    'city':            'City',
    'country':         'Country',
    // Products
    'add_product':     '+ Add',
    'edit':            'Edit',
    'delete':          'Del.',
    'save':            'Save',
    'cancel':          'Cancel',
    'search':          'Search...',
    'name_fr':         'Name (FR)',
    'name_en':         'Name (EN)',
    'cat_fr':          'Category (FR)',
    'cat_en':          'Category (EN)',
    'price':           'Price (FCFA)',
    'promo':           'Promo price',
    'stock':           'Stock',
    'desc_fr':         'Description (FR)',
    'desc_en':         'Description (EN)',
    'emoji':           'Emoji',
    'gen_ai':          '✦ Generate descriptions with AI',
    'in_stock':        'In stock',
    'low_stock':       'remaining',
    'out_stock':       'Out of stock',
    // Orders
    'status':          'Status',
    'pending':         'Pending',
    'confirmed':       'Confirmed',
    'delivered':       'Delivered',
    'cancelled':       'Cancelled',
    'all':             'All',
    'date':            'Date',
    'total':           'Total',
    'customer':        'Customer',
    'items':           'Items',
    // General
    'welcome':         'Welcome',
    'no_data':         'No data',
    'saved':           'Saved ✓',
    'deleted':         'Deleted',
    'confirm_delete':  'Delete this product?',
    'dark_mode':       'Dark mode',
    'light_mode':      'Light mode',
    'lang_switch':     'FR',
    // Portal
    'who_are_you':     'Who are you?',
    'choose_profile':  'Choose your profile to access your space',
    'client_title':    'I shop for\ngroceries',
    'vendor_title':    'I manage my\nstore',
    'admin_title':     'I manage\nthe platform',
    'client_btn':      'Shop now →',
    'vendor_btn':      'Manage my store →',
    'admin_btn':       'Access panel →',
    // Client
    'catalogue':       'Catalogue',
    'cart':            'Cart',
    'my_orders':       'My orders',
    'my_invoices':     'My invoices',
    'profile':         'Profile',
    'add_cart':        '+ Cart',
    'unavailable':     'Unavailable',
    'checkout':        'Order',
    'delivery':        'Delivery',
    'pickup':          'Pickup',
  }
};

// ══════════════════════════════════════════
//  FONCTIONS PRINCIPALES
// ══════════════════════════════════════════

var currentTheme = localStorage.getItem(THEME_KEY) || 'light';
var currentLang  = localStorage.getItem(LANG_KEY)  || 'fr';

function applyTheme(theme) {
  currentTheme = theme;
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.setAttribute('data-theme', theme);
  var btn = document.getElementById('fm-theme-btn');
  if (btn) {
    btn.innerHTML = theme === 'dark'
      ? '<span style="font-size:16px">☀️</span>'
      : '<span style="font-size:16px">🌙</span>';
    btn.title = theme === 'dark' ? T[currentLang]['light_mode'] : T[currentLang]['dark_mode'];
  }
}

function applyLang(lang) {
  currentLang = lang;
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.setAttribute('lang', lang === 'fr' ? 'fr' : 'en');
  // Traduire tous les éléments avec data-t="key"
  document.querySelectorAll('[data-t]').forEach(function(el) {
    var key = el.getAttribute('data-t');
    var val = T[lang][key];
    if (!val) return;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      if (el.placeholder !== undefined) el.placeholder = val;
    } else if (el.tagName === 'OPTION') {
      el.textContent = val;
    } else {
      el.textContent = val;
    }
  });
  // Mettre à jour bouton lang
  var lbtn = document.getElementById('fm-lang-btn');
  if (lbtn) lbtn.textContent = T[lang]['lang_switch'];
  // Retrigger si callbacks enregistrés
  if (typeof window.onLangChange === 'function') window.onLangChange(lang);
}

function toggleTheme() {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

function toggleLang() {
  applyLang(currentLang === 'fr' ? 'en' : 'fr');
}

// Raccourci global : t('key') → traduit selon langue courante
window.t = function(key) {
  return (T[currentLang] && T[currentLang][key]) || key;
};
window.currentLang = function() { return currentLang; };
window.currentTheme = function() { return currentTheme; };
window.applyLang = applyLang;
window.applyTheme = applyTheme;
window.toggleTheme = toggleTheme;
window.toggleLang = toggleLang;

// ══════════════════════════════════════════
//  INJECTION CSS DARK MODE
// ══════════════════════════════════════════

function injectDarkStyles() {
  var style = document.createElement('style');
  style.id = 'fm-dark-styles';
  style.textContent = DARK_VARS;
  document.head.appendChild(style);
}

// ══════════════════════════════════════════
//  BOUTON FLOTTANT (Dark + Lang)
// ══════════════════════════════════════════

function injectToggleWidget() {
  var widget = document.createElement('div');
  widget.id = 'fm-widget';
  widget.style.cssText = [
    'position:fixed', 'bottom:1.5rem', 'right:1.5rem',
    'display:flex', 'flex-direction:column', 'gap:8px',
    'z-index:9999', 'align-items:center'
  ].join(';');

  // Bouton thème
  var themeBtn = document.createElement('button');
  themeBtn.id = 'fm-theme-btn';
  themeBtn.title = currentTheme === 'dark' ? T[currentLang]['light_mode'] : T[currentLang]['dark_mode'];
  themeBtn.style.cssText = [
    'width:40px', 'height:40px', 'border-radius:50%',
    'border:1.5px solid rgba(27,67,50,.2)',
    'background:var(--wh,#fff)',
    'cursor:pointer', 'display:flex', 'align-items:center', 'justify-content:center',
    'box-shadow:0 2px 12px rgba(0,0,0,.1)',
    'transition:all .2s', 'font-size:16px',
    'font-family:inherit'
  ].join(';');
  themeBtn.innerHTML = currentTheme === 'dark' ? '<span style="font-size:16px">☀️</span>' : '<span style="font-size:16px">🌙</span>';
  themeBtn.addEventListener('click', toggleTheme);
  themeBtn.addEventListener('mouseenter', function(){ this.style.transform='scale(1.1)'; });
  themeBtn.addEventListener('mouseleave', function(){ this.style.transform='scale(1)'; });

  // Bouton langue
  var langBtn = document.createElement('button');
  langBtn.id = 'fm-lang-btn';
  langBtn.title = 'Changer la langue / Switch language';
  langBtn.style.cssText = [
    'width:40px', 'height:40px', 'border-radius:50%',
    'border:1.5px solid rgba(27,67,50,.2)',
    'background:var(--gr,#1B4332)',
    'color:white', 'cursor:pointer',
    'display:flex', 'align-items:center', 'justify-content:center',
    'box-shadow:0 2px 12px rgba(0,0,0,.1)',
    'transition:all .2s',
    'font-size:11px', 'font-weight:700', 'letter-spacing:.5px',
    'font-family:inherit'
  ].join(';');
  langBtn.textContent = T[currentLang]['lang_switch'];
  langBtn.addEventListener('click', toggleLang);
  langBtn.addEventListener('mouseenter', function(){ this.style.transform='scale(1.1)'; });
  langBtn.addEventListener('mouseleave', function(){ this.style.transform='scale(1)'; });

  widget.appendChild(themeBtn);
  widget.appendChild(langBtn);
  document.body.appendChild(widget);
}

// ══════════════════════════════════════════
//  INIT au chargement de la page
// ══════════════════════════════════════════

function init() {
  injectDarkStyles();
  injectToggleWidget();
  applyTheme(currentTheme);
  applyLang(currentLang);

  // Écouter la préférence système (si pas de préférence sauvegardée)
  if (!localStorage.getItem(THEME_KEY)) {
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) applyTheme('dark');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
