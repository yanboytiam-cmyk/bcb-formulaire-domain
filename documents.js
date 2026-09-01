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
  function nouvellePage(titre, sousTitre) {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
    var etat = { y: 0 };
    var logo = logoBCB();

    function bandeau() {
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
        doc.text(CABINET.nom + '  ·  Page ' + i + ' of ' + n, LARG - L, HAUT - 31, { align: 'right' });
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
      for (var i = 0; i < paires.length; i += nb) {
        place(34);
        for (var k = 0; k < nb; k++) {
          var p = paires[i + k];
          if (!p || !p[0]) continue;
          var x = L + k * colonne, larg = colonne - 16;
          doc.setFont('helvetica', 'bold'); doc.setFontSize(7.2);
          doc.setTextColor(SAGE[0], SAGE[1], SAGE[2]);
          doc.text(doc.splitTextToSize(p[0].toUpperCase(), larg)[0], x, etat.y);
          doc.setFont('helvetica', 'normal'); doc.setFontSize(9.6);
          doc.setTextColor(INK[0], INK[1], INK[2]);
          var val = nonVide(p[1]);
          if (val) doc.text(doc.splitTextToSize(val, larg)[0], x, etat.y + 14);
          doc.setDrawColor(LIGNE[0], LIGNE[1], LIGNE[2]); doc.setLineWidth(0.7);
          doc.line(x, etat.y + 19, x + larg, etat.y + 19);
        }
        etat.y += 36;
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
    var p = nouvellePage('OVERLAPPING AUTHORIZATION ATTESTATION',
      'Carelon Behavioral Health of Maryland  ·  COMAR 10.09.80.06B');

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
    p.encadre('Questions? Carelon customer service: 1-800-888-1965  ·  maryland.carelonbh.com');

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

    p.saut();
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
