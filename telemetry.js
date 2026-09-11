/* ============================================================================
 * Portfolio Telemetry v1 — privacy-preserving client scaffold (INERT BY DEFAULT)
 * ----------------------------------------------------------------------------
 * FORBIDDEN: No mouse/keystroke/scroll/pixel tracking. No pointer coordinates,
 * no key logging, no scroll-depth, no canvas fingerprinting, no 1px beacons,
 * no third-party trackers. Only the 10 coarse lifecycle events below may be
 * emitted. Any addition of fine-grained input tracking is a privacy violation.
 *
 * PRIVACY:
 *  - Anonymous session id only (sessionStorage, per-tab, never persisted to
 *    localStorage/cookies/IndexedDB). Regenerated each tab session.
 *  - No PII fields anywhere (no name/email/message/phone/address/IP capture).
 *    Data keys matching PII patterns are dropped before enqueue.
 *  - Honours navigator.doNotTrack === '1' (no collection at all).
 *  - Sampling via sampleRate (0-1); deterministic per-session roll.
 *
 * INERTNESS (prove the early return):
 *  - Telemetry.init() returns false WITHOUT scheduling any timer/listener or
 *    touching the network when: enabled !== true OR !endpoint (absent/empty)
 *    OR DNT === '1' OR sampled-out. With the shipped config
 *    { enabled:false, endpoint:"" } the module loads but _active stays false,
 *    every Telemetry.event()/performanceSample()/error() call no-ops, and no
 *    fetch()/sendBeacon() call site is reachable (all transport lives behind
 *    `if (!_active) return`).
 *
 * FAIL-SAFE:
 *  - Every public method wraps its body in try/catch and never rethrows, so a
 *    throw inside transport/queue/storage cannot propagate into app code.
 *  - All hook call sites in script.js use `try{...}catch(e){}` guards too, so
 *    even a broken Telemetry global cannot alter existing control flow.
 * ============================================================================ */
