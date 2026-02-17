(function (global) {
  function getServiceKey(row) {
    if (!row) return '';
    if (row.serviceId !== undefined && row.serviceId !== null) {
      return `#${row.serviceId}`;
    }
    if (row.service_id !== undefined && row.service_id !== null) {
      return `#${row.service_id}`;
    }
    const label = row.service ?? row.service_nom ?? '';
    return String(label).toLowerCase();
  }

  function getCodeKey(row) {
    if (!row) return '';
    return String(row.code ?? row.ligne_code ?? '');
  }

  function orderRowsByService(rows) {
    if (!Array.isArray(rows)) return [];
    const serviceOrder = [];
    rows.forEach((row) => {
      const key = getServiceKey(row);
      if (!serviceOrder.includes(key)) {
        serviceOrder.push(key);
      }
    });
    return rows.slice().sort((a, b) => {
      const keyA = getServiceKey(a);
      const keyB = getServiceKey(b);
      const idxA = serviceOrder.indexOf(keyA);
      const idxB = serviceOrder.indexOf(keyB);
      if (idxA !== idxB) {
        return idxA - idxB;
      }
      return getCodeKey(a).localeCompare(getCodeKey(b), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    });
  }

  const STATUS_ITEMS = [
    { code: 'CONFORME', label: 'C' },
    { code: 'NON_CONFORME', label: 'NC' },
    { code: 'NA', label: 'NA' },
    { code: 'OBS', label: 'OBS' },
  ];
  const STATUS_BOX = 4;
  const STATUS_GAP = 9;
  const STATUS_HEIGHT = STATUS_ITEMS.length * STATUS_GAP + 6;

  function drawStatusColumn(doc, x, y, selectedCode) {
    doc.setFont('courier', '', 10);
    STATUS_ITEMS.forEach((item, idx) => {
      const posY = y + idx * STATUS_GAP;
      doc.rect(x, posY - STATUS_BOX + 2, STATUS_BOX, STATUS_BOX);
      if (selectedCode && selectedCode === item.code) {
        doc.setFont('courier', 'bold', 10);
        doc.text('x', x + 1.1, posY + 1);
        doc.setFont('courier', '', 10);
      }
      doc.text(item.label, x + STATUS_BOX + 3, posY + 1);
    });
  }

  function drawCommentBlock(doc, x, y, width, height, text) {
    doc.rect(x, y, width, height);
    if (text) {
      const lines = doc.splitTextToSize(text, width - 4);
      doc.setFont('courier', '', 10);
      doc.text(lines, x + 2, y + 6);
    }
  }

  function drawTableHeader(doc, colX, y) {
    doc.setFont('courier', 'bold', 11);
    doc.text('Code', colX.code + 2, y);
    doc.text('Critere', colX.crit + 2, y);
    doc.text('Service', colX.service + 2, y);
    doc.text('STATUTS', colX.status + 2, y);
    doc.text('Commentaires', colX.comment + 2, y);
    doc.setFont('courier', '', 11);
  }

  function buildAuditSheet(doc, { title = 'Fiche Audit Preparation', header = {}, rows = [], showStatusMarks = false } = {}) {
    if (!doc) throw new Error('doc requis');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = { top: 22, left: 22, right: 12, bottom: 20 };
    const availableWidth = pageWidth - margin.left - margin.right;
    const colWidth = {
      code: 24,
      crit: 36,
      service: 34,
      status: 36,
      comment: availableWidth - (24 + 36 + 34 + 36),
    };
    const colX = {
      code: margin.left,
      crit: margin.left + colWidth.code,
      service: margin.left + colWidth.code + colWidth.crit,
      status: margin.left + colWidth.code + colWidth.crit + colWidth.service,
      comment: margin.left + colWidth.code + colWidth.crit + colWidth.service + colWidth.status,
    };

    function preparePage(isFirstPage) {
      doc.setFont('courier', 'bold', 18);
      doc.text(title, pageWidth / 2, margin.top - 10, { align: 'center' });
      doc.setFont('courier', '', 12);
      let y = margin.top;
      if (isFirstPage) {
        doc.text(header.auditLabel || `Audit #${header.auditNumber ?? '-'}`, margin.left, y);
        y += 8;
        doc.text(`Norme : ${header.norme || '-'}`, margin.left, y);
        y += 8;
        doc.text(`Service : ${header.service || '-'}`, margin.left, y);
        y += 8;
        doc.text(`Date : ${header.date || '-'}`, margin.left, y);
        y += 8;
        doc.text(`Statut : ${header.statut || '-'}`, margin.left, y);
        doc.text(`Auditeur : ${header.auditeur || '-'}`, pageWidth - margin.right, margin.top, { align: 'right' });
        y += 14;
      } else {
        y += 4;
      }
      doc.setLineWidth(0.4);
      doc.line(margin.left, y, pageWidth - margin.right, y);
      y += 8;
      drawTableHeader(doc, colX, y);
      return y + 4;
    }

    const orderedRows = orderRowsByService(rows);
    let cursorY = preparePage(true);
    if (!orderedRows.length) {
      orderedRows.push({ code: '', critere: '', service: '', commentaire: '' });
    }
    orderedRows.forEach((row) => {
      const critText = row.critere || row.intitule || '';
      const serviceText = row.service || row.service_nom || '';
      const commentText = row.commentaire || row.comment || '';
      const critLines = doc.splitTextToSize(critText || '-', colWidth.crit - 4);
      const commentLines = commentText ? doc.splitTextToSize(commentText, colWidth.comment - 4) : [];
      const rowHeight = Math.max(
        32,
        critLines.length * 5 + 12,
        commentLines.length * 4 + 12,
        STATUS_HEIGHT
      );
      if (cursorY + rowHeight > pageHeight - margin.bottom) {
        doc.addPage();
        cursorY = preparePage(false);
      }
      doc.rect(colX.code, cursorY, colWidth.code, rowHeight);
      doc.rect(colX.crit, cursorY, colWidth.crit, rowHeight);
      doc.rect(colX.service, cursorY, colWidth.service, rowHeight);
      doc.rect(colX.status, cursorY, colWidth.status, rowHeight);
      drawCommentBlock(doc, colX.comment, cursorY, colWidth.comment, rowHeight, commentText);
      doc.setFont('courier', '', 11);
      doc.text(row.code ? String(row.code) : '-', colX.code + 2, cursorY + 6);
      doc.text(critLines, colX.crit + 2, cursorY + 6);
      doc.text(serviceText || '-', colX.service + 2, cursorY + 6);
      const selected = showStatusMarks ? row.statut : null;
      drawStatusColumn(doc, colX.status + 2, cursorY + 6, selected);
      cursorY += rowHeight + 6;
    });
  }

  global.buildAuditSheet = buildAuditSheet;
})(window);
