exports.wrap = (fn) => (req, res, next) => fn(req, res).catch(next);
exports.bad = (msg, status = 400) => Object.assign(new Error(msg), { status });
exports.txt = (v, max) => String(v ?? '').trim().slice(0, max);
exports.money = (v) => Math.round(+v * 100) / 100;
exports.has = (q) => { const s = String(q || '').toLowerCase(); return (r) => !s || r.full_name.toLowerCase().includes(s); };
exports.paged = (all, p, size = 10) => {
  const total = all.length, pages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(Math.max(parseInt(p) || 1, 1), pages);
  return { rows: all.slice((page - 1) * size, page * size), total, page, pages };
};