(function () {
  'use strict';

  var ALLOWLIST = {
    PAGE_VIEW: 1,
    FILTER_CHANGE: 1,
    VIDEO_OPEN: 1,
    VIDEO_READY: 1,
    VIDEO_CLOSE: 1,
    CTA_CLICK: 1,
    CONTACT_SUBMIT: 1,
    CONTACT_ERROR: 1,
    ERROR: 1,
    PERFORMANCE_SAMPLE: 1
  };

  var MAX_QUEUE = 200;            // drop-oldest cap
  var MAX_EVENT_BYTES = 4 * 1024; // per-event payload guard
  var MAX_BATCH_BYTES = 64 * 1024;// per-flush payload guard
  var FLUSH_INTERVAL_MS = 15000;  // capped interval, only fires when queue non-empty
  var SID_KEY = 'telemetry_sid';
  var ROLL_KEY = 'telemetry_roll';

  var _active = false;
  var _endpoint = '';
  var _sampleRate = 1.0;
  var _sessionId = '';
  var _startedAt = '';
  var _queue = [];
  var _flushTimer = null;
  var _page = '';
  // P1 real-user rendering signals (coarse aggregates only — the full
  // performance timeline is never stored or sent). Armed only when active.
  var _lcpMs = null;      // last observed LCP candidate for this page view
  var _cls = 0;           // sum of layout-shift values without recent input
  var _clsSeen = false;
  var _ltCount = 0;       // longtask count / total / max for this page view
  var _ltTotalMs = 0;
  var _ltMaxMs = 0;

  function safeSessionId() {
    try {
      var existing = null;
      try { existing = window.sessionStorage.getItem(SID_KEY); } catch (e) { existing = null; }
      if (existing && /^[A-Za-z0-9-]{8,64}$/.test(existing)) return existing;
      var id = '';
      try {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
          id = window.crypto.randomUUID();
        }
      } catch (e) { id = ''; }
      if (!id) {
        // Fallback: NOT persistent — sessionStorage only, per-tab session.
        id = 's-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 0xffffff).toString(36);
      }
      id = String(id).slice(0, 64);
      try { window.sessionStorage.setItem(SID_KEY, id); } catch (e) {}
      return id;
    } catch (e) { return 's-anon'; }
  }

  function sessionRoll() {
    // Deterministic per-session roll in [0,1): stable for the tab session so
    // sampling does not flicker event-to-event.
    try {
      var cached = null;
      try { cached = window.sessionStorage.getItem(ROLL_KEY); } catch (e) {}
      var v = parseFloat(cached);
      if (isFinite(v) && v >= 0 && v < 1) return v;
      var h = 0;
      var s = _sessionId || 'x';
      for (var i = 0; i < s.length; i++) { h = ((h * 31) + s.charCodeAt(i)) >>> 0; }
      v = (h % 100000) / 100000;
      try { window.sessionStorage.setItem(ROLL_KEY, String(v)); } catch (e) {}
      return v;
    } catch (e) { return 0; }
  }

  function deviceClass() {
    try {
      var w = window.innerWidth || 0;
      if (w <= 640) return 'mobile';
      if (w <= 1024) return 'tablet';
      return 'desktop';
    } catch (e) { return 'unknown'; }
  }

  function viewport() {
    try { return (window.innerWidth || 0) + 'x' + (window.innerHeight || 0); }
    catch (e) { return ''; }
  }

  function browserOs() {
    // Coarse family only — full UA string is never stored/sent.
    try {
      var ua = (navigator.userAgent || '').toLowerCase();
      var browser = 'other';
      if (ua.indexOf('edg/') !== -1) browser = 'edge';
      else if (ua.indexOf('chrome/') !== -1) browser = 'chrome';
      else if (ua.indexOf('firefox/') !== -1) browser = 'firefox';
      else if (ua.indexOf('safari/') !== -1) browser = 'safari';
      var os = 'other';
      if (ua.indexOf('windows') !== -1) os = 'windows';
      else if (ua.indexOf('android') !== -1) os = 'android';
      else if (ua.indexOf('iphone') !== -1 || ua.indexOf('ipad') !== -1) os = 'ios';
      else if (ua.indexOf('mac os') !== -1) os = 'macos';
      else if (ua.indexOf('linux') !== -1) os = 'linux';
      return { browser: browser, os: os };
    } catch (e) { return { browser: 'other', os: 'other' }; }
  }

  function sanitizeData(data) {
    // No PII anywhere: drop keys that look like identity/contact content and
    // coerce everything else to short primitives. Never throws.
    try {
      if (!data || typeof data !== 'object') return {};
      var out = {};
      var keys = Object.keys(data).slice(0, 20);
      for (var i = 0; i < keys.length; i++) {
        var k = String(keys[i]).slice(0, 48);
        try {
          if (/e-?mail|name|message|phone|address|ip\b|user|token|auth|password/i.test(k)) continue;
          var v = data[keys[i]];
          if (v === null || v === undefined) continue;
          if (typeof v === 'string') out[k] = v.slice(0, 200);
          else if (typeof v === 'number' && isFinite(v)) out[k] = Math.round(v * 100) / 100;
          else if (typeof v === 'boolean') out[k] = v;
          // objects/arrays/functions deliberately dropped (no nested PII, no URL lists)
        } catch (e) {}
      }
      return out;
    } catch (e) { return {}; }
  }

  function enqueue(name, data) {
    try {
      if (!_active) return false; // INERT PATH: no queue growth, no timers armed
      if (!ALLOWLIST[name]) return false;
      var evt = {
        event: name,
        ts: new Date().toISOString(),
        page: _page,
        data: sanitizeData(data)
      };
      try {
        var size = (JSON.stringify(evt) || '').length;
        if (size > MAX_EVENT_BYTES) {
          // Payload-size guard: keep the name/timestamp, note truncation.
          evt = { event: name, ts: evt.ts, page: _page, data: { truncated: true } };
        }
      } catch (e) {}
      _queue.push(evt);
      while (_queue.length > MAX_QUEUE) _queue.shift(); // drop-oldest cap
      return true;
    } catch (e) { return false; }
  }

  function buildPayload() {
    var bo = browserOs();
    return {
      session_id: _sessionId,
      started_at: _startedAt,
      viewport: viewport(),
      device_class: deviceClass(),
      browser: bo.browser,
      os: bo.os,
      page: _page,
      events: _queue.splice(0, _queue.length)
    };
  }

  function transport(payload) {
    // FAIL-SAFE: every branch guarded; a throw here must never reach app code.
    try {
      if (!_active || !payload || !payload.events || !payload.events.length) return;
      var body = '';
      try { body = JSON.stringify(payload); } catch (e) { return; }
      if (body.length > MAX_BATCH_BYTES) {
        // Batch guard: keep the most recent events that fit.
        try {
          var evts = payload.events;
          while (evts.length > 1 && JSON.stringify(evts).length > MAX_BATCH_BYTES) evts.shift();
          payload.events = evts;
          body = JSON.stringify(payload);
        } catch (e) { return; }
        if (body.length > MAX_BATCH_BYTES) return; // still too big → drop flush
      }
      if (!_endpoint) return; // zero-network invariant when endpoint absent/empty
      try {
        if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
          try {
            var blob = null;
            try { blob = new Blob([body], { type: 'application/json' }); } catch (e) { blob = null; }
            var ok = blob
              ? navigator.sendBeacon(_endpoint, blob)
              : navigator.sendBeacon(_endpoint, body);
            if (ok) return; // accepted — fall through to keepalive only on false
          } catch (e) { /* fall through to fetch */ }
        }
      } catch (e) {}
      try {
        if (typeof fetch === 'function') {
          fetch(_endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body,
            keepalive: true,
            credentials: 'omit'
          }).catch(function () {});
        }
      } catch (e) {}
    } catch (e) {}
  }

  function flush() {
    try {
      if (!_active) return;              // inert: flush is a no-op
      if (!_queue.length) return;        // capped interval only sends when non-empty
      transport(buildPayload());
    } catch (e) {}
  }

  function armPerfObservers() {
    // Armed ONLY on the active path (init returns early otherwise), so the
    // inert configuration observes nothing. Each type guarded separately:
    // unsupported browsers (e.g. no LCP/longtask in Firefox) simply yield
    // nulls, which sanitizeData omits from the payload.
    try {
      var po = window.PerformanceObserver;
      if (typeof po !== 'function') return;
      try {
        new po(function (list) {
          try {
            var es = list.getEntries() || [];
            if (es.length) _lcpMs = Math.round(es[es.length - 1].startTime);
          } catch (e) {}
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (e) {}
      try {
        new po(function (list) {
          try {
            (list.getEntries() || []).forEach(function (en) {
              try {
                if (en.hadRecentInput) return;
                _cls += (typeof en.value === 'number' ? en.value : 0);
                _clsSeen = true;
              } catch (e) {}
            });
          } catch (e) {}
        }).observe({ type: 'layout-shift', buffered: true });
      } catch (e) {}
      try {
        new po(function (list) {
          try {
            (list.getEntries() || []).forEach(function (en) {
              try {
                var d = Math.round(en.duration || 0);
                _ltCount++;
                _ltTotalMs += d;
                if (d > _ltMaxMs) _ltMaxMs = d;
              } catch (e) {}
            });
          } catch (e) {}
        }).observe({ type: 'longtask', buffered: true });
      } catch (e) {}
    } catch (e) {}
  }

  function armFlushers() {
    try {
      if (_flushTimer) { try { clearInterval(_flushTimer); } catch (e) {} _flushTimer = null; }
      try {
        document.addEventListener('visibilitychange', function () {
          try { if (document.hidden) flush(); } catch (e) {}
        });
      } catch (e) {}
      try {
        window.addEventListener('pagehide', function () {
          try { flush(); } catch (e) {}
        });
      } catch (e) {}
      try {
        _flushTimer = setInterval(function () {
          try { if (_queue.length) flush(); } catch (e) {}
        }, FLUSH_INTERVAL_MS);
      } catch (e) {}
    } catch (e) {}
  }

  var Telemetry = {
    init: function (config) {
      try {
        _active = false; // default inert; only set true after every gate passes
        _queue = [];
        var cfg = (config && typeof config === 'object') ? config : {};
        // EARLY-RETURN PATH (inert-by-default proof — each return leaves no
        // timers/listeners and makes fetch/sendBeacon unreachable):
        if (cfg.enabled !== true) return false;                       // (1) disabled
        var ep = typeof cfg.endpoint === 'string' ? cfg.endpoint.trim() : '';
        if (!ep) return false;                                        // (2) absent/empty endpoint
        try {
          if (typeof navigator !== 'undefined' && navigator.doNotTrack === '1') return false; // (3) DNT
        } catch (e) {}
        var sr = parseFloat(cfg.sampleRate);
        _sampleRate = (isFinite(sr) && sr >= 0 && sr <= 1) ? sr : 1.0;
        _sessionId = safeSessionId();
        _startedAt = new Date().toISOString();
        try { _page = (window.location.pathname.split('/').pop() || 'index.html').slice(0, 80); }
        catch (e) { _page = ''; }
        if (!(sessionRoll() < _sampleRate)) { _sessionId = ''; return false; } // (4) sampled out
        _endpoint = ep.slice(0, 500);
        _active = true;
        armPerfObservers();
        armFlushers();
        return true;
      } catch (e) { try { _active = false; } catch (_) {} return false; }
    },
    event: function (name, data) {
      try {
        if (!_active) return false; // inert: zero network, zero behavior change
        return enqueue(name, data);
      } catch (e) { return false; }
    },
    performanceSample: function () {
      try {
        if (!_active) return false;
        var agg = {};
        try {
          var nav = performance.getEntriesByType
            ? performance.getEntriesByType('navigation')[0] : null;
          if (nav) {
            agg.domContentLoaded = Math.round(nav.domContentLoadedEventEnd - nav.startTime);
            agg.loadEvent = Math.round(nav.loadEventEnd - nav.startTime);
            agg.transfer = nav.transferSize || 0;
          }
        } catch (e) {}
        try {
          var paints = performance.getEntriesByType
            ? performance.getEntriesByType('paint') : [];
          (paints || []).forEach(function (p) {
            try {
              if (p.name === 'first-contentful-paint') agg.fcp = Math.round(p.startTime);
              else if (p.name === 'first-paint') agg.fp = Math.round(p.startTime);
            } catch (e) {}
          });
        } catch (e) {}
        try {
          // Aggregates ONLY — never raw resource URL lists.
          var res = performance.getEntriesByType
            ? performance.getEntriesByType('resource') : [];
          var total = 0, count = 0, maxDur = 0;
          (res || []).forEach(function (r) {
            try {
              count++;
              total += (r.transferSize || 0);
              if (r.duration > maxDur) maxDur = r.duration;
            } catch (e) {}
          });
          agg.resourceCount = count;
          agg.resourceBytes = total;
          agg.maxResourceMs = Math.round(maxDur);
        } catch (e) {}
        // P1: real-user rendering signals. Null when unobserved (unsupported
        // browser or no candidate yet) — sanitizeData drops nulls, so the
        // payload carries only what was actually measured. CLS counts only
        // shifts without recent input, matching the lab's CLS definition.
        try {
          agg.lcp = (_lcpMs === null) ? null : _lcpMs;
          agg.cls = _clsSeen ? (Math.round(_cls * 10000) / 10000) : null;
          agg.longTasks = _ltCount || null;
          agg.longTaskMs = _ltCount ? _ltTotalMs : null;
          agg.longTaskMaxMs = _ltCount ? _ltMaxMs : null;
        } catch (e) {}
        return enqueue('PERFORMANCE_SAMPLE', agg);
      } catch (e) { return false; }
    },
    error: function (type, detail) {
      try {
        if (!_active) return false;
        return enqueue('ERROR', {
          type: String(type || 'error').slice(0, 80),
          detail: String(detail == null ? '' : detail).slice(0, 300)
        });
      } catch (e) { return false; }
    },
    // Introspection for verification only (never sends anything itself).
    _isActive: function () { try { return !!_active; } catch (e) { return false; } }
  };

  try { window.Telemetry = Telemetry; } catch (e) {}
})();
