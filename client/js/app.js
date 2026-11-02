const $ = (s) => document.querySelector(s);
const on = (sel, fn) => document.querySelectorAll(sel).forEach((el) => (el.onclick = () => fn(el)));
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const peso = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 });
const round = (n) => Math.round(n * 100) / 100;
const S = { col: null, ev: null, open: null, q: '', page: 1 };
const SEARCH = '<input id="q" type="search" class="form-control form-control-lg" placeholder="Search by name" aria-label="Search by name" autocomplete="off">';

async function api(url, opt) {
  const t = setTimeout(() => $('#loading').classList.remove('d-none'), 250);
  try {
    const res = await fetch('/api' + url, opt && { method: opt.method, headers: { 'Content-Type': 'application/json' }, body: opt.body && JSON.stringify(opt.body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Server error. Please try again.');
    return data;
  } catch (e) {
    if (e instanceof TypeError) e.message = 'Cannot reach the server. Is it running in Termux?';
    throw e;
  } finally { clearTimeout(t); $('#loading').classList.add('d-none'); }
}
async function run(fn) {
  try { await fn(); } catch (e) {
    $('#errmsg').textContent = e.message; $('#err').classList.remove('d-none');
    $('#retry').onclick = () => { $('#err').classList.add('d-none'); run(fn); };
  }
}
$('#close').onclick = () => $('#err').classList.add('d-none');
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.remove('d-none'); setTimeout(() => t.classList.add('d-none'), 2500); }
function modal(html) { $('#modal').innerHTML = `<div class="box">${html}</div>`; $('#modal').classList.remove('d-none'); }
function closeModal() { $('#modal').classList.add('d-none'); }
function confirmBox(msg, yes) {
  modal(`<h2>Are you sure?</h2><p class="mut">${msg}</p><button class="btn-dg" id="y" style="background:#9B1C0E;color:#fff">Yes, delete</button><button class="btn-alt" id="n">Cancel</button>`);
  $('#n').onclick = closeModal; $('#y').onclick = () => { closeModal(); run(yes); };
}
function formBox(title, fields, vals, save) {
  modal(`<h2>${title}</h2>${fields.map((f) => `<label for="f_${f.k}">${f.label}</label><input id="f_${f.k}" type="${f.type || 'text'}" ${f.type == 'number' ? 'inputmode="decimal" step="any" min="0"' : ''} maxlength="255" class="form-control form-control-lg" value="${esc(vals[f.k])}">`).join('')}<button class="btn-ct" id="ok">Save</button><button class="btn-alt" id="n">Cancel</button>`);
  $('#n').onclick = closeModal;
  $('#ok').onclick = () => { const d = {}; fields.forEach((f) => (d[f.k] = $('#f_' + f.k).value)); closeModal(); run(() => save(d)); };
}
const pagerHTML = (d) => d.pages > 1 ? `<div class="pager"><button class="btn-alt btn-sm" data-pg="${d.page - 1}" ${d.page <= 1 ? 'disabled' : ''}>Previous</button><span>Page ${d.page} of ${d.pages}</span><button class="btn-alt btn-sm" data-pg="${d.page + 1}" ${d.page >= d.pages ? 'disabled' : ''}>Next</button></div>` : '';
const pagerBind = (load) => on('[data-pg]', (el) => { S.page = +el.dataset.pg; S.open = null; run(load); window.scrollTo(0, 0); });
function searchBind(load) {
  let t; $('#q').value = S.q;
  $('#q').oninput = (e) => { clearTimeout(t); t = setTimeout(() => { S.q = e.target.value.trim(); S.page = 1; run(load); }, 300); };
}
const qs = () => `q=${encodeURIComponent(S.q)}&page=${S.page}`;

async function home() {
  const s = await api('/summary');
  const card = (l, n, sub) => `<div class="cardx"><p>${l}</p><b>${n}</b><small>${sub}</small></div>`;
  $('#view').innerHTML = `
  <div class="grid">${card('Paid today', s.today.n, peso(s.today.total))}${card('This week', s.week.n, peso(s.week.total))}${card('This month', s.month.n, peso(s.month.total))}${card('Total collected', peso(s.all.total), 'All time')}</div>
  <div class="grid g2">${card('Students', s.students, 'enrolled')}${card('Latest event: ' + esc(s.event ? s.event.title : 'none yet'), s.event ? s.event.present : 0, `of ${s.students} present`)}</div>
  <h2>By collection</h2>
  ${s.collections.map((c) => `<div class="cardx"><div class="rowx"><span>${esc(c.title)}</span><span>${peso(c.collected)} of ${peso(c.amount * s.students)}</span></div>${c.notes ? `<p class="mut">${esc(c.notes)}</p>` : ''}</div>`).join('') || '<div class="cardx">No collections yet.</div>'}
  <h2>By month</h2>
  ${s.months.map((m) => `<div class="cardx"><div class="rowx"><span>${new Date(m.ym + '-01T00:00:00').toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</span><span>${m.n} paid · ${peso(m.total)}</span></div></div>`).join('') || '<div class="cardx">No payments yet.</div>'}`;
}

async function stu() {
  $('#view').innerHTML = `<div class="cardx"><label for="names" class="fw-semibold">Add students (one name per line)</label><textarea id="names" class="form-control form-control-lg my-2" rows="3"></textarea><button class="btn-ct" id="addst">Add Students</button></div>${SEARCH}<div id="list"></div>`;
  $('#addst').onclick = () => run(async () => {
    const r = await api('/students', { method: 'POST', body: { names: $('#names').value.split('\n') } });
    $('#names').value = ''; toast(`${r.added} added${r.skipped ? `, ${r.skipped} duplicate${r.skipped > 1 ? 's' : ''} skipped` : ''}`); await stuList();
  });
  searchBind(stuList); await stuList();
}
async function stuList() {
  const d = await api(`/students?${qs()}`); S.page = d.page;
  $('#list').innerHTML = `<p class="mut mb-2">${d.total} student${d.total == 1 ? '' : 's'}</p>` + (d.rows.map((r) => `<div class="cardx rowx mb-2"><span>${esc(r.full_name)}</span><span class="acts"><button class="btn-alt btn-sm" data-edit="${r.id}" data-name="${esc(r.full_name)}">Edit</button><button class="btn-dg btn-sm" data-del="${r.id}" data-name="${esc(r.full_name)}">Delete</button></span></div>`).join('') || '<div class="cardx">No students found.</div>') + pagerHTML(d);
  pagerBind(stuList);
  on('[data-edit]', (el) => formBox('Edit student', [{ k: 'full_name', label: 'Full name' }], { full_name: el.dataset.name }, async (v) => { await api('/students/' + el.dataset.edit, { method: 'PUT', body: v }); toast('Saved'); await stuList(); }));
  on('[data-del]', (el) => confirmBox(`Delete <b>${esc(el.dataset.name)}</b>? Their payments and attendance records will be deleted too. This cannot be undone.`, async () => { await api('/students/' + el.dataset.del, { method: 'DELETE' }); toast('Deleted'); await stuList(); }));
}

const colFields = [{ k: 'title', label: 'Collection name' }, { k: 'amount', label: 'Amount per student (₱)', type: 'number' }, { k: 'notes', label: 'Notes (e.g. where it was bought, receipt no.)' }];
async function pay() {
  const cols = await api('/collections');
  if (!cols.find((c) => c.id == S.col)) S.col = cols[0] ? cols[0].id : null;
  $('#view').innerHTML = `<div class="two">${cols.length ? `<select id="col" class="form-select form-select-lg" aria-label="Collection">${cols.map((c) => `<option value="${c.id}" ${c.id == S.col ? 'selected' : ''}>${esc(c.title)}</option>`).join('')}</select>` : ''}<button class="btn-ct btn-sm" id="newc">New collection</button></div>
  ${S.col ? `<div id="info"></div>${SEARCH}<div id="list"></div>` : '<div class="cardx">No collections yet. Create one to start tracking payments.</div>'}`;
  $('#newc').onclick = () => formBox('New collection', colFields, {}, async (v) => { const x = await api('/collections', { method: 'POST', body: v }); S.col = x.id; S.q = ''; S.page = 1; await pay(); });
  if (!S.col) return;
  $('#col').onchange = (e) => { S.col = e.target.value; S.q = ''; S.page = 1; S.open = null; run(pay); };
  searchBind(payList); await payList();
}
async function payList() {
  const d = await api(`/collections/${S.col}/status?${qs()}`); S.page = d.page;
  const col = d.collection, sm = d.summary;
  $('#info').innerHTML = `<div class="cardx"><div class="rowx"><span>${esc(col.title)} · ${peso(col.amount)} each</span><span class="acts"><button class="btn-alt btn-sm" id="editc">Edit</button><button class="btn-dg btn-sm" id="delc">Delete</button></span></div>
  ${col.notes ? `<p class="mut">${esc(col.notes)}</p>` : ''}<div class="bar"><i style="width:${sm.expected ? Math.min(100, sm.collected / sm.expected * 100) : 0}%"></i></div>
  <p class="mut"><strong>${peso(sm.collected)}</strong> collected of ${peso(sm.expected)} · ${sm.paidN} paid · ${sm.partialN} partial · ${sm.unpaidN} unpaid</p></div>`;
  $('#list').innerHTML = (d.rows.map((r) => {
    const bal = round(col.amount - r.paid), st = bal <= 0 ? ['ok', 'Paid'] : r.paid > 0 ? ['part', `${peso(r.paid)} / ${peso(col.amount)}`] : ['no', 'Unpaid'];
    return `<div class="cardx mb-2"><button class="rowbtn" data-open="${r.id}"><span>${esc(r.full_name)}</span><span class="chip ${st[0]}">${st[1]}</span></button>${S.open == r.id ? `<div class="open">${bal > 0 ? `<p class="mut">Balance: ${peso(bal)}</p>
    <label for="amt">Amount</label><input id="amt" type="number" inputmode="decimal" min="0" step="any" class="form-control form-control-lg" placeholder="Any amount up to ${peso(bal)}">
    <label for="note">Note (optional)</label><input id="note" maxlength="255" class="form-control form-control-lg" placeholder="e.g. GCash ref, received by">
    <div class="q"><button data-q="10">₱10</button><button data-q="20">₱20</button><button data-q="${bal}">Full ${peso(bal)}</button></div>
    <button class="btn-ct" data-save="${r.id}">Save Payment</button>` : '<p class="mut">Fully paid.</p>'}<h3>Payment history</h3><div id="hist" class="mut">Loading…</div></div>` : ''}</div>`;
  }).join('') || '<div class="cardx">No students found.</div>') + pagerHTML(d);
  pagerBind(payList);
  $('#editc').onclick = () => formBox('Edit collection', colFields, col, async (v) => { await api('/collections/' + col.id, { method: 'PUT', body: v }); toast('Saved'); await pay(); });
  $('#delc').onclick = () => confirmBox(`Delete <b>${esc(col.title)}</b>? Every payment recorded under it will be deleted too. This cannot be undone.`, async () => { await api('/collections/' + col.id, { method: 'DELETE' }); S.col = null; toast('Deleted'); await pay(); });
  on('[data-open]', (el) => { S.open = S.open == el.dataset.open ? null : el.dataset.open; run(payList); });
  on('[data-q]', (el) => { $('#amt').value = el.dataset.q; });
  on('[data-save]', (el) => run(async () => {
    await api('/payments', { method: 'POST', body: { student_id: el.dataset.save, collection_id: S.col, amount: $('#amt').value, notes: $('#note').value } }); toast('Payment saved'); await payList();
  }));
  if (S.open && $('#hist')) {
    const h = await api(`/payments?student_id=${S.open}&collection_id=${S.col}`);
    $('#hist').innerHTML = h.map((p) => `<div class="rowx hist"><span>${peso(p.amount)} · ${p.paid_at}${p.notes ? `<br><small>${esc(p.notes)}</small>` : ''}</span><button class="btn-dg btn-sm" data-delp="${p.id}" data-info="${peso(p.amount)} on ${p.paid_at}">Delete</button></div>`).join('') || 'No payments yet.';
    on('[data-delp]', (el) => confirmBox(`Delete the payment of ${esc(el.dataset.info)}? This cannot be undone.`, async () => { await api('/payments/' + el.dataset.delp, { method: 'DELETE' }); toast('Deleted'); await payList(); }));
  }
}

async function att() {
  const evs = await api('/events');
  if (!evs.find((e) => e.id == S.ev)) S.ev = evs[0] ? evs[0].id : null;
  $('#view').innerHTML = `<div class="two">${evs.length ? `<select id="ev" class="form-select form-select-lg" aria-label="Event">${evs.map((e) => `<option value="${e.id}" ${e.id == S.ev ? 'selected' : ''}>${esc(e.title)}</option>`).join('')}</select>` : ''}<button class="btn-ct btn-sm" id="newe">New event</button></div>
  ${S.ev ? `<div id="info"></div>${SEARCH}<div id="list"></div>` : '<div class="cardx">No events yet. Create one to take attendance.</div>'}`;
  $('#newe').onclick = () => formBox('New event', [{ k: 'title', label: 'Event name' }], {}, async (v) => { const x = await api('/events', { method: 'POST', body: v }); S.ev = x.id; S.q = ''; S.page = 1; await att(); });
  if (!S.ev) return;
  $('#ev').onchange = (e) => { S.ev = e.target.value; S.q = ''; S.page = 1; run(att); };
  searchBind(attList); await attList();
}
async function attList() {
  const d = await api(`/events/${S.ev}/attendance?${qs()}`); S.page = d.page;
  const c = d.counts, ev = d.event;
  $('#info').innerHTML = `<div class="cardx"><div class="rowx"><span>${esc(ev.title)} · ${ev.event_date}</span><span class="acts"><button class="btn-alt btn-sm" id="edite">Rename</button><button class="btn-dg btn-sm" id="dele">Delete</button></span></div></div>
  <div class="grid g3"><div class="cardx"><p>Present</p><b>${c.present}</b></div><div class="cardx"><p>Absent</p><b>${c.absent}</b></div><div class="cardx"><p>Not marked</p><b>${c.unmarked}</b></div></div>`;
  $('#list').innerHTML = (d.rows.map((r) => `<div class="cardx mb-2"><div class="arow"><span>${esc(r.full_name)}</span><div class="pa"><button class="${r.status == 'present' ? 'p' : ''}" data-id="${r.id}" data-s="present">Present</button><button class="${r.status == 'absent' ? 'a' : ''}" data-id="${r.id}" data-s="absent">Absent</button></div></div></div>`).join('') || '<div class="cardx">No students found.</div>') + pagerHTML(d);
  pagerBind(attList);
  $('#edite').onclick = () => formBox('Rename event', [{ k: 'title', label: 'Event name' }], { title: ev.title }, async (v) => { await api('/events/' + ev.id, { method: 'PUT', body: v }); toast('Saved'); await att(); });
  $('#dele').onclick = () => confirmBox(`Delete <b>${esc(ev.title)}</b>? All attendance marked for it will be deleted too. This cannot be undone.`, async () => { await api('/events/' + ev.id, { method: 'DELETE' }); S.ev = null; toast('Deleted'); await att(); });
  on('[data-s]', (el) => run(async () => { await api(`/events/${S.ev}/attendance`, { method: 'PUT', body: { student_id: el.dataset.id, status: el.dataset.s } }); await attList(); }));
}

const views = { home, pay, att, stu };
function go(v) {
  S.q = ''; S.page = 1; S.open = null;
  document.querySelectorAll('.nav button').forEach((b) => b.classList.toggle('on', b.dataset.v == v));
  run(views[v]);
}
on('.nav button', (b) => go(b.dataset.v));
$('#sub').textContent = 'Payment & Attendance · ' + new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric' });
go('home');
