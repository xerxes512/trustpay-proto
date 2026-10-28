/*
 * TrustPay prototype - screens and routing. All business rules live in state.js.
 * User-provided text is always inserted with textContent (via h()), never innerHTML.
 */
(function () {
  'use strict';
  const S = window.TrustPayState;
  const root = document.getElementById('app');
  const ui = { menu: false, create: null, form: {}, flash: null, lastRoute: null };

  /* ---------- tiny DOM helper ---------- */
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    kids.flat(2).forEach((c) => { if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c))); });
    return e;
  }
  const LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#10233F"/><path d="M9 10h14v4.5c0 5-3 8.2-7 9.5-4-1.3-7-4.5-7-9.5z" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><path d="M12.5 15.5l2.500 2.500 4.500-5" fill="none" stroke="#6EE7B7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function svgSpan(markup) { const s = h('span'); s.innerHTML = markup; return s; } // trusted static markup only
  const badge = (status) => h('span', { class: 'badge ' + S.STATUS[status].tone }, S.STATUS[status].label);
  const link = (ref, role) => location.href.split('#')[0] + '#/' + (role === 'vendor' ? 'v' : 't') + '/' + ref;
  const go = (path) => { location.hash = path; };
  function flash(kind, text) { ui.flash = { kind, text }; }

  /* ---------- shared chrome ---------- */
  function Header() {
    const nav = h('nav', { class: 'links' + (ui.menu ? ' open' : ''), id: 'nav', 'aria-label': 'Main' },
      h('a', { href: '#/how' }, 'How It Works'), h('a', { href: '#/buyer' }, 'For Buyers'), h('a', { href: '#/vendor' }, 'For Vendors'),
      h('a', { href: '#/investor' }, 'Investors'), h('a', { class: 'cta', href: '#/enter' }, 'Sign In'));
    const btn = h('button', { class: 'menu-btn', 'aria-expanded': String(ui.menu), 'aria-controls': 'nav', 'aria-label': 'Menu',
      onclick: () => { ui.menu = !ui.menu; nav.classList.toggle('open', ui.menu); btn.setAttribute('aria-expanded', String(ui.menu)); } }, 'Menu');
    return h('div', null,
      h('div', { class: 'strip' }, 'Prototype environment: sample data and simulated events only. No real payments or accounts.'),
      h('header', { class: 'top' }, h('div', { class: 'wrap' },
        h('div', { class: 'bar' }, h('a', { class: 'brand', href: '#/' }, svgSpan(LOGO), 'TrustPay'), btn), nav)));
  }
  function Footer() {
    return h('footer', null, h('div', { class: 'wrap grid g3' },
      h('div', null, h('a', { class: 'brand', href: '#/' }, svgSpan(LOGO), 'TrustPay'), h('p', { style: 'margin-top:10px' }, 'Buy with Confidence. Sell with Trust.')),
      h('div', null, h('p', null, 'TrustPay is a proposed product. This prototype demonstrates the intended experience using simulated data. It does not process payments, hold funds, verify identities, or guarantee outcomes.')),
      h('div', null, h('p', null, h('b', { style: 'color:#fff' }, 'Prototype controls')),
        h('button', { class: 'btn sec sm', onclick: () => {
          if (confirm('Reset the demonstration to its sample state? Transactions you created will be removed.')) { S.resetDb(); flash('ok', 'Demonstration reset to sample data.'); const same = location.hash === '#/vendor'; go('/vendor'); if (same) render(); }
        } }, 'Reset demonstration'))));
  }
  const Flash = () => { const f = ui.flash; ui.flash = null; return f ? h('div', { class: 'alert ' + f.kind, role: 'status' }, f.text) : null; };

  /* ---------- content ---------- */
  const STEPS = [
    ['Vendor creates a transaction', 'The vendor enters the product, price, delivery arrangement and terms, then shares a link.'],
    ['Buyer reviews the offer', 'The buyer sees the full details and can accept, request changes, or decline.'],
    ['Both parties agree on the terms', 'Accepted terms are recorded as a fixed snapshot. Different terms mean a new transaction.'],
    ['Payment is recorded', 'Payment is recorded through the intended payment process. Final arrangements depend on the payment-provider and regulatory structure.'],
    ['Product is dispatched or handed over', 'The vendor records dispatch or an in-person handover, with an optional tracking reference.'],
    ['Delivery or handover is confirmed', 'An explicit confirmation records the time. Nothing starts by accident.'],
    ['The inspection period begins', 'The intended rule is three hours from confirmed delivery, counted from a recorded timestamp.'],
    ['Completed, or sent to dispute review', 'Without a reported problem the transaction moves to completion checks. A reported problem pauses the normal path for review.']];
  const stepList = () => h('ol', { class: 'steps' }, STEPS.map(([t, d]) => h('li', null, h('b', null, t), h('span', { class: 'muted' }, d))));
  const hero = (t, sub) => h('section', { class: 'hero' }, h('div', { class: 'wrap' }, h('h1', null, t), h('p', null, sub)));

  function SampleCard() {
    const rows = [['Offer created', 'done'], ['Terms accepted', 'done'], ['Payment recorded', 'done'], ['Delivery confirmed', 'now'], ['Inspection window', ''], ['Completion checks', '']];
    return h('div', { class: 'card sample', 'aria-label': 'Sample transaction card' },
      h('div', { class: 'head' }, h('div', null, h('b', { style: 'color:#10233F' }, 'iPhone 15 Pro Max 256GB'), h('div', { class: 'small muted' }, 'Sample transaction')),
        h('span', { class: 'badge amber' }, 'Inspection in progress')),
      h('div', { class: 'big' }, S.formatNaira(1650000)), h('div', { class: 'small muted' }, 'Example price only'),
      h('ul', { class: 'mini' }, rows.map(([t, c]) => h('li', { class: c }, h('i'), t))),
      h('div', { class: 'small muted', style: 'margin-top:10px' }, 'Inspection time remaining: 02:41:09 (illustration)'));
  }
  function Landing() {
    const sec = (cls, ...k) => h('section', { class: 'sec ' + cls }, h('div', { class: 'wrap' }, k));
    return h('div', null,
      h('section', { class: 'hero' }, h('div', { class: 'wrap hero-grid' },
        h('div', null, h('h1', null, 'Buy with Confidence. Sell with Trust.'),
          h('p', null, 'TrustPay is designed to help buyers and vendors agree on terms and follow a structured, recorded transaction process, from offer to delivery to inspection.'),
          h('div', { class: 'row' }, h('a', { class: 'btn', href: '#/how' }, 'Explore How It Works'), h('a', { class: 'btn sec', href: '#/vendor' }, 'Explore the Vendor Experience'))),
        SampleCard())),
      sec('', h('h2', null, 'How it works'), h('p', { class: 'muted' }, 'Eight recorded stages from offer to completion.'), stepList(), h('a', { class: 'btn sec', href: '#/how' }, 'See the full process')),
      sec('alt', h('div', { class: 'grid g2' },
        h('div', null, h('h2', null, 'For buyers'), h('p', null, 'See the product, condition, price, delivery fee and terms in one place before you agree. Request changes or decline without pressure. After delivery you have a defined inspection window, and a way to report a problem.'),
          h('a', { class: 'btn sec', href: '#/buyer' }, 'Open buyer dashboard')),
        h('div', null, h('h2', null, 'For vendors'), h('p', null, 'Create a transaction in a few steps and share one link. Accepted terms are recorded so both sides refer to the same agreement, and every stage is time-stamped.'),
          h('a', { class: 'btn sec', href: '#/vendor' }, 'Open vendor dashboard')))),
      sec('', h('h2', null, 'Transaction transparency'), h('div', { class: 'grid g3' },
        [['Recorded agreements', 'Accepted terms are kept as a fixed snapshot and cannot be silently edited.'],
         ['Transaction visibility', 'Both parties see the same status and a time-stamped timeline.'],
         ['Dispute reporting', 'A problem raised during inspection pauses the normal path and moves the transaction to review.']]
          .map(([t, d]) => h('div', { class: 'card' }, h('h3', null, t), h('p', { class: 'muted', style: 'margin:0' }, d))))),
      sec('alt faq', h('h2', null, 'Frequently asked questions'),
        [['Is TrustPay a marketplace?', 'No. It coordinates a transaction between a vendor and a buyer who already agree to deal. There is no public catalogue.'],
         ['Does this prototype handle real money?', 'No. Payment, dispatch and delivery events are simulated by demonstration controls.'],
         ['Does TrustPay eliminate risk?', 'No. It is designed to make transactions more organised and transparent. It does not guarantee outcomes.'],
         ['When does the inspection window start?', 'Only when delivery or handover is explicitly confirmed. The intended length is three hours.'],
         ['Does the inspection ending release funds?', 'No. Ending only moves the transaction to completion checks. Any real release would depend on the final payment structure and backend checks.']]
          .map(([q, a]) => h('details', null, h('summary', null, q), h('p', { class: 'muted' }, a)))));
  }
  function How() {
    return h('div', null, hero('How TrustPay works', 'The proposed transaction lifecycle, from offer to completion or review.'),
      h('div', { class: 'wrap page' }, h('div', { class: 'cols' }, h('div', { class: 'card' }, stepList()),
        h('div', { class: 'stack' }, h('div', { class: 'alert info' }, 'Exact payment and fund-release arrangements depend on the final payment-provider and regulatory structure. This prototype simulates those steps.'),
          h('div', { class: 'card' }, h('h3', null, 'Try it'), h('p', { class: 'muted' }, 'Create a sample transaction and follow it through every stage.'), h('a', { class: 'btn', href: '#/create' }, 'Create a sample transaction'))))));
  }
  function Enter() {
    return h('div', null, hero('Choose a demonstration profile', 'A convenience for demonstrating both sides of a transaction.'),
      h('div', { class: 'wrap page' }, h('div', { class: 'alert warn' }, 'This is not a login. TrustPay has no real accounts in this prototype, and no passwords or personal details are collected.'),
        h('div', { class: 'grid g2' }, h('div', { class: 'card' }, h('h3', null, 'Vendor'), h('p', { class: 'muted' }, 'Sample vendor: Lagos Gadget Hub.'), h('a', { class: 'btn', href: '#/vendor' }, 'Continue as vendor')),
          h('div', { class: 'card' }, h('h3', null, 'Buyer'), h('p', { class: 'muted' }, 'Sample buyer.'), h('a', { class: 'btn', href: '#/buyer' }, 'Continue as buyer')))));
  }

  /* ---------- dashboards ---------- */
  const GROUPS = {
    awaiting: ['awaiting_review', 'changes_requested', 'accepted'],
    progress: ['payment_simulated', 'dispatched'],
    inspection: ['inspection', 'inspection_complete'],
    review: ['dispute'],
    done: ['completed', 'resolved', 'declined', 'cancelled']
  };
  function TxRow(tx, role) {
    return h('a', { class: 'list-item', href: '#/' + (role === 'vendor' ? 'v' : 't') + '/' + tx.ref },
      h('div', null, h('b', null, tx.productName), h('span', { class: 'small muted' }, tx.ref + ' · ' + S.formatNaira(S.totalOf(tx)) + ' (example)')), badge(tx.status));
  }
  function VendorDash() {
    const f = ui.form.filter || { q: '', status: '' };
    const all = S.list();
    const stat = (label, n) => h('div', { class: 'card stat' }, h('b', null, n), h('span', { class: 'muted small' }, label));
    const shown = all.filter((t) => (!f.status || t.status === f.status) && (!f.q || (t.productName + t.ref).toLowerCase().includes(f.q.toLowerCase())));
    const q = h('input', { id: 'q', type: 'search', value: f.q, placeholder: 'Search product or reference', 'aria-label': 'Search transactions',
      oninput: (e) => { f.q = e.target.value; ui.form.filter = f; renderList(); } });
    const sel = h('select', { 'aria-label': 'Filter by status', onchange: (e) => { f.status = e.target.value; ui.form.filter = f; renderList(); } },
      h('option', { value: '' }, 'All statuses'), Object.entries(S.STATUS).map(([k, v]) => h('option', { value: k, selected: f.status === k }, v.label)));
    const listBox = h('div', { class: 'card' });
    function renderList() {
      const rows = S.list().filter((t) => (!f.status || t.status === f.status) && (!f.q || (t.productName + t.ref).toLowerCase().includes(f.q.toLowerCase())));
      listBox.replaceChildren(...(rows.length ? rows.map((t) => TxRow(t, 'vendor')) : [h('p', { class: 'muted' }, 'No transactions match. Clear the search or create a new transaction.')]));
    }
    renderList();
    return h('div', { class: 'wrap page' }, Flash(),
      h('div', { class: 'row', style: 'justify-content:space-between;margin-bottom:16px' }, h('div', null, h('h2', { style: 'margin:0' }, 'Welcome, Lagos Gadget Hub'), h('span', { class: 'muted small' }, 'Sample vendor workspace with example data')),
        h('a', { class: 'btn', href: '#/create' }, 'Create transaction')),
      h('div', { class: 'grid g4', style: 'margin-bottom:16px' }, stat('Sample transactions', all.length),
        stat('Awaiting buyer or payment', all.filter((t) => GROUPS.awaiting.includes(t.status)).length),
        stat('In delivery or inspection', all.filter((t) => [...GROUPS.progress, ...GROUPS.inspection].includes(t.status)).length),
        stat('Under dispute review', all.filter((t) => t.status === 'dispute').length)),
      h('div', { class: 'filters' }, q, sel), listBox);
  }
  function BuyerDash() {
    const all = S.list();
    const block = (title, statuses, empty) => {
      const rows = all.filter((t) => statuses.includes(t.status));
      return h('div', { class: 'card' }, h('h3', null, title + ' (' + rows.length + ')'), rows.length ? rows.map((t) => TxRow(t, 'buyer')) : h('p', { class: 'muted small', style: 'margin:0' }, empty));
    };
    return h('div', { class: 'wrap page' }, Flash(), h('h2', null, 'Your transactions'), h('p', { class: 'muted' }, 'Sample buyer view with example data.'),
      h('div', { class: 'stack' },
        block('Awaiting your action', ['awaiting_review'], 'Nothing needs your attention.'),
        block('Agreed, in progress', ['accepted', 'payment_simulated', 'dispatched'], 'No agreed transactions in progress.'),
        block('In the inspection period', GROUPS.inspection, 'No transactions in inspection.'),
        block('Under review', GROUPS.review, 'No open disputes.'),
        block('Completed and history', ['completed', 'resolved', 'declined', 'cancelled', 'changes_requested'], 'No history yet.')));
  }

  /* ---------- form helpers ---------- */
  function field(label, name, val, errs, o) {
    o = o || {};
    const id = 'f-' + name, err = errs && errs[name];
    const common = { id, name, 'aria-invalid': err ? 'true' : null, 'aria-describedby': err ? id + '-e' : null };
    let input;
    if (o.options) input = h('select', common, h('option', { value: '' }, 'Choose...'), o.options.map((x) => h('option', { value: x, selected: val === x }, x)));
    else if (o.area) input = h('textarea', common, val || '');
    else input = h('input', Object.assign({ type: o.type || 'text', value: val == null ? '' : val, inputmode: o.mode || null, min: o.min || null }, common));
    return h('div', { class: 'field' + (err ? ' err' : '') }, h('label', { for: id }, label), input,
      o.hint ? h('div', { class: 'hint' }, o.hint) : null, err ? h('div', { class: 'error', id: id + '-e', role: 'alert' }, err) : null);
  }

  /* ---------- create transaction (3 steps) ---------- */
  const STEP_FIELDS = [['productName', 'brand', 'model', 'condition', 'description'], ['price', 'deliveryMethod', 'deliveryFee', 'dispatchBy'], ['terms']];
  function Create() {
    if (!ui.create) ui.create = { step: 0, data: { deliveryMethod: 'Courier delivery', deliveryFee: '0' }, errors: {}, created: null };
    const c = ui.create, d = c.data, e = c.errors;
    if (c.created) return Created(c.created);
    const form = h('form', { novalidate: true, onsubmit: (ev) => ev.preventDefault(), oninput: (ev) => { if (ev.target.name) d[ev.target.name] = ev.target.value; if (ev.target.name === 'deliveryMethod') render(); } });
    const prog = h('div', { class: 'prog', 'aria-label': 'Step ' + (c.step + 1) + ' of 3' }, [0, 1, 2].map((i) => h('span', { class: i <= c.step ? 'on' : '' })));
    if (c.step === 0) form.append(h('h3', null, 'Product'), field('Product name', 'productName', d.productName, e), field('Brand', 'brand', d.brand, e), field('Model', 'model', d.model, e),
      field('Condition', 'condition', d.condition, e, { options: S.CONDITIONS }), field('Product description', 'description', d.description, e, { area: true }));
    if (c.step === 1) form.append(h('h3', null, 'Price and delivery'), field('Product price (naira)', 'price', d.price, e, { mode: 'numeric', hint: 'Whole naira. Example prices only.' }),
      field('Delivery method', 'deliveryMethod', d.deliveryMethod, e, { options: S.DELIVERY }),
      d.deliveryMethod === 'Courier delivery' ? field('Delivery fee (naira)', 'deliveryFee', d.deliveryFee, e, { mode: 'numeric', hint: 'Enter 0 if free.' }) : null,
      field('Proposed dispatch deadline', 'dispatchBy', d.dispatchBy, e, { type: 'date', min: S.today() }));
    if (c.step === 2) {
      const total = (Number(d.price) || 0) + (d.deliveryMethod === 'Courier delivery' ? Number(d.deliveryFee) || 0 : 0);
      form.append(h('h3', null, 'Terms and review'), field('Additional transaction terms (optional)', 'terms', d.terms, e, { area: true }),
        h('dl', { class: 'kv card tight' }, [['Product', d.productName + ' ' + d.model + ' (' + d.brand + ')'], ['Condition', d.condition], ['Price', S.formatNaira(d.price)],
          ['Delivery', d.deliveryMethod + (d.deliveryMethod === 'Courier delivery' ? ', ' + S.formatNaira(d.deliveryFee) : '')], ['Dispatch deadline', d.dispatchBy]]
          .map(([k, v]) => h('div', null, h('dt', null, k), h('dd', null, v))), h('div', { class: 'tot' }, h('dt', null, 'Total proposed'), h('dd', null, S.formatNaira(total)))));
    }
    const hasErr = Object.keys(e).length;
    const next = () => {
      const all = S.validateInput(d), mine = {};
      STEP_FIELDS[c.step].forEach((k) => { if (all[k]) mine[k] = all[k]; });
      c.errors = mine;
      if (!Object.keys(mine).length) {
        if (c.step < 2) c.step++;
        else {
          const r = S.createTx(d);
          if (r.errors) { c.errors = r.errors; c.step = 0; } else { c.created = r.tx; }
        }
      }
      render();
    };
    form.append(h('div', { class: 'row' }, c.step ? h('button', { type: 'button', class: 'btn sec', onclick: () => { c.step--; c.errors = {}; render(); } }, 'Back') : null,
      h('button', { type: 'button', class: 'btn', onclick: next }, c.step === 2 ? 'Create transaction' : 'Continue')));
    return h('div', { class: 'wrap page', style: 'max-width:640px' }, h('a', { class: 'crumb', href: '#/vendor' }, 'Back to dashboard'), h('h2', null, 'Create transaction'), prog,
      hasErr ? h('div', { class: 'alert bad', role: 'alert' }, 'Please fix the highlighted fields.') : null, h('div', { class: 'card' }, form));
  }
  function Created(tx) {
    const url = link(tx.ref, 'buyer');
    const box = h('input', { class: 'linkbox', readonly: true, value: url, 'aria-label': 'Buyer link', onfocus: (e) => e.target.select() });
    const msg = h('div', { role: 'status', class: 'small muted' });
    const copy = () => {
      const fallback = () => { box.focus(); box.select(); msg.textContent = 'Copy was blocked by the browser. The link is selected: press and hold, then choose Copy.'; };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(() => { msg.textContent = 'Link copied.'; }, fallback); else fallback();
    };
    return h('div', { class: 'wrap page', style: 'max-width:640px' }, h('div', { class: 'alert ok', role: 'status' }, 'Transaction created: ' + tx.ref),
      h('div', { class: 'card stack' }, h('h3', null, 'Share the buyer link'), box, msg,
        h('div', { class: 'row' }, h('button', { class: 'btn', onclick: copy }, 'Copy link'), h('a', { class: 'btn sec', href: '#/t/' + tx.ref }, 'Open buyer page'), h('a', { class: 'btn sec', href: '#/v/' + tx.ref }, 'View as vendor')),
        h('p', { class: 'small muted' }, 'The link works in this browser only, because the prototype keeps data locally. A real product would store it on a server.')),
      h('button', { class: 'btn sec', style: 'margin-top:16px', onclick: () => { ui.create = null; render(); } }, 'Create another'));
  }

  /* ---------- transaction page ---------- */
  function Timeline(tx) {
    return h('ol', { class: 'tl' }, tx.events.map((ev) => h('li', null, h('span', { class: 'when' }, S.formatDate(ev.at)), ev.label, ev.simulated ? h('span', { class: 'tag' }, 'Simulated') : null)));
  }
  const kv = (rows) => h('dl', { class: 'kv' }, rows.map(([k, v, c]) => h('div', { class: c || null }, h('dt', null, k), h('dd', null, v))));

  function Countdown(tx) {
    const rem = S.inspectionRemaining(tx);
    const box = h('div', { class: 'card' }, h('h3', null, 'Inspection window'));
    if (rem === null) { box.append(h('div', { class: 'alert bad', role: 'alert' }, 'The recorded confirmation time is missing or invalid, so the inspection state cannot be determined. A real system would flag this for review.')); return box; }
    const start = h('p', { class: 'small muted' }, 'Started: ' + S.formatDate(tx.deliveredAt) + ' (three hours from confirmed delivery or handover)');
    const clock = h('div', { class: 'count', 'data-start': tx.deliveredAt, role: 'timer', 'aria-live': 'off' }, fmtMs(rem));
    box.append(clock, start, rem > 0 ? h('p', { class: 'small muted' }, 'Report a problem before the window ends if something is wrong with the item.')
      : h('div', { class: 'alert info' }, 'The inspection window has ended. This does not release any funds. Completion checks come next.'));
    return box;
  }
  const fmtMs = (ms) => { const s = Math.floor(ms / 1000), p = (n) => String(n).padStart(2, '0'); return p(Math.floor(s / 3600)) + ':' + p(Math.floor(s % 3600 / 60)) + ':' + p(s % 60); };

  function run(fn, okMsg) { try { fn(); if (okMsg) flash('ok', okMsg); } catch (err) { flash('bad', err.message); } render(); }

  function BuyerActions(tx) {
    const f = ui.form;
    if (f.mode === 'changes') return h('div', { class: 'card' }, h('h3', null, 'Request changes'), field('What would you like changed?', 'msg', f.msg, f.errors, { area: true }),
      h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => {
        const v = document.getElementById('f-msg').value;
        try { S.requestChanges(tx.ref, v); ui.form = {}; flash('ok', 'Change request recorded.'); } catch (err) { f.msg = v; f.errors = { msg: err.message }; } render(); } }, 'Send request'),
        h('button', { class: 'btn sec', onclick: () => { ui.form = {}; render(); } }, 'Cancel')));
    return h('div', { class: 'card' }, h('h3', null, 'Review this offer'), h('p', { class: 'muted' }, 'Accepting records these terms as a fixed agreement. Review the details first.'),
      h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => run(() => S.acceptOffer(tx.ref), 'Offer accepted. Terms recorded.') }, 'Accept Offer'),
        h('button', { class: 'btn sec', onclick: () => { ui.form = { mode: 'changes' }; render(); } }, 'Request Changes'),
        h('button', { class: 'btn danger', onclick: () => { if (confirm('Decline this offer? This cannot be undone.')) run(() => S.declineOffer(tx.ref), 'Offer declined.'); } }, 'Decline Offer')));
  }
  function ReportForm(tx) {
    const f = ui.form;
    if (f.mode !== 'report') return h('div', { class: 'card' }, h('h3', null, 'Something wrong with the item?'), h('p', { class: 'muted' }, 'You can report a problem during inspection. This pauses the normal completion path and moves the transaction to review.'),
      h('button', { class: 'btn danger', onclick: () => { ui.form = { mode: 'report' }; render(); } }, 'Report a problem'));
    const grab = () => ({ reason: document.getElementById('f-reason').value, description: document.getElementById('f-description').value,
      evidenceName: (document.getElementById('f-file').files[0] || {}).name || '' });
    if (f.review) return h('div', { class: 'card stack' }, h('h3', null, 'Review your report'),
      kv([['Reason', f.data.reason], ['Description', f.data.description], ['Attachment', f.data.evidenceName || 'None']]),
      h('p', { class: 'small muted' }, 'Demonstration only: attachments are not uploaded or sent to any dispute system.'),
      h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => { try { S.openDispute(tx.ref, f.data); ui.form = {}; flash('ok', 'Problem reported. Dispute reference: ' + S.getTx(tx.ref).dispute.ref); } catch (err) { flash('bad', err.message); } render(); } }, 'Submit report'),
        h('button', { class: 'btn sec', onclick: () => { f.review = false; render(); } }, 'Edit')));
    return h('div', { class: 'card' }, h('h3', null, 'Report a problem'),
      field('Reason', 'reason', f.data && f.data.reason, f.errors, { options: S.DISPUTE_REASONS }), field('Describe what happened', 'description', f.data && f.data.description, f.errors, { area: true }),
      h('div', { class: 'field' }, h('label', { for: 'f-file' }, 'Illustrative attachment (optional)'), h('input', { id: 'f-file', type: 'file', accept: 'image/*' }),
        h('div', { class: 'hint' }, 'Demonstration only: the file stays on your device. Only its name is listed as a sample evidence record.')),
      h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => {
        const data = grab(), errors = {};
        if (!data.reason) errors.reason = 'Choose a reason.';
        if (data.description.trim().length < 10) errors.description = 'Describe the problem in at least 10 characters.';
        f.data = data; f.errors = errors; f.review = !Object.keys(errors).length; render(); } }, 'Review report'),
        h('button', { class: 'btn sec', onclick: () => { ui.form = {}; render(); } }, 'Cancel')));
  }
  function DisputeCard(tx, role) {
    const d = tx.dispute; if (!d) return null;
    const box = h('div', { class: 'card stack' }, h('div', { class: 'row', style: 'justify-content:space-between' }, h('h3', { style: 'margin:0' }, 'Dispute ' + d.ref), h('span', { class: 'badge ' + (tx.status === 'resolved' ? 'green' : 'red') }, d.status)),
      kv([['Reported issue', d.reason], ['Buyer description', d.description], ['Vendor response', d.vendorResponse || 'Not yet provided'], ['Resolution', d.resolution || 'Pending']]),
      h('div', null, h('b', { style: 'color:#10233F' }, 'Evidence timeline'), h('ol', { class: 'tl', style: 'margin-top:10px' }, d.evidence.map((x) => h('li', null, h('span', { class: 'when' }, S.formatDate(x.at)), x.label)))));
    if (d.status === 'Return Proposed') box.append(h('div', { class: 'alert warn' }, 'A return is proposed. The returned item and its condition would need verification before any refund is finalised.'));
    if (d.status === 'Refund Proposed') box.append(h('div', { class: 'alert warn' }, 'A refund is proposed in this demonstration. No refund is processed by this prototype.'));
    if (role === 'vendor' && tx.status === 'dispute') box.append(h('div', null, field('Vendor response', 'vresp', '', null, { area: true }),
      h('button', { class: 'btn sm', onclick: () => run(() => S.addVendorResponse(tx.ref, document.getElementById('f-vresp').value), 'Vendor response recorded.') }, 'Submit response')));
    return box;
  }
  function Ops(tx) {
    const body = h('div', { class: 'stack', style: 'margin-top:12px' });
    const note = (t) => body.append(h('p', { class: 'small muted' }, t));
    const btn = (label, fn, msg, cls) => body.append(h('button', { class: 'btn sm ' + (cls || ''), onclick: () => run(fn, msg) }, label));
    note('Demonstration controls stand in for systems that do not exist yet. They are not part of the buyer or vendor experience.');
    const s = tx.status;
    if (s === 'accepted') btn('Simulate Payment Confirmation', () => S.simulatePayment(tx.ref), 'Simulated payment event recorded. No money moved.');
    if (s === 'payment_simulated') {
      body.append(field('Tracking reference (optional)', 'trk', '', null), h('button', { class: 'btn sm', onclick: () => run(() => S.recordDispatch(tx.ref, { tracking: document.getElementById('f-trk').value }), 'Dispatch recorded.') }, 'Record dispatch'));
    }
    if (s === 'dispatched') {
      body.append(field('Delivery notes (optional)', 'dn', '', null, { area: true }),
        h('label', { class: 'small' }, h('input', { type: 'checkbox', id: 'dconf' }), ' I confirm the item was delivered or physically handed over'),
        h('button', { class: 'btn sm', onclick: () => run(() => S.confirmDelivery(tx.ref, { confirmed: document.getElementById('dconf').checked, notes: document.getElementById('f-dn').value }), 'Delivery confirmed. Inspection started.') }, 'Confirm delivery and start inspection'));
    }
    if (s === 'inspection') {
      btn('Fast-forward: end inspection window', () => S.demoMoveDeliveryBack(tx.ref), 'Confirmation time moved back three hours.', 'sec');
      btn('Move to completion checks', () => S.completeInspection(tx.ref), 'Inspection complete. No funds released.');
    }
    if (s === 'inspection_complete') btn('Run simulated completion checks', () => S.markCompleted(tx.ref), 'Transaction completed (simulated).');
    if (s === 'dispute' || (s === 'resolved' && tx.dispute && tx.dispute.status !== 'Closed')) {
      const sel = h('select', { id: 'stage', 'aria-label': 'Dispute status' }, S.DISPUTE_STAGES.map((x) => h('option', { value: x, selected: x === tx.dispute.status }, x)));
      body.append(field('Resolution note (used when resolving)', 'rnote', '', null, { area: true }), sel,
        h('button', { class: 'btn sm', onclick: () => run(() => S.setDisputeStage(tx.ref, sel.value, document.getElementById('f-rnote').value), 'Dispute status updated.') }, 'Update dispute status'));
    }
    return h('details', { class: 'ops' }, h('summary', null, 'Demonstration controls'), body);
  }

  function TxPage(ref, role) {
    const tx = S.getTx(ref);
    const back = role === 'vendor' ? '#/vendor' : '#/buyer';
    if (!tx) return h('div', { class: 'wrap page' }, h('div', { class: 'alert bad' }, 'No transaction with reference ' + ref + ' exists in this browser. Prototype data is stored locally on each device.'), h('a', { class: 'btn sec', href: back }, 'Back to dashboard'));
    const terms = tx.snapshot || tx; // after acceptance, show the frozen snapshot
    const s = tx.status;
    const main = h('div', { class: 'stack' }, Flash());
    if (tx.snapshot) main.append(h('div', { class: 'alert info' }, 'Terms accepted ' + S.formatDate(tx.snapshot.acceptedAt) + ' and locked. New terms need a new transaction.'));
    main.append(h('div', { class: 'card' }, h('h3', null, terms.productName), h('p', { class: 'muted' }, terms.brand + ' ' + terms.model + ' · ' + terms.condition), h('p', null, terms.description),
      kv([['Product price', S.formatNaira(terms.price)], ['Delivery fee', S.formatNaira(terms.deliveryFee)], ['Total proposed amount', S.formatNaira(S.totalOf(terms.total ? { price: terms.price, deliveryFee: terms.deliveryFee } : terms)), 'tot'],
        ['Delivery', terms.deliveryMethod], ['Dispatch deadline', terms.dispatchBy], ['Vendor', tx.vendor], ['Buyer', tx.buyer]]),
      h('p', { class: 'small muted', style: 'margin-top:12px' }, 'Additional terms: ' + (terms.terms || 'None'))));
    if (s === 'awaiting_review') main.append(role === 'buyer' ? BuyerActions(tx) : h('div', { class: 'card' }, h('h3', null, 'Waiting for the buyer'), h('p', { class: 'muted' }, 'Share the buyer link so they can review the offer.'),
      h('a', { class: 'btn sec sm', href: '#/t/' + tx.ref }, 'Open buyer page')));
    if (s === 'changes_requested') main.append(h('div', { class: 'card stack' }, h('h3', null, 'Changes requested'), h('p', null, '"' + tx.changeRequest + '"'),
      h('p', { class: 'small muted' }, 'Terms are not edited in place. Cancel this transaction and create a replacement with the new terms.'),
      role === 'vendor' ? h('button', { class: 'btn', onclick: () => { run(() => S.cancelAgreement(tx.ref)); ui.create = { step: 0, errors: {}, created: null, data: { productName: tx.productName, brand: tx.brand, model: tx.model, condition: tx.condition, description: tx.description, price: String(tx.price), deliveryMethod: tx.deliveryMethod, deliveryFee: String(tx.deliveryFee), dispatchBy: '', terms: tx.terms } }; go('/create'); } }, 'Cancel and create replacement') : null));
    if (s === 'accepted') main.append(h('div', { class: 'card stack' }, h('h3', null, 'Payment stage'), h('p', { class: 'muted' }, 'In the proposed process, payment would be recorded here through an approved payment provider. This prototype does not process or hold money. Use the demonstration controls to simulate the event.'),
      h('button', { class: 'btn danger sm', onclick: () => { if (confirm('Cancel this agreement? Different terms require a new transaction.')) run(() => S.cancelAgreement(tx.ref), 'Agreement cancelled.'); } }, 'Cancel agreement')));
    if (s === 'payment_simulated') main.append(h('div', { class: 'card' }, h('h3', null, 'Awaiting dispatch'), h('p', { class: 'muted', style: 'margin:0' }, 'A simulated payment event is recorded. It is not evidence of a real payment.')));
    if (s === 'dispatched') main.append(h('div', { class: 'card' }, h('h3', null, 'On the way'), h('p', { class: 'muted', style: 'margin:0' }, 'Dispatch recorded' + (tx.tracking ? ' (reference ' + tx.tracking + ')' : '') + '. The inspection window starts only when delivery or handover is confirmed.')));
    if (s === 'inspection' || s === 'inspection_complete') { main.append(Countdown(tx)); if (role === 'buyer') main.append(ReportForm(tx));
      if (s === 'inspection_complete') main.append(h('div', { class: 'alert warn' }, 'Awaiting completion checks. A real system would verify payment status, disputes and eligibility on the server first.')); }
    if (s === 'dispute') main.append(h('div', { class: 'alert warn' }, 'The normal completion path is paused while this dispute is open.'));
    if (tx.dispute) main.append(DisputeCard(tx, role));
    if (s === 'completed') main.append(h('div', { class: 'alert ok' }, 'Completed in the prototype. This is a simulation, not evidence of a real financial transaction.'));
    if (s === 'declined' || s === 'cancelled') main.append(h('div', { class: 'alert bad' }, 'This transaction is closed: ' + S.STATUS[s].label.toLowerCase() + '.'));
    const side = h('div', { class: 'stack' }, h('div', { class: 'card' }, h('h3', null, 'Timeline'), Timeline(tx)), Ops(tx));
    return h('div', { class: 'wrap page' }, h('a', { class: 'crumb', href: back }, 'Back to dashboard'),
      h('div', { class: 'row', style: 'justify-content:space-between;margin-bottom:14px' }, h('div', null, h('h2', { style: 'margin:0' }, tx.ref), h('span', { class: 'small muted' }, 'Viewing as ' + role + ' · created ' + S.formatDate(tx.createdAt))), badge(s)),
      h('div', { class: 'cols' }, main, side));
  }

  /* ---------- investor overview ---------- */
  function Investor() {
    const t = (c) => h('span', { class: 'badge ' + (c ? 'green' : 'amber') }, c ? 'Confirmed' : 'Assumption to validate');
    const items = [
      ['The problem', false, 'Phone and electronics deals between vendors and buyers often rely on informal agreements, with little shared record of terms, delivery and what happens when something goes wrong. The scale of this problem has not been measured.'],
      ['Proposed solution', true, 'A structured transaction process: recorded terms, visible stages, a defined inspection window and dispute reporting.'],
      ['Target customers', true, 'Phone and electronics vendors and their customers.'],
      ['Initial focus', true, 'Phones and electronics, starting in Abuja and Lagos, subject to operational readiness.'],
      ['Workflow', true, 'Offer, agreement, payment record, dispatch or handover, confirmed delivery, three-hour inspection, completion or dispute review.'],
      ['Revenue model', false, 'A transaction fee. The structure is provisional and no fee is final.'],
      ['Market entry', false, 'A small vendor-led pilot in one city before widening. Requires vendor interviews to validate.'],
      ['Operational and regulatory challenges', false, 'Payment-provider and licensing structure, how funds would be held, dispute handling capacity, identity checks, delivery coordination, and legal advice on all of these.'],
      ['Roadmap', false, 'Prototype, vendor and buyer interviews, legal and regulatory advice, payment-provider selection, backend build, controlled pilot.'],
      ['Next validation milestones', false, 'Interview vendors on current practice, test willingness to use the process, confirm the regulatory route, and agree pilot success measures.']];
    return h('div', null, hero('Investor overview', 'What is decided, and what still needs evidence. No market sizes, revenue projections or partnerships are claimed.'),
      h('div', { class: 'wrap page' }, h('div', { class: 'stack' }, items.map(([title, c, body]) => h('div', { class: 'card' }, h('div', { class: 'row', style: 'justify-content:space-between' }, h('h3', { style: 'margin:0' }, title), t(c)), h('p', { style: 'margin:10px 0 0' }, body))),
        h('a', { class: 'btn', href: '#/vendor' }, 'See the working prototype'))));
  }

  /* ---------- routing ---------- */
  function render() {
    const p = (location.hash.slice(1) || '/').split('/').filter(Boolean);
    let view;
    switch (p[0]) {
      case undefined: view = Landing(); break;
      case 'how': view = How(); break;
      case 'enter': view = Enter(); break;
      case 'vendor': view = VendorDash(); break;
      case 'buyer': view = BuyerDash(); break;
      case 'create': view = Create(); break;
      case 'investor': view = Investor(); break;
      case 't': view = TxPage(p[1], 'buyer'); break;
      case 'v': view = TxPage(p[1], 'vendor'); break;
      default: view = h('div', { class: 'wrap page' }, h('p', null, 'Page not found.'), h('a', { href: '#/' }, 'Go home'));
    }
    const notice = S.consumeRecoveryNotice() ? h('div', { class: 'alert warn wrap', role: 'status', style: 'margin-top:12px' }, 'Saved prototype data could not be read, so sample data was restored.') : null;
    const y = window.scrollY, same = ui.lastRoute === location.hash;
    root.replaceChildren(...[Header(), notice, h('main', { id: 'main' }, view), Footer()].filter(Boolean));
    window.scrollTo(0, same ? y : 0); ui.lastRoute = location.hash;
  }
  window.addEventListener('hashchange', () => { ui.menu = false; ui.form = {}; render(); });

  // Update the countdown from the stored timestamp every second; refresh once when it reaches zero.
  setInterval(() => {
    const el = document.querySelector('[data-start]'); if (!el) return;
    const start = Date.parse(el.getAttribute('data-start'));
    const rem = Math.max(0, start + S.INSPECTION_MS - Date.now());
    const was = el.textContent; el.textContent = fmtMs(rem);
    if (rem === 0 && was !== '00:00:00') render();
  }, 1000);

  render();
})();
