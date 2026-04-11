/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   FRESHMART — INVOICE ENGINE  v1.0                              ║
 * ║   Générateur PDF production · jsPDF 2.x compatible             ║
 * ║   Inclure APRÈS jsPDF : <script src="invoice.js"></script>     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 *  CORRECTIONS PRODUCTION :
 *  ✅ Emojis retirés du PDF (remplacés par texte neutre)
 *  ✅ Accents français encodés correctement (Latin-1 safe)
 *  ✅ doc.triangle() remplacé (n'existe pas dans jsPDF 2.x)
 *  ✅ roundedRect() utilisé correctement
 *  ✅ Nombres formatés sans espaces insécables
 *  ✅ Apostrophes et guillemets sécurisés
 *  ✅ Troncature intelligente des textes longs
 *
 *  API PUBLIQUE :
 *  FMInvoice.generate(order, store, clientInfo) → télécharge le PDF
 *  FMInvoice.generateReport(stores, orders, clients) → rapport SA
 */

(function(window) {
  'use strict';

  /* ─────────────────────────────────────────
     UTILITAIRES PDF — sécurisation des textes
  ───────────────────────────────────────────*/

  /**
   * Nettoyer un texte pour jsPDF :
   * - Supprimer les emojis (hors Latin-1)
   * - Remplacer les espaces insécables par des espaces normaux
   * - Sécuriser les apostrophes et guillemets
   * - Tronquer si nécessaire
   */
  function safe(str, maxLen) {
    if (!str) return '';
    var s = String(str)
      // Retirer les emojis et caractères hors BMP (> U+FFFF)
      .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
      // Retirer les autres emojis courants (plage symboles)
      .replace(/[\u2600-\u27FF\u2B00-\u2BFF\uFE00-\uFE0F]/g, '')
      // Retirer les caractères de variation Unicode
      .replace(/\uFE0F/g, '')
      // Espaces insécables → espace normal
      .replace(/\u00A0|\u202F|\u2009|\u2007/g, ' ')
      // Apostrophe typographique → apostrophe droite
      .replace(/[\u2018\u2019\u02BC]/g, "'")
      // Guillemets typographiques → guillemets droits
      .replace(/[\u201C\u201D\u00AB\u00BB]/g, '"')
      // Tirets longs → tiret simple
      .replace(/[\u2013\u2014]/g, '-')
      // Nettoyer les espaces multiples
      .replace(/\s+/g, ' ')
      .trim();
    if (maxLen && s.length > maxLen) {
      s = s.slice(0, maxLen - 1) + '.';
    }
    return s;
  }

  /**
   * Formater un montant sans espaces insécables
   * (toLocaleString peut retourner U+202F sur certains navigateurs)
   */
  function money(n) {
    var num = Math.floor(n || 0);
    // Formatage manuel pour éviter les caractères problématiques
    return num.toLocaleString('fr-FR').replace(/\u202F|\u00A0/g, ' ') + ' FCFA';
  }

  function moneyShort(n) {
    var num = Math.floor(n || 0);
    return num.toLocaleString('fr-FR').replace(/\u202F|\u00A0/g, ' ') + ' F';
  }

  /**
   * Formater une date en français sans caractères problématiques
   */
  function dateStr(dateInput) {
    var d = new Date(dateInput);
    var months = ['janvier','fevrier','mars','avril','mai','juin',
                  'juillet','aout','septembre','octobre','novembre','decembre'];
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function dateShort(dateInput) {
    var d = new Date(dateInput);
    var months = ['jan','fev','mar','avr','mai','jun',
                  'jul','aou','sep','oct','nov','dec'];
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  /* ─────────────────────────────────────────
     PALETTE & HELPERS DESSIN
  ───────────────────────────────────────────*/

  var PALETTE = {
    G    : [27,  99,  50],   // vert foncé
    G2   : [45, 106,  79],   // vert moyen
    GL   : [216,243,220],    // vert clair
    WHITE: [255,255,255],
    INK  : [17,  22,  18],
    INK2 : [61,  73,  64],
    INK3 : [122,140,128],
    LN   : [227,234,229],
    BG   : [247,249,247],
    OR   : [180, 83,   9],
    BLUE : [30,  64, 175],
    RED  : [192, 57,  43],
  };

  function makeHelpers(doc) {
    return {
      setC : function(c) { doc.setTextColor(c[0], c[1], c[2]); },
      setF : function(c) { doc.setFillColor(c[0], c[1], c[2]); },
      setD : function(c) { doc.setDrawColor(c[0], c[1], c[2]); },
      rect : function(x,y,w,h) { doc.rect(x,y,w,h,'F'); },
      line : function(x1,y1,x2,y2) { doc.line(x1,y1,x2,y2); },
      txt  : function(t,x,y,opts) { doc.text(safe(String(t)), x, y, opts||{}); },
      // Coin décoratif (remplace doc.triangle qui n'existe pas)
      corner: function(x,y,size, color) {
        doc.setFillColor(color[0], color[1], color[2]);
        // Simuler le triangle avec un polygone
        doc.triangle ? doc.triangle(x,y+size, x+size,y+size, x+size,y,'F')
                     : doc.rect(x, y, size, size, 'F'); // fallback carré
      },
      // Badge coloré (remplace roundedRect)
      badge: function(x,y,w,h,color) {
        doc.setFillColor(color[0], color[1], color[2]);
        // Utiliser roundedRect si disponible, sinon rect
        if (doc.roundedRect) {
          doc.roundedRect(x, y, w, h, 2, 2, 'F');
        } else {
          doc.rect(x, y, w, h, 'F');
        }
      },
    };
  }

  /* ─────────────────────────────────────────
     GÉNÉRATEUR FACTURE PRINCIPALE
  ───────────────────────────────────────────*/

  /**
   * @param {object} order      — commande adaptée (FM.adaptOrder)
   * @param {object} store      — boutique adaptée (FM.adaptStore)
   * @param {object} clientInfo — { fn, ln, phone, addr } (optionnel, complète order.customer)
   */
  function generateInvoice(order, store, clientInfo) {
    if (!window.jspdf) {
      console.error('[FMInvoice] jsPDF non chargé');
      return;
    }

    var doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
    var h = makeHelpers(doc);
    var PW = 210, PH = 297;
    var P = PALETTE;

    // ── Données boutique ──
    var storeName  = safe(store ? store.name : 'FreshMart', 40);
    var storeCity  = safe(store ? (store.city || '') + (store.country ? ', ' + store.country : '') : '');
    var storeAddr  = safe(store ? (store.addr || '') : '');
    var storePhone = safe(store ? (store.ownerPhone || store.whatsappPhone || '') : '');
    var storeEmail = safe(store ? (store.ownerEmail || '') : '');
    var storeType  = safe(store ? (store.storeType || 'Epicerie') : 'Epicerie');

    // ── Données commande ──
    var invNum    = 'FM-' + order.id.slice(-8).toUpperCase();
    var invDate   = dateStr(order.createdAt);
    var dueDate   = dateStr(new Date(new Date(order.createdAt).getTime() + 30*86400000));
    var statusMap = { pending: 'En attente', confirmed: 'Confirmee', delivered: 'Livree', cancelled: 'Annulee' };
    var statusLabel = statusMap[order.status] || safe(order.status);
    var statusColor = order.status === 'delivered' ? P.BLUE
                    : order.status === 'confirmed'  ? P.G
                    : order.status === 'cancelled'  ? P.RED : P.OR;
    var deliveryLabel = order.delType === 'delivery' ? 'Livraison domicile' : 'Retrait boutique';

    // ── Données client ──
    var custName  = safe(order.customer && order.customer.name ? order.customer.name
                       : clientInfo ? (clientInfo.fn + ' ' + clientInfo.ln) : 'Client', 40);
    var custPhone = safe(order.customer && order.customer.phone ? order.customer.phone
                       : clientInfo ? (clientInfo.phone || '') : '');
    var custAddr  = safe(order.addr || (clientInfo ? (clientInfo.addr || '') : ''));

    /* ════════════════════════════════════════
       ZONE 1 — EN-TÊTE (0 → 55 mm)
    ════════════════════════════════════════ */
    h.setF(P.G); h.rect(0, 0, PW, 55);

    // Coin décoratif haut-droit (vert moyen)
    h.setF(P.G2);
    // Dessiner 3 rectangles décroissants pour simuler un biseau
    doc.rect(PW-50, 0, 50, 55, 'F');
    h.setF(P.G);
    doc.rect(PW-50, 0, 30, 55, 'F');

    // Nom boutique
    h.setC(P.WHITE);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
    h.txt(storeName, 16, 22);

    // Type boutique
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    h.setC(P.GL);
    h.txt(storeType, 16, 29);

    // Infos boutique
    doc.setFontSize(8.5);
    var headerY = 36;
    if (storeCity)  { h.txt(storeCity,  16, headerY); headerY += 6; }
    if (storeAddr)  { h.txt(storeAddr,  16, headerY); headerY += 6; }
    if (storePhone) { h.txt('Tel: ' + storePhone, 16, headerY); }

    // Mot FACTURE à droite
    h.setC(P.WHITE);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(26);
    h.txt('FACTURE', PW-16, 24, { align: 'right' });

    // Numéro et date
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    h.setC(P.GL);
    h.txt(invNum, PW-16, 33, { align: 'right' });
    h.txt('Le ' + invDate, PW-16, 41, { align: 'right' });

    /* ════════════════════════════════════════
       ZONE 2 — BANDE INFO (55 → 95 mm)
    ════════════════════════════════════════ */
    h.setF(P.BG); h.rect(0, 55, PW, 40);

    // Séparateur fin
    h.setF(P.LN); h.rect(14, 55, 182, 0.3);

    // Bloc CLIENT (gauche)
    h.setC(P.INK3); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
    h.txt('FACTURE A', 16, 66);

    h.setC(P.INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    h.txt(custName, 16, 74);

    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    h.setC(P.INK2);
    var clientY = 81;
    if (custPhone) { h.txt('Tel: ' + custPhone, 16, clientY); clientY += 7; }
    if (custAddr)  { h.txt(custAddr, 16, clientY); }

    // Séparateur vertical
    h.setF(P.LN); h.rect(105, 58, 0.3, 33);

    // Bloc STATUT (droite-haut)
    h.setC(P.INK3); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
    h.txt('STATUT', 112, 66);

    h.badge(112, 68, 32, 7, statusColor);
    h.setC(P.WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    h.txt(statusLabel.toUpperCase(), 128, 73.5, { align: 'center' });

    // Bloc ECHEANCE
    h.setC(P.INK3); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
    h.txt('ECHEANCE', 150, 66);
    h.setC(P.INK2); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    h.txt(dueDate, 150, 73);

    // Bloc LIVRAISON
    h.setC(P.INK3); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
    h.txt('LIVRAISON', 112, 81);
    h.setC(P.INK2); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    h.txt(deliveryLabel, 112, 88);

    /* ════════════════════════════════════════
       ZONE 3 — TABLEAU ARTICLES
    ════════════════════════════════════════ */
    var y = 105;
    var cols = [16, 88, 118, 146, 172];
    var colHeaders = ['DESCRIPTION', 'QTE', 'PRIX UNIT.', 'REMISE', 'TOTAL'];

    // En-tête colonnes
    h.setF(P.G); h.rect(14, y-5, 182, 9);
    h.setC(P.WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
    colHeaders.forEach(function(ch, i) { h.txt(ch, cols[i], y+1); });
    y += 9;

    var items = order.items || [];

    items.forEach(function(it, i) {
      // Saut de page si nécessaire
      if (y > 245) {
        doc.addPage();
        h.setF(P.G); h.rect(14, 15, 182, 9);
        h.setC(P.WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
        colHeaders.forEach(function(ch, j) { h.txt(ch, cols[j], 21); });
        y = 30;
      }

      // Fond alterné
      h.setF(i % 2 === 0 ? P.BG : P.WHITE);
      h.rect(14, y-5, 182, 12);

      // Ligne séparation fine
      h.setF(P.LN); h.rect(14, y+7, 182, 0.2);

      // Nom produit (sans emoji)
      var prodName = safe(it.name || '', 35);
      var unit     = it.price || 0;
      var orig     = it.originalPrice || unit;
      var qty      = it.qty || 1;
      var discount = orig > unit ? (orig - unit) * qty : 0;
      var lineTotal= unit * qty;

      h.setC(P.INK); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      h.txt(prodName, cols[0], y+2);

      doc.setFont('helvetica', 'bold');
      h.txt(String(qty), cols[1], y+2);

      doc.setFont('helvetica', 'normal');
      h.setC(P.INK2);
      h.txt(moneyShort(unit), cols[2], y+2);

      if (discount > 0) {
        h.setC(P.OR);
        h.txt('-' + moneyShort(discount), cols[3], y+2);
      } else {
        h.setC(P.INK3);
        h.txt('—', cols[3], y+2);
      }

      h.setC(P.INK); doc.setFont('helvetica', 'bold');
      h.txt(moneyShort(lineTotal), PW-16, y+2, { align: 'right' });

      y += 13;
    });

    /* ════════════════════════════════════════
       ZONE 4 — TOTAUX
    ════════════════════════════════════════ */
    y += 4;
    h.setF(P.LN); h.rect(14, y, 182, 0.3);
    y += 8;

    var subtotal   = items.reduce(function(s, it) { return s + (it.originalPrice || it.price) * it.qty; }, 0);
    var totalDisc  = subtotal - order.total;

    // Sous-total
    h.setC(P.INK3); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    h.txt('Sous-total', 120, y);
    h.setC(P.INK2);
    h.txt(money(subtotal), PW-16, y, { align: 'right' });
    y += 8;

    // Remise (si applicable)
    if (totalDisc > 0) {
      h.setC(P.INK3); h.txt('Remises', 120, y);
      h.setC(P.OR);   h.txt('-' + money(totalDisc), PW-16, y, { align: 'right' });
      y += 8;
    }

    // Frais livraison (si applicable)
    if (order.deliveryFee && order.deliveryFee > 0) {
      h.setC(P.INK3); h.txt('Frais de livraison', 120, y);
      h.setC(P.INK2); h.txt(money(order.deliveryFee), PW-16, y, { align: 'right' });
      y += 8;
    }

    y += 2;
    // Bloc TOTAL TTC
    h.setF(P.G); h.rect(100, y-6, PW-114, 17);
    h.setC(P.GL); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    h.txt('TOTAL TTC', 106, y+2);
    h.setC(P.WHITE); doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    h.txt(money(order.total), PW-16, y+5, { align: 'right' });
    y += 22;

    /* ════════════════════════════════════════
       ZONE 5 — NOTE CLIENT (si présente)
    ════════════════════════════════════════ */
    if (order.note && order.note.trim()) {
      var noteText = safe(order.note, 100);
      if (y + 20 > PH - 30) { doc.addPage(); y = 20; }

      h.setF([255, 251, 235]); h.rect(14, y, 182, 18);
      h.setF(P.OR);            h.rect(14, y, 2,   18);

      h.setC(P.OR); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
      h.txt('NOTE CLIENT', 20, y+6);

      h.setC(P.INK2); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
      // Découper la note sur 2 lignes max
      var words    = noteText.split(' ');
      var line1 = '', line2 = '';
      words.forEach(function(w) {
        if ((line1 + w).length < 65) line1 += (line1 ? ' ' : '') + w;
        else line2 += (line2 ? ' ' : '') + w;
      });
      h.txt(line1, 20, y+12);
      if (line2) h.txt(line2.slice(0, 70), 20, y+18);
      y += 26;
    }

    /* ════════════════════════════════════════
       PIED DE PAGE
    ════════════════════════════════════════ */
    var footerY = PH - 20;

    h.setF(P.G);  h.rect(0, footerY-2, PW, 0.5);
    h.setF(P.GL); h.rect(0, footerY-2, 50, 0.5);

    h.setC(P.INK3); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    h.txt('Merci pour votre confiance — ' + storeName, PW/2, footerY+4, { align: 'center' });

    doc.setFontSize(7);
    var footerInfo = storeCity + (storePhone ? '   Tel: ' + storePhone : '');
    h.txt(safe(footerInfo), PW/2, footerY+10, { align: 'center' });
    h.txt('Facture ' + invNum + '  -  Generee le ' + dateShort(new Date()), PW-16, footerY+10, { align: 'right' });

    // Numéros de pages
    var totalPages = doc.internal.getNumberOfPages();
    for (var p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      h.setC(P.INK3); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
      h.txt('Page ' + p + '/' + totalPages, 16, footerY+10);
    }

    doc.save('facture-' + invNum + '.pdf');
    return invNum;
  }

  /* ─────────────────────────────────────────
     GÉNÉRATEUR RAPPORT SUPER ADMIN
  ───────────────────────────────────────────*/

  function generateReport(stores, orders, clients) {
    if (!window.jspdf) return;

    var doc = new window.jspdf.jsPDF();
    var h = makeHelpers(doc);
    var now = new Date();
    var P = PALETTE;

    var rev  = orders.reduce(function(s,o){ return s+o.total; }, 0);
    var pend = orders.filter(function(o){ return o.status==='pending'; }).length;
    var delivered = orders.filter(function(o){ return o.status==='delivered'; }).length;

    // En-tête
    h.setF(P.G); h.rect(0, 0, 210, 38);
    h.setC(P.WHITE); doc.setFont('helvetica','bold'); doc.setFontSize(18);
    h.txt('FreshMart - Rapport Super Admin', 14, 16);
    doc.setFont('helvetica','normal'); doc.setFontSize(9);
    h.setC(P.GL);
    h.txt('Rapport du ' + dateStr(now), 14, 25);
    h.txt('FreshMart Global', 14, 32);

    var y = 50;

    // Section Résumé
    h.setC(P.G); doc.setFont('helvetica','bold'); doc.setFontSize(13);
    h.txt('Resume Global', 14, y); y += 9;

    var summaryRows = [
      ['Boutiques actives', stores.filter(function(s){ return s.active; }).length + ' / ' + stores.length],
      ['Clients inscrits', String(clients.length)],
      ['Commandes totales', String(orders.length)],
      ['Commandes livrees', String(delivered)],
      ['En attente', String(pend)],
      ['Chiffre d\'affaires', money(rev)],
    ];

    summaryRows.forEach(function(row, i) {
      h.setF(i%2===0 ? P.BG : P.WHITE); h.rect(14, y-4, 182, 9);
      h.setC(P.INK2); doc.setFont('helvetica','normal'); doc.setFontSize(10);
      h.txt(row[0], 18, y+3);
      h.setC(P.INK); doc.setFont('helvetica','bold');
      h.txt(row[1], 190, y+3, { align:'right' });
      y += 11;
    });

    y += 6;

    // Section Boutiques
    h.setC(P.G); doc.setFont('helvetica','bold'); doc.setFontSize(13);
    h.txt('Detail des boutiques', 14, y); y += 9;

    // En-tête colonnes
    h.setF(P.G); h.rect(14, y-4, 182, 8);
    h.setC(P.WHITE); doc.setFont('helvetica','bold'); doc.setFontSize(8);
    h.txt('Boutique', 18, y+1);
    h.txt('Type', 70, y+1);
    h.txt('Ville', 100, y+1);
    h.txt('Proprietaire', 130, y+1);
    h.txt('CA (FCFA)', 190, y+1, { align: 'right' });
    y += 10;

    stores.forEach(function(s, i) {
      if (y > 265) { doc.addPage(); y = 20; }
      var so  = orders.filter(function(o){ return o.storeId === s.id; });
      var rev = so.reduce(function(sum, o){ return sum + o.total; }, 0);

      h.setF(i%2===0 ? P.BG : P.WHITE); h.rect(14, y-4, 182, 9);
      doc.setFont('helvetica','normal'); doc.setFontSize(8.5);

      h.setC(P.INK); h.txt(safe(s.name, 22), 18, y+2);
      h.setC(P.INK2); h.txt(safe(s.storeType || 'Epicerie', 15), 70, y+2);
      h.txt(safe(s.city || '—', 15), 100, y+2);
      h.txt(safe(s.ownerName || '—', 20), 130, y+2);
      h.setC(P.G); doc.setFont('helvetica','bold');
      h.txt(money(rev), 190, y+2, { align: 'right' });
      y += 11;
    });

    // Pied de page
    var footerY = 277;
    h.setF(P.G); h.rect(0, footerY, 210, 0.5);
    h.setC(P.INK3); doc.setFont('helvetica','normal'); doc.setFontSize(7);
    h.txt('FreshMart Global  -  Rapport genere le ' + dateStr(now), 105, footerY+6, { align: 'center' });

    doc.save('rapport-freshmart-' + now.getFullYear() + '-' + (now.getMonth()+1) + '.pdf');
  }

  /* ─── API publique ─── */
  window.FMInvoice = {
    generate     : generateInvoice,
    generateReport: generateReport,
    safe         : safe,
    money        : money,
    dateStr      : dateStr,
  };

})(window);
