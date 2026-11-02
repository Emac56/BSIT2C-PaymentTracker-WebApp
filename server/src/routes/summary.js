const r = require('express').Router(), db = require('../db'), { wrap } = require('../utils');
const rows = async (sql) => (await db.query(sql))[0];
const one = async (sql) => (await rows(sql))[0];
const paid = (w) => one(`SELECT COUNT(DISTINCT student_id) n, COALESCE(SUM(amount), 0) total FROM payments WHERE ${w}`);
r.get('/', wrap(async (q, s) => s.json({
  today: await paid('paid_at = CURDATE()'),
  week: await paid('YEARWEEK(paid_at, 1) = YEARWEEK(CURDATE(), 1)'),
  month: await paid('YEAR(paid_at) = YEAR(CURDATE()) AND MONTH(paid_at) = MONTH(CURDATE())'),
  all: await paid('1 = 1'),
  students: (await one('SELECT COUNT(*) n FROM students')).n,
  event: (await one(`SELECT e.title, COALESCE(SUM(a.status = 'present'), 0) present FROM events e
    LEFT JOIN attendance a ON a.event_id = e.id GROUP BY e.id ORDER BY e.event_date DESC, e.id DESC LIMIT 1`)) || null,
  collections: await rows(`SELECT c.id, c.title, c.amount, c.notes, COALESCE(SUM(p.amount), 0) collected FROM collections c
    LEFT JOIN payments p ON p.collection_id = c.id GROUP BY c.id ORDER BY c.id DESC`),
  months: await rows(`SELECT DATE_FORMAT(paid_at, '%Y-%m') ym, COUNT(DISTINCT student_id) n, SUM(amount) total FROM payments
    GROUP BY ym ORDER BY ym DESC LIMIT 6`),
})));
module.exports = r;
