/**
 * Export professional — PDF, Excel et Word avec logo INM, titres, tableaux.
 *
 * Utilisation :
 *   exporterPDF({ fichier:"commandes.pdf", titre:"Liste des commandes", … })
 *   exporterExcel({ fichier:"stock.xlsx", feuilles:[ … ] })
 *   exporterWord({ fichier:"devis.docx", titre:"Devis n°…", … })
 *
 * Les colonnes s'écrivent :
 *   { titre: "Numéro", valeur: (l) => l.numero, align: "center" }
 *
 * Le logo INM (265×90) est chargé automatiquement à chaque export.
 * Bibliothèques : jspdf+autotable, exceljs, docx — import dynamique.
 */

import LOGO_URL from "../assets/logo-inm.png";

// ---- CONSTANTES D'IDENTITÉ ------------------------------------------------
export const COULEUR = [21, 101, 192]; // #1565c0 — bleu INM
export const COULEUR_HEX = "#1565c0";
export const ORGANISME = "REPUBLIQUE DE MADAGASCAR";
export const ORGANISME_SOUS = "Imprimerie Nationale — SGCFC-INM";
const RATIO_LOGO = 265 / 90; // largeur / hauteur (265×90 px)

// ---- CACHE DU LOGO (base64 + Uint8Array) -----------------------------------
let _logo = null;

async function _chargerLogo() {
  if (_logo) return _logo;
  const reponse = await fetch(LOGO_URL);
  const blob = await reponse.blob();
  const ab = await blob.arrayBuffer();
  const octets = new Uint8Array(ab);
  const dataUrl = await new Promise((ok) => {
    const f = new FileReader();
    f.onloadend = () => ok(f.result);
    f.readAsDataURL(blob);
  });
  _logo = { dataUrl, octets };
  return _logo;
}

// ---- TÉLÉCHARGEMENT --------------------------------------------------------
function telecharger(blob, fichier) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fichier;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---- VENDREDI (format date fr) ---------------------------------------------
const DATE_FR = (d) =>
  new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const MAINTENANT_FR = () =>
  new Date().toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const NB_LIGNES = (n) => `${n} ligne${n > 1 ? "s" : ""}`;

