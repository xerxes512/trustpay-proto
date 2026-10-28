/*
 * TrustPay prototype - state and business rules (no DOM code here).
 * Everything is stored in the browser's localStorage. localStorage is NOT secure storage;
 * a real product needs a server-side database and server-side enforcement of every rule below.
 */
(function (root) {
  'use strict';

  const STORAGE_KEY = 'trustpay.prototype.v1';
  const INSPECTION_MS = 3 * 60 * 60 * 1000; // intended rule: 3 hours from confirmed delivery/handover
  const CONDITIONS = ['New', 'UK Used', 'Refurbished'];
  const DELIVERY = ['Courier delivery', 'In-person handover'];
  const DISPUTE_REASONS = ['Wrong item received', 'Item damaged', 'Item materially different from the description',
    'Item not received', 'Suspected tampering or substitution', 'Other issue'];
  const DISPUTE_STAGES = ['Awaiting Vendor Response', 'Awaiting Evidence', 'Under Review', 'Return Proposed',
    'Refund Proposed', 'Resolved', 'Closed'];

  // Label + colour tone for every status the prototype can show.
  const STATUS = {
    awaiting_review: { label: 'Awaiting buyer review', tone: 'amber' },
    changes_requested: { label: 'Changes requested', tone: 'amber' },
    declined: { label: 'Declined', tone: 'red' },
    accepted: { label: 'Agreement accepted', tone: 'blue' },
    payment_simulated: { label: 'Payment simulated', tone: 'blue' },
    dispatched: { label: 'Dispatched', tone: 'blue' },
    inspection: { label: 'Inspection in progress', tone: 'amber' },
    inspection_complete: { label: 'Inspection complete', tone: 'amber' },
    dispute: { label: 'Dispute open', tone: 'red' },
    resolved: { label: 'Resolved', tone: 'green' },
    completed: { label: 'Completed', tone: 'green' },
    cancelled: { label: 'Cancelled', tone: 'grey' }
  };

  // The ONLY permitted status changes. Anything else throws.
  const TRANSITIONS = {
    awaiting_review: ['changes_requested', 'declined', 'accepted'],
    changes_requested: ['cancelled'],
    accepted: ['payment_simulated', 'cancelled'],
    payment_simulated: ['dispatched'],
    dispatched: ['inspection'],
    inspection: ['inspection_complete', 'dispute'],
    inspection_complete: ['completed', 'dispute'],
    dispute: ['resolved'],
    declined: [], completed: [], resolved: [], cancelled: []
  };

  let db = null; // initialised at the bottom, after all functions exist

  /* ---------- formatting helpers ---------- */
  const naira = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });
  const formatNaira = (n) => naira.format(Number(n) || 0);
  function formatDate(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return 'Invalid date';
    return d.toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
  }
  function today() { return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
  function newRef(prefix) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return prefix + '-' + s;
  }

  /* ---------- persistence ---------- */
  function loadDb() {
    try {
      const parsed = JSON.parse(root.localStorage.getItem(STORAGE_KEY));
      if (parsed && Array.isArray(parsed.txs) && parsed.txs.every(isUsableTx)) return parsed;
      if (parsed !== null) { const fresh = seed(); fresh.recovered = true; return fresh; }
    } catch (e) { const fresh = seed(); fresh.recovered = true; return fresh; }
    return seed();
  }
  function isUsableTx(t) {
    return t && typeof t.ref === 'string' && STATUS[t.status] && Array.isArray(t.events);
  }
  function save() {
    try { root.localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch (e) { /* storage full or blocked: demo continues in memory */ }
  }
  function consumeRecoveryNotice() { const r = !!db.recovered; delete db.recovered; if (r) save(); return r; }

  /* ---------- validation ---------- */
  function validateInput(i, opts) {
    const e = {}, t = (v) => String(v == null ? '' : v).trim();
    if (t(i.productName).length < 2) e.productName = 'Enter the product name (at least 2 characters).';
    if (!t(i.brand)) e.brand = 'Enter the brand.';
    if (!t(i.model)) e.model = 'Enter the model.';
    if (!CONDITIONS.includes(i.condition)) e.condition = 'Choose a condition.';
    if (t(i.description).length < 10) e.description = 'Describe the product in at least 10 characters.';
    const price = Number(i.price);
    if (t(i.price) === '' || !Number.isInteger(price) || price < 1000 || price > 50000000)
      e.price = 'Enter a whole-naira price between 1,000 and 50,000,000.';
    if (!DELIVERY.includes(i.deliveryMethod)) e.deliveryMethod = 'Choose a delivery method.';
    if (i.deliveryMethod === 'Courier delivery') {
      const f = Number(i.deliveryFee);
      if (t(i.deliveryFee) === '' || !Number.isInteger(f) || f < 0 || f > 1000000)
        e.deliveryFee = 'Enter the delivery fee in whole naira (0 if free).';
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t(i.dispatchBy))) e.dispatchBy = 'Choose a dispatch deadline.';
    else if (!(opts && opts.allowPastDate) && t(i.dispatchBy) < today()) e.dispatchBy = 'The deadline cannot be in the past.';
    if (t(i.terms).length > 1000) e.terms = 'Keep additional terms under 1,000 characters.';
    return e;
  }

  /* ---------- core mutation helpers ---------- */
  const getTx = (ref) => db.txs.find((t) => t.ref === ref) || null;
  function need(ref) { const t = getTx(ref); if (!t) throw new Error('Transaction not found.'); return t; }
  function addEvent(tx, type, label, simulated) {
    tx.events.push({ at: new Date().toISOString(), type: type, label: label, simulated: !!simulated });
  }
  function transition(tx, to, type, label, simulated) {
    if (!(TRANSITIONS[tx.status] || []).includes(to))
      throw new Error('Not allowed: ' + STATUS[tx.status].label + ' cannot move to ' + STATUS[to].label + '.');
    tx.status = to;
    addEvent(tx, type, label, simulated);
    save();
  }
  const totalOf = (tx) => tx.price + tx.deliveryFee;

  /* ---------- workflow operations ---------- */
  function createTx(input) {
    const errors = validateInput(input);
    if (Object.keys(errors).length) return { errors: errors };
    const courier = input.deliveryMethod === 'Courier delivery';
    const tx = {
      ref: newRef('TP'), vendor: 'Lagos Gadget Hub (sample vendor)', buyer: 'Sample Buyer',
      productName: input.productName.trim(), brand: input.brand.trim(), model: input.model.trim(),
      condition: input.condition, description: input.description.trim(), price: Number(input.price),
      deliveryMethod: input.deliveryMethod, deliveryFee: courier ? Number(input.deliveryFee) : 0,
      dispatchBy: input.dispatchBy, terms: String(input.terms || '').trim(),
      status: 'awaiting_review', createdAt: new Date().toISOString(), events: [],
      snapshot: null, changeRequest: null, deliveredAt: null, tracking: '', deliveryNotes: '', dispute: null
    };
    addEvent(tx, 'created', 'Vendor created the transaction and shared the offer link');
    db.txs.unshift(tx); save();
    return { tx: tx };
  }
  function acceptOffer(ref) {
    const tx = need(ref);
    if (Object.keys(validateInput(tx, { allowPastDate: true })).length) throw new Error('This offer is incomplete and cannot be accepted.');
    // Immutable snapshot of the agreed terms. No function in this file edits it afterwards.
    tx.snapshot = JSON.parse(JSON.stringify({
      productName: tx.productName, brand: tx.brand, model: tx.model, condition: tx.condition, description: tx.description,
      price: tx.price, deliveryMethod: tx.deliveryMethod, deliveryFee: tx.deliveryFee, total: totalOf(tx),
      dispatchBy: tx.dispatchBy, terms: tx.terms, acceptedAt: new Date().toISOString()
    }));
    transition(tx, 'accepted', 'accepted', 'Buyer accepted the offer; terms recorded as a snapshot');
  }
  function requestChanges(ref, message) {
    const m = String(message || '').trim();
    if (m.length < 5) throw new Error('Describe the change you would like (at least 5 characters).');
    const tx = need(ref); tx.changeRequest = m;
    transition(tx, 'changes_requested', 'changes', 'Buyer requested changes: ' + m.slice(0, 200));
  }
  const declineOffer = (ref) => { const tx = need(ref); transition(tx, 'declined', 'declined', 'Buyer declined the offer'); };
  const cancelAgreement = (ref) => {
    const tx = need(ref);
    transition(tx, 'cancelled', 'cancelled', 'Agreement cancelled; a replacement transaction must be created for new terms');
  };
  // Simulated only: no money moves anywhere.
  const simulatePayment = (ref) => { const tx = need(ref);
    transition(tx, 'payment_simulated', 'payment_simulated', 'Simulated payment event recorded (demonstration only; no funds moved)', true); };
  function recordDispatch(ref, d) {
    const tx = need(ref);
    tx.tracking = String((d && d.tracking) || '').trim().slice(0, 60);
    transition(tx, 'dispatched', 'dispatched', 'Dispatch / handover preparation recorded' + (tx.tracking ? ' (ref ' + tx.tracking + ')' : ''));
  }
  // Only this explicit action starts the inspection clock.
  function confirmDelivery(ref, d) {
    if (!d || d.confirmed !== true) throw new Error('Tick the confirmation box to confirm delivery or handover.');
    const tx = need(ref);
    if (tx.status !== 'dispatched') throw new Error('Delivery can only be confirmed after dispatch is recorded.');
    tx.deliveredAt = new Date().toISOString();
    tx.deliveryNotes = String(d.notes || '').trim().slice(0, 300);
    transition(tx, 'inspection', 'delivered', 'Delivery confirmed; 3-hour inspection window started');
  }
  // Remaining ms from the STORED timestamp; null when it is missing/invalid.
  function inspectionRemaining(tx, nowMs) {
    if (!tx || !tx.deliveredAt) return null;
    const start = Date.parse(tx.deliveredAt);
    if (isNaN(start)) return null;
    return Math.max(0, start + INSPECTION_MS - (nowMs == null ? Date.now() : nowMs));
  }
  // Expiry never releases funds. It only allows moving to "inspection complete - awaiting completion checks".
  function completeInspection(ref) {
    const tx = need(ref);
    if (inspectionRemaining(tx) !== 0) throw new Error('The inspection window has not ended (or its timestamp is invalid).');
    transition(tx, 'inspection_complete', 'inspection_complete', 'Inspection window ended; awaiting completion checks. No funds released.');
  }
  const markCompleted = (ref) => { const tx = need(ref);
    transition(tx, 'completed', 'completed', 'Simulated completion checks passed. No real payout occurred in this prototype.', true); };
  function openDispute(ref, d) {
    const tx = need(ref);
    if (!DISPUTE_REASONS.includes(d.reason)) throw new Error('Choose a reason for the problem.');
    if (String(d.description || '').trim().length < 10) throw new Error('Describe the problem in at least 10 characters.');
    tx.dispute = { ref: newRef('DS'), reason: d.reason, description: String(d.description).trim(), status: 'Awaiting Vendor Response',
      evidence: [], vendorResponse: null, resolution: null, openedAt: new Date().toISOString() };
    tx.dispute.evidence.push({ at: tx.dispute.openedAt, label: 'Buyer statement submitted' });
    if (d.evidenceName) tx.dispute.evidence.push({ at: tx.dispute.openedAt, label: 'Illustrative attachment listed: ' + String(d.evidenceName).slice(0, 80) + ' (file not uploaded)' });
    try { transition(tx, 'dispute', 'dispute', 'Buyer reported a problem (' + d.reason + '); normal completion paused'); }
    catch (err) { tx.dispute = null; throw err; }
  }
  function addVendorResponse(ref, text) {
    const tx = need(ref);
    if (tx.status !== 'dispute' || !tx.dispute) throw new Error('There is no open dispute.');
    if (String(text || '').trim().length < 5) throw new Error('Enter a response (at least 5 characters).');
    tx.dispute.vendorResponse = String(text).trim();
    tx.dispute.evidence.push({ at: new Date().toISOString(), label: 'Vendor response recorded' });
    if (tx.dispute.status === 'Awaiting Vendor Response') tx.dispute.status = 'Under Review';
    addEvent(tx, 'vendor_response', 'Vendor response recorded'); save();
  }
  function setDisputeStage(ref, stage, note) {
    const tx = need(ref);
    if (!DISPUTE_STAGES.includes(stage) || !tx.dispute) throw new Error('Invalid dispute stage.');
    if (tx.status === 'resolved') {
      if (stage !== 'Closed') throw new Error('A resolved dispute can only be closed.');
    } else if (tx.status !== 'dispute') throw new Error('There is no open dispute.');
    else if (stage === 'Closed') throw new Error('Resolve the dispute before closing it.');
    tx.dispute.status = stage;
    if (stage === 'Resolved') {
      tx.dispute.resolution = String(note || '').trim() || 'Resolution recorded by the demonstration operator. Any return or refund would need real verification in production.';
      transition(tx, 'resolved', 'resolved', 'Dispute resolved (demonstration state)');
    } else {
      addEvent(tx, 'dispute_stage', 'Dispute status: ' + stage); save();
    }
  }
  // Demo-only helper to demonstrate expiry without waiting 3 hours.
  function demoMoveDeliveryBack(ref) {
    const tx = need(ref);
    if (tx.status !== 'inspection') throw new Error('Only available while inspection is in progress.');
    tx.deliveredAt = new Date(Date.now() - INSPECTION_MS - 1000).toISOString();
    addEvent(tx, 'demo', 'Demonstration control: confirmation timestamp moved back 3 hours', true); save();
  }

  /* ---------- sample data ---------- */
  function seed() {
    const fresh = { txs: [] };
    const prev = db; db = fresh;
    const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
    const base = { condition: 'New', deliveryMethod: 'Courier delivery', deliveryFee: 5000, terms: 'Inspection window applies from confirmed delivery. Sample terms only.' };
    const mk = (o) => createTx(Object.assign({}, base, o)).tx;
    const mac = mk({ productName: 'MacBook Pro 14-inch', brand: 'Apple', model: 'M3 Pro', condition: 'UK Used', price: 1450000, deliveryMethod: 'In-person handover', dispatchBy: day(3), description: 'Space Black, 18GB RAM, 512GB, charger included. Sample listing.' });
    acceptOffer(mac.ref); simulatePayment(mac.ref); recordDispatch(mac.ref, {}); confirmDelivery(mac.ref, { confirmed: true });
    mac.deliveredAt = new Date(Date.now() - 4 * 3600e3).toISOString(); save();
    completeInspection(mac.ref); markCompleted(mac.ref);
    const i14 = mk({ productName: 'iPhone 14 Pro', brand: 'Apple', model: '256GB', condition: 'UK Used', price: 780000, dispatchBy: day(2), description: 'Deep Purple, battery health 91%. Sample listing.' });
    acceptOffer(i14.ref); simulatePayment(i14.ref); recordDispatch(i14.ref, { tracking: 'SAMPLE-1042' }); confirmDelivery(i14.ref, { confirmed: true });
    const s24 = mk({ productName: 'Samsung Galaxy S24 Ultra', brand: 'Samsung', model: '512GB', price: 1180000, dispatchBy: day(2), description: 'Titanium Black, sealed box. Sample listing.' });
    acceptOffer(s24.ref); simulatePayment(s24.ref);
    mk({ productName: 'iPhone 15 Pro Max', brand: 'Apple', model: '256GB', price: 1650000, dispatchBy: day(4), description: 'Natural Titanium, sealed box, 1-year Apple warranty. Sample listing.' });
    db = prev; save0(fresh); return fresh;
  }
  function save0(d) { try { root.localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) { /* ignore */ } }
  function resetDb() { db = seed(); save(); }

  db = loadDb();

  root.TrustPayState = { STATUS, TRANSITIONS, CONDITIONS, DELIVERY, DISPUTE_REASONS, DISPUTE_STAGES, INSPECTION_MS,
    list: () => db.txs, getTx, totalOf, formatNaira, formatDate, today, validateInput, createTx, acceptOffer, requestChanges,
    declineOffer, cancelAgreement, simulatePayment, recordDispatch, confirmDelivery, inspectionRemaining, completeInspection,
    markCompleted, openDispute, addVendorResponse, setDisputeStage, demoMoveDeliveryBack, resetDb, consumeRecoveryNotice };
})(typeof window !== 'undefined' ? window : globalThis);
