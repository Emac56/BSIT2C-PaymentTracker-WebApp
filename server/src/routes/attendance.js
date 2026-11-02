const r = require('express').Router(), db = require('../db'), { wrap, bad, txt, paged, has } = require('../utils');
const title = (b) => { const t = txt(b.title, 100); if (!t) throw bad('Event name is required.'); return t; };
r.get('/events', wrap(async (q, s) => s.json((await db.query('SELECT id, title, event_date FROM events ORDER BY id DESC'))[0])));
r.post('/events', wrap(async (q, s) => {
  const [x] = await db.query('INSERT INTO events (title) VALUES (?)', [title(q.body)]);
  s.json({ id: x.insertId });
}));
r.put('/events/:id', wrap(async (q, s) => { await db.query('UPDATE events SET title = ? WHERE id = ?', [title(q.body), q.params.id]); s.json({ ok: true }); }));
r.delete('/events/:id', wrap(async (q, s) => { await db.query('DELETE FROM events WHERE id = ?', [q.params.id]); s.json({ ok: true }); }));
r.get('/events/:id/attendance', wrap(async (q, s) => {
  const [[ev]] = await db.query('SELECT id, title, event_date FROM events WHERE id = ?', [q.params.id]);
  if (!ev) throw bad('Event not found.', 404);
  const [all] = await db.query(
    `SELECT s.id, s.full_name, a.status FROM students s
     LEFT JOIN attendance a ON a.student_id = s.id AND a.event_id = ? ORDER BY s.full_name`, [ev.id]);
  const counts = { present: 0, absent: 0, unmarked: 0 };
  all.forEach((x) => counts[x.status || 'unmarked']++);
  s.json({ event: ev, counts, ...paged(all.filter(has(q.query.q)), q.query.page) });
}));
r.put('/events/:id/attendance', wrap(async (q, s) => {
  const { student_id, status } = q.body;
  if (!['present', 'absent'].includes(status)) throw bad('Invalid status.');
  await db.query(
    `INSERT INTO attendance (event_id, student_id, status) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE status = VALUES(status)`, [q.params.id, student_id, status]);
  s.json({ ok: true });
}));
module.exports = r;
