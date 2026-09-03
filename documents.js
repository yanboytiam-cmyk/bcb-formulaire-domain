/* ══════════════════════════════════════════════════════════════════════════
   BCB Liberty Health Care — fabrication des documents patient
   ──────────────────────────────────────────────────────────────────────────
   Les TROIS documents sont produits ici, dans le navigateur, deja signes, au
   moment ou le patient valide le formulaire :

     A. Patient Intake Package        (Sections A / B / C / D du modele v3)
     B. Discharge Concern & Authorization
     C. Carelon Overlapping Authorization Attestation  (COMAR 10.09.80.06B)

   n8n ne fabrique plus rien : il depose les trois fichiers sur le Drive et
   ecrit une ligne. L'attente du patient passe d'une quarantaine de secondes a
   quelques-unes, et le document ne depend plus d'un modele Google Docs qui
   peut etre modifie par megarde.

   La signature du prestataire reste vide tant que Caroline Bonu n'a pas signe
   une fois sur sa page dediee ; ensuite elle est apposee automatiquement.
   ══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* Les couleurs sont celles du formulaire : le document doit se reconnaitre
     au premier coup d'oeil comme venant du meme cabinet. */
  var FOREST = [45, 74, 62];
  var SAGE = [107, 143, 113];
  var GOLD = [201, 153, 74];
  var GREY = [125, 140, 130];
  var INK = [28, 43, 35];
  var LIGNE = [222, 232, 223];
  var DOUX = [244, 247, 244];

  var CABINET = {
    nom: 'BCB Liberty Health Care',
    adresse: '1 N Charles Street, Baltimore, MD 21201',
    contact: 'info@bcblibertyhealthcare.com  ·  +1 (240) 709-7791',
    npi: '1518688100',
    tin: '88-0620378'
  };

  var L = 54, LARG = 612, HAUT = 792;
  var UTILE = LARG - L * 2;

  /* L'attestation d'autorisations superposees n'est pas un document de BCB :
     c'est le formulaire de Carelon, l'organisme de tutelle, que le cabinet
     remplit et lui renvoie. Il doit donc porter l'identite de Carelon, sinon la
     hierarchie ne reconnait pas le sien. Logo, violets et turquoise sont releves
     sur le modele officiel (Discharge template.docx). */
  var CARELON = {
    nom: 'Carelon Behavioral Health – Maryland',
    titre: 'Attestation to Discharge Conflicting/Overlapping Authorization(s) '
      + 'Due to Overlap Requirement',
    reference: 'COMAR 10.09.80.06B',
    telephone: '1-800-888-1965',
    site: 'maryland.carelonbh.com',
    ratio: 333 / 86,
    logo: 'data:image/png;base64,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'
  };

  /* Un theme = les sept couleurs du gabarit plus la ligne de pied de page.
     Les briques de mise en page ne connaissent que ca : changer de theme suffit
     a changer d'identite sans toucher au contenu. */
  var THEME_BCB = {
    style: 'bcb',
    primaire: FOREST, second: SAGE, accent: GOLD,
    gris: GREY, encre: INK, ligne: LIGNE, doux: DOUX,
    pied: CABINET.nom
  };

  var THEME_CARELON = {
    style: 'carelon',
    primaire: [59, 6, 135],     /* le violet profond des titres du modele */
    second: [80, 52, 148],      /* le violet du logo */
    accent: [1, 185, 183],      /* le turquoise de la marque */
    gris: [120, 114, 138], encre: [29, 26, 45],
    ligne: [226, 221, 238], doux: [246, 243, 252],
    pied: CARELON.site
  };

  var POINTS_CARELON = [[43, 191, 240], [1, 185, 183], [135, 122, 184]];


  function logoBCB() {
    var img = document.querySelector('.intro-logo, .header-logo');
    return (img && img.src && img.src.indexOf('data:image') === 0) ? img.src : null;
  }

  function nonVide(v) {
    if (v === null || v === undefined) return '';
    v = String(v).trim();
    return (v === 'N/A' || v === 'undefined' || v === 'null') ? '' : v;
  }

  function estOui(v) {
    return String(v || '').trim().toLowerCase() === 'yes';
  }

  /* Une photo de carte d'assurance pese souvent plusieurs megaoctets. Telle
     quelle elle alourdirait le PDF autant que l'envoi. On la redimensionne
     avant de l'incruster : le texte de la carte reste lisible a 1400 px. */
  function preparerImage(dataUri, maxCote) {
    return new Promise(function (resolve) {
      if (!dataUri || dataUri.indexOf('data:image') !== 0) { resolve(null); return; }
      var img = new Image();
      img.onload = function () {
        try {
          var ech = Math.min(1, maxCote / Math.max(img.width, img.height));
          var w = Math.max(1, Math.round(img.width * ech));
          var h = Math.max(1, Math.round(img.height * ech));
          var c = document.createElement('canvas');
          c.width = w; c.height = h;
          var g = c.getContext('2d');
          g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
          g.drawImage(img, 0, 0, w, h);
          resolve({ uri: c.toDataURL('image/jpeg', 0.82), w: w, h: h, format: 'JPEG' });
        } catch (e) { resolve(null); }
      };
      img.onerror = function () { resolve(null); };
      img.src = dataUri;
    });
  }

  /* ────────────────────────────────────────────────────────────────────────
     Le gabarit BCB : bandeau, pied de page, et les briques de mise en page.
     Les trois documents ne font qu'empiler ces briques.
     ──────────────────────────────────────────────────────────────────────── */
  function nouvellePage(titre, sousTitre, theme) {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
    var etat = { y: 0 };
    var logo = logoBCB();

    /* Les briques ci-dessous ne connaissent que ces sept noms. En les
       redeclarant ici on rebadge tout le gabarit d'un seul coup, sans toucher
       a une seule ligne de contenu. */
    var T = theme || THEME_BCB;
    var FOREST = T.primaire, SAGE = T.second, GOLD = T.accent;
    var GREY = T.gris, INK = T.encre, LIGNE = T.ligne, DOUX = T.doux;

    /* En-tete de Carelon : leur logo, leurs violets, leur titre officiel.
       Le cabinet n'apparait qu'a l'interieur, a sa place de prestataire. */
    /* Le filet reprend les trois couleurs des pastilles du logo, fondues dans
       le violet : une seule barre, pas des marques posees a cote. */
    function filetCarelon() {
      doc.setFillColor(FOREST[0], FOREST[1], FOREST[2]);
      doc.rect(0, 0, LARG, 6, 'F');
      for (var i = 0; i < POINTS_CARELON.length; i++) {
        var c = POINTS_CARELON[i];
        doc.setFillColor(c[0], c[1], c[2]);
        doc.rect(i * 30, 0, 30, 6, 'F');
      }
    }

    /* L'en-tete est serre volontairement : chaque point gagne ici est un point
       de texte gagne en bas de page, et l'attestation doit tenir en deux
       feuilles. Elle circule agrafee chez Carelon. */
    function bandeauCarelon() {
      filetCarelon();
      var yl = 28, larg = 132, haut = larg / CARELON.ratio;
      try { doc.addImage(CARELON.logo, 'PNG', L, yl, larg, haut); } catch (e) { }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.4);
      doc.setTextColor(SAGE[0], SAGE[1], SAGE[2]);
      doc.text(CARELON.reference, LARG - L, yl + 12, { align: 'right' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.4);
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.text(CARELON.site, LARG - L, yl + 23, { align: 'right' });

      etat.y = yl + haut + 20;
      doc.setFont('times', 'bold'); doc.setFontSize(14);
      doc.setTextColor(FOREST[0], FOREST[1], FOREST[2]);
      var lg = doc.splitTextToSize(titre, UTILE);
      for (var j = 0; j < lg.length; j++) { doc.text(lg[j], L, etat.y); etat.y += 16; }
      etat.y += 1;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.text(sousTitre, L, etat.y);
      etat.y += 12;
      doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]); doc.setLineWidth(1.6);
      doc.line(L, etat.y, L + 62, etat.y);
      doc.setDrawColor(LIGNE[0], LIGNE[1], LIGNE[2]); doc.setLineWidth(0.8);
      doc.line(L + 62, etat.y, LARG - L, etat.y);
      etat.y += 20;
    }

    function bandeau() {
      if (T.style === 'carelon') { bandeauCarelon(); return; }
      doc.setFillColor(FOREST[0], FOREST[1], FOREST[2]);
      doc.rect(0, 0, LARG, 6, 'F');
      doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
      doc.rect(0, 6, LARG, 1.6, 'F');
      var y = 30, x = L;
      if (logo) {
        try { doc.addImage(logo, 'PNG', L, y, 62, 62); x = L + 78; } catch (e) { x = L; }
      }
      doc.setFont('times', 'bold'); doc.setFontSize(15);
      doc.setTextColor(FOREST[0], FOREST[1], FOREST[2]);
      doc.text(titre, x, y + 18);
      doc.setFont('times', 'normal'); doc.setFontSize(10);
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.text(sousTitre, x, y + 33);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.2);
      doc.setTextColor(FOREST[0], FOREST[1], FOREST[2]);
      doc.text(CABINET.nom, x, y + 50);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.6);
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.text(CABINET.adresse, x, y + 60);
      doc.text(CABINET.contact, x, y + 70);
      etat.y = 112;
      doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]); doc.setLineWidth(0.8);
      doc.line(L, etat.y, LARG - L, etat.y);
      etat.y += 22;
    }

    function pied() {
      var n = doc.internal.getNumberOfPages();
      for (var i = 1; i <= n; i++) {
        doc.setPage(i);
        doc.setDrawColor(LIGNE[0], LIGNE[1], LIGNE[2]); doc.setLineWidth(0.6);
        doc.line(L, HAUT - 44, LARG - L, HAUT - 44);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.2);
        doc.setTextColor(155, 165, 158);
        doc.text('Confidential — protected health information.', L, HAUT - 31);
        doc.text(T.pied + '  ·  Page ' + i + ' of ' + n, LARG - L, HAUT - 31, { align: 'right' });

        /* Une page detachee du reste doit encore dire de qui elle vient :
           l'attestation circule feuille par feuille chez Carelon. */
        if (T.style === 'carelon' && i > 1) {
          filetCarelon();
          doc.setFont('helvetica', 'bold'); doc.setFontSize(7.4);
          doc.setTextColor(SAGE[0], SAGE[1], SAGE[2]);
          doc.text(CARELON.nom.toUpperCase(), L, 26);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(GREY[0], GREY[1], GREY[2]);
          doc.text(CARELON.reference, LARG - L, 26, { align: 'right' });
          doc.setDrawColor(LIGNE[0], LIGNE[1], LIGNE[2]); doc.setLineWidth(0.6);
          doc.line(L, 33, LARG - L, 33);
        }
      }
    }

    function place(h) {
      if (etat.y + h > HAUT - 62) { doc.addPage(); etat.y = 52; return true; }
      return false;
    }
    function saut() { doc.addPage(); etat.y = 52; }

    /* Bandeau de grande section (A, B, C, D) : il doit se voir au feuilletage. */
    function section(lettre, titre, chapeau) {
      place(80);
      var h = 34;
      doc.setFillColor(FOREST[0], FOREST[1], FOREST[2]);
      doc.rect(L, etat.y - 12, UTILE, h, 'F');
      doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
      doc.rect(L, etat.y - 12, 4, h, 'F');
      doc.setFont('helvetica', 'bold');
      if (lettre) {
        doc.setFontSize(8);
        doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
        doc.text('SECTION ' + lettre, L + 16, etat.y + 1);
      }
      doc.setFontSize(11); doc.setTextColor(255, 255, 255);
      doc.text(titre.toUpperCase(), L + 16, lettre ? etat.y + 15 : etat.y + 9);
      etat.y += h + 6;
      if (chapeau) {
        doc.setFont('helvetica', 'italic'); doc.setFontSize(8.2);
        doc.setTextColor(GREY[0], GREY[1], GREY[2]);
        var lg = doc.splitTextToSize(chapeau, UTILE);
        for (var i = 0; i < lg.length; i++) { doc.text(lg[i], L, etat.y); etat.y += 11; }
        etat.y += 6;
      }
    }

    function titreSection(t, num) {
      place(44);
      etat.y += 6;
      if (num) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.4);
        doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
        doc.text(String(num), L, etat.y);
      }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9.4);
      doc.setTextColor(FOREST[0], FOREST[1], FOREST[2]);
      doc.text(t.toUpperCase(), num ? L + 26 : L, etat.y);
      etat.y += 6;
      doc.setDrawColor(LIGNE[0], LIGNE[1], LIGNE[2]); doc.setLineWidth(0.6);
      doc.line(L, etat.y, LARG - L, etat.y);
      etat.y += 14;
    }

    function paragraphe(txt, opts) {
      opts = opts || {};
      doc.setFont('helvetica', opts.gras ? 'bold' : (opts.italique ? 'italic' : 'normal'));
      doc.setFontSize(opts.taille || 9.2);
      var c = opts.couleur || INK;
      doc.setTextColor(c[0], c[1], c[2]);
      var lignes = doc.splitTextToSize(txt, opts.largeur || UTILE);
      var il = opts.interligne || 12.5;
      for (var i = 0; i < lignes.length; i++) {
        place(il);
        doc.text(lignes[i], opts.x || L, etat.y);
        etat.y += il;
      }
      etat.y += (opts.apres === undefined ? 8 : opts.apres);
    }

    function puces(items) {
      for (var i = 0; i < items.length; i++) {
        var lg = doc.splitTextToSize(items[i], UTILE - 16);
        place(lg.length * 11.6 + 2);
        doc.setFillColor(SAGE[0], SAGE[1], SAGE[2]);
        doc.circle(L + 3, etat.y - 3, 1.8, 'F');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        doc.setTextColor(INK[0], INK[1], INK[2]);
        for (var j = 0; j < lg.length; j++) {
          if (j > 0) place(11.6);
          doc.text(lg[j], L + 16, etat.y);
          etat.y += 11.6;
        }
        etat.y += 2;
      }
      etat.y += 4;
    }

    function liste(items) {
      var indent = 18;
      for (var i = 0; i < items.length; i++) {
        var lg = doc.splitTextToSize(items[i], UTILE - indent);
        place(lg.length * 12.5 + 4);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9.2);
        doc.setTextColor(SAGE[0], SAGE[1], SAGE[2]);
        doc.text(String(i + 1) + '.', L, etat.y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(INK[0], INK[1], INK[2]);
        for (var j = 0; j < lg.length; j++) {
          if (j > 0) place(12.5);
          doc.text(lg[j], L + indent, etat.y);
          etat.y += 12.5;
        }
        etat.y += 4;
      }
      etat.y += 4;
    }

    /* Champs en deux colonnes : libelle discret, valeur soulignee.
       Une valeur vide laisse un trait a remplir a la main. */
    function champs(paires, colonnes) {
      var nb = colonnes || 2;
      var colonne = UTILE / nb;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.2);
      for (var i = 0; i < paires.length; i += nb) {
        /* Un libelle long tient sur deux lignes plutot que d'etre tronque :
           « IF AUTHORIZED REPRESENTATIVE, RELATIONSHIP TO » sans son
           dernier mot ne veut plus rien dire sur un document juridique. */
        var lignesEtiq = 1;
        for (var e = 0; e < nb; e++) {
          var pe = paires[i + e];
          if (!pe || !pe[0]) continue;
          var n = doc.splitTextToSize(pe[0].toUpperCase(), colonne - 16).length;
          if (n > lignesEtiq) lignesEtiq = Math.min(n, 2);
        }
        var hEtiq = lignesEtiq * 9;
        place(hEtiq + 27);
        for (var k = 0; k < nb; k++) {
          var p = paires[i + k];
          if (!p || !p[0]) continue;
          var x = L + k * colonne, larg = colonne - 16;
          doc.setFont('helvetica', 'bold'); doc.setFontSize(7.2);
          doc.setTextColor(SAGE[0], SAGE[1], SAGE[2]);
          var lg = doc.splitTextToSize(p[0].toUpperCase(), larg);
          for (var j = 0; j < lignesEtiq && j < lg.length; j++) {
            doc.text(lg[j], x, etat.y + j * 9);
          }
          doc.setFont('helvetica', 'normal'); doc.setFontSize(9.6);
          doc.setTextColor(INK[0], INK[1], INK[2]);
          var val = nonVide(p[1]);
          if (val) doc.text(doc.splitTextToSize(val, larg)[0], x, etat.y + hEtiq + 5);
          doc.setDrawColor(LIGNE[0], LIGNE[1], LIGNE[2]); doc.setLineWidth(0.7);
          doc.line(x, etat.y + hEtiq + 10, x + larg, etat.y + hEtiq + 10);
        }
        etat.y += hEtiq + 27;
      }
      etat.y += 2;
    }

    /* Question ouverte : l'intitule au-dessus, la reponse dessous, sur toute
       la largeur. Une reponse vide affiche "Not provided" plutot que rien :
       un blanc laisse croire a un oubli de generation. */
    function question(q, r, opts) {
      opts = opts || {};
      var val = nonVide(r);
      var lgQ = doc.splitTextToSize(q, UTILE);
      var lgR = doc.splitTextToSize(val || 'Not provided', UTILE - 12);
      place(lgQ.length * 11 + lgR.length * 12 + 14);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.4);
      doc.setTextColor(FOREST[0], FOREST[1], FOREST[2]);
      for (var i = 0; i < lgQ.length; i++) { doc.text(lgQ[i], L, etat.y); etat.y += 11; }
      etat.y += 3;
      doc.setFont('helvetica', val ? 'normal' : 'italic'); doc.setFontSize(9.4);
      if (val) doc.setTextColor(INK[0], INK[1], INK[2]);
      else doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      for (var j = 0; j < lgR.length; j++) {
        place(12);
        doc.text(lgR[j], L + 12, etat.y);
        etat.y += 12;
      }
      etat.y += (opts.apres === undefined ? 8 : opts.apres);
    }

    /* Question fermee : intitule a gauche, reponse a droite, sur une ligne. */
    function questionCourte(q, r) {
      var val = nonVide(r) || '—';
      var largeQ = UTILE - 110;
      var lg = doc.splitTextToSize(q, largeQ);
      place(lg.length * 11.5 + 8);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.8);
      doc.setTextColor(INK[0], INK[1], INK[2]);
      var yDebut = etat.y;
      for (var i = 0; i < lg.length; i++) {
        if (i > 0) place(11.5);
        doc.text(lg[i], L, etat.y);
        etat.y += 11.5;
      }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.8);
      doc.setTextColor(estOui(val) ? GOLD[0] : SAGE[0], estOui(val) ? GOLD[1] : SAGE[1],
                       estOui(val) ? GOLD[2] : SAGE[2]);
      doc.text(val, LARG - L, yDebut, { align: 'right' });
      doc.setDrawColor(LIGNE[0], LIGNE[1], LIGNE[2]); doc.setLineWidth(0.5);
      doc.line(L, etat.y + 1, LARG - L, etat.y + 1);
      etat.y += 9;
    }

    function caseACocher(coche, texte) {
      var lg = doc.splitTextToSize(texte, UTILE - 22);
      place(lg.length * 12 + 6);
      var yb = etat.y - 8;
      doc.setDrawColor(SAGE[0], SAGE[1], SAGE[2]); doc.setLineWidth(0.9);
      doc.rect(L, yb, 10, 10);
      if (coche) {
        doc.setFillColor(SAGE[0], SAGE[1], SAGE[2]);
        doc.rect(L + 2, yb + 2, 6, 6, 'F');
      }
      doc.setFont('helvetica', coche ? 'bold' : 'normal'); doc.setFontSize(9);
      var c = coche ? INK : GREY;
      doc.setTextColor(c[0], c[1], c[2]);
      for (var i = 0; i < lg.length; i++) {
        if (i > 0) place(12);
        doc.text(lg[i], L + 20, etat.y);
        etat.y += 12;
      }
      etat.y += 6;
    }

    /* Grille de cases a cocher sur trois colonnes, comme la liste de symptomes
       du formulaire papier : on garde les non coches, leur absence est une
       information clinique. */
    function grilleCases(items, colonnes) {
      var nb = colonnes || 3;
      var colonne = UTILE / nb;
      for (var i = 0; i < items.length; i += nb) {
        place(20);
        for (var k = 0; k < nb; k++) {
          var it = items[i + k];
          if (!it) continue;
          var x = L + k * colonne;
          doc.setDrawColor(SAGE[0], SAGE[1], SAGE[2]); doc.setLineWidth(0.8);
          doc.rect(x, etat.y - 7.5, 8.5, 8.5);
          if (it.coche) {
            doc.setFillColor(SAGE[0], SAGE[1], SAGE[2]);
            doc.rect(x + 1.8, etat.y - 5.7, 4.9, 4.9, 'F');
          }
          doc.setFont('helvetica', it.coche ? 'bold' : 'normal'); doc.setFontSize(7.8);
          var c = it.coche ? INK : GREY;
          doc.setTextColor(c[0], c[1], c[2]);
          doc.text(doc.splitTextToSize(it.texte, colonne - 20)[0], x + 13, etat.y);
        }
        etat.y += 16;
      }
      etat.y += 6;
    }

    /* Tableau simple : en-tetes sur fond vert, lignes alternees. */
    function tableau(entetes, lignes, parts) {
      var total = parts.reduce(function (a, b) { return a + b; }, 0);
      var largeurs = parts.map(function (p) { return UTILE * p / total; });
      function ligne(cellules, opt) {
        var hauteurs = cellules.map(function (c, i) {
          return doc.splitTextToSize(String(c === undefined ? '' : c), largeurs[i] - 10).length;
        });
        var nbl = Math.max.apply(null, hauteurs);
        var h = nbl * 10.5 + 8;
        place(h);
        if (opt.entete) {
          doc.setFillColor(FOREST[0], FOREST[1], FOREST[2]);
          doc.rect(L, etat.y - 9, UTILE, h, 'F');
        } else if (opt.paire) {
          doc.setFillColor(DOUX[0], DOUX[1], DOUX[2]);
          doc.rect(L, etat.y - 9, UTILE, h, 'F');
        }
        var x = L;
        for (var i = 0; i < cellules.length; i++) {
          doc.setFont('helvetica', opt.entete ? 'bold' : 'normal');
          doc.setFontSize(opt.entete ? 7.6 : 8.4);
          if (opt.entete) doc.setTextColor(255, 255, 255);
          else doc.setTextColor(INK[0], INK[1], INK[2]);
          var lg = doc.splitTextToSize(String(cellules[i] === undefined ? '' : cellules[i]),
                                       largeurs[i] - 10);
          for (var j = 0; j < lg.length; j++) doc.text(lg[j], x + 5, etat.y + j * 10.5);
          x += largeurs[i];
        }
        doc.setDrawColor(LIGNE[0], LIGNE[1], LIGNE[2]); doc.setLineWidth(0.5);
        doc.line(L, etat.y + h - 9, LARG - L, etat.y + h - 9);
        etat.y += h;
      }
      ligne(entetes, { entete: true });
      for (var r = 0; r < lignes.length; r++) ligne(lignes[r], { paire: r % 2 === 1 });
      etat.y += 8;
    }

    /* Une piece jointe (carte d'assurance, piece d'identite) posee dans le
       document : c'est la seule copie conservee, elle doit rester lisible. */
    function piece(img, legende) {
      var largeMax = UTILE * 0.62, hautMax = 210;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.6);
      doc.setTextColor(SAGE[0], SAGE[1], SAGE[2]);
      if (!img) {
        place(26);
        doc.text(legende.toUpperCase(), L, etat.y);
        doc.setFont('helvetica', 'italic'); doc.setFontSize(8.4);
        doc.setTextColor(GREY[0], GREY[1], GREY[2]);
        doc.text('Not provided', L + 200, etat.y);
        etat.y += 18;
        return;
      }
      var ech = Math.min(largeMax / img.w, hautMax / img.h, 1);
      var w = img.w * ech, h = img.h * ech;
      place(h + 30);
      doc.text(legende.toUpperCase(), L, etat.y);
      etat.y += 8;
      try { doc.addImage(img.uri, img.format, L, etat.y, w, h); } catch (e) { }
      doc.setDrawColor(LIGNE[0], LIGNE[1], LIGNE[2]); doc.setLineWidth(0.8);
      doc.rect(L, etat.y, w, h);
      etat.y += h + 16;
    }

    /* Bloc de signature : image si elle existe, sinon une ligne vierge a
       signer a la main. C'est ce qui laisse sa place a Caroline Bonu tant
       qu'elle n'a pas enregistre la sienne. */
    function signature(opts) {
      place(96);
      var larg = UTILE * 0.52;
      var yImg = etat.y;
      if (opts.image) {
        try { doc.addImage(opts.image, 'PNG', L, yImg, 150, 46); } catch (e) { }
      }
      var yl = yImg + 50;
      doc.setDrawColor(INK[0], INK[1], INK[2]); doc.setLineWidth(0.8);
      doc.line(L, yl, L + larg, yl);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.4);
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.text(opts.libelle, L, yl + 11);

      var xd = L + larg + 30, largD = LARG - L - xd;
      doc.setDrawColor(INK[0], INK[1], INK[2]);
      doc.line(xd, yl, xd + largD, yl);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.6);
      doc.setTextColor(INK[0], INK[1], INK[2]);
      if (nonVide(opts.date)) doc.text(opts.date, xd, yl - 6);
      doc.setFontSize(7.4); doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.text(opts.libelleDate || 'DATE SIGNED (MM/DD/YYYY)', xd, yl + 11);

      etat.y = yl + 26;
      if (nonVide(opts.nomImprime)) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9.2);
        doc.setTextColor(INK[0], INK[1], INK[2]);
        doc.text(opts.nomImprime, L, etat.y); etat.y += 12;
      }
      if (nonVide(opts.sousTitre)) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.4);
        doc.setTextColor(GREY[0], GREY[1], GREY[2]);
        doc.text(opts.sousTitre, L, etat.y); etat.y += 12;
      }
      etat.y += 10;
    }

    function encadre(texte) {
      var lg = doc.splitTextToSize(texte, UTILE - 28);
      var h = lg.length * 11.5 + 20;
      place(h + 8);
      doc.setFillColor(DOUX[0], DOUX[1], DOUX[2]);
      doc.roundedRect(L, etat.y - 10, UTILE, h, 6, 6, 'F');
      doc.setDrawColor(SAGE[0], SAGE[1], SAGE[2]); doc.setLineWidth(2);
      doc.line(L, etat.y - 10, L, etat.y - 10 + h);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.4);
      doc.setTextColor(INK[0], INK[1], INK[2]);
      var yy = etat.y + 4;
      for (var i = 0; i < lg.length; i++) { doc.text(lg[i], L + 14, yy); yy += 11.5; }
      etat.y += h + 4;
    }

    bandeau();
    return {
      doc: doc, etat: etat, place: place, saut: saut, section: section,
      titreSection: titreSection, paragraphe: paragraphe, puces: puces, liste: liste,
      champs: champs, question: question, questionCourte: questionCourte,
      caseACocher: caseACocher, grilleCases: grilleCases, tableau: tableau,
      piece: piece, signature: signature, encadre: encadre, pied: pied
    };
  }

  /* ════════════════════════════════════════════════════════════════════════
     A. PATIENT INTAKE PACKAGE  —  sections A, B, C, D du modele v3
     ════════════════════════════════════════════════════════════════════════ */

  var SYMPTOMES = [
    ['sym_depressed_mood', 'Depressed mood'],
    ['sym_unable_enjoy', 'Unable to enjoy activities'],
    ['sym_sleep_disturbance', 'Sleep pattern disturbance'],
    ['sym_loss_interest', 'Loss of interest'],
    ['sym_concentration', 'Concentration / forgetfulness'],
    ['sym_appetite_change', 'Change in appetite'],
    ['sym_excessive_guilt', 'Excessive guilt'],
    ['sym_fatigue', 'Fatigue'],
    ['sym_decreased_libido', 'Decreased libido'],
    ['sym_racing_thoughts', 'Racing thoughts'],
    ['sym_impulsivity', 'Impulsivity'],
    ['sym_risky_behavior', 'Increased risky behavior'],
    ['sym_increased_libido', 'Increased libido'],
    ['sym_decreased_sleep', 'Decreased need for sleep'],
    ['sym_excessive_energy', 'Excessive energy'],
    ['sym_irritability', 'Increased irritability'],
    ['sym_crying_spells', 'Crying spells'],
    ['sym_excessive_worry', 'Excessive worry'],
    ['sym_anxiety_attacks', 'Anxiety / panic attacks'],
    ['sym_avoidance', 'Avoidance'],
    ['sym_hallucinations', 'Hallucinations'],
    ['sym_suspiciousness', 'Suspiciousness / paranoia']
  ];

  var CAGE = [
    ['cage_cut_down', 'Have you ever felt you ought to cut down on your drinking or drug use?'],
    ['cage_annoyed', 'Have people annoyed you by criticizing your drinking or drug use?'],
    ['cage_guilty', 'Have you ever felt bad or guilty about your drinking or drug use?'],
    ['cage_morning', 'Have you ever had a drink or used drugs first thing in the morning to steady your nerves or get rid of a hangover?'],
    ['cage_problem', 'Do you think you may have a problem with alcohol or drug use?'],
    ['street_drugs_recent', 'Have you used any street drugs in the past 3 months?'],
    ['prescription_abuse', 'Have you ever abused prescription medication?']
  ];

  function documentAdmission(d, images) {
    var p = nouvellePage('PATIENT INTAKE PACKAGE',
      'Registration · HIPAA · Telepsychiatry · Mental Health Intake');
    var sig = d.signature_image;
    var nom = nonVide(d.fullname);

    /* Sommaire : le document fait une dizaine de pages, on doit pouvoir s'y
       reperer sans le lire en entier. */
    p.encadre('This document is generated automatically when a patient completes the online '
      + 'intake forms. Section A — Patient Registration Information. Section B — Notice of '
      + 'Privacy Practices (HIPAA). Section C — Telepsychiatry Informed Consent. '
      + 'Section D — Mental Health Intake Form.');
    p.champs([
      ['Patient', nom],
      ['Date of birth', d.dateDOB],
      ['Date completed', d.date],
      ['Carelon Member ID', d.carelon_member_id || d.identification_number]
    ]);

    /* ── SECTION A ───────────────────────────────────────────────────────── */
    p.section('A', 'Patient Registration Information',
      'Administrative and billing information, collected from the patient registration form.');

    p.titreSection('Personal Information', 'A1');
    p.champs([
      ['First Name', d.first_name], ['Last Name', d.last_name],
      ['Full Name', d.fullname], ['Sex', d.sex],
      ['Home Address', d.home_address], ['City', d.city],
      ['State', d.state], ['Zip Code', d.zip_code],
      ['Phone Number', d.phone], ['Email Address', d.email],
      ['Date of Birth', d.dateDOB], ['Social Security Number', d.social_security_number],
      ['Employer', d.employer], ['Occupation', d.occupation]
    ]);

    p.titreSection('Medical Referrals', 'A2');
    p.champs([
      ['Primary Care Physician', d.primary_care_physician],
      ['Referring Physician / Psychologist / Therapist', d.referring_physician]
    ]);

    p.titreSection('Emergency Contact', 'A3');
    p.champs([
      ['Emergency Contact Name', d.emergency_contact_name],
      ['Relationship to Patient', d.emergency_contact_relationship],
      ['Emergency Contact Phone', d.emergency_contact_phone], ['', '']
    ]);

    p.titreSection('Primary Insurance', 'A4');
    p.champs([
      ['Primary Insurance Provider', d.primary_insurance], ['Subscriber Name', d.fullname],
      ['Subscriber Date of Birth', d.dateDOB], ['Group Number', d.group_number],
      ['Carelon Member ID', d.carelon_member_id || d.identification_number], ['', '']
    ]);
    p.piece(images.insurance_front, 'Insurance card — front');
    p.piece(images.insurance_back, 'Insurance card — back');
    p.piece(images.government_id, 'Government-issued photo ID');

    p.titreSection('Assignment of Benefits & Records Release', 'A5');
    p.paragraphe('I hereby authorize direct payment to ' + CABINET.nom + ' of any medical '
      + 'benefits payable to me for services provided. I understand it is my responsibility to '
      + 'obtain any required referral authorization prior to my appointment. I am responsible '
      + 'for any co-payment, deductible, or patient portion on the day of service. If my '
      + 'account becomes delinquent, I will be held responsible for reasonable attorney’s '
      + 'fees, court costs, and collection costs.');
    p.paragraphe('I hereby authorize ' + CABINET.nom + ' to release my records to my insurance '
      + 'company and/or primary care physician for the purpose of processing my insurance '
      + 'claims. This authorization shall remain in effect as long as charges are being '
      + 'submitted for insurance claim processing or as dictated by the payer.');
    p.signature({ image: sig, date: d.date, libelle: 'PATIENT SIGNATURE', nomImprime: nom });

    /* ── SECTION B ───────────────────────────────────────────────────────── */
    p.saut();
    p.section('B', 'Notice of Privacy Practices (HIPAA)',
      CABINET.nom + ' is required by law to maintain the privacy of your Protected Health '
      + 'Information (PHI).');

    p.titreSection('Our Commitment', 'B1');
    p.paragraphe(CABINET.nom + ' safeguards all health information, including demographic data '
      + 'and records from other providers. We will notify you of any unauthorized access, use, '
      + 'or disclosure of your unsecured PHI.');

    p.titreSection('Uses Requiring Written Authorization', 'B2');
    p.paragraphe('Written authorization is required before disclosing PHI outside of treatment, '
      + 'payment, or healthcare operations. You may revoke authorization in writing at any '
      + 'time. We cannot retract disclosures already made.');

    p.titreSection('Verbal Authorization Required For', 'B3');
    p.paragraphe('Changes to personal information such as name, home address, and insurance '
      + 'information.');

    p.titreSection('Disclosures Not Requiring Your Consent', 'B4');
    p.puces([
      'Treatment coordination and referrals to other providers',
      'Billing, payment, and insurance reimbursement activities',
      'Legal guardian, conservator, or healthcare agent of incapacitated patients',
      'Military command authorities (if applicable)',
      'Federal, state, or local law requirements',
      'Public health reporting (infectious diseases)',
      'Reporting abuse, neglect, or domestic violence',
      'Situations where you have shown signs of hurting yourself or others',
      'Appointment reminders and information about treatment alternatives'
    ]);

    p.titreSection('Your Rights', 'B5');
    p.puces([
      'Examine your health record within 5 working days of written request',
      'Receive a copy within 15 days of written request (fee may apply)',
      'Request corrections to your medical record',
      'Withdraw authorization in writing at any time (future disclosures only)'
    ]);

    p.titreSection('Acknowledgment of Receipt', 'B6');
    p.paragraphe('With my signature below, I acknowledge that I have received and reviewed the '
      + CABINET.nom + ' Notice of Privacy Practices.');
    p.signature({ image: sig, date: d.date, libelle: 'PATIENT SIGNATURE', nomImprime: nom });

    /* ── SECTION C ───────────────────────────────────────────────────────── */
    p.saut();
    p.section('C', 'Telepsychiatry Informed Consent',
      CABINET.nom + ' uses the HIPAA-approved secured system CareCloud for all telepsychiatry '
      + 'sessions.');

    p.titreSection('What is Telepsychiatry?', 'C1');
    p.paragraphe('Telepsychiatry allows patients to access psychiatric care using audio-video '
      + 'interfaces. All systems incorporate network and software security protocols to protect '
      + 'confidentiality and data integrity.');

    p.titreSection('Expected Benefits', 'C2');
    p.puces([
      'Improved access to psychiatric care — receive treatment from home or office',
      'More efficient psychiatric evaluation and ongoing management'
    ]);

    p.titreSection('Possible Risks', 'C3');
    p.puces([
      'Transmitted information may be insufficient for appropriate medical decision-making (for example, poor image resolution)',
      'Delays in evaluation could occur due to equipment deficiencies or failures',
      'In rare cases, security protocols could fail, causing a breach of privacy of personal medical information',
      'Lack of access to complete medical records may result in adverse drug interactions or other errors'
    ]);

    p.titreSection('Patient Rights — by signing I understand that', 'C4');
    p.liste([
      'Privacy laws protecting medical information also apply to telepsychiatry. No identifying information will be disclosed without my consent.',
      'I may withhold or withdraw consent to telepsychiatry at any time, without affecting my right to future care or treatment.',
      'I have the right to inspect all information obtained in telepsychiatry and may receive copies for a reasonable fee.',
      'Alternative methods of psychiatric care may be available to me and I may choose them at any time.',
      'It is my duty to inform my psychiatrist of any other healthcare providers involved in my care.',
      'No results from telepsychiatry can be guaranteed or assured.'
    ]);

    p.titreSection('My Responsibilities', 'C5');
    p.liste([
      'I will NOT record any telepsychiatry sessions without the prior written consent of NP Bonu and associates.',
      'I will inform NP Bonu if any other person can hear or see any part of our session before it begins.',
      'I MUST be a resident of DC and physically in DC when receiving telepsychiatry services from ' + CABINET.nom + '.',
      'My initial consultation will be conducted via telepsychiatry.',
      'My health insurance may or may not cover this service; I accept financial responsibility for the service.'
    ]);

    p.titreSection('Authorization', 'C6');
    p.paragraphe('I hereby authorize ' + CABINET.nom + ' to use telepsychiatry in the course of '
      + 'my diagnosis and treatment.');
    p.caseACocher(estOui(d.copy_offered), 'I have been offered a copy of this consent form.');
    p.signature({ image: sig, date: d.date, libelle: 'PATIENT SIGNATURE', nomImprime: nom });

    /* ── SECTION D ───────────────────────────────────────────────────────── */
    p.saut();
    p.section('D', 'Mental Health Intake Form',
      'Complete clinical intake information.');

    p.titreSection('Patient Identification', 'D1');
    p.champs([
      ['First Name', d.first_name], ['Last Name', d.last_name],
      ['Date', d.date], ['Date of Birth', d.dateDOB]
    ]);

    p.titreSection('Reason for Visit', 'D2');
    p.question('What are the problem(s) for which you are seeking help?', d.problems_seeking_help);
    p.question('What are your treatment goals?', d.treatment_goals);

    p.titreSection('Current Symptoms Checklist', 'D3');
    p.grilleCases(SYMPTOMES.map(function (s) {
      return { coche: estOui(d[s[0]]), texte: s[1] };
    }), 3);
    p.question('Additional symptoms not listed above', d.additional_symptoms);

    p.titreSection('Suicidal Ideation Assessment', 'D4');
    p.questionCourte('Have you ever had feelings or thoughts that you didn’t want to live?', d.suicidal_thoughts);
    p.questionCourte('How often do you have these thoughts?', d.suicidal_frequency);
    p.questionCourte('When was the last time you had thoughts of dying?', d.suicidal_last_time);
    p.question('Has anything happened recently to make you feel this way?', d.suicidal_trigger);
    p.questionCourte('On a scale of 1 to 10 (10 = strongest), how strong is your desire to kill yourself currently?', d.suicidal_intensity_scale);
    p.question('Would anything make it better?', d.suicidal_better);
    p.questionCourte('Have you ever thought about how you would kill yourself?', d.suicidal_method_thought);
    p.question('If yes — describe the method', d.suicidal_method_desc);
    p.questionCourte('Is the method you would use readily available?', d.suicidal_method_available);
    p.questionCourte('Have you planned a time for this?', d.suicidal_planned_time);
    p.question('Is there anything that would stop you from killing yourself?', d.suicidal_stoppers);
    p.questionCourte('Do you feel hopeless and/or worthless?', d.suicidal_hopeless);
    p.questionCourte('Have you ever tried to kill or harm yourself before?', d.self_harm_history);
    p.question('Do you have access to guns? If yes, please explain.', d.guns_access);

    p.titreSection('Personal Medical History', 'D5');
    p.question('Describe any relevant personal medical history', d.personal_medical_history);

    p.titreSection('Family Medical History', 'D6');
    p.question('Describe relevant family medical history', d.family_medical_history);

    p.titreSection('Psychiatric History', 'D7');
    p.questionCourte('Have you ever been seen by a psychiatrist in the past?', d.psychiatrist_seen);
    p.question('If yes: when, by whom, nature of treatment, previous diagnoses?', d.psychiatrist_details);
    p.questionCourte('Have you ever been hospitalized for psychiatric reasons?', d.psychiatric_hospitalized);
    p.question('If yes: reason, when, and where?', d.psychiatric_hospitalization_details);

    p.titreSection('Past Psychiatric Medications', 'D8');
    p.paragraphe('Medications previously taken, with dates, dosage and effectiveness where '
      + 'remembered.', { italique: true, taille: 8.2, apres: 6 });
    var meds = [];
    for (var m = 1; m <= 12; m++) {
      if (nonVide(d['med_name_' + m])) {
        meds.push([d['med_name_' + m], nonVide(d['med_start_' + m]) || '—',
                   nonVide(d['med_end_' + m]) || '—', nonVide(d['med_dosage_' + m]) || '—',
                   nonVide(d['med_effect_' + m]) || '—']);
      }
    }
    if (meds.length) {
      p.tableau(['Medication Name', 'Start Date', 'End Date', 'Dosage', 'Effectiveness (1-10)'],
                meds, [3, 1.6, 1.6, 1.6, 1.8]);
    } else {
      p.paragraphe('No past psychiatric medication reported.', { italique: true, couleur: GREY });
    }

    p.titreSection('Family Psychiatric History', 'D9');
    p.questionCourte('Has anyone in your family been diagnosed with or treated for psychiatric conditions?', d.family_psychiatric_history);
    p.question('If yes: who, and what condition(s)?', d.family_psychiatric_details);

    p.titreSection('Alcohol & Drug Use', 'D10');
    p.questionCourte('Have you ever been treated for alcohol or drug use or abuse?', d.substance_treatment);
    p.question('If yes: for which substances?', d.substance_treated_for);
    p.question('If yes: where were you treated and when?', d.substance_treatment_details);
    p.champs([
      ['Days per week drinking alcohol', d.alcohol_days_per_week],
      ['Largest amount in one day (past 3 months)', d.alcohol_max_day],
      ['Minimum drinks per day', d.alcohol_min_per_day],
      ['Maximum drinks per day', d.alcohol_max_per_day]
    ]);
    p.tableau(['Question', 'Answer'],
      CAGE.map(function (c) { return [c[1], nonVide(d[c[0]]) || '—']; }), [6, 1.4]);
    p.question('If street drugs used: which ones?', d.street_drugs_which);
    p.question('If prescription medications abused: which ones and for how long?', d.prescription_abuse_details);

    p.titreSection('Tobacco / Cigarettes', 'D11');
    p.questionCourte('Have you ever smoked cigarettes?', d.cigarettes_ever);
    p.questionCourte('Are you currently smoking?', d.cigarettes_current);
    p.champs([
      ['Average amount per day', d.cigarettes_per_day],
      ['Duration of smoking', d.cigarettes_duration],
      ['If former smoker: when did you stop?', d.cigarettes_stopped], ['', '']
    ]);

    p.titreSection('Family Background & Childhood History', 'D12');
    p.questionCourte('Were you adopted?', d.adopted);
    p.champs([
      ['Siblings and their ages', d.siblings_and_ages], ['', ''],
      ['Father’s Occupation', d.father_occupation], ['Mother’s Occupation', d.mother_occupation]
    ]);
    p.questionCourte('Did your parents divorce?', d.parents_divorced);
    p.champs([
      ['Your age at time of divorce', d.age_at_divorce],
      ['Who did you live with after?', d.lived_with_after_divorce],
      ['How old were you when you left home?', d.age_left_home], ['', '']
    ]);
    p.question('Has anyone in your immediate family died? Who and when?', d.family_deaths);

    p.titreSection('Trauma History', 'D13');
    p.questionCourte('Do you have a history of being abused emotionally, sexually, physically, or by neglect?', d.abuse_history);
    p.question('If yes: when, where, and by whom?', d.abuse_details);

    p.titreSection('Educational History', 'D14');
    p.champs([['Highest level of education completed', d.education_level], ['', '']]);

    p.titreSection('Occupational History', 'D15');
    p.champs([['Current employment status', d.employment_status], ['', '']]);
    p.question('Additional occupational information', d.occupation_additional);
    p.questionCourte('Have you ever served in the military?', d.military_service);

    p.titreSection('Relationship & Family Status', 'D16');
    p.champs([
      ['Current relationship status', d.relationship_status],
      ['If not married: currently in a relationship?', d.in_relationship],
      ['Are you sexually active?', d.sexually_active],
      ['Sexual orientation', d.sexual_orientation],
      ['Spouse / Significant Other’s Occupation', d.partner_occupation], ['', '']
    ]);
    p.question('Describe your relationship with your spouse / partner', d.relationship_description);
    p.questionCourte('Have you had any prior marriages?', d.prior_marriages);
    p.champs([
      ['If yes: how many?', d.prior_marriages_count],
      ['Total duration', d.prior_marriages_duration]
    ]);
    p.questionCourte('Do you have children?', d.has_children);
    p.question('If yes: list ages and gender', d.children_ages_genders);
    p.question('Describe your relationship with your children', d.children_relationship);
    p.question('List everyone who currently lives with you', d.current_household);

    p.titreSection('Legal History', 'D17');
    p.question('Have you ever been arrested? If yes, describe.', d.arrest_history);
    p.question('Do you have any pending legal problems? If yes, describe.', d.pending_legal);

    p.titreSection('Additional Information', 'D18');
    p.question('Is there anything else you would like us to know?', d.additional_info);

    p.titreSection('Signature', 'D19');
    p.signature({ image: sig, date: d.date, libelle: 'PATIENT SIGNATURE', nomImprime: nom });

    /* ── CONFIRMATION FINALE ─────────────────────────────────────────────── */
    p.saut();
    p.section('', 'Final Confirmation & Signatures', '');
    p.paragraphe('By signing below, the patient certifies that all information in this complete '
      + 'intake package is accurate and truthful, and confirms having read and understood all '
      + 'four sections of this document.');
    if (d.signer_type === 'Authorized Representative') {
      p.encadre('This package is signed by an Authorized Representative on behalf of the '
        + 'patient. Relationship to participant: '
        + (nonVide(d.relationship_to_participant) || 'not stated') + '. Authority: '
        + (nonVide(d.representative_authority) || 'not stated') + '.');
    }
    p.signature({
      image: sig, date: d.date,
      libelle: d.signer_type === 'Authorized Representative'
        ? 'AUTHORIZED REPRESENTATIVE SIGNATURE' : 'PATIENT SIGNATURE',
      nomImprime: nom, sousTitre: 'Date of birth: ' + (nonVide(d.dateDOB) || '—')
    });
    p.signature({
      image: d.witness_signature_image, date: d.date, libelle: 'WITNESS SIGNATURE',
      nomImprime: nonVide(d.witness_name), sousTitre: 'Witness'
    });

    p.titreSection('For Office Use Only', '');
    p.champs([
      ['Received By', d.office_received_by], ['Date Received', d.date],
      ['Patient ID / Chart #', d.office_patient_id],
      ['Insurance Verified', d.office_insurance_verified]
    ]);
    p.question('Notes', d.office_notes);
    p.paragraphe('Rev. 11/2022  ·  ' + CABINET.nom + '  ·  HIPAA Compliant',
      { italique: true, taille: 7.6, couleur: GREY });

    p.pied();
    return p.doc;
  }

  /* ════════════════════════════════════════════════════════════════════════
     B. Discharge Concern & Authorization
     ════════════════════════════════════════════════════════════════════════ */
  function documentDischarge(d) {
    var p = nouvellePage('DISCHARGE CONCERN & AUTHORIZATION',
      'Behavioral Health Outpatient Mental Health Clinic (OMHC)');

    p.titreSection('Patient Information', '1');
    p.champs([
      ['Patient Name', d.fullname], ['Date of Birth', d.dateDOB],
      ['Carelon Member ID', d.carelon_member_id], ['Date', d.date]
    ]);

    p.titreSection('Request', '2');
    p.paragraphe('I, ' + (nonVide(d.fullname) || '________________________') +
      ', voluntarily request to be discharged from my current Outpatient Mental Health Clinic '
      + '(OMHC). I understand that my current Carelon authorization must be closed before my '
      + 'behavioral health services can be transferred to ' + CABINET.nom + '.');

    p.titreSection('Authorization', '3');
    p.paragraphe('I authorize ' + CABINET.nom + ' to coordinate and provide my behavioral health '
      + 'treatment, including psychiatric evaluation, medication management, treatment planning, '
      + 'care coordination, and other medically necessary mental health services.');

    p.titreSection('Acknowledgment', '4');
    p.paragraphe('I understand this request and voluntarily authorize my discharge from my '
      + 'current OMHC provider and the transfer of my behavioral health care to ' + CABINET.nom + '.');

    if (d.signer_type === 'Authorized Representative') {
      p.encadre('This form is signed by an Authorized Representative on behalf of the patient. '
        + 'Relationship to participant: ' + (nonVide(d.relationship_to_participant) || 'not stated')
        + '. Authority: ' + (nonVide(d.representative_authority) || 'not stated') + '.');
    }

    p.titreSection('Signatures', '5');
    p.signature({
      image: d.signature_image, date: d.date,
      libelle: d.signer_type === 'Authorized Representative'
        ? 'AUTHORIZED REPRESENTATIVE SIGNATURE' : 'PATIENT SIGNATURE',
      nomImprime: nonVide(d.printed_name) || nonVide(d.fullname),
      sousTitre: d.signer_type === 'Authorized Representative'
        ? 'Authorized Representative — ' + (nonVide(d.relationship_to_participant) || 'relationship not stated')
        : 'Patient'
    });
    p.signature({
      image: d.provider_signature_image, date: d.provider_signature_image ? d.date : '',
      libelle: 'BCB LIBERTY HEALTH CARE REPRESENTATIVE',
      nomImprime: d.provider_rep_name || 'Caroline Bonu',
      sousTitre: d.provider_rep_title || 'APRN'
    });

    p.pied();
    return p.doc;
  }

  /* ════════════════════════════════════════════════════════════════════════
     C. Carelon Overlapping Authorization Attestation
     ════════════════════════════════════════════════════════════════════════ */
  function documentCarelon(d) {
    var estRep = (d.signer_type === 'Authorized Representative');
    var p = nouvellePage(CARELON.titre, CARELON.nom, THEME_CARELON);

    p.titreSection('Participant Information', '1');
    p.champs([
      ['Participant Full Name', d.fullname], ['Participant ID', d.carelon_member_id],
      ['Date of Birth', d.dateDOB], ['Date', d.date]
    ]);

    p.titreSection('Provider Information', '2');
    p.champs([
      ['Provider Organization Name', CABINET.nom], ['Provider NPI', CABINET.npi],
      ['Provider TIN Number', CABINET.tin], ['', '']
    ]);

    p.titreSection('Purpose', '3');
    p.paragraphe('Certain services are not permitted to overlap according to COMAR 10.09.80.06B. '
      + 'Refer to the Combination of Mental Health Services document or the Combination of SUD '
      + 'Services document on Carelon’s website for additional details.');
    p.paragraphe('This attestation documents the participant’s (or Authorized '
      + 'Representative’s) request to receive services with the provider listed above, and '
      + 'to discharge, end or close any conflicting or overlapping authorization(s) that prevent '
      + 'authorization or delivery of those services.');
    p.encadre('If the participant has any questions, they can call Carelon customer '
      + 'service at ' + CARELON.telephone + ' to ask for additional details.  ·  '
      + CARELON.site);

    p.titreSection('Participant / Authorized Representative Attestation', '4');
    p.paragraphe('By signing below, I attest and agree that I am:', { gras: true, apres: 10 });
    p.caseACocher(!estRep, 'The participant.');
    p.caseACocher(estRep, 'The participant’s Authorized Representative or legal guardian, '
      + 'with legal authority to act on the participant’s behalf.');
    p.paragraphe('And that:', { gras: true, apres: 8 });
    p.liste([
      'I am requesting to receive the indicated behavioral health service(s) with the provider identified above.',
      'I understand that certain service authorizations may not overlap, and that existing overlapping authorizations may prevent the requested services from being authorized or delivered from this provider.',
      'I am requesting that any conflicting and overlapping authorization(s), including those associated with other provider(s), that are not permitted to overlap with the services I am seeking with this provider be discharged, ended or closed, as allowed under program rules, so that services may proceed with this provider. I understand that conflicting and overlapping authorizations will be discharged, ended or closed immediately upon submission of this document.',
      'I understand that ending or discharging an authorization may affect the participant’s ability to receive services under the discharged authorization(s). I have had the opportunity to ask questions about this decision and have received answers I understand.',
      'I attest that this decision is voluntary and made without coercion.'
    ]);
    p.champs([
      ['Printed Name (participant or Authorized Representative)', d.printed_name || d.fullname],
      ['If Authorized Representative, relationship to participant', d.relationship_to_participant],
      ['If Authorized Representative, brief description of authority', d.representative_authority],
      ['', '']
    ]);
    p.signature({
      image: d.signature_image, date: d.date,
      libelle: estRep ? 'AUTHORIZED REPRESENTATIVE SIGNATURE' : 'PARTICIPANT SIGNATURE',
      nomImprime: '', sousTitre: ''
    });

    /* Pas de saut force ici : l'attestation du prestataire suit celle du
       participant. Le saut coutait une feuille entiere pour une demi-page de
       blanc, et `place()` la reportera d'elle-meme si elle ne tient pas. */
    p.titreSection('Provider / Authorized Provider Representative Attestation', '5');
    p.paragraphe('By signing below, I attest and agree that:', { gras: true, apres: 8 });
    p.liste([
      'I am the provider or an Authorized Representative of the provider identified above, and I am authorized to sign this attestation on behalf of the provider.',
      'The participant (or Authorized Representative) completed this attestation in concert with the provider and affirmed they are seeking services with this provider.',
      'To the best of my knowledge, the participant may have an existing authorization(s) that conflicts with the non-overlap requirement for the service(s) being sought with this provider, and this attestation is intended to document the participant’s request to discharge or end such conflicting, overlapping authorization(s), including authorization(s) associated with other provider(s).',
      'I informed the participant (or Authorized Representative) that discharging an authorization may affect access to services under the discharged authorization(s), and provided an opportunity for questions.'
    ]);
    p.champs([
      ['Printed Name (Provider / Representative)', d.provider_rep_name || 'Caroline Bonu'],
      ['Title', d.provider_rep_title || 'APRN']
    ]);
    p.signature({
      image: d.provider_signature_image, date: d.provider_signature_image ? d.date : '',
      libelle: 'PROVIDER SIGNATURE', nomImprime: '', sousTitre: ''
    });

    p.pied();
    return p.doc;
  }

  function nomFichier(nom, suffixe) {
    var base = String(nom || 'Patient').replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
    return (base || 'Patient') + ' - ' + suffixe + '.pdf';
  }

  /* Point d'entree unique appele par le formulaire au moment de l'envoi.
     Asynchrone : les photos doivent etre redimensionnees avant d'etre posees
     dans le document. */
  window.construireDocumentsBCB = async function (d) {
    var images = {
      insurance_front: await preparerImage(d.image_insurance_front, 1400),
      insurance_back: await preparerImage(d.image_insurance_back, 1400),
      government_id: await preparerImage(d.image_government_id, 1400)
    };
    var admission = documentAdmission(d, images);
    var discharge = documentDischarge(d);
    var carelon = documentCarelon(d);
    return {
      pdf_admission: admission.output('datauristring').split(',')[1],
      pdf_admission_nom: nomFichier(d.fullname, 'Patient Intake Package'),
      pdf_discharge: discharge.output('datauristring').split(',')[1],
      pdf_discharge_nom: nomFichier(d.fullname, 'Discharge Concern and Authorization'),
      pdf_carelon: carelon.output('datauristring').split(',')[1],
      pdf_carelon_nom: nomFichier(d.fullname, 'Carelon Overlapping Authorization Attestation'),
      _docs: { admission: admission, discharge: discharge, carelon: carelon }
    };
  };
})();
