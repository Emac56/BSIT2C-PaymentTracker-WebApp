const r = require('express').Router(), db = require('../db'), { wrap, bad, txt, paged, has, money } = require('../utils');
const amt = (v) => { const n = money(v); if (!(n > 0) || n > 1000000) throw bad('Enter an amount greater than 0.'); return n; };
const colData = (b) => {
  const t = txt(b.title, 100);
  if (!t) throw bad('Collection name is required.');
  return [t, amt(b.amount), txt(b.notes, 255) || null];
};
r.get('/collections', wrap(async (q, s) => s.json((await db.query('SELECT id, title, amount, notes FROM collections ORDER BY id DESC'))[0])));
r.post('/collections', wrap(async (q, s) => {
  const [x] = await db.query('INSERT INTO collections (title, amount, notes) VALUES (?, ?, ?)', colData(q.body));
  s.json({ id: x.insertId });
}));
r.put('/collections/:id', wrap(async (q, s) => {
  await db.query('UPDATE collections SET title = ?, amount = ?, notes = ? WHERE id = ?', [...colData(q.body), q.params.id]);
  s.json({ ok: true });
}));
r.delete('/collections/:id', wrap(async (q, s) => { await db.query('DELETE FROM collections WHERE id = ?', [q.params.id]); s.json({ ok: true }); }));
r.get('/collections/:id/status', wrap(async (q, s) => {
  const [[col]] = await db.query('SELECT id, title, amount, notes FROM collections WHERE id = ?', [q.params.id]);
  if (!col) throw bad('Collection not found.', 404);
  const [all] = await db.query(
    `SELECT s.id, s.full_name, COALESCE(SUM(p.amount), 0) paid FROM students s
     LEFT JOIN payments p ON p.student_id = s.id AND p.collection_id = ?
     GROUP BY s.id ORDER BY s.full_name`, [col.id]);
  const sm = { expected: money(col.amount * all.length), collected: money(all.reduce((a, x) => a + x.paid, 0)), paidN: 0, partialN: 0, unpaidN: 0 };
  all.forEach((x) => { if (x.paid >= col.amount) sm.paidN++; else if (x.paid > 0) sm.partialN++; else sm.unpaidN++; });
  s.json({ collection: col, summary: sm, ...paged(all.filter(has(q.query.q)), q.query.page) });
}));
r.get('/payments', wrap(async (q, s) => s.json((await db.query(
  'SELECT id, amount, paid_at, notes FROM payments WHERE student_id = ? AND collection_id = ? ORDER BY paid_at DESC, id DESC',
  [q.query.student_id, q.query.collection_id]))[0])));
r.post('/payments', wrap(async (q, s) => {
  const { student_id, collection_id } = q.body, amount = amt(q.body.amount);
  const [[c]] = await db.query('SELECT amount FROM collections WHERE id = ?', [collection_id]);
  if (!c) throw bad('Collection not found.', 404);
  const [[t]] = await db.query('SELECT COALESCE(SUM(amount), 0) paid FROM payments WHERE student_id = ? AND collection_id = ?', [student_id, collection_id]);
  const bal = money(c.amount - t.paid);
  if (amount > bal) throw bad(`Too much. The remaining balance is ₱${bal}.`);
  await db.query('INSERT INTO payments (student_id, collection_id, amount, notes) VALUES (?, ?, ?, ?)', [student_id, collection_id, amount, txt(q.body.notes, 255) || null]);
  s.json({ balance: money(bal - amount) });
}));
r.delete('/payments/:id', wrap(async (q, s) => { await db.query('DELETE FROM payments WHERE id = ?', [q.params.id]); s.json({ ok: true }); }));
module.exports = r;
