function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[character]));
}

export function normalizeMinervaTimestamp(value) {
  if (value === null || value === undefined || value === '') return null;
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return null;
  const date = new Date(seconds * 1000);
  if (Number.isNaN(date.getTime())) return null;
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
  return { iso: date.toISOString(), text: formatter.format(date) };
}

export function makeMinervaLocalDateHtml(value) {
  const normalized = normalizeMinervaTimestamp(value);
  return normalized
    ? `<time datetime="${escapeHtml(normalized.iso)}">${escapeHtml(normalized.text)}</time>`
    : (value ? `<time>${escapeHtml(value)}</time>` : '');
}

export function makeMinervaFooterInfoData(pageState = {}, pageContract = {}) {
  const data = pageState.data || {};
  const items = [];
  if (pageContract.showLastModifiedFooter && data.date) {
    const localDate = makeMinervaLocalDateHtml(data.date);
    items.push({
      id: 'footer-info-lastmod',
      html: data.rev
        ? `이 리비전은 ${localDate}에 편집되었습니다.`
        : `이 문서는 ${localDate}에 마지막으로 편집되었습니다.`
    });
  }
  if (data.copyright_text) items.push({ id: 'footer-info-copyright', html: data.copyright_text });
  return items.length ? { id: 'footer-info', className: null, 'array-items': items } : null;
}