// ═══════════════════════════════════════════════════════════════════════════
//  PDF (jsPDF + autoTable)
// ═══════════════════════════════════════════════════════════════════════════
export async function exporterPDF({
  fichier,
  titre,
  sousTitre = "",
  meta = [],
  colonnes = [],
  lignes = [],
  note = "",
  signatures = [], // [{ titre:"Agent SDO", nom:"" }]
}) {
  const [{ jsPDF }, autoTable] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable").then((m) => m.default),
  ]);
  const { dataUrl } = await _chargerLogo();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const L = doc.internal.pageSize.getWidth(); // 210
  const H = doc.internal.pageSize.getHeight(); // 297
  const M = 14;
  const PU = L - 2 * M; // largeur utile

  // ── Pied de page (appelé après autoTable pour avoir le bon nombre de pages)
  function pied() {
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setDrawColor(200, 205, 215);
      doc.setLineWidth(0.3);
      doc.line(M, 286, L - M, 286);
      doc.setFontSize(6.5);
      doc.setTextColor(130, 130, 130);
      doc.text("IMPRIMERIE NATIONALE — SGCFC-INM", M, 290);
      doc.text(`Page ${i} / ${total}`, L - M, 290, { align: "right" });
      doc.text(MAINTENANT_FR(), M, 293);
    }
  }

  // ── En-tête : logo à gauche, institution à droite, filet bleu
  const hLogo = 16;
  const lLogo = hLogo * RATIO_LOGO;
  doc.addImage(dataUrl, "PNG", M, 10, lLogo, hLogo);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(ORGANISME, L - M, 13, { align: "right" });
  doc.setFontSize(10);
  doc.setTextColor(...COULEUR);
  doc.text("Imprimerie Nationale", L - M, 19, { align: "right" });
  doc.setFontSize(7);
  doc.setTextColor(130, 130, 130);
  doc.text("SGCFC-INM — Système de Gestion des Coûts, de la Fabrication et du Contrôle du Prix de Revient", L - M, 24, { align: "right" });
  doc.setDrawColor(...COULEUR);
  doc.setLineWidth(0.6);
  doc.line(M, 29, L - M, 29);

  let y = 36;

  // ── Titre
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...COULEUR);
  doc.text(titre.toUpperCase(), L / 2, y, { align: "center" });
  y += 6;

  // ── Sous-titre
  if (sousTitre) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(sousTitre, L / 2, y, { align: "center", maxWidth: PU });
    y += 5;
  }

  // ── Méta-données (2 colonnes)
  if (meta.length) {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const colGauche = meta.slice(0, Math.ceil(meta.length / 2));
    const colDroite = meta.slice(Math.ceil(meta.length / 2));
    const yMeta = y;
    const hMeta = Math.max(colGauche.length, colDroite.length) * 3.8;
    colGauche.forEach((m, i) => {
      doc.setFont("helvetica", "bold");
      doc.text((m.libelle || "") + " :", M, yMeta + i * 3.8);
      const valX = M + doc.getTextWidth((m.libelle || "") + " : ") + 1;
      doc.setFont("helvetica", "normal");
      doc.text(String(m.valeur ?? ""), valX, yMeta + i * 3.8);
    });
    colDroite.forEach((m, i) => {
      doc.setFont("helvetica", "bold");
      doc.text((m.libelle || "") + " :", L / 2 + 6, yMeta + i * 3.8);
      const valX2 = L / 2 + 6 + doc.getTextWidth((m.libelle || "") + " : ") + 1;
      doc.setFont("helvetica", "normal");
      doc.text(String(m.valeur ?? ""), valX2, yMeta + i * 3.8);
    });
    y = yMeta + hMeta + 3;
  }

  // ── Tableau
  if (colonnes.length && lignes.length) {
    autoTable(doc, {
      startY: y,
      head: [colonnes.map((c) => c.titre)],
      body: lignes.map((lig) => colonnes.map((c) => c.valeur(lig))),
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [40, 40, 40],
        lineColor: [210, 216, 226],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: COULEUR,
        textColor: 255,
        fontStyle: "bold",
        fontSize: 7.5,
        halign: "center",
      },
      alternateRowStyles: { fillColor: [246, 248, 251] },
      margin: { left: M, right: M, bottom: 24 },
      columnStyles: colonnes.reduce((acc, c, i) => {
        if (c.align) acc[i] = { halign: c.align, cellWidth: c.largeur };
        return acc;
      }, {}),
      didParseCell: (donnees) => {
        if (donnees.row.index === 0) donnees.cell.styles.halign = "center";
      },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // ── Note de bas de tableau
  if (note) {
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text(note, M, y);
    y += 5;
  }

  // ── Zones de signature
  if (signatures.length) {
    const ySig = Math.max(y + 4, 242); // au moins avant le pied de page
    signatures.forEach((s, i) => {
      const x = M + (i / signatures.length) * PU;
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      doc.line(x, ySig + 18, x + PU / signatures.length - 10, ySig + 18);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.text(s.titre || "", x, ySig + 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(110, 110, 110);
      doc.text(s.nom || "________________", x, ySig + 17);
    });
  }

  // ── Pied de page sur toutes les pages
  pied();
  doc.save(fichier);
}

// ═══════════════════════════════════════════════════════════════════════════
//  EXCEL (exceljs) — logo + titres + tableau stylé
// ═══════════════════════════════════════════════════════════════════════════
export async function exporterExcel({ fichier, feuilles }) {
  const ExcelJS = (await import("exceljs")).default;
  const classeur = new ExcelJS.Workbook();
  classeur.creator = "SGCFC-INM — Imprimerie Nationale";
  classeur.created = new Date();

  const { dataUrl } = await _chargerLogo();
  const imageId = classeur.addImage({
    base64: dataUrl.split(",")[1],
    extension: "png",
  });

  const LARGEURS_COL = [14, 22, 22, 18, 18, 18, 16, 16, 16, 14, 14, 14, 14, 14];

  feuilles.forEach((feuille, idx) => {
    const ws = classeur.addWorksheet(feuille.nom.substring(0, 31), {
      views: [{ state: "frozen", ySplit: 6 }],
    });

    // Logo (première feuille uniquement ou toutes)
    if (idx === 0) {
      ws.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 130, height: 44 },
      });
    }

    const cols = feuille.colonnes || [];
    const lg = feuille.lignes || [];

    const dCol = String.fromCharCode(64 + cols.length); // ex. "G" pour 7 colonnes
    const plage = `A1:${dCol}1`;

    // Ligne 1 : République merged A…1
    ws.mergeCells(`A1:${dCol}1`);
    const c1 = ws.getCell("A1");
    c1.value = ORGANISME;
    c1.font = { name: "Calibri", size: 9, bold: true, color: { argb: "555555" } };
    c1.alignment = { horizontal: idx === 0 ? "right" : "center", vertical: "middle" };
    ws.getRow(1).height = idx === 0 ? 18 : 14;

    // Ligne 2 : sous-titre merged
    ws.mergeCells(`A2:${dCol}2`);
    const c2 = ws.getCell("A2");
    c2.value = ORGANISME_SOUS;
    c2.font = { name: "Calibri", size: 10, bold: true, color: { argb: COULEUR_HEX.replace("#", "") } };
    c2.alignment = { horizontal: idx === 0 ? "right" : "center", vertical: "middle" };
    ws.getRow(2).height = 14;

    // Ligne 3 : titre du document merged
    ws.mergeCells(`A3:${dCol}3`);
    const c3 = ws.getCell("A3");
    c3.value = feuille.titre || "SGCFC";
    c3.font = { name: "Calibri", size: 14, bold: true, color: { argb: COULEUR_HEX.replace("#", "") } };
    c3.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(3).height = 22;

    // Ligne 4 : sous-titre merged
    if (feuille.sousTitre) {
      ws.mergeCells(`A4:${dCol}4`);
      const c4 = ws.getCell("A4");
      c4.value = feuille.sousTitre;
      c4.font = { name: "Calibri", size: 9.5, color: { argb: "666666" } };
      c4.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(4).height = 16;
    }

    // Ligne 5 : meta
    if (feuille.meta && feuille.meta.length) {
      ws.mergeCells(`A5:${dCol}5`);
      const c5 = ws.getCell("A5");
      c5.value = feuille.meta.map((m) => `${m.libelle} : ${m.valeur}`).join("  |  ");
      c5.font = { name: "Calibri", size: 8, color: { argb: "888888" } };
      c5.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(5).height = 14;
    }

    // Ligne 6 : en-tête de tableau
    const hl = ws.getRow(6);
    hl.height = 18;
    cols.forEach((col, i) => {
      const cell = hl.getCell(i + 1);
      cell.value = col.titre;
      cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: "FFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COULEUR_HEX.replace("#", "") } };
      cell.alignment = { horizontal: col.align || "center", vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "D2D8E2" } },
        bottom: { style: "thin", color: { argb: "D2D8E2" } },
        left: { style: "thin", color: { argb: "D2D8E2" } },
        right: { style: "thin", color: { argb: "D2D8E2" } },
      };
    });

    // Données
    lg.forEach((lig, ligIdx) => {
      const r = ws.getRow(7 + ligIdx);
      r.height = 16;
      cols.forEach((col, colIdx) => {
        const cell = r.getCell(colIdx + 1);
        cell.value = col.valeur(lig);
        cell.font = { name: "Calibri", size: 9 };
        cell.alignment = { horizontal: col.align || "center", vertical: "middle" };
        cell.border = {
          bottom: { style: "thin", color: { argb: "E0E4EB" } },
        };
        if (ligIdx % 2 === 1) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F6F8FB" } };
        }
      });
    });

    // Largeurs de colonnes
    cols.forEach((col, i) => {
      ws.getColumn(i + 1).width = col.largeur || LARGEURS_COL[i] || 16;
    });

    // Filtre automatique sur l'en-tête
    if (lg.length) {
      ws.autoFilter = {
        from: { row: 6, column: 1 },
        to: { row: 6 + lg.length, column: cols.length },
      };
    }
  });

  const buffer = await classeur.xlsx.writeBuffer();
  telecharger(new Blob([buffer]), fichier);
}

