const r = require('express').Router(), db = require('../db'), { wrap, bad, txt, paged, has } = require('../utils');
r.get('/', wrap(async (q, s) => {
  const [all] = await db.query('SELECT id, full_name FROM students ORDER BY full_name');
  s.json(paged(all.filter(has(q.query.q)), q.query.page));
}));
r.post('/', wrap(async (q, s) => {
  const names = [...new Set((q.body.names || []).map((n) => txt(n, 100)).filter(Boolean))];
  if (!names.length) throw bad('Enter at least one name.');
  const [ex] = await db.query('SELECT full_name FROM students');
  const have = new Set(ex.map((e) => e.full_name.toLowerCase()));
  const fresh = names.filter((n) => !have.has(n.toLowerCase()));
  if (fresh.length) await db.query('INSERT INTO students (full_name) VALUES ?', [fresh.map((n) => [n])]);
  s.json({ added: fresh.length, skipped: names.length - fresh.length });
}));
r.put('/:id', wrap(async (q, s) => {
  const n = txt(q.body.full_name, 100);
  if (!n) throw bad('Name is required.');
  const [x] = await db.query('UPDATE students SET full_name = ? WHERE id = ?', [n, q.params.id]);
  if (!x.affectedRows) throw bad('Student not found.', 404);
  s.json({ ok: true });
}));
r.delete('/:id', wrap(async (q, s) => { await db.query('DELETE FROM students WHERE id = ?', [q.params.id]); s.json({ ok: true }); }));
module.exports = r;