// ═══════════════════════════════════════════════════════════════════════════
//  WORD (docx) — document structuré avec logo, tableaux, pied de page
// ═══════════════════════════════════════════════════════════════════════════
export async function exporterWord({
  fichier,
  titre,
  sousTitre = "",
  meta = [],
  colonnes = [],
  lignes = [],
  note = "",
}) {
  const docx = await import("docx");
  const { octets } = await _chargerLogo();
  const { Document, Packer, Header, Footer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ShadingType, PageNumber, TabStopPosition, TabStopType } = docx;

  // ── Couleur INM en format docx compatible
  const COULEUR_DOCX = "1565c0";
  const GRIS_FONCE = "444444";
  const GRIS_FONCEE = "333333";

  // ── Style en-tête de tableau
  function celluleEnTete(texte) {
    return new TableCell({
      width: { size: 1800, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: COULEUR_DOCX },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 40, after: 40 },
          children: [
            new TextRun({ text: texte, bold: true, color: "ffffff", size: 18, font: "Calibri" }),
          ],
        }),
      ],
    });
  }

  function celluleDonnee(texte, align = AlignmentType.CENTER) {
    return new TableCell({
      children: [
        new Paragraph({
          alignment: align,
          spacing: { before: 30, after: 30 },
          children: [new TextRun({ text: String(texte ?? ""), size: 18, font: "Calibri" })],
        }),
      ],
    });
  }

  // ── Tableau de données
  const enfants = [];

  // Titre
  enfants.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 0 },
      children: [new TextRun({ text: titre.toUpperCase(), bold: true, size: 28, color: COULEUR_DOCX, font: "Calibri" })],
    })
  );

  if (sousTitre) {
    enfants.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
        children: [new TextRun({ text: sousTitre, size: 20, color: "666666", font: "Calibri" })],
      })
    );
  }

  // Méta
  meta.forEach((m) => {
    enfants.push(
      new Paragraph({
        spacing: { before: 40, after: 0 },
        children: [
          new TextRun({ text: `${m.libelle} :  `, bold: true, size: 18, color: GRIS_FONCE, font: "Calibri" }),
          new TextRun({ text: String(m.valeur ?? ""), size: 18, color: GRIS_FONCEE, font: "Calibri" }),
        ],
      })
    );
  });

  if (meta.length) {
    enfants.push(new Paragraph({ spacing: { before: 120, after: 80 }, children: [] }));
  }

  // Tableau
  if (colonnes.length && lignes.length) {
    const largeurTableau = colonnes.length * 2000; // DXA
    enfants.push(
      new Table({
        width: { size: largeurTableau, type: WidthType.DXA },
        rows: [
          new TableRow({ tableHeader: true, children: colonnes.map((c) => celluleEnTete(c.titre)) }),
          ...lignes.map((lig) =>
            new TableRow({
              children: colonnes.map((c) => {
                const txt = String(c.valeur(lig) ?? "");
                return celluleDonnee(txt, c.align === "left" ? AlignmentType.LEFT : c.align === "right" ? AlignmentType.RIGHT : AlignmentType.CENTER);
              }),
            })
          ),
        ],
      })
    );
    enfants.push(new Paragraph({ spacing: { before: 100 }, children: [] }));
  }

  // Note
  if (note) {
    enfants.push(
      new Paragraph({
        children: [new TextRun({ text: note, size: 16, color: "888888", font: "Calibri", italics: true })],
      })
    );
  }

  // ── Document
  const doc = new Document({
    creator: "SGCFC-INM — Imprimerie Nationale",
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
          paragraph: { spacing: { after: 60 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1200, bottom: 1000, left: 1100, right: 1100 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                tabStops: [
                  { type: TabStopType.RIGHT, position: TabStopPosition.MAX },
                ],
                children: [
                  new docx.ImageRun({
                    data: octets,
                    transformation: { width: 96, height: 33 },
                    type: "png",
                  }),
                  new docx.Tab(),
                  new TextRun({
                    text: "REPUBLIQUE DE MADAGASCAR\nImprimerie Nationale",
                    size: 16,
                    color: "666666",
                    font: "Calibri",
                    bold: true,
                  }),
                ],
              }),
              new docx.Paragraph({
                border: {
                  bottom: { style: BorderStyle.SINGLE, size: 6, color: COULEUR_DOCX },
                },
                spacing: { after: 0 },
                children: [],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 80 },
                border: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: "D2D8E2" },
                },
                children: [
                  new TextRun({ text: "IMPRIMERIE NATIONALE — SGCFC-INM  |  ", size: 16, color: "999999", font: "Calibri" }),
                  new TextRun({ text: "Page ", size: 16, color: "999999", font: "Calibri" }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "999999", font: "Calibri" }),
                  new TextRun({ text: " sur ", size: 16, color: "999999", font: "Calibri" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "999999", font: "Calibri" }),
                ],
              }),
            ],
          }),
        },
        children: enfants,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  telecharger(blob, fichier);
}

// ═══════════════════════════════════════════════════════════════════════════
//  Fonctions utilitaires exportées (pour construire les méta/colonnes)
// ═══════════════════════════════════════════════════════════════════════════
export function metaEdition(nbLignes, prefixe = "") {
  const items = [
    { libelle: "Édité le", valeur: MAINTENANT_FR() },
    { libelle: "N éléments", valeur: nbLignes },
  ];
  if (prefixe) items.unshift({ libelle: "Document", valeur: prefixe });
  return items;
}

export function colonne(titre, champ, align = "center", largeur = null) {
  return { titre, valeur: (l) => l[champ], align, largeur };
}

export function colonnePerso(titre, valeur, align = "center", largeur = null) {
  return { titre, valeur, align, largeur };
}

export { DATE_FR, MAINTENANT_FR, NB_LIGNES };