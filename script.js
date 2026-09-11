// Portfolio — reads config.js (file:// compatible)
let CONTENT = null;
if (typeof CONFIG !== 'undefined') {
  CONTENT = CONFIG;
} else {
  console.error("CONFIG not loaded — check config.js");
}

function youtubeIdFromUrl(url){
  if(!url) return "";
  try{
    url = url.trim();
    let m = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
    if(m) return m[1];
    m = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
    if(m) return m[1];
    m = url.match(/embed\/([A-Za-z0-9_-]{11})/);
    if(m) return m[1];
    m = url.match(/shorts\/([A-Za-z0-9_-]{11})/);
    if(m) return m[1];
    m = url.match(/live\/([A-Za-z0-9_-]{11})/);
    if(m) return m[1];
    if(/^[A-Za-z0-9_-]{11}$/.test(url)) return url;
  }catch(e){}
  return "";
}

const PLACEHOLDER_SVG = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340"><rect width="600" height="340" fill="#18181b"/><rect x="1" y="1" width="598" height="338" fill="none" stroke="#252529"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#a1a1aa" font-family="Inter,sans-serif" font-size="13">No preview available</text></svg>');

function getYouTubeThumb(id, quality){
  if(!id) return "";
  if(quality==="maxres") return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
  if(quality==="mq") return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

function handleThumbError(img){
  const yid = img.dataset.yid || "";
  const custom = img.dataset.custom || "";
  const src = img.src || "";
  if(src === custom && yid){
    img.dataset.tried = "custom";
    img.src = getYouTubeThumb(yid, "maxres");
    return;
  }
  if(src.includes("/maxresdefault.jpg") && yid){
    img.dataset.tried = "maxres";
    img.src = getYouTubeThumb(yid, "hq");
    return;
  }
  if(src.includes("/hqdefault.jpg") && yid){
    img.dataset.tried = "hq";
    img.src = getYouTubeThumb(yid, "mq");
    return;
  }
  if(src.includes("mqdefault")){
    img.dataset.tried = "mq";
    img.onerror = null;
    img.src = PLACEHOLDER_SVG;
    return;
  }
  img.onerror = null;
  img.src = PLACEHOLDER_SVG;
}

// YouTube serves HTTP 200 + a 120px gray stub when maxres is missing, so
// onerror never fires. Step down on load when the decoded image is a stub.
function thumbQualityCheck(img){
  try{
    if((img.src || "").includes("/maxresdefault.jpg")
      && img.naturalWidth > 0 && img.naturalWidth <= 120
      && (img.dataset.yid || "")){
      img.dataset.tried = "maxres";
      img.src = getYouTubeThumb(img.dataset.yid, "hq");
    }
  }catch(_){}
}

// P2.4 case/text presentation — presentation layer only (CSS text-transform, never content conversion).
// Priority: component setting → global → component default. Missing/invalid → component default.
// P2.4 defaults: all natural (normal/none) — stored Title Case renders verbatim; never capitalize free text (acronym-safe). Uppercase still available explicitly.
function resolveTextCase(compVal, globalVal, compDefault){
  const clean = v => (typeof v === 'string' ? v.trim().toLowerCase() : 'default');
  const c = clean(compVal), g = clean(globalVal);
  if(c === 'uppercase' || c === 'lowercase' || c === 'capitalize' || c === 'normal') return c;
  if(g === 'uppercase' || g === 'lowercase' || g === 'capitalize' || g === 'normal') return g;
  return compDefault || 'normal';
}
function textCaseToTransform(v){
  if(v === 'uppercase') return 'uppercase';
  if(v === 'lowercase') return 'lowercase';
  if(v === 'capitalize') return 'capitalize';
  return 'none';
}
function globalTextCase(){
  try{ return (CONTENT && CONTENT.design && CONTENT.design.textCase) || 'default'; }catch(e){ return 'default'; }
}
function projectBadgeCase(p){
  const comp = (p && (p.categoryCase || (p.display && p.display.categoryCase))) || 'default';
  return resolveTextCase(comp, globalTextCase(), 'normal');
}

// Shared project-card grid renderer (homepage + Work page). Top-level so
// V3 service icons (presentation only — stored emoji untouched).
// Monochrome inline SVG, 24px via CSS, stroke currentColor 1.5px.
// Duplicate 🎬 resolved visually: YouTube=play, Ads=megaphone.
function serviceIconSvg(icon, title){
  const t = (title||"").toLowerCase();
  const wrap = inner => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${inner}</svg>`;
  if(/podcast|mic|audio/.test(t) || icon==="🎙️") return wrap(`<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>`);
  if(/reel|short|bolt|⚡/.test(t) || icon==="⚡") return wrap(`<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/>`);
  if(/ad|promo|mega/.test(t)) return wrap(`<path d="M3 11v3l4 1 2 5h2l-2-5 9 3V6L6 10H3z"/><path d="M18 8a3 3 0 0 1 0 6"/>`);
  if(/film|🎞/.test(t) || icon==="🎞️") return wrap(`<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 10h4M3 14h4M17 10h4M17 14h4"/>`);
  // default YouTube / clapper
  return wrap(`<rect x="3" y="6" width="18" height="12" rx="3"/><path d="M10 9.5v5l4.5-2.5z"/>`);
}
// V3 form labels (presentation/a11y only — text comes from config *Label, placeholders stay as examples).
function ensureContactLabels(form){
  if(!form) return;
  const cfg = CONTENT?.contact?.form || {};
  const defs = [
    ['name','input[name="name"]', cfg.nameLabel || 'Your Name'],
    ['email','input[name="email"]', cfg.emailLabel || 'Your Email'],
    ['service','select[name="service"]', cfg.serviceLabel || 'Service'],
    ['message','textarea[name="message"]', cfg.messageLabel || 'Message'],
  ];
  defs.forEach(([fid, sel, text])=>{
    const el = form.querySelector(sel);
    if(!el) return;
    if(!el.id) el.id = `contact-${fid}`;
    if(!el.getAttribute('aria-label')) el.setAttribute('aria-label', text);
    const prev = el.previousElementSibling;
    if(prev && prev.tagName==='LABEL' && prev.getAttribute('for')===el.id) { prev.textContent = text; return; }
    const label = document.createElement('label');
    label.setAttribute('for', el.id);
    label.textContent = text;
    el.insertAdjacentElement('beforebegin', label);
  });
}
// Focal resolver (single shared path for Home = Work = All/Long/Short).
// Precedence (short cards): p.focusShort → p.focus → '50% 35%' default.
// Precedence (long cards): p.focus → 'center'. Explicit values (validated +
// clamped) are NEVER overwritten by tooling; absent/invalid → safe default.
// Per-ratio split exists because evidence proved one anchor cannot serve
// both 16:9 and 9:16 for wide-group/text-heavy art (group shots keep the
// message centrally; side windows eject faces AND headline). Paint-only
// (object-position %), no layout, no network, no CV, cover kept in template/CSS.
function resolveFocusValue(fc){
  if(!fc || fc.x === undefined || fc.y === undefined) return null;
  const fx = parseFloat(fc.x), fy = parseFloat(fc.y);
  if(!isFinite(fx) || !isFinite(fy)) return 'center';
  return `${Math.min(1, Math.max(0, fx)) * 100}% ${Math.min(1, Math.max(0, fy)) * 100}%`;
}
function resolveThumbFocus(p){
  const short = !!(p && p.format === 'short');
  if(short){
    return resolveFocusValue(p.focusShort)
        || resolveFocusValue(p.focus)
        || '50% 35%';
  }
  return resolveFocusValue(p.focus) || 'center';
}
// both pages use one implementation; inputs only, no page assumptions
// beyond the passed grid element.
function renderGrid(projects, gridEl){
  if(!gridEl) return;
  if(!projects.length){
    gridEl.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#a1a1aa">No videos in this category yet.</div>`;
    return;
  }
  gridEl.innerHTML = projects.map(p=>{
    const yid = p.youtubeId || youtubeIdFromUrl(p.youtubeUrl);
    const isVideo = yid && yid.length===11;
    const d = p.display || {};
    const customThumb = (p.thumbnail||"").trim();
    const showThumb = d.thumbnail!==false;
    const primaryThumb = showThumb ? (customThumb || (isVideo ? getYouTubeThumb(yid, "maxres") : PLACEHOLDER_SVG)) : PLACEHOLDER_SVG;
    const badgeCase = projectBadgeCase(p);
    const badge = d.category===false ? '' : `<span class="badge" style="text-transform:${textCaseToTransform(badgeCase)}">${(p.category || (p.format==='short' ? "Reels" : "Video")).replace(/</g,'&lt;')}</span>`;
    const play = (d.playButton===false || !isVideo) ? '' : `<span class="play-badge">▶</span>`;
    const youtubeUrl = p.youtubeUrl || (yid ? `https://www.youtube.com/watch?v=${yid}` : "");
    const format = p.format || 'long';
    const safeThumb = (customThumb || (isVideo ? getYouTubeThumb(yid, "maxres") : "")).replace(/"/g,'&quot;');
    const alt = (p.thumbnailAlt || p.title || "").replace(/"/g,'&quot;');
    const desc = (p.description||"").replace(/"/g,'&quot;');
    const fit = p.thumbnailFit || 'cover';
    // Focal anchor (face-aware, editor-computed, stored on project data).
    // Single shared renderer: Home + Work + filters stay consistent by
    // construction. Manual values never overwritten (see resolveThumbFocus).
    const focusPos = resolveThumbFocus(p);
    const cardLabel = ((isVideo ? 'Play ' : 'View ') + (p.title || 'Untitled')).replace(/"/g, '&quot;');
    const title = d.title===false ? '' : `<h3>${(p.title||"Untitled").replace(/</g,'&lt;')}</h3>`;
    const meta = d.meta===false ? '' : `<p>${(p.meta||"").replace(/</g,'&lt;')}</p>`;
    const descHtml = (d.description===false || !desc) ? '' : `<p style="font-size:11px;color:#a1a1aa;white-space:normal;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;margin-top:2px">${desc.replace(/</g,'&lt;')}</p>`;
    return `
    <article class="card" data-youtube-url="${youtubeUrl}" data-youtube-id="${yid||""}" data-format="${format}" data-title="${(p.title||"").replace(/"/g,'&quot;')}" data-thumb="${safeThumb}" data-desc="${desc}" data-thumb-alt="${alt}" tabindex="0" role="button" aria-label="${cardLabel}">
      <div class="card-media" style="${showThumb ? '' : 'display:none'}">
        <img src="${primaryThumb}" data-custom="${customThumb}" data-yid="${yid||""}" alt="${alt}" loading="lazy" decoding="async" onerror="handleThumbError(this)" onload="thumbQualityCheck(this)" style="object-fit:${fit};object-position:${focusPos};${showThumb ? '' : 'display:none'}">
        ${badge}
        ${play}
      </div>
      <div class="card-body">${title}${meta}${descHtml}</div>
    </article>`;
  }).join('');
}

// Hover preview — lightweight CSS only (thumbnail zoom + play badge)
// Iframe hover preview disabled for reliability — click-to-play is primary
let activePreview = null;
function showPreview(card){ return; }
function hidePreview(card){
  const media = card?.querySelector('.card-media');
  if(media) media.classList.remove('preview-active');
  if(activePreview === card) activePreview = null;
}
function setupHoverPreview(){ return; }

function applySections(c){
  const sections = (c.sections && Array.isArray(c.sections) && c.sections.length) ? [...c.sections].sort((a,b)=>(a.order||0)-(b.order||0)) : null;
  if(!sections) return;
  // Map section id to DOM
  const map = {
    'hero': document.getElementById('hero'),
    'showreel': document.querySelector('.hero-media'), // showreel is part of hero
    'work': document.getElementById('work'),
    'about': document.getElementById('about'),
    'services': document.getElementById('services'),
    'contact': document.getElementById('contact')
  };
  const root = document.getElementById('sectionsRoot');
  // Reorder DOM for work/about/services/contact inside root
  if(root){
    // collect visible and hidden to reorder
    const orderIds = sections.filter(s=> ['work','about','services','contact'].includes(s.id)).sort((a,b)=>a.order-b.order).map(s=>s.id);
    orderIds.forEach(id=>{
      const el = map[id];
      if(el && el.parentElement===root) root.appendChild(el);
    });
    // Handle visibility for those 4
    sections.forEach(sec=>{
      const el = map[sec.id];
      if(!el) return;
      // hero/showreel handled elsewhere, but also respect sections visibility
      if(!isVisible(sec)){
        el.style.display='none';
        el.setAttribute('aria-hidden','true');
      } else {
        el.style.display='';
        el.removeAttribute('aria-hidden');
      }
    });
  }
  // Navigation — separate showInNav from visibility (control center).
  // Base gate via getVisibleSections() (order-preserving), then nav opt-in.
  const navIds = getVisibleSections(sections).filter(s=>{
    const isNav = s.showInNav !== undefined ? s.showInNav : !['hero','showreel'].includes(s.id);
    return isNav;
  }).map(s=>s.id);
  // Also include custom sections if they have been injected
  const customRoot = document.getElementById('customSectionsRoot');
  if(customRoot){
    // Filter-first: OFF custom sections never enter DOM/media (no node, no
    // src, no listeners). Base gate via isVisible() BEFORE createElement.
    sections.filter(s=> s.type==='custom').forEach(sec=>{
      const secVisible = isVisible(sec);
      let el = document.getElementById(sec.id);
      if(!secVisible){
        if(el) el.remove();
        return;
      }
      if(!el){
        el = document.createElement('section');
        el.id = sec.id;
        el.className = 'section container';
        el.setAttribute('data-section','custom');
        customRoot.appendChild(el);
      }
      el.style.display = '';
      {
        // build content from elements
        const elements = getVisibleItems(sec.elements).sort((a,b)=>(a.order||0)-(b.order||0));
        const secTitleCase = resolveTextCase(sec.titleCase, globalTextCase(), 'normal');
        let html = `<div class="section-head"><h2 style="text-transform:${textCaseToTransform(secTitleCase)}">${(sec.title||'Section').replace(/</g,'&lt;')}</h2></div>`;
        if(elements.length){
          html += elements.map(el=>{
            const t = (el.type||'paragraph').toLowerCase();
            const content = (el.content||'').replace(/</g,'&lt;');
            const url = (el.url||'').replace(/"/g,'&quot;');
            const alt = (el.alt||'').replace(/"/g,'&quot;');
            if(t==='heading') return `<h3 style="font-family:Space Grotesk,sans-serif;font-size:clamp(20px,3vw,28px);margin:12px 0">${content}</h3>`;
            if(t==='paragraph') return `<p style="color:#a1a1aa;margin:8px 0;line-height:1.6">${content}</p>`;
            if(t==='image' && el.url) return `<div style="margin:12px 0;border-radius:12px;overflow:hidden;border:1px solid #252529"><img src="${url}" alt="${alt}" style="width:100%;height:auto;display:block;object-fit:cover" loading="lazy" decoding="async" onerror="this.style.display='none'"></div>`;
            if(t==='video' && el.url) {
              const vid = youtubeIdFromUrl(el.url) || el.url;
              if(vid && vid.length===11) return `<div style="margin:12px 0"><a href="https://www.youtube.com/watch?v=${vid}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;background:#facc15;color:#000;padding:10px 16px;border-radius:999px;font-weight:600;text-decoration:none">▶ Watch Video — ${content||'YouTube'}</a></div>`;
              return `<p><a href="${url}" target="_blank" rel="noopener" style="color:#facc15">${content||url}</a></p>`;
            }
            if(t==='button' && el.url) return `<div style="margin:12px 0"><a href="${url}" target="_blank" rel="noopener" class="btn">${content||'Learn More'}</a></div>`;
            if(t==='link' && el.url) return `<p><a href="${url}" target="_blank" rel="noopener" style="color:#facc15;text-decoration:underline">${content||url}</a></p>`;
            if(t==='divider') return `<hr style="border:none;border-top:1px solid #252529;margin:16px 0">`;
            if(t==='list' && el.content) {
              const items = el.content.split('\n').filter(Boolean).map(i=> `<li style="margin:4px 0">${i.replace(/</g,'&lt;')}</li>`).join('');
              return `<ul style="color:#a1a1aa;margin:8px 0;padding-left:20px">${items}</ul>`;
            }
            if(t==='card') return `<div style="background:#18181b;border:1px solid #252529;border-radius:16px;padding:16px;margin:8px 0"><h4 style="margin:0 0 6px">${content}</h4><p style="color:#a1a1aa;font-size:13px;margin:0">${(el.description||'').replace(/</g,'&lt;')}</p></div>`;
            return `<p style="color:#a1a1aa">${content}</p>`;
          }).join('');
        } else {
          html += `<div style="color:#a1a1aa;padding:24px;border:1px dashed #2e2e32;border-radius:16px;text-align:center">Empty section — add elements in Editor → Sections → ${sec.title}<br><span style="font-size:12px;opacity:0.7">id:${sec.id}</span></div>`;
        }
        el.innerHTML = html;
      }
    });
  }
  // Build nav links
  const navContainer = document.querySelector('.nav-links');
  const mobileMenu = document.getElementById('mobileMenu');
  if(navContainer){
    const labelMap = {work:'Work', about:'About', services:'Services', contact:'Contact'};
    const contactVisible = navIds.includes('contact');
    // Global nav: Home first, then sections. Active derives from the page
    // (work.html -> Work, otherwise Home); section anchors never go active.
    const onWorkPage = !!window.WORK_PAGE;
    const navActiveAttr = (isHome, isWork)=>{
      const active = onWorkPage ? isWork : isHome;
      return active ? ' class="active" aria-current="page"' : '';
    };
    // P2.1 header lock: on work.html, bare "#id" anchors would stay on work page;
    // prefix with index.html so About/Services/Contact always resolve home (defensive; currently work page keeps static nav).
    const navHrefFor = (raw, fallbackId)=>{
      let h = (raw && raw.trim()) ? raw.trim() : `#${fallbackId}`;
      if(onWorkPage && h.startsWith('#')) return 'index.html' + h;
      return h;
    };
    let html = `<a href="index.html"${navActiveAttr(true, false)}>Home</a>`;
    // Respect order: navIds already sorted by sections order via filter on sorted sections
    navIds.forEach(id=>{
      if(id==='contact') return; // handle as button last
      const sec = sections.find(s=>s.id===id);
      // Global nav label for Work stays "Work" even though the homepage
      // section title reads "Selected Work".
      const label = id==='work' ? 'Work' : ((sec?.title) || labelMap[id] || id);
      const href = navHrefFor(sec?.href, id);
      const isExternal = /^https?:\/\//.test(href) || href.startsWith('mailto:') || href.startsWith('tel:');
      const target = isExternal ? ' target="_blank" rel="noopener"' : '';
      html += `<a href="${href.replace(/"/g,'&quot;')}"${navActiveAttr(false, id==='work')}${target}>${label.replace(/</g,'&lt;')}</a>`;
    });
    if(contactVisible){
      const contactSec = sections.find(s=>s.id==='contact');
      const contactHref = navHrefFor(contactSec?.href, 'contact');
      const isExt = /^https?:\/\//.test(contactHref) || contactHref.startsWith('mailto:');
      const target = isExt ? ' target="_blank" rel="noopener"' : '';
      const contactLabel = contactSec?.title || 'Contact';
      // V2 L3: Contact is ghost/neutral — yellow reserved for My Work / Send Message only.
      if(isExt){
        html += `<a href="${contactHref.replace(/"/g,'&quot;')}"${target}>${contactLabel.replace(/</g,'&lt;')}</a>`;
      } else {
        html += `<a href="${contactHref.replace(/"/g,'&quot;')}" class="btn btn-sm btn-ghost btn-header-contact">${contactLabel.replace(/</g,'&lt;')}</a>`;
      }
    }
    if(!navIds.length){
      html = `<span style="color:#52525b;font-size:13px">No sections</span>`;
    }
    navContainer.innerHTML = html;
    if(mobileMenu){
      let mHtml=`<a href="index.html"${navActiveAttr(true, false)}>Home</a>`;
      navIds.forEach(id=>{
        const sec = sections.find(s=>s.id===id);
        const label = id==='work' ? 'Work' : ((sec?.title) || labelMap[id] || id);
        const href = navHrefFor(sec?.href, id);
        const isExternal = /^https?:\/\//.test(href) || href.startsWith('mailto:');
        const target = isExternal ? ' target="_blank" rel="noopener"' : '';
        // mobile keeps simple <a> without button style
        mHtml += `<a href="${href.replace(/"/g,'&quot;')}"${navActiveAttr(false, id==='work')}${target}>${label.replace(/</g,'&lt;')}</a>`;
      });
      // Mobile always includes contact if not in navIds but sections has contact visible? For consistency, use navIds check
      if(mHtml) mobileMenu.innerHTML = mHtml;
    }
  }
}

// ============================================================
// CENTRAL VISIBILITY CONTRACT (Phase 2 — pure refactor, zero behavior change)
// ------------------------------------------------------------
// Canonical semantics, defined ONCE here. All renderers consume the
// getters below; no renderer may re-invent these predicates inline.
//
// LAYERS (evaluated in this order):
//   1. BASE GATE — `visible === false` means "unavailable to public
//      rendering". Nothing bypasses it: home pick, work pick, services
//      pick, stats/links picks and section reads all start here.
//   2. PAGE PLACEMENT — `homeEnabled` / `workEnabled` decide whether a
//      base-visible project is placed on that page. Flat form
//      (`p.homeEnabled`) and concurrent-actor nested form
//      (`p.home.enabled`, `p.home.order`) are BOTH honored; either form
//      set to `false` excludes the item from home placement.
//   3. SUB-ELEMENT SWITCHES — `display.*` (e.g. `display.title`,
//      `display.thumbnail`, `display.cta`) toggle pieces INSIDE an
//      already-selected item. They never re-admit a base-hidden item.
//   4. NAV — section `showInNav` + section `visible` drive nav links.
//      `showInNav` absent defaults to true except `hero`/`showreel`.
//   5. DROPDOWN ONLY — `selectable === false` hides a (visible) service
//      from the contact dropdown. It never affects service rendering.
//
// CANONICAL ABSENT-VALUE DEFAULTS:
//   visible absent = true (shown)        → test is `!== false`
//   display.* absent = shown             → test is `!== false`
//   home/work placement absent = true    → test is `!== false`
//   order absent = 0                     → `(homeOrder ?? home.order ?? order ?? 0)`
//
// PHASE DISCIPLINE: this layer only SELECTS. Converting a `display:none`
// hide into skip-render is Phase 4 work — not done here. No new flags.
// ============================================================
function isVisible(item){
  return !!item && item.visible !== false;
}
// Generic base-gate filter: preserves order, never mutates, [] for non-array.
function getVisibleItems(list){
  return (Array.isArray(list) ? list : []).filter(isVisible);
}
// Base gate ONLY (no placement/sort/cap). Defaults to live CONTENT when
// no list is passed. Absent `visible` normalizes to true via isVisible.
function getVisibleProjects(projects){
  const list = (projects === undefined) ? ((typeof CONTENT !== 'undefined' && CONTENT) ? CONTENT.projects : []) : projects;
  return getVisibleItems(list);
}
// Base gate ONLY for sections. Absent `visible` normalizes to true.
function getVisibleSections(sections){
  const list = (sections === undefined) ? ((typeof CONTENT !== 'undefined' && CONTENT) ? CONTENT.sections : []) : sections;
  return getVisibleItems(list);
}
// Base gate ONLY for services. Absent `visible` normalizes to true.
// NOTE: `selectable` is intentionally NOT applied here — it drives the
// contact dropdown only (call sites filter `.selectable !== false` after).
function getVisibleServices(services){
  const list = (services === undefined) ? ((typeof CONTENT !== 'undefined' && CONTENT) ? CONTENT.services : []) : services;
  return getVisibleItems(list);
}
// TODO (Phase 2): getEnabledPages()/getEnabledLinks() SKIPPED — they cannot
// be built from existing config without inventing new schema. Nav derives
// from sections[] (`showInNav` + `visible`), and footer/contact links are
// independent per-object arrays (`c.footer.links`, `c.contact.links`) with
// no shared link-registry or pages array in config.js. Revisit if a pages
// schema is ever introduced.
// OFF = never enters DOM/media: start from visible !== false, keep
// homeEnabled !== false (absent means true = today's behavior), split by
// format, sort each by (homeOrder ?? order ?? 0), cap by home limits.
// renderGrid() only builds the passed-in lists, so non-selected projects
// cause zero home work (no card DOM, no thumbnail request, no listeners).
// Work page (workVisibleProjects/renderWorkPage) intentionally untouched.
// HOME CAP PRECEDENCE (owner decision — CONFIG DRIVES):
//   1. CONFIG when present: CONTENT.home.longFormLimit / shortFormLimit
//      (finite > 0) set the intended caps.
//   2. DEFAULTS when absent/invalid: long=6 / short=4 (owner statement).
//   3. HARD SAFETY CEILING 6 each: a config asking for more is clamped to 6,
//      so rendering can never exceed 6+6 even if config says higher — and it
//      can never exceed config intent downward (config 4 => max 4, not 6).
// Short-form default is 4: do NOT silently keep over-rendering 6 when config
// says 4 or is absent.
const HOME_DEFAULT_LONG = 6;
const HOME_DEFAULT_SHORT = 4;
const HOME_HARD_CEILING = 6;
function homeLimits(){
  const h = (typeof CONTENT !== 'undefined' && CONTENT && typeof CONTENT.home === 'object' && CONTENT.home) || {};
  const L = parseInt(h.longFormLimit, 10), S = parseInt(h.shortFormLimit, 10);
  const wantLong = (Number.isFinite(L) && L > 0) ? L : HOME_DEFAULT_LONG;
  const wantShort = (Number.isFinite(S) && S > 0) ? S : HOME_DEFAULT_SHORT;
  return {long: Math.min(wantLong, HOME_HARD_CEILING),
          short: Math.min(wantShort, HOME_HARD_CEILING)};
}
function selectHomeProjects(projects){
  // Filter-first: base gate via getVisibleProjects(), then homeEnabled !== false (absent = true).
  // Also honors concurrent-actor nested p.home.enabled when present.
  const list = getVisibleProjects(projects || []).filter(p => p.homeEnabled !== false && !(p.home && typeof p.home === 'object' && p.home.enabled === false));
  // Sort key: flat homeOrder ?? nested home.order ?? order ?? 0 (absent falls back to order).
  const homeKey = (p) => {
    if (typeof p.homeOrder === 'number' && isFinite(p.homeOrder)) return p.homeOrder;
    const nested = p.home && typeof p.home === 'object' ? p.home.order : undefined;
    const n = typeof nested === 'number' ? nested : parseInt(nested, 10);
    if (Number.isFinite(n)) return n;
    if (typeof p.order === 'number' && isFinite(p.order)) return p.order;
    const o = parseInt(p.order, 10);
    return Number.isFinite(o) ? o : 0;
  };
  const byHomeOrder = (a, b) => (homeKey(a) - homeKey(b));
  const lim = (typeof homeLimits === 'function') ? homeLimits() : {long: HOME_DEFAULT_LONG, short: HOME_DEFAULT_SHORT};
  const homeLong = list.filter(p => (p.format || 'long') === 'long').sort(byHomeOrder).slice(0, lim.long);
  const homeShort = list.filter(p => p.format === 'short').sort(byHomeOrder).slice(0, lim.short);
  return { homeLong, homeShort };
}

function renderSite(){
  // file:// guard — YouTube Error 153 is caused by missing HTTP Referer
  if(location.protocol === 'file:'){
    const w = document.getElementById('fileWarn');
    if(w) w.style.display='block';
    console.warn('Portfolio opened via file:// — YouTube embeds need http://localhost:8000 — use Preview.bat');
  }
  if(!CONTENT){
    const el = document.getElementById('projectGridLong');
    if(el) el.innerHTML = `<div style="grid-column:1/-1;background:#1a1a1d;border:1px solid #2a2a2e;padding:24px;border-radius:16px;color:#facc15">
      <strong>Could not load portfolio data.</strong><br>
      <span style="color:#a1a1aa;font-size:14px">config.js not found. Make sure config.js is next to index.html.</span>
    </div>`;
    return;
  }
  const c = CONTENT;

  // Site title/description
  if(c.site?.title) document.getElementById('pageTitle').textContent = c.site.title;
  else document.getElementById('pageTitle').textContent = (c.profile?.name || "Portfolio") + " — Portfolio";
  const metaDesc = document.querySelector('meta[name="description"]');
  if(metaDesc && c.site?.description) metaDesc.setAttribute('content', c.site.description);
  // Site language, favicon, share image — SEO/high-level
  if(c.site?.language) document.documentElement.setAttribute('lang', c.site.language);
  if(c.site?.favicon){
    let link = document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]');
    if(!link){ link=document.createElement('link'); link.rel='icon'; document.head.appendChild(link); }
    try{ link.href = c.site.favicon; }catch(e){}
  }
  if(c.site?.shareImage){
    let og = document.querySelector('meta[property="og:image"]');
    if(!og){ og=document.createElement('meta'); og.setAttribute('property','og:image'); document.head.appendChild(og); }
    og.setAttribute('content', c.site.shareImage);
  }

  // Sections — scalable order/visibility, navigation adapts
  try{ applySections(c); }catch(e){ console.warn('sections', e); }

  document.getElementById('logo').innerHTML = (c.profile?.name || "SAHIL") + "<span>.</span>";
  // Hero — granular visibility
  const heroSectionEl = document.getElementById('hero');
  if(c.hero?.visible===false){
    if(heroSectionEl) heroSectionEl.style.display='none';
  } else {
    if(heroSectionEl) heroSectionEl.style.display='';
    const heroDisp = c.hero?.display || {};
    const heroEyebrow = c.hero?.eyebrow || c.profile?.tagline || "";
    const heroTaglineEl = document.getElementById('heroTagline');
    if(heroTaglineEl){
      heroTaglineEl.textContent = heroEyebrow;
      if(heroDisp.eyebrow===false){
        heroTaglineEl.style.display='none';
        heroTaglineEl.setAttribute('hidden','');
        heroTaglineEl.setAttribute('aria-hidden','true');
      } else {
        heroTaglineEl.style.display='';
        heroTaglineEl.removeAttribute('hidden');
        heroTaglineEl.removeAttribute('aria-hidden');
      }
      // P2.4 section-label case (presentation only, stored value untouched — default natural)
      try{ heroTaglineEl.style.textTransform = textCaseToTransform(resolveTextCase(c.hero?.eyebrowCase, globalTextCase(), 'normal')); }catch(e){}
    }
    const heroTitleEl = document.getElementById('heroTitle');
    if(heroTitleEl){
      heroTitleEl.innerHTML = `${c.hero?.title || ""}<br><span id="heroTitleAccent">${c.hero?.titleAccent || ""}</span>`;
      heroTitleEl.style.display = heroDisp.title===false ? 'none' : '';
    }
    const heroDescEl = document.getElementById('heroDesc');
    if(heroDescEl){
      heroDescEl.textContent = c.hero?.description || "";
      heroDescEl.style.display = heroDisp.description===false ? 'none' : '';
    }
    // Hero vertical offsets (editor position controls): px translate per
    // text element, 0/absent/invalid = current position. transform keeps
    // document flow and responsive behavior untouched.
    const heroOffset = (c.hero && c.hero.offset) || {};
    const heroNum = (raw)=>{
      let v = Number(raw);
      if(!isFinite(v)) v = 0;
      return Math.max(-80, Math.min(80, Math.round(v)));
    };
    // Relative offset: shifts the element visually without moving document
    // flow (siblings/layout untouched, wrapping intact). Works on inline
    // content too, where transforms would not apply. Cleared at 0.
    const heroShift = (el, v)=>{
      if(!el) return;
      el.style.position = v ? 'relative' : '';
      el.style.top = v ? `${v}px` : '';
    };
    heroShift(document.getElementById('heroTagline'), heroNum(heroOffset.eyebrow));
    heroShift(document.getElementById('heroDesc'), heroNum(heroOffset.description));
    // Title moves its own block; highlight (inline span, moves with its
    // parent) gets the compensated delta so each is visually independent.
    const tt = heroNum(heroOffset.title), hh = heroNum(heroOffset.highlight);
    heroShift(heroTitleEl, tt);
    heroShift(document.getElementById('heroTitleAccent'),
      Math.max(-80, Math.min(80, hh - tt)));
    // CTA buttons — data-driven + granular + dead-destination gate (P1).
    // A CTA pointing at a disabled destination never binds/renders as live:
    // work targets (work.html / #work) require work section visible; contact
    // targets (#contact / index.html#contact) require contact section visible.
    // Gate evaluated here (authoritative impl, in place) before href/display.
    const sectionVisibleById = (id)=>{
      try{
        const list = (c.sections && Array.isArray(c.sections)) ? c.sections : [];
        const sec = list.find(s=>s.id===id);
        if(!sec) return true; // missing flags keep existing defaults (present)
        return isVisible(sec);
      }catch(e){ return true; }
    };
    const ctaTargetOff = (href)=>{
      const h = (href||"").trim().toLowerCase();
      if(!h) return false;
      if(h.includes('#contact') || h==='contact') return !sectionVisibleById('contact');
      if(h.includes('work.html') || h==='#work' || h.endsWith('#work')) return !sectionVisibleById('work');
      return false;
    };
    const ctaPrimary = c.hero?.ctaPrimary || {text:"View My Work →", href:"#work", visible:true};
    const ctaSecondary = c.hero?.ctaSecondary || {text:"Let's Talk", href:"#contact", visible:true};
    const ctaContainer = document.querySelector('.hero-cta');
    if(ctaContainer){
      const btns = ctaContainer.querySelectorAll('a.btn');
      const pOff = ctaTargetOff(ctaPrimary.href || "#work");
      const sOff = ctaTargetOff(ctaSecondary.href || "#contact");
      if(btns[0]){
        btns[0].textContent = ctaPrimary.text || "View My Work →";
        if(pOff){
          btns[0].removeAttribute('href');
          btns[0].style.display='none';
          btns[0].setAttribute('aria-hidden','true');
          btns[0].tabIndex = -1;
        } else {
          btns[0].setAttribute('href', ctaPrimary.href || "#work");
          btns[0].style.display = (ctaPrimary.visible===false || heroDisp.cta===false) ? 'none' : '';
          btns[0].removeAttribute('aria-hidden');
          btns[0].tabIndex = 0;
        }
      }
      if(btns[1]){
        btns[1].textContent = ctaSecondary.text || "Let's Talk";
        if(sOff){
          btns[1].removeAttribute('href');
          btns[1].style.display='none';
          btns[1].setAttribute('aria-hidden','true');
          btns[1].tabIndex = -1;
        } else {
          btns[1].setAttribute('href', ctaSecondary.href || "#contact");
          btns[1].style.display = (ctaSecondary.visible===false || heroDisp.cta===false) ? 'none' : '';
          btns[1].removeAttribute('aria-hidden');
          btns[1].tabIndex = 0;
        }
      }
      const pHidden = (ctaPrimary.visible===false || heroDisp.cta===false || pOff);
      const sHidden = (ctaSecondary.visible===false || heroDisp.cta===false || sOff);
      if(pHidden && sHidden){
        ctaContainer.style.display='none';
      } else {
        ctaContainer.style.display = heroDisp.cta===false ? 'none' : '';
      }
    }
    // Stats granular
    const statsDisp = heroDisp.stats !== false;
    const statsEl = document.getElementById('stats');
    if(statsEl){
      if(!statsDisp){
        statsEl.style.display='none';
      } else {
        // handled later
      }
    }
    // Media granular — hide if hero display.media false OR showreel hidden (content or section)
    const heroMediaDisp = heroDisp.media !== false;
    const sectionShowreel = c.sections?.find(s=>s.id==='showreel');
    const sectionShowreelVisible = sectionShowreel ? isVisible(sectionShowreel) : true;
    const showreelVisible = c.showreel?.visible !== false && sectionShowreelVisible;
    const heroMediaEl = document.querySelector('.hero-media');
    if(heroMediaEl){
      if(!heroMediaDisp || !showreelVisible){
        heroMediaEl.style.display='none';
        heroMediaEl.setAttribute('hidden','');
        heroMediaEl.setAttribute('aria-hidden','true');
        const heroEl = document.querySelector('.hero');
        if(heroEl) heroEl.style.gridTemplateColumns='1fr';
      } else {
        heroMediaEl.style.display='';
        heroMediaEl.removeAttribute('hidden');
        heroMediaEl.removeAttribute('aria-hidden');
        const heroEl = document.querySelector('.hero');
        if(heroEl) heroEl.style.gridTemplateColumns='';
      }
    }
  }
  const thumb = c.showreel?.thumbnail || "";
  const thumbAlt = c.showreel?.thumbnailAlt || c.showreel?.title || "Showreel";
  // Media discipline (home path): don't fetch hero/showreel thumb while hidden.
  // Section show/hide mechanics above are untouched; this only skips the src
  // assignment (zero thumbnail request) when the image could never be seen.
  const _heroHidden = c.hero?.visible === false;
  const _secSr = c.sections?.find(s=>s.id==='showreel');
  const _srHidden = c.showreel?.visible === false || (_secSr && !isVisible(_secSr));
  const _mediaOff = (c.hero?.display?.media === false);
  const _skipHeroThumb = _heroHidden || _srHidden || _mediaOff;
  if(thumb) {
    const heroImg = document.getElementById('heroThumb');
    if(heroImg && !_skipHeroThumb){
      heroImg.src = thumb;
      heroImg.alt = thumbAlt;
      heroImg.onerror = function(){ this.onerror=null; this.src = PLACEHOLDER_SVG; };
    }
  } else {
    const heroImg = document.getElementById('heroThumb');
    if(heroImg && !_skipHeroThumb && c.showreel?.visible!==false){
      // use YouTube poster if no custom thumb
      const yid = c.showreel?.youtubeId || youtubeIdFromUrl(c.showreel?.youtubeUrl||"");
      if(yid) heroImg.src = `https://img.youtube.com/vi/${yid}/hqdefault.jpg`;
    }
  }
  const srLabel = c.showreel?.label || c.showreel?.title || "Showreel — Click to play";
  const srLabelEl = document.getElementById('showreelLabel');
  if(srLabelEl){
    srLabelEl.textContent = "● " + srLabel;
    const srDisp = c.showreel?.display || {};
    srLabelEl.style.display = srDisp.label===false ? 'none' : '';
    srLabelEl.parentElement.style.display = srDisp.label===false ? 'none' : '';
  }
  // Showreel granular — title is hero label, handled above; video/thumbnail handled via heroMedia already
  const srDisp2 = c.showreel?.display || {};
  const heroCard2 = document.getElementById('heroCard');
  if(heroCard2){
    const playBtn = heroCard2.querySelector('.play-btn');
    if(playBtn) playBtn.style.display = srDisp2.playButton===false ? 'none' : '';
    const thumbImg = document.getElementById('heroThumb');
    if(thumbImg && srDisp2.thumbnail===false) thumbImg.style.display='none';
    else if(thumbImg) thumbImg.style.display='';
  }
  const heroDisp2 = c.hero?.display || {};
  const stats = c.hero?.stats || [];
  const statsEl = document.getElementById('stats');
  if(statsEl){
    // Media discipline (home path): skip stats HTML work while hero hidden.
    // Show/hide mechanics untouched; only avoids innerHTML churn when unseen.
    const _heroHiddenForStats = c.hero?.visible === false;
    if(_heroHiddenForStats){
      statsEl.innerHTML='';
      statsEl.style.display='none';
    } else {
    const groupVisible = heroDisp2.stats !== false;
    const visibleStats = getVisibleItems(stats).filter(s=> s.display!==false);
    if(groupVisible && visibleStats.length){
      statsEl.innerHTML = visibleStats.map(s=>{
        // handle both old {value,label} and new {text,value}
        const val = s.value || s.text || '';
        const lab = s.label || s.text || '';
        // for old string-based points, val is value, lab is label
        const v = s.value !== undefined ? s.value : (s.text||'');
        const l = s.label !== undefined ? s.label : '';
        // if new object has text field, use it for both?
        if(s.text && !s.value) return `<div><strong>${s.text}</strong></div>`;
        return `<div><strong>${v}</strong><span>${l}</span></div>`;
      }).join('');
      statsEl.style.display='';
    } else {
      statsEl.innerHTML='';
      statsEl.style.display='none';
    }
    }
  }
  // Work / Selected Work — complete control
  const workSec = (c.sections||[]).find(s=>s.id==='work');
  const workTitleEl = document.querySelector('#work .section-head h2');
  if(workTitleEl){
    if(workSec?.title) workTitleEl.textContent = workSec.title;
    workTitleEl.style.display = workSec?.settings?.titleVisible===false ? 'none' : '';
  }
  const workSubtitleEl = document.getElementById('workSubtitle');
  if(workSubtitleEl){
    const sub = workSec?.settings?.subtitle || "Explore my latest editing projects";
    workSubtitleEl.textContent = sub;
    const subVis = workSec?.settings?.showSubtitle!==false && workSec?.settings?.titleVisible!==false ? workSec?.settings?.showSubtitle!==false : workSec?.settings?.showSubtitle!==false;
    // Actually subtitle visible is independent, but if title hidden, subtitle still shows
    workSubtitleEl.style.display = workSec?.settings?.showSubtitle===false ? 'none' : '';
    // If both title and subtitle hidden, hide the left header container but keep layout
    const headLeft = document.querySelector('#work .section-head-left');
    if(headLeft){
      const titleVis = workSec?.settings?.titleVisible!==false;
      const subVis2 = workSec?.settings?.showSubtitle!==false;
      headLeft.style.display = (!titleVis && !subVis2) ? 'none' : '';
    }
  }
  const longLabel = workSec?.settings?.longLabel || "Long-form";
  const shortLabel = workSec?.settings?.shortLabel || "Short-form";
  const longVisible = workSec?.settings?.longVisible!==false;
  const shortVisible = workSec?.settings?.shortVisible!==false;
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    if(btn.dataset.tab==='long'){
      btn.textContent = longLabel;
      btn.style.display = longVisible ? '' : 'none';
    }
    if(btn.dataset.tab==='short'){
      btn.textContent = shortLabel;
      btn.style.display = shortVisible ? '' : 'none';
    }
  });
  // handle tabs visibility: showTabs false OR both tabs hidden => hide tabs
  const showTabs = workSec?.settings?.showTabs !== false && (longVisible || shortVisible);
  const tabsEl = document.querySelector('.work-tabs');
  if(tabsEl) tabsEl.style.display = showTabs ? '' : 'none';
  // default tab handling will be after grid render

  // About — granular
  const aboutDisp = c.about?.display || {};
  const aboutEyebrowEl = document.querySelector('#about .eyebrow');
  if(aboutEyebrowEl){
    aboutEyebrowEl.textContent = c.about?.eyebrow || "ABOUT ME";
    aboutEyebrowEl.style.display = aboutDisp.eyebrow===false ? 'none' : '';
    // P2.4 section-label case (presentation only, stored value untouched — default natural)
    try{ aboutEyebrowEl.style.textTransform = textCaseToTransform(resolveTextCase(c.about?.eyebrowCase, globalTextCase(), 'normal')); }catch(e){}
  }
  const aboutSection = document.getElementById('about');
  if(c.about && c.about.visible === false){
    if(aboutSection) aboutSection.style.display='none';
  } else {
    if(aboutSection) aboutSection.style.display='';
    const aboutImg = document.getElementById('aboutImg');
    if(aboutImg){
      const aboutImgWrap = document.querySelector('.about-img');
      // Filter-first: no src fetch while display.image OFF (gate passes before
      // any network). Hidden wrap follows the hero hidden/aria-hidden pattern.
      if(aboutDisp.image===false){
        try{ aboutImg.removeAttribute('src'); }catch(e){}
        aboutImg.setAttribute('aria-hidden','true');
        if(aboutImgWrap){
          aboutImgWrap.style.display='none';
          aboutImgWrap.setAttribute('aria-hidden','true');
        }
      } else {
        const imgSrc = c.about?.image || "";
        aboutImg.src = imgSrc || PLACEHOLDER_SVG;
        // Same focal model as project thumbs (about.focus, editor-computed).
        try{
          const _afx = parseFloat(c.about?.focus?.x), _afy = parseFloat(c.about?.focus?.y);
          aboutImg.style.objectPosition = (isFinite(_afx) && isFinite(_afy))
            ? `${Math.min(1, Math.max(0, _afx)) * 100}% ${Math.min(1, Math.max(0, _afy)) * 100}%`
            : 'center';
        }catch(_){}
        aboutImg.alt = c.about?.imageAlt || c.about?.title || "About photo";
        aboutImg.onerror = function(){ this.onerror=null; this.src = PLACEHOLDER_SVG; };
        aboutImg.removeAttribute('aria-hidden');
        if(aboutImgWrap){
          aboutImgWrap.style.display='';
          aboutImgWrap.removeAttribute('aria-hidden');
        }
      }
    }
    const aboutTitleEl = document.getElementById('aboutTitle');
    if(aboutTitleEl){
      aboutTitleEl.innerHTML = (c.about?.title || "").replace('\n','<br>');
      aboutTitleEl.style.display = aboutDisp.title===false ? 'none' : '';
    }
    const aboutTextEl = document.getElementById('aboutText');
    if(aboutTextEl){
      aboutTextEl.textContent = c.about?.text || "";
      aboutTextEl.style.display = aboutDisp.text===false ? 'none' : '';
    }
    const aboutListEl = document.getElementById('aboutList');
    if(aboutListEl){
      const ptsRaw = c.about?.points || [];
      const pts = ptsRaw.filter(p=>{
        if(typeof p==='string') return true;
        return isVisible(p);
      }).map(p=> typeof p==='string' ? p : (p.text||p.value||''));
      const groupVisible = aboutDisp.highlights!==false;
      aboutListEl.innerHTML = pts.map(p=>`<li>✓ ${p.replace(/</g,'&lt;')}</li>`).join('');
      aboutListEl.style.display = (groupVisible && pts.length) ? '' : 'none';
    }
    const aboutToolsEl = document.getElementById('aboutTools');
    if(aboutToolsEl){
      const toolsRaw = c.about?.tools || [];
      const tools = toolsRaw.filter(t=>{
        if(typeof t==='string') return true;
        return isVisible(t);
      }).map(t=> typeof t==='string' ? t : (t.text||t.value||''));
      const groupVisible = aboutDisp.tools!==false;
      aboutToolsEl.innerHTML = tools.map(t=>`<span>${t.replace(/</g,'&lt;')}</span>`).join('');
      aboutToolsEl.style.display = (groupVisible && tools.length) ? '' : 'none';
    }
  }

  // Services — title from sections, only visible
  const servicesSec = (c.sections||[]).find(s=>s.id==='services');
  const servicesTitleEl = document.getElementById('servicesTitle');
  if(servicesTitleEl && servicesSec?.title) servicesTitleEl.textContent = servicesSec.title;
  const visibleServices = getVisibleServices(c.services);
  const servicesGrid = document.getElementById('servicesGrid');
  const servicesSection = document.getElementById('services');
  if(servicesGrid){
    // Dead-destination gate: a service CTA resolving to #contact while the
    // contact section is OFF is dropped before DOM creation (no dead CTA).
    const contactOff = (()=>{ try{ const l=((c.sections||[]).find(s=>s.id==='contact')); return l ? !isVisible(l) : false; }catch(e){ return false; } })();
    if(visibleServices.length){
      servicesGrid.innerHTML = visibleServices.map(s=>{
        const d = s.display || {};
        const icon = d.icon===false ? '' : `<div class="icon">${serviceIconSvg(s.icon, s.title)}</div>`;
        const title = d.title===false ? '' : `<h3>${(s.title||'').replace(/</g,'&lt;')}</h3>`;
        const desc = d.description===false ? '' : `<p>${(s.description||'').replace(/</g,'&lt;')}</p>`;
        const price = d.price===false ? '' : (s.price ? `<span class="price">${s.price.replace(/</g,'&lt;')}</span>` : '');
        const showCTA = d.cta!==false && s.ctaText && s.ctaText.trim();
        const rawHref = (s.ctaHref||"#contact");
        const deadContact = contactOff && (rawHref.trim().toLowerCase().includes('#contact') || rawHref.trim()==='#contact');
        const cta = (!showCTA || deadContact) ? '' : `<a href="${rawHref.replace(/"/g,'&quot;')}" ${s.ctaNewTab ? 'target="_blank" rel="noopener"' : ''} class="btn btn-sm" style="margin-top:10px;">${s.ctaText.replace(/</g,'&lt;')}</a>`;
        return `<div class="service-card">${icon}${title}${desc}${price}${cta}</div>`;
      }).join('');
      if(servicesSection) servicesSection.style.display='';
    } else {
      servicesGrid.innerHTML = '';
      if(servicesSection) servicesSection.style.display='none';
    }
  }
  // Also handle services section title visibility via display (if needed, title is section title)
  const servicesDisp = (c.services && c.services.display) || {};
  // No separate title display for now, section visibility handles it
  // Contact — granular heading, subheading, form
  const contactDisp = c.contact?.display || {};
  const contactSec = (c.sections||[]).find(s=>s.id==='contact');
  const contactHeadingEl = document.querySelector('#contact h2');
  if(contactHeadingEl){
    if(c.contact?.heading) contactHeadingEl.innerHTML = c.contact.heading;
    contactHeadingEl.style.display = contactDisp.heading===false ? 'none' : '';
  }
  const contactDescEl = document.querySelector('#contact .contact-grid > div > p');
  if(contactDescEl){
    if(c.contact?.subheading) contactDescEl.textContent = c.contact.subheading;
    contactDescEl.style.display = contactDisp.subheading===false ? 'none' : '';
  }
  const contactEmailEl = document.querySelector('#contactLinks');
  // email and links handled below, but respect display.email/links
  const formDisp = c.contact?.form?.display || {};
  const formCfgForDropdown = c.contact?.form || {};
  // Contact service dropdown — dynamic from visible services, no hardcoded options
  const serviceSelect = document.querySelector('#contactForm select[name="service"]');
  if(serviceSelect){
    const currentVal = serviceSelect.value;
    const placeholder = formCfgForDropdown.servicePlaceholder || "Select Service";
    serviceSelect.innerHTML = `<option value="" disabled selected>${placeholder.replace(/</g,'&lt;')}</option>`;
    // Only show services where visible && selectable !== false — hidden services never appear
    const selectableServices = visibleServices.filter(s=> s.selectable!==false);
    selectableServices.forEach(s=>{
      const opt = document.createElement('option');
      opt.value = s.title;
      opt.textContent = s.title;
      serviceSelect.appendChild(opt);
    });
    if(formCfgForDropdown.includeOther){
      const optOther = document.createElement('option');
      optOther.value = "Other";
      optOther.textContent = "Other";
      serviceSelect.appendChild(optOther);
    }
    // restore if still valid
    if(currentVal) serviceSelect.value = currentVal;
  }

  // Contact links — granular, no href="#"
  const contactLinksEl = document.getElementById('contactLinks');
  if(contactLinksEl){
    if(contactDisp.links===false || contactDisp.email===false){
      // handled below
    }
    let html = '';
    const email = (c.contact?.email || "").trim();
    if(email && contactDisp.email!==false){
      html += `<a href="mailto:${email.replace(/"/g,'&quot;')}">${email.replace(/</g,'&lt;')}</a>`;
    }
    const links = c.contact?.links || [];
    const visibleLinks = getVisibleItems(links).filter(l => (l.url||"").trim());
    if(contactDisp.links!==false && visibleLinks.length){
      visibleLinks.forEach(l=>{
        const label = (l.label || "Link").replace(/</g,'&lt;');
        const url = l.url.trim();
        const safeUrl = url.replace(/"/g,'&quot;');
        html += `<a href="${safeUrl}" target="_blank" rel="noopener">${label}</a>`;
      });
    } else if(contactDisp.links!==false){
      const insta = (c.contact?.instagram||"").trim();
      const yt = (c.contact?.youtube||"").trim();
      if(insta) html += `<a href="${insta.replace(/"/g,'&quot;')}" target="_blank" rel="noopener">Instagram</a>`;
      if(yt) html += `<a href="${yt.replace(/"/g,'&quot;')}" target="_blank" rel="noopener">YouTube</a>`;
    }
    if(!html){
      html = contactDisp.links===false && contactDisp.email===false ? '' : `<span style="color:#a1a1aa">Contact via form</span>`;
    }
    contactLinksEl.innerHTML = html;
    contactLinksEl.style.display = (contactDisp.links===false && contactDisp.email===false && !html) ? 'none' : '';
    // hide entire contact links container if both email and links hidden
    if(contactDisp.email===false && contactDisp.links===false) contactLinksEl.style.display='none';
  }
  // Contact form visibility — granular fields + labels/placeholders/required/order
  const contactFormEl = document.getElementById('contactForm');
  if(contactFormEl){
    const formVisible = contactDisp.form!==false && c.contact?.form?.visible!==false;
    contactFormEl.style.display = formVisible ? '' : 'none';
    if(formVisible){
      const formCfg = c.contact?.form || {};
      const formDisp2 = formCfg.display || {};
      // Handle field visibility and required
      const fieldMap = {
        name: contactFormEl.querySelector('input[name="name"]'),
        email: contactFormEl.querySelector('input[name="email"]'),
        service: contactFormEl.querySelector('select[name="service"]'),
        message: contactFormEl.querySelector('textarea[name="message"]'),
        submit: contactFormEl.querySelector('button[type="submit"]')
      };
      for(const [fid, el] of Object.entries(fieldMap)){
        if(!el) continue;
        const isVisible = formDisp2[fid]!==false && (fid!=="submit" ? true : formCfg.visible!==false);
        // For submit, also check formCfg.visible
        if(fid==="submit"){
          el.style.display = (isVisible && formCfg.visible!==false) ? '' : 'none';
          continue;
        }
        // Hide/show the field's container if needed
        const container = el.closest('div') || el.parentElement;
        // For inputs, the container might be the field itself or its wrapper
        if(isVisible){
          if(container) container.style.display='';
          el.style.display='';
          el.required = !!formCfg[`${fid}Required`];
          // Update placeholder and label if exists
          if(formCfg[`${fid}Placeholder`]) el.placeholder = formCfg[`${fid}Placeholder`];
          // If there's a label element (not in current HTML, but handle if added)
          const labelEl = contactFormEl.querySelector(`label[for="${fid}"]`);
          if(labelEl && formCfg[`${fid}Label`]) labelEl.textContent = formCfg[`${fid}Label`];
        } else {
          if(container && container!==contactFormEl) container.style.display='none';
          el.style.display='none';
          el.required = false;
        }
      }
      // Handle field order — reorder DOM elements based on fieldOrder
      const order = formCfg.fieldOrder || ["name","email","service","message","submit"];
      const orderMap = {name: fieldMap.name?.closest('div') || fieldMap.name, email: fieldMap.email?.closest('div') || fieldMap.email, service: fieldMap.service?.closest('div') || fieldMap.service, message: fieldMap.message, submit: fieldMap.submit};
      // Collect existing field containers in current order
      const existing = Array.from(contactFormEl.children).filter(el=> el!==document.getElementById('formNote') && el.tagName!=="P");
      // Only reorder if we have a clear order and elements exist
      if(order && order.length){
        // Create ordered list of elements to append in desired order
        const ordered = order.map(fid=> orderMap[fid]).filter(el=> el && el.parentElement===contactFormEl);
        if(ordered.length){
          ordered.forEach(el=> contactFormEl.appendChild(el));
          // Ensure formNote stays last
          const note = document.getElementById('formNote');
          if(note) contactFormEl.appendChild(note);
        }
      }
      // Handle Other option and empty state
      const serviceSelect = fieldMap.service;
      if(serviceSelect && formDisp2.service!==false){
        // Check if no selectable services (base gate via getter, dropdown-only selectable inline)
        const selectable = getVisibleServices(c.services).filter(s=> s.selectable!==false);
        if(selectable.length===0 && !formCfg.includeOther){
          // No services available — hide service field
          const svcContainer = serviceSelect.closest('div') || serviceSelect.parentElement;
          if(svcContainer) svcContainer.style.display='none';
          // Show warning if needed (handled via CSS, but we can add a note)
        }
      }
    }
  }
  // Contact form — placeholders, labels, button, required, Other
  const contactForm = document.getElementById('contactForm');
  if(contactForm){
    const formCfg = c.contact?.form || {};
    const nameInput = contactForm.querySelector('input[name="name"]');
    if(nameInput){
      if(formCfg.namePlaceholder) nameInput.placeholder = formCfg.namePlaceholder;
      if(formCfg.nameLabel) nameInput.setAttribute("aria-label", formCfg.nameLabel);
      nameInput.required = !!formCfg.nameRequired;
    }
    const emailInput = contactForm.querySelector('input[name="email"]');
    if(emailInput){
      if(formCfg.emailPlaceholder) emailInput.placeholder = formCfg.emailPlaceholder;
      if(formCfg.emailLabel) emailInput.setAttribute("aria-label", formCfg.emailLabel);
      emailInput.required = !!formCfg.emailRequired;
    }
    const serviceSelect2 = contactForm.querySelector('select[name="service"]');
    if(serviceSelect2){
      if(formCfg.servicePlaceholder && serviceSelect2.options.length) serviceSelect2.options[0].textContent = formCfg.servicePlaceholder;
      if(serviceSelect2.options.length){
        serviceSelect2.options[0].value = "";
        serviceSelect2.options[0].disabled = true;
        if(!serviceSelect2.value) serviceSelect2.options[0].selected = true;
      }
      if(formCfg.serviceLabel) serviceSelect2.setAttribute("aria-label", formCfg.serviceLabel);
      serviceSelect2.required = !!formCfg.serviceRequired;
      // Other option is handled in dropdown generation above, but ensure placeholder is correct
    }
    const msgInput = contactForm.querySelector('textarea[name="message"]');
    if(msgInput){
      if(formCfg.messagePlaceholder) msgInput.placeholder = formCfg.messagePlaceholder;
      if(formCfg.messageLabel) msgInput.setAttribute("aria-label", formCfg.messageLabel);
      msgInput.required = !!formCfg.messageRequired;
    }
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    if(submitBtn){
      if(formCfg.submitText) submitBtn.textContent = formCfg.submitText;
      submitBtn.style.display = (formCfg.display && formCfg.display.submit===false) ? 'none' : '';
    }
    try{ ensureContactLabels(contactForm); }catch(e){}
  }
  // Footer — granular
  const footerEl = document.querySelector('.footer');
  const footerDisp = c.footer?.display || {};
  if(footerEl && c.footer?.visible===false){
    footerEl.style.display='none';
  } else if(footerEl){
    footerEl.style.display='';
    const footerTextEl = document.getElementById('footerText');
    if(footerTextEl){
      const footerCfg = c.footer || {};
      if(footerCfg.text) footerTextEl.textContent = footerCfg.text;
      else footerTextEl.textContent = `© 2026 ${c.profile?.name||"Sahil"}.`;
      footerTextEl.style.display = footerDisp.copyright===false ? 'none' : '';
    }
    const backToTopEl = document.querySelector('.footer-inner a[href="#hero"], .footer-inner a[href="#top"], .footer-inner a[href="#"]');
    if(backToTopEl){
      if(c.footer?.backToTopText) backToTopEl.textContent = c.footer.backToTopText;
      backToTopEl.style.display = footerDisp.backToTop===false ? 'none' : '';
      const backWrap = backToTopEl.parentElement;
      if(backWrap) backWrap.style.display = footerDisp.backToTop===false ? 'none' : '';
    }
    // footer social links if any (not yet, but handle)
    const footerSocial = document.querySelector('.footer .social-links');
    if(footerSocial) footerSocial.style.display = footerDisp.social===false ? 'none' : '';
    // footer additional links — universal link system
    const footerLinksData = getVisibleItems(c.footer?.links).filter(l=> (l.url||"").trim());
    let footerLinksEl = document.getElementById('footerLinks');
    if(!footerLinksEl && footerLinksData.length){
      footerLinksEl = document.createElement('div');
      footerLinksEl.id='footerLinks';
      footerLinksEl.style.display='flex';
      footerLinksEl.style.gap='16px';
      footerLinksEl.style.flexWrap='wrap';
      footerLinksEl.style.alignItems='center';
      const inner = document.querySelector('.footer-inner');
      if(inner){
        // insert before backToTop span (last child)
        const backTopWrap = inner.querySelector('span:last-child');
        if(backTopWrap && backTopWrap.parentElement===inner) inner.insertBefore(footerLinksEl, backTopWrap);
        else inner.appendChild(footerLinksEl);
      }
    }
    if(footerLinksEl){
      if(footerLinksData.length && footerDisp.links!==false){
        footerLinksEl.innerHTML = footerLinksData.map(l=> `<a href="${l.url.replace(/"/g,'&quot;')}" target="_blank" rel="noopener" style="color:#d4d4d8;text-decoration:underline;text-underline-offset:4px;font-size:13px;">${(l.label||'Link').replace(/</g,'&lt;')}</a>`).join('');
        footerLinksEl.style.display='flex';
      } else {
        footerLinksEl.innerHTML='';
        footerLinksEl.style.display='none';
      }
    }
  }

  // Filter-first home pipeline: OFF = never enters DOM/media. selectHomeProjects
  // starts from visible, keeps homeEnabled !== false, sorts by
  // (homeOrder ?? order ?? 0), caps by home limits (CONFIG drives per
  // HOME CAP PRECEDENCE: config when present, defaults 6/4, ceiling 6 each).
  // renderGrid() below only builds these selected
  // lists, so excluded items cause zero home work.
  // Work page path (workVisibleProjects/renderWorkPage) keeps all visible.
  const { homeLong: longProjects, homeShort: shortProjects } = selectHomeProjects(c.projects || []);
  // "View All Work →" (static, genuinely optional): hide with hidden/
  // aria-hidden (hero pattern, no CSS override block) while the work section
  // is OFF so it never reads as a dead CTA to a disabled destination.
  try{
    const workOff = (()=>{ const s=(c.sections||[]).find(x=>x.id==='work'); return s ? !isVisible(s) : false; })();
    const viewAll = document.getElementById('viewAllWork') || document.querySelector('#work a.btn[href="work.html"]');
    if(viewAll){
      const wrap = viewAll.closest('div') || viewAll;
      if(workOff){
        viewAll.setAttribute('aria-hidden','true');
        viewAll.tabIndex = -1;
        if(wrap){ wrap.setAttribute('hidden',''); wrap.setAttribute('aria-hidden','true'); wrap.style.display='none'; }
        else viewAll.style.display='none';
      } else {
        viewAll.removeAttribute('aria-hidden');
        viewAll.tabIndex = 0;
        if(wrap){ wrap.removeAttribute('hidden'); wrap.removeAttribute('aria-hidden'); wrap.style.display=''; }
        else viewAll.style.display='';
      }
    }
  }catch(e){}

  const gridLong = document.getElementById('projectGridLong');
  const gridShort = document.getElementById('projectGridShort');

  // Handle empty states and tabs hidden: if both tabs hidden, show all projects in long grid without tabs
  const workSettings = workSec?.settings || {};
  const tabsShouldShow = workSettings.showTabs!==false && (workSettings.longVisible!==false || workSettings.shortVisible!==false);
  if(!tabsShouldShow){
    // Show all visible projects in long grid
    const allVisible = [...longProjects, ...shortProjects];
    renderGrid(allVisible, gridLong);
    gridShort.style.display='none';
    gridLong.style.display='grid';
    const tabsEl2 = document.querySelector('.work-tabs');
    if(tabsEl2) tabsEl2.style.display='none';
  } else {
    renderGrid(longProjects, gridLong);
    renderGrid(shortProjects, gridShort);
  }
  // Above-fold thumbs (render path only): first 2 home long-grid images load
  // eager with high fetch priority; everything else keeps renderGrid's lazy.
  // No URL/selection/order logic touched — attribute switch on position only.
  try{
    const _foldImgs = gridLong ? gridLong.querySelectorAll('img') : [];
    _foldImgs.forEach((img, i)=>{ if(i < 2){ img.loading = 'eager'; img.setAttribute('fetchpriority', 'high'); } });
  }catch(e){}

  setupTabs();
  bindCards(yidOverride());
  setupHoverPreview();
  // Default tab handling
  const defaultTab = workSettings.defaultTab || "long";
  const longVis = workSettings.longVisible!==false;
  const shortVis = workSettings.shortVisible!==false;
  let initialTab = defaultTab;
  if(initialTab==="long" && !longVis) initialTab = shortVis ? "short" : "long";
  if(initialTab==="short" && !shortVis) initialTab = longVis ? "long" : "short";
  // If tabs hidden, already handled, else set active
  if(tabsShouldShow){
    document.querySelectorAll('.tab-btn').forEach(b=> {b.classList.remove('active'); b.setAttribute('aria-selected','false'); b.setAttribute('aria-pressed','false');});
    document.querySelector(`.tab-btn[data-tab="${initialTab}"]`)?.classList.add('active');
    document.querySelector(`.tab-btn[data-tab="${initialTab}"]`)?.setAttribute('aria-selected','true');
    document.querySelector(`.tab-btn[data-tab="${initialTab}"]`)?.setAttribute('aria-pressed','true');
    gridLong.style.display = initialTab==="long" ? 'grid' : 'none';
    gridShort.style.display = initialTab==="short" ? 'grid' : 'none';
    try{
      const viewAllInit = document.getElementById('viewAllWork');
      if(viewAllInit) viewAllInit.setAttribute('href', 'work.html?filter=' + (initialTab === 'short' ? 'short' : 'long'));
    }catch(_){}
  } else {
    // No tabs, long grid already shows all
    gridLong.style.display='grid';
    gridShort.style.display='none';
  }
}

function setupTabs(){
  // Bind-after-gate (P1): OFF tabs (longVisible/shortVisible false) get no
  // listeners and no keyboard presence. Base gate read from work settings;
  // missing flags default to true per the central contract.
  let longVis = true, shortVis = true;
  try{
    const ws = (((CONTENT||{}).sections||[]).find(s=>s.id==='work')||{}).settings || {};
    longVis = ws.longVisible!==false;
    shortVis = ws.shortVisible!==false;
  }catch(e){}
  const tabVisible = (btn)=>{
    const t = btn && btn.dataset ? btn.dataset.tab : '';
    if(t==='long') return longVis;
    if(t==='short') return shortVis;
    return true;
  };
  const tabs = Array.from(document.querySelectorAll('.tab-btn:not(.wtab)'));
  const longGrid = document.getElementById('projectGridLong');
  const shortGrid = document.getElementById('projectGridShort');
  const liveTabs = [];
  tabs.forEach((btn)=>{
    if(!tabVisible(btn)){
      btn.onclick = null;
      btn.onkeydown = null;
      btn.tabIndex = -1;
      btn.setAttribute('aria-hidden','true');
      return;
    }
    btn.tabIndex = 0;
    btn.removeAttribute('aria-hidden');
    liveTabs.push(btn);
  });
  liveTabs.forEach((btn)=>{
    const idx = liveTabs.indexOf(btn);
    btn.onclick = ()=>{
      liveTabs.forEach(b=>{b.classList.remove('active'); b.setAttribute('aria-selected','false'); b.setAttribute('aria-pressed','false')});
      btn.classList.add('active'); btn.setAttribute('aria-selected','true'); btn.setAttribute('aria-pressed','true');
      const tab = btn.dataset.tab;
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(activePreview) hidePreview(activePreview);
      if(tab==='long'){
        shortGrid.style.display='none';
        longGrid.style.display='grid';
        if(!prefersReduced){
          longGrid.style.opacity='0';
          longGrid.style.transition='opacity 200ms';
          requestAnimationFrame(()=>{ longGrid.style.opacity='1'; });
        }
      } else {
        longGrid.style.display='none';
        shortGrid.style.display='grid';
        if(!prefersReduced){
          shortGrid.style.opacity='0';
          shortGrid.style.transition='opacity 200ms';
          requestAnimationFrame(()=>{ shortGrid.style.opacity='1'; });
        }
      }
      try{ if(window.Telemetry) Telemetry.event('FILTER_CHANGE', { tab: tab }); }catch(e){}
      try{
        const viewAll = document.getElementById('viewAllWork');
        if(viewAll) viewAll.setAttribute('href', 'work.html?filter=' + (tab === 'short' ? 'short' : 'long'));
      }catch(_){}
    };
    btn.onkeydown = (e)=>{
      if(e.key!=='ArrowRight' && e.key!=='ArrowLeft') return;
      e.preventDefault();
      const next = e.key==='ArrowRight' ? liveTabs[(idx+1)%liveTabs.length] : liveTabs[(idx-1+liveTabs.length)%liveTabs.length];
      if(next){ next.focus(); next.click(); }
    };
  });
}

function yidOverride(){
  const c = CONTENT;
  return c.showreel?.youtubeId || youtubeIdFromUrl(c.showreel?.youtubeUrl||"");
}

// Work page (work.html) — complete collection, same data/cards/player as
// home. Runs instead of renderSite() when window.WORK_PAGE is set.
//
// PHASE 3 pipeline (no redesign, no schema change):
//   CONFIG → getVisibleProjects() → long/shortVisible gate → classify →
//   active filter → render only resulting cards → bind only rendered cards.
// Work placement is visible-ONLY: homeEnabled/home.enabled NEVER control
// Work (Home and Work stay independently controllable). Config order is
// preserved exactly (no sort, no homeOrder).
function workVisibleProjects(){
  // BASE GATE only. Deliberately ignores homeEnabled / home.enabled /
  // workEnabled: those drive Home placement, never Work placement.
  return getVisibleProjects();
}
// Work format buckets: missing→long, long→long, short→short (verbatim).
// Unknown formats have NO bucket in this two-section layout (no DOM section
// exists for them) — see COUNT/RENDER RESOLUTION in renderWorkPage.
function workFormatBucket(p){
  const f = (p && p.format !== undefined && p.format !== null && p.format !== '') ? p.format : 'long';
  if(f === 'long') return 'long';
  if(f === 'short') return 'short';
  return null;
}
function workFilterMatch(p, f){
  const fmt = p.format || 'long';
  const hay = ((p.category||'') + ' ' + (p.meta||'') + ' ' + (p.title||'')).toLowerCase();
  const adRe = /(^|[\s·\/,;\-—])(ads?|advertisements?|promotional?|promos?|commercials?)([\s·\/,;\-—]|$)/;
  if(f === 'long') return fmt === 'long';
  if(f === 'short') return fmt === 'short';
  if(f === 'ads') return adRe.test(hay);
  if(f === 'other') return fmt !== 'long' && fmt !== 'short' && !adRe.test(hay);
  return true; // all
}
function renderWorkPage(){
  const c = CONTENT;
  if(!c) return;
  if(location.protocol === 'file:'){
    const w = document.getElementById('fileWarn');
    if(w) w.style.display = 'block';
  }
  const title = 'Work — ' + (c.site?.title || ((c.profile?.name || "Portfolio") + " — Portfolio"));
  const pageTitleEl = document.getElementById('pageTitle');
  if(pageTitleEl) pageTitleEl.textContent = title;
  const logoEl = document.getElementById('logo');
  if(logoEl) logoEl.innerHTML = (c.profile?.name || "SAHIL") + "<span>.</span>";
  const gridLong = document.getElementById('workGridLong');
  const gridShort = document.getElementById('workGridShort');
  const secLong = document.getElementById('workSectionLong');
  const secShort = document.getElementById('workSectionShort');
  const emptyEl = document.getElementById('workEmpty');
  const countEl = document.getElementById('workCount');
  const emptyText = ((c.sections||[]).find(s=>s.id==='work')?.settings?.emptyText) || 'No videos in this category yet.';
  // WORK PLACEMENT + LONG/SHORT-VISIBLE gates (Phase 3). Missing flags
  // default to true (visible), matching today's behavior. Exclusion happens
  // BEFORE renderGrid/card creation: disabled buckets never enter DOM, never
  // request thumbnails, never get listeners (no display:none tricks on cards).
  const workSettings = ((c.sections||[]).find(s=>s.id==='work') || {}).settings || {};
  const longVisible = workSettings.longVisible !== false;
  const shortVisible = workSettings.shortVisible !== false;
  // Pill availability: hide the pill of a disabled bucket (All pill always
  // stays). Tabs container hides only when BOTH buckets are off.
  // Bind-after-gate (P1): OFF pills get no listeners/keyboard (inert).
  const wtabVisible = (btn)=>{
    const f = btn && btn.dataset ? btn.dataset.filter : 'all';
    if(f === 'long') return longVisible;
    if(f === 'short') return shortVisible;
    return true;
  };
  try{
    document.querySelectorAll('.wtab').forEach(btn=>{
      const f = btn.dataset.filter;
      if(f === 'long') btn.style.display = longVisible ? '' : 'none';
      if(f === 'short') btn.style.display = shortVisible ? '' : 'none';
      if(!wtabVisible(btn)){ btn.tabIndex = -1; btn.setAttribute('aria-hidden','true'); }
      else { btn.tabIndex = 0; btn.removeAttribute('aria-hidden'); }
    });
    if(!longVisible && !shortVisible){
      const tabsEl = document.querySelector('.work-tabs');
      if(tabsEl) tabsEl.style.display = 'none';
    }
  }catch(e){}
  // Pre-rendered grids (toggle-only filter switches, home setupTabs pattern):
  // full gated longs/shorts are rendered ONCE below (config order preserved,
  // no sort); all/long/short switches only toggle section display — no
  // innerHTML destroy/recreate. Motion interplay: no DOM mutation means the
  // MutationObserver path stays quiet; motion.js onFilterClick already covers
  // non-mutated nodes (instantRevealCard for visible-grid cards + armAll
  // after the fade), so already-revealed cards persist with .is-visible.
  const gatedFull = workVisibleProjects().filter(p => {
    const b = workFormatBucket(p);
    if(b === 'long') return longVisible;
    if(b === 'short') return shortVisible;
    return false; // unknown format: no section exists → exclude from count+render
  });
  const fullLongs = gatedFull.filter(p => workFormatBucket(p) === 'long');
  const fullShorts = gatedFull.filter(p => workFormatBucket(p) === 'short');
  if(gridLong) renderGrid(fullLongs, gridLong);
  if(gridShort) renderGrid(fullShorts, gridShort);
  bindCards(yidOverride());
  let _workFallbackActive = false;
  function paintOne(sec, grid, items, show){
    if(sec) sec.style.display = show ? '' : 'none';
    if(grid) grid.style.display = '';
    void items;
    if(sec){
      const head = sec.querySelector('.work-subhead');
      // Subheads label the groups only in the mixed All view.
      if(head) head.style.display = (show && currentFilter === 'all') ? '' : 'none';
    }
  }
  let currentFilter = 'all';
  function paint(filter){
    currentFilter = filter;
    // COUNT/RENDER RESOLUTION (Phase 3 exception, documented — not silent):
    // pre-change code counted every base-visible item matching the filter in
    // `list` (and in the project count) but only rendered `long`/`short`
    // buckets, so an unknown-format item (e.g. format:"trailer") matching
    // All/Ads/Other was COUNTED yet rendered NOWHERE. Resolution: items with
    // no bucket (workFormatBucket() === null) are excluded from BOTH count
    // and render consistently, AFTER the long/shortVisible gate and BEFORE
    // the active filter. Invariant after gating: list.length ===
    // longs.length + shorts.length, so the count always describes exactly
    // what can render. Known formats are verbatim: missing→long,
    // long→long, short→short. Order preserved (filters only, no sort).
    const list = gatedFull.filter(p => workFilterMatch(p, filter));
    const longs = list.filter(p => workFormatBucket(p) === 'long');
    const shorts = list.filter(p => workFormatBucket(p) === 'short');
    if(filter === 'all' || filter === 'long' || filter === 'short'){
      // Toggle-only path (live pills): pre-rendered grids already hold
      // exactly longs/shorts for these filters (long ⇒ all longs, short ⇒
      // all shorts, all ⇒ both), so only section display changes. If a
      // hidden ads/other fallback render ever dirtied the grids, restore
      // the full grids once before toggling.
      if(_workFallbackActive){
        if(gridLong) renderGrid(fullLongs, gridLong);
        if(gridShort) renderGrid(fullShorts, gridShort);
        _workFallbackActive = false;
      }
      // Format sections show only when they hold items for this filter.
      paintOne(secLong, gridLong, longs,
        (filter === 'all' || filter === 'long') && longs.length > 0);
      paintOne(secShort, gridShort, shorts,
        (filter === 'all' || filter === 'short') && shorts.length > 0);
    } else {
      // Hidden-pill fallback (ads/other): exact render path, verbatim old
      // behavior (render matching bucket, clear empty one), so output is
      // identical even though these pills have no visible UI.
      _workFallbackActive = true;
      const showLong = (filter === 'ads' || filter === 'other') && longs.length > 0;
      const showShort = (filter === 'ads' || filter === 'other') && shorts.length > 0;
      if(secLong) secLong.style.display = showLong ? '' : 'none';
      if(showLong && gridLong) renderGrid(longs, gridLong);
      else if(gridLong) gridLong.innerHTML = '';
      if(secLong){
        const head = secLong.querySelector('.work-subhead');
        if(head) head.style.display = 'none';
      }
      if(secShort) secShort.style.display = showShort ? '' : 'none';
      if(showShort && gridShort) renderGrid(shorts, gridShort);
      else if(gridShort) gridShort.innerHTML = '';
      if(secShort){
        const head = secShort.querySelector('.work-subhead');
        if(head) head.style.display = 'none';
      }
    }
    if(emptyEl){
      if(!list.length){
        emptyEl.textContent = emptyText;
        emptyEl.style.display = '';
      } else {
        emptyEl.textContent = '';
        emptyEl.style.display = 'none';
      }
    }
    if(countEl) countEl.textContent = list.length === 1 ? '1 project' : list.length + ' projects';
    bindCards(yidOverride());
  }
  const wtabsAll = Array.from(document.querySelectorAll('.wtab'));
  const wtabs = wtabsAll.filter(wtabVisible);
  wtabsAll.forEach((btn)=>{
    if(!wtabVisible(btn)) return; // OFF pill: no listeners, no keyboard
  });
  wtabs.forEach((btn)=>{
    const idx = wtabs.indexOf(btn);
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.wtab').forEach(b=>{ if(wtabVisible(b)){ b.classList.remove('active'); b.setAttribute('aria-selected','false'); b.setAttribute('aria-pressed','false'); } });
      btn.classList.add('active');
      btn.setAttribute('aria-selected','true');
      btn.setAttribute('aria-pressed','true');
      paint(btn.dataset.filter || 'all');
      try{ if(window.Telemetry) Telemetry.event('FILTER_CHANGE', { filter: (btn.dataset.filter || 'all') }); }catch(e){}
    });
    btn.addEventListener('keydown', (e)=>{
      if(e.key!=='ArrowRight' && e.key!=='ArrowLeft') return;
      e.preventDefault();
      const next = e.key==='ArrowRight' ? wtabs[(idx+1)%wtabs.length] : wtabs[(idx-1+wtabs.length)%wtabs.length];
      if(next){ next.focus(); next.click(); }
    });
  });
  const footerCfg = c.footer || {};
  const footerTextEl = document.getElementById('footerText');
  if(footerTextEl){
    footerTextEl.textContent = footerCfg.text || `© 2026 ${c.profile?.name||"Sahil"}.`;
  }
  // P2.4 natural: work subheads render normal (Long-form/Short-form stored text verbatim); presentation only, stored values untouched
  try{
    const workSec = (c.sections||[]).find(s=>s.id==='work');
    const subCase = resolveTextCase(workSec?.settings?.subheadCase, globalTextCase(), 'normal');
    document.querySelectorAll('.work-subhead').forEach(h=>{ h.style.textTransform = textCaseToTransform(subCase); });
  }catch(e){}
  // Dead-destination gate (P1, work page): "Let's Talk →" targets contact;
  // hide with hidden/aria-hidden (hero pattern) while contact is OFF.
  try{
    const cSec = (c.sections||[]).find(s=>s.id==='contact');
    const cOff = cSec ? !isVisible(cSec) : false;
    const talk = document.querySelector('.work-cta a[href*="#contact"]');
    if(talk){
      const wrap = talk.closest('.work-cta') || talk;
      if(cOff){
        talk.setAttribute('aria-hidden','true'); talk.tabIndex = -1;
        wrap.setAttribute('hidden',''); wrap.setAttribute('aria-hidden','true'); wrap.style.display='none';
      } else {
        talk.removeAttribute('aria-hidden'); talk.tabIndex = 0;
        wrap.removeAttribute('hidden'); wrap.removeAttribute('aria-hidden'); wrap.style.display='';
      }
    }
  }catch(e){}
  try{
    const q = new URLSearchParams(location.search || '').get('filter') || 'all';
    let initFilter = (q === 'long' || q === 'short') ? q : 'all';
    if(initFilter === 'long' && !longVisible) initFilter = 'all';
    if(initFilter === 'short' && !shortVisible) initFilter = 'all';
    document.querySelectorAll('.wtab').forEach(b=>{
      const on = (b.dataset.filter || 'all') === initFilter;
      if(wtabVisible(b)){
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    });
    paint(initFilter);
  }catch(_){ paint('all'); }
  // Above-fold thumbs (work path): mirror the home render path (first 2
  // long-grid images eager + high fetch priority). renderGrid keeps every
  // other image lazy/async, so below-fold stays lazy.
  try{
    const _wFold = gridLong ? gridLong.querySelectorAll('img') : [];
    _wFold.forEach((img, i)=>{ if(i < 2){ img.loading = 'eager'; img.setAttribute('fetchpriority', 'high'); } });
  }catch(e){}
}

// Startup quality preference — request highest available quality once per
// open (1080p when offered, else the top reported level), then leave the
// player alone so manual selection and YouTube adaptation keep working.
// Pure enhancement: without the IFrame API (offline/blocked) playback is
// exactly as before. Never loops, never re-forces.
var _ytq = null; // {player, token, done}
var _ytqSeq = 0;
function _ytqPickBest(levels){
  if(!levels || !levels.length) return null;
  if(levels.indexOf('hd1080') !== -1) return 'hd1080';
  return levels[0];
}
function _ytqEnsureApi(cb){
  try{
    if(window.YT && window.YT.Player){ cb(true); return; }
    if(window._ytqApiLoading){ window._ytqApiQueue.push(cb); return; }
    window._ytqApiLoading = true;
    window._ytqApiQueue = [cb];
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function(){
      try{ if(prev) prev(); }catch(_){}
      var q = window._ytqApiQueue || [];
      window._ytqApiQueue = [];
      window._ytqApiLoading = false;
      q.forEach(function(fn){ try{ fn(!!(window.YT && window.YT.Player)); }catch(_){} });
    };
    var tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    tag.onerror = function(){
      var q = window._ytqApiQueue || [];
      window._ytqApiQueue = [];
      window._ytqApiLoading = false;
      q.forEach(function(fn){ try{ fn(false); }catch(_){} });
    };
    document.head.appendChild(tag);
    setTimeout(function(){
      if(window._ytqApiLoading && !(window.YT && window.YT.Player)){
        var q = window._ytqApiQueue || [];
        window._ytqApiQueue = [];
        window._ytqApiLoading = false;
        q.forEach(function(fn){ try{ fn(false); }catch(_){} });
      }
    }, 8000);
  }catch(_){ try{ cb(false); }catch(_){} }
}
function _ytqRequestOnce(player, token){
  try{
    var cur = window._ytq;
    if(!cur || cur.token !== token || cur.done) return;
    cur.done = true;
    var levels = player.getAvailableQualityLevels
      ? player.getAvailableQualityLevels() : [];
    var best = _ytqPickBest(levels);
    if(best && player.setPlaybackQuality) player.setPlaybackQuality(best);
  }catch(_){}
}
function YTQualityEnhance(iframeEl){
  if(!iframeEl) return;
  var token = (++_ytqSeq) + ':' + (iframeEl.getAttribute('data-youtube-id') || '');
  _ytqEnsureApi(function(ok){
    if(!ok) return;
    try{
      if(!document.contains(iframeEl)) return; // already closed
      var player = new YT.Player(iframeEl, {events: {
        // Fast-start race cover: if already PLAYING when the API binds,
        // the state-change event may never re-fire for this start.
        onReady: function(){
          try{
            if(player.getPlayerState && player.getPlayerState() === 1){
              _ytqRequestOnce(player, token);
            }
          }catch(_){}
        },
        onStateChange: function(ev){
          if(!ev || ev.data !== 1) return; // 1 = PLAYING
          _ytqRequestOnce(player, token);
        }
      }});
      window._ytq = {player: player, token: token, done: false};
    }catch(_){}
  });
}
function YTQualityTeardown(){
  try{
    if(window._ytq && window._ytq.player && window._ytq.player.destroy){
      window._ytq.player.destroy();
    }
  }catch(_){}
  window._ytq = null;
}

// Video viewer — ONE native YouTube iframe only, minimal shell, ratio-aware
// Tracks the active resize listener so EVERY close path (button, backdrop,
// Escape) and every second-open tears it down — no leaked handlers/players.
var _activeVideoResize = null;
var _activeMsgHandler = null;
var _activeVideoTimer = null;
function teardownVideoHandlers(){
  try{ YTQualityTeardown(); }catch(_){}
  if(_activeVideoResize){ try{ window.removeEventListener('resize', _activeVideoResize); }catch(_){} _activeVideoResize = null; }
  if(_activeMsgHandler){ try{ window.removeEventListener('message', _activeMsgHandler); }catch(_){} _activeMsgHandler = null; }
  if(_activeVideoTimer){ try{ clearTimeout(_activeVideoTimer); }catch(_){} _activeVideoTimer = null; }
}
function playVideo(youtubeUrl, youtubeId, format, title, thumb, desc){
  let yid = (youtubeId && /^[A-Za-z0-9_-]{11}$/.test(youtubeId)) ? youtubeId : youtubeIdFromUrl(youtubeId || youtubeUrl || "");
  if(!yid) yid = youtubeIdFromUrl(youtubeUrl || "");
  const url = youtubeUrl || (yid ? ("https://www.youtube.com/watch?v=" + yid) : "");
  const isShort = format === 'short';
  const displayTitle = (title || (isShort ? "Short" : "Video")).replace(/</g,'&lt;');
  const displayTitleAttr = (title || (isShort ? "Short" : "Video")).replace(/"/g,'&quot;');

  const box = document.getElementById('lightboxContent');
  if(box){
    box.className = 'lightbox-content';
    box.style.aspectRatio = 'auto';
    box.style.width = 'auto';
    box.style.height = 'auto';
    box.style.maxWidth = 'none';
    box.style.maxHeight = 'none';
    box.style.background = 'transparent';
    box.style.boxShadow = 'none';
    box.style.borderRadius = '0';
    box.style.padding = '0';
    box.style.display = 'flex';
    box.style.alignItems = 'center';
    box.style.justifyContent = 'center';
  }

  if(!yid || yid.length !== 11){
    const errHtml = `
      <div class="video-viewer" style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:24px;max-width:min(92vw,480px);background:#111113;border-radius:16px;">
        <p style="color:#fafafa;font-weight:600;">Video unavailable here.</p>
        ${url ? `<a href="${url}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;background:#facc15;color:#000;padding:10px 18px;border-radius:999px;font-weight:600;font-size:13px;text-decoration:none">Watch on YouTube ↗</a>` : ``}
        <button onclick="closeLightbox()" style="background:none;border:none;color:#a1a1aa;font-size:13px;cursor:pointer;min-height:44px;min-width:44px">Close</button>
      </div>`;
    // Error-over-open: tear down any live player/handlers before replacing
    // content (single-player invariant holds for the fallback modal too).
    if(document.getElementById('lightbox')?.classList.contains('open')){
      try{ teardownVideoHandlers(); }catch(_){}
      const oldFrame = document.getElementById('lightboxContent')?.querySelector('iframe');
      if(oldFrame){ try{ oldFrame.src='about:blank'; }catch(_){} oldFrame.remove(); }
    }
    openLightbox(errHtml);
    return;
  }

  if(document.getElementById('lightbox')?.classList.contains('open')){
    try{ teardownVideoHandlers(); }catch(_){}
    const oldFrame = document.getElementById('lightboxContent')?.querySelector('iframe');
    if(oldFrame){ try{ oldFrame.src='about:blank'; }catch(_){} oldFrame.remove(); }
  }

  let ytOrigin = '';
  try{
    if(/^https?:$/.test(window.location.protocol) && window.location.origin && window.location.origin !== 'null'){
      ytOrigin = '&origin=' + encodeURIComponent(window.location.origin);
    }
  }catch(_){}
  const playerHtml = `<iframe data-youtube-id="${yid}" src="https://www.youtube-nocookie.com/embed/${yid}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1${ytOrigin}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="YouTube video player — ${displayTitleAttr}" style="position:absolute;inset:0;width:100%;height:100%;border:none;background:#000;border-radius:8px"></iframe>`;

  const stageStyle = isShort
    ? 'position:relative;overflow:hidden;background:#0a0a0b;border:1px solid rgba(255,255,255,.05);border-radius:8px;box-shadow:0 24px 64px rgba(0,0,0,.55);width:min(92vw,420px);aspect-ratio:9/16;display:flex;align-items:center;justify-content:center;'
    : 'position:relative;overflow:hidden;background:#0a0a0b;border:1px solid rgba(255,255,255,.05);border-radius:8px;box-shadow:0 24px 64px rgba(0,0,0,.55);width:min(92vw,1200px);aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;';

  const modalHtml = `
    <div class="video-viewer" style="position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;background:transparent;border-radius:0;padding:12px;box-shadow:none;max-width:none;max-height:none;">
      <div style="display:flex;justify-content:flex-end;align-items:center;width:100%;flex-shrink:0;">
        <button onclick="closeLightbox()" aria-label="Close video" style="width:40px;height:40px;min-width:40px;min-height:40px;border-radius:50%;background:rgba(10,10,11,.6);backdrop-filter:none;border:1px solid rgba(255,255,255,.12);box-shadow:0 4px 12px rgba(0,0,0,.35);color:#fff;display:grid;place-items:center;font-size:15px;cursor:pointer;flex-shrink:0;">✕</button>
      </div>
      <div class="video-stage" data-format="${isShort ? 'short' : 'long'}" style="${stageStyle};">
        <div class="video-spinner" style="position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;z-index:1;background:transparent;">
          <div style="width:28px;height:28px;border-radius:50%;border:2px solid rgba(255,255,255,.15);border-top-color:rgba(255,255,255,.65);animation:videoSpin .8s linear infinite;"></div>
        </div>
        <div style="position:absolute;inset:0;">
          ${playerHtml}
        </div>
        <div class="video-fallback" style="display:none;position:absolute;inset:0;background:#000;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;z-index:2">
          <p style="color:#fafafa;font-weight:600;margin-bottom:6px">Video unavailable here.</p>
          <a href="${url}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;background:#facc15;color:#000;padding:10px 18px;border-radius:999px;font-weight:600;font-size:13px;text-decoration:none">Watch on YouTube ↗</a>
        </div>
      </div>
    </div>
  `;

  openLightbox(modalHtml);
  try{ if(window.Telemetry) Telemetry.event('VIDEO_OPEN', { format: (isShort ? 'short' : 'long') }); }catch(e){}

  // Ratio-aware sizing: viewport → available → video ratio → ideal size (hug video, no giant empty)
  try{
    const stage = box?.querySelector('.video-stage');
    if(stage){
      const isShortStage = stage.dataset.format === 'short';
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const availableWidth = Math.min(1200, Math.floor(vw * 0.92));
      const availableHeight = Math.floor(vh * 0.9) - 24;
      let width, height;
      if(isShortStage){
        height = Math.min(availableHeight, availableWidth * 16/9);
        height = Math.max(320, Math.min(height, vh * 0.85));
        width = height * 9/16;
        if(width > availableWidth){
          width = availableWidth;
          height = width * 16/9;
        }
      } else {
        width = Math.min(availableWidth, availableHeight * 16/9, 1200);
        height = width * 9/16;
        if(height > availableHeight){
          height = availableHeight;
          width = height * 16/9;
        }
      }
      stage.style.width = Math.round(width) + 'px';
      stage.style.height = Math.round(height) + 'px';
      stage.style.maxWidth = '100%';
      stage.style.maxHeight = 'none';
      stage.style.marginInline = 'auto';
      const roHandler = () => {
        try{ clearTimeout(stage._resizeTimer); }catch(_){}
        try{ clearTimeout(_activeVideoTimer); }catch(_){}
        stage._resizeTimer = _activeVideoTimer = setTimeout(()=>{
          try{
            const vw2 = window.innerWidth;
            const vh2 = window.innerHeight;
            const aw2 = Math.min(1200, Math.floor(vw2 * 0.92));
            const ah2 = Math.floor(vh2 * 0.9) - 24;
            let w2,h2;
            if(isShortStage){
              h2 = Math.min(ah2, aw2 * 16/9);
              h2 = Math.max(300, Math.min(h2, vh2 * 0.88));
              w2 = h2 * 9/16;
              if(w2 > aw2){ w2=aw2; h2=w2*16/9; }
            } else {
              w2 = Math.min(aw2, ah2 * 16/9, 1200);
              h2 = w2 * 9/16;
              if(h2 > ah2){ h2=ah2; w2=h2*16/9; }
            }
            const st = box?.querySelector('.video-stage');
            if(st && document.getElementById('lightbox')?.classList.contains('open')){
              st.style.width = Math.round(w2)+'px';
              st.style.height = Math.round(h2)+'px';
            } else {
              window.removeEventListener('resize', roHandler);
            }
          }catch(e){}
        }, 100);
      };
      // Single live resize handler: replace any prior one before adding.
      // teardownVideoHandlers()/closeLightbox own the only removal paths, so
      // window.closeLightbox stays a stable reference (no per-open wrapper
      // stacking on second-open).
      if(_activeVideoResize && _activeVideoResize !== roHandler){ try{ window.removeEventListener('resize', _activeVideoResize); }catch(_){} }
      try{ clearTimeout(_activeVideoTimer); }catch(_){}
      _activeVideoTimer = null;
      window.addEventListener('resize', roHandler);
      _activeVideoResize = roHandler;
    }
  }catch(e){}

  const playerEl = box?.querySelector('iframe');
  const fallback = box?.querySelector('.video-fallback');
  let fallbackShown = false;
  function showFallback(){
    if(fallbackShown) return;
    fallbackShown = true;
    const ifr = box?.querySelector('iframe');
    if(ifr) ifr.style.display='none';
    if(fallback) fallback.style.display='flex';
  }
  if(playerEl){
    playerEl.onerror = showFallback;
    // VIDEO_READY semantics: iframe `load` observed (once). NOT playback
    // started, NOT video watched — player state belongs in the lab.
    try{ var _hideSpin=function(){ try{ var _sp=box?box.querySelector('.video-spinner'):null; if(_sp) _sp.style.display='none'; }catch(e){} }; if(window.Telemetry) playerEl.addEventListener('load', function(){ _hideSpin(); try{ Telemetry.event('VIDEO_READY', {}); }catch(e){} }, { once: true }); else playerEl.addEventListener('load', function(){ _hideSpin(); }, { once: true }); }catch(e){}
    const msgHandler = (e)=>{
      try{
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if(data && data.event === 'onError') showFallback();
      }catch(_){}
    };
    // Late-error path: stay subscribed while the modal is open (YouTube can
    // post onError well after load); torn down in closeLightbox on every
    // close path, and replaced on every second-open (no 5s window, no leak).
    if(_activeMsgHandler){ try{ window.removeEventListener('message', _activeMsgHandler); }catch(_){} _activeMsgHandler = null; }
    window.addEventListener('message', msgHandler);
    _activeMsgHandler = msgHandler;
  }
  try{ YTQualityEnhance(box?.querySelector('iframe')); }catch(_){}
}

document.getElementById('menuBtn')?.addEventListener('click', ()=> document.getElementById('mobileMenu').classList.toggle('open'));
document.getElementById('mobileMenu')?.addEventListener('click', (e)=>{ if(e.target && e.target.closest && e.target.closest('a')) document.getElementById('mobileMenu').classList.remove('open'); });
// V3.0 nav drawer: ESC + outside-click (backdrop) close, no push (drawer stays absolute overlay, CSS only)
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape'){ document.getElementById('mobileMenu')?.classList.remove('open'); } });
document.addEventListener('click', (e)=>{ const m=document.getElementById('mobileMenu'); if(!m||!m.classList.contains('open')) return; if(e.target.closest && e.target.closest('.nav')) return; m.classList.remove('open'); });

const lightbox = document.getElementById('lightbox');
const lightboxContent = document.getElementById('lightboxContent');
let _prevFocus = null;
let _scrollY = 0;
function openLightbox(html){
  const alreadyOpen = lightbox.classList.contains('open');
  if(!alreadyOpen){
    _prevFocus = document.activeElement;
    _scrollY = window.scrollY;
    const sbWidth = window.innerWidth - document.documentElement.clientWidth;
    lightboxContent.innerHTML = html;
    lightbox.classList.add('open');
    document.body.style.overflow='hidden';
    if(sbWidth>0){
      document.body.style.paddingRight = sbWidth+'px';
      const nav=document.querySelector('.nav');
      if(nav) nav.style.paddingRight = sbWidth+'px';
    }
    document.body.style.position='fixed';
    document.body.style.top=`-${_scrollY}px`;
    document.body.style.width='100%';
  } else {
    // Re-open over an open modal (second video / error fallback): swap
    // content only, preserve the original scroll lock and focus return.
    lightboxContent.innerHTML = html;
    lightbox.classList.add('open');
  }
  // focus close
  requestAnimationFrame(()=>{
    const btn = lightboxContent.querySelector('button');
    if(btn) btn.focus();
    else lightboxContent.focus();
  });
}
function closeLightbox(){
  // Idempotent: Escape/backdrop/visibility handlers all funnel here, so a
  // stray Escape with no modal must be a no-op (never scroll or refocus).
  if(!lightbox.classList.contains('open')) return;
  try{ if(window.Telemetry && lightboxContent.querySelector('iframe')) Telemetry.event('VIDEO_CLOSE', {}); }catch(e){}
  // Single teardown path: helper owns YT player + resize + message + timer.
  try{ teardownVideoHandlers(); }catch(_){}
  const iframe = lightboxContent.querySelector('iframe');
  if(iframe){ try{ iframe.src='about:blank'; }catch(_){} iframe.remove(); }
  lightboxContent.innerHTML='';
  lightbox.classList.remove('open');
  document.body.style.overflow='';
  document.body.style.paddingRight='';
  const nav=document.querySelector('.nav');
  if(nav) nav.style.paddingRight='';
  document.body.style.position='';
  document.body.style.top='';
  document.body.style.width='';
  window.scrollTo(0, _scrollY);
  lightboxContent.className='lightbox-content';
  lightboxContent.removeAttribute('style');
  // (V3: dead #lightboxClose restore removed — element never exists)
  if(activePreview) hidePreview(activePreview);
  if(_prevFocus && _prevFocus.focus) try{ _prevFocus.focus(); }catch(_){}
}
lightbox?.addEventListener('click', e=>{ if(e.target===lightbox) closeLightbox(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeLightbox(); });
// Background playback: closing the tab/switching apps tears down the player
// via the existing closeLightbox path (resize listener, iframe, scroll lock).
// Scoped to an open lightbox so hidden-tab changes with no modal are no-ops.
document.addEventListener('visibilitychange', ()=>{ if(document.hidden && lightbox?.classList.contains('open')) closeLightbox(); });

function bindCards(heroId){
  // Bind-after-gate (P0/P1): OFF showreel gets no src/iframe/player, no
  // listeners, no keyboard presence. Gate mirrors renderSite media logic:
  // hero visible AND showreel content visible AND showreel section visible
  // AND hero display.media not OFF. Missing flags default true (contract).
  const heroOff = (()=>{
    try{
      if(CONTENT?.hero?.visible===false) return true;
      if((CONTENT?.hero?.display?.media)===false) return true;
      if(CONTENT?.showreel?.visible===false) return true;
      const ss = ((CONTENT?.sections||[]).find(s=>s.id==='showreel'));
      if(ss && !isVisible(ss)) return true;
      return false;
    }catch(e){ return false; }
  })();
  const heroBtn = document.getElementById('playShowreel');
  const heroCard = document.getElementById('heroCard');
  const heroUrl = CONTENT?.showreel?.youtubeUrl || (heroId ? `https://www.youtube.com/watch?v=${heroId}` : "");
  const heroThumb = CONTENT?.showreel?.thumbnail || "";
  const heroTitle = CONTENT?.showreel?.title || CONTENT?.showreel?.label || "Showreel";
  function onHeroClick(e){
    e.preventDefault();
    if(!heroId) return;
    playVideo(heroUrl, heroId, 'long', heroTitle, heroThumb);
  }
  if(heroOff || !heroId){
    if(heroBtn){ heroBtn.onclick = null; heroBtn.tabIndex = -1; heroBtn.setAttribute('aria-hidden','true'); }
    if(heroCard){ heroCard.onclick = null; heroCard.onkeydown = null; heroCard.tabIndex = -1; heroCard.setAttribute('aria-hidden','true'); }
  } else {
    if(heroBtn){ heroBtn.onclick = onHeroClick; heroBtn.tabIndex = 0; heroBtn.removeAttribute('aria-hidden'); }
    if(heroCard){
      heroCard.onclick = onHeroClick;
      heroCard.onkeydown = e=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); onHeroClick(e); } };
      heroCard.setAttribute('role','button'); heroCard.setAttribute('tabindex','0'); heroCard.style.cursor='pointer';
      heroCard.removeAttribute('aria-hidden');
    }
  }

  document.querySelectorAll('.card').forEach(card=>{
    if(card.dataset.bound) return; card.dataset.bound="1";
    card.addEventListener('click', ()=>{
      const yid = card.dataset.youtubeId || "";
      const isVideo = yid && yid.length===11;
      if(isVideo){
        const url = card.dataset.youtubeUrl || "";
        const format = card.dataset.format || 'long';
        const title = card.dataset.title || "";
        const thumb = card.dataset.thumb || "";
        const desc = card.dataset.desc || "";
        playVideo(url, yid, format, title, thumb, desc);
      } else {
        const title = card.dataset.title || "";
        const desc = card.dataset.desc || "";
        const img = card.querySelector('img');
        const src = img?.dataset.custom || img?.src || "";
        if(src && src !== PLACEHOLDER_SVG) openLightbox(`<div style="padding:16px;background:#111113;color:#fafafa;display:flex;justify-content:space-between;align-items:center"><h3>${title.replace(/</g,'&lt;')}</h3><button onclick="closeLightbox()" style="background:none;border:none;color:#a1a1aa;font-size:18px;cursor:pointer;min-height:44px;min-width:44px">✕</button></div><img src="${src}" alt="" style="max-width:100%;max-height:80vh;object-fit:contain"><p style="padding:12px 16px;color:#a1a1aa;font-size:13px">${desc.replace(/</g,'&lt;')}</p>`);
      }
    });
    card.addEventListener('keydown', e=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); card.click(); } });
  });
}

// SCROLL-SPY (one system) — sections [home,work,about,services], one activeSection, one updateActiveNav.
// Observer: threshold array + rootMargin 35-45% band (-35% top / -55% bottom = 10% middle band).
// Strongest-section wins + hysteresis (0.12) prevents boundary flicker; nav updates only on change.
// Home maps to #home if present else #hero (checked first — #hero exists, no new id added). Hidden sections skipped.
// Click+hash share this path: delegated smooth scroll (reduced-motion instant), passive hash sync (replaceState, no loops),
// initial #hash lands after layout settles, footer back-to-top reuses same delegated handler (no separate logic).
let activeSection = null;
let _spyObserver = null;
let _spyRatios = {};
let _spySyncing = false;
function updateActiveNav(id){
  if(!id || id === activeSection) return;
  activeSection = id;
  try{
    const toSpyId = (a)=>{
      const h = (a.getAttribute('href') || '').trim();
      if(!h) return null;
      if(h === 'index.html' || h === './' || h === '/') return 'home';
      if(h === 'work.html' || h.indexOf('work.html') === 0) return 'work';
      const hi = h.indexOf('#');
      if(hi !== -1){
        const base = h.slice(0, hi);
        const hash = h.slice(hi + 1);
        if(base === '' || base === 'index.html' || base === './'){
          if(hash === 'hero' || hash === 'home' || hash === '') return 'home';
          if(hash === 'work') return 'work';
          if(hash === 'about') return 'about';
          if(hash === 'services') return 'services';
          return null;
        }
        return null;
      }
      return null;
    };
    document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(a=>{
      const sid = toSpyId(a);
      if(sid && sid === id){
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      } else if(sid){
        a.classList.remove('active');
        a.removeAttribute('aria-current');
      }
    });
    const hashFor = { home: (document.getElementById('home') ? 'home' : 'hero'), work: 'work', about: 'about', services: 'services' }[id];
    if(hashFor && ('#' + hashFor) !== location.hash && !_spySyncing){
      try{ history.replaceState(null, '', '#' + hashFor); }catch(_){}
    }
  }catch(_){}
}
function setupSectionTracking(){
  try{
    if(window.WORK_PAGE) return;
    if(_spyObserver){ try{ _spyObserver.disconnect(); }catch(_){} _spyObserver = null; }
    _spyRatios = {};
    const homeEl = document.getElementById('home') || document.getElementById('hero');
    const defs = [
      ['home', homeEl],
      ['work', document.getElementById('work')],
      ['about', document.getElementById('about')],
      ['services', document.getElementById('services')]
    ].filter(entry=>{
      const el = entry[1];
      if(!el) return false;
      try{
        if(el.style && el.style.display === 'none') return false;
        if(el.hasAttribute && el.hasAttribute('hidden')) return false;
      }catch(_){}
      return true;
    });
    if(!defs.length) return;
    const applyInitialHash = ()=>{
      try{
        const h = (location.hash || '').replace('#', '');
        const map = { home: 'home', hero: 'home', work: 'work', about: 'about', services: 'services' };
        if(map[h]) updateActiveNav(map[h]);
        else if(!activeSection) updateActiveNav('home');
      }catch(_){}
    };
    _spyObserver = new IntersectionObserver((entries)=>{
      try{
        entries.forEach(en=>{
          const sid = en.target && en.target.dataset ? en.target.dataset.spyId : null;
          if(!sid) return;
          _spyRatios[sid] = { ratio: en.intersectionRatio || 0, isIntersecting: !!en.isIntersecting };
        });
        let best = null, bestRatio = -1;
        for(const k in _spyRatios){
          const r = _spyRatios[k];
          if(r.isIntersecting && r.ratio > bestRatio){ best = k; bestRatio = r.ratio; }
        }
        if(!best) return;
        if(best === activeSection) return;
        const cur = _spyRatios[activeSection];
        if(cur && cur.isIntersecting && (bestRatio - cur.ratio) < 0.12) return;
        _spySyncing = true;
        try{ updateActiveNav(best); }finally{ _spySyncing = false; }
      }catch(_){}
    }, { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: '-35% 0px -55% 0px' });
    defs.forEach(entry=>{
      try{ entry[1].dataset.spyId = entry[0]; _spyRatios[entry[0]] = { ratio: 0, isIntersecting: false }; _spyObserver.observe(entry[1]); }catch(_){}
    });
    if(!window._spyClickBound){
      window._spyClickBound = true;
      document.addEventListener('click', (e)=>{
        try{
          const a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
          if(!a) return;
          const href = a.getAttribute('href') || '';
          if(href.length < 2) return;
          const target = document.getElementById(href.slice(1));
          if(!target) return;
          e.preventDefault();
          const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          try{ target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); }catch(_){ try{ target.scrollIntoView(); }catch(_){} }
          try{ history.replaceState(null, '', href); }catch(_){}
          try{ document.getElementById('mobileMenu')?.classList.remove('open'); }catch(_){}
        }catch(_){}
      });
      window.addEventListener('hashchange', ()=>{
        if(_spySyncing) return;
        try{
          const h = (location.hash || '').replace('#', '');
          if(!h) return;
          const t = document.getElementById(h);
          if(!t) return;
          const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          try{ t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); }catch(_){}
        }catch(_){}
      });
      const landHash = ()=>{
        try{
          const h = (location.hash || '').replace('#', '');
          if(!h){ applyInitialHash(); return; }
          const t = document.getElementById(h);
          if(!t){ applyInitialHash(); return; }
          requestAnimationFrame(()=>{ requestAnimationFrame(()=>{
            try{ t.scrollIntoView({ behavior: 'auto', block: 'start' }); }catch(_){}
            applyInitialHash();
          }); });
        }catch(_){}
      };
      if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ()=>{ setTimeout(landHash, 120); }, { once: true });
      else setTimeout(landHash, 120);
      if(!(location.hash || '').replace('#', '')) applyInitialHash();
    } else {
      applyInitialHash();
    }
  }catch(_){}
}

document.getElementById('contactForm')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const form = e.target;
  const note = document.getElementById('formNote');
  // Clear prior errors
  form.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
  form.querySelectorAll('.form-error').forEach(el=>el.remove());
  const d = new FormData(form);
  const name = (d.get('name')||"").toString().trim();
  const emailVal = (d.get('email')||"").toString().trim();
  const service = (d.get('service')||"").toString();
  const message = (d.get('message')||"").toString().trim();
  const cfg = CONTENT?.contact?.form || {};
  let firstInvalid = null;
  const flag = (fieldName, msg)=>{
    const el = form.querySelector(`[name="${fieldName}"]`);
    if(!el) return;
    el.setAttribute('aria-invalid','true');
    const err = document.createElement('p');
    err.className = 'form-error';
    err.textContent = msg;
    el.insertAdjacentElement('afterend', err);
    if(!firstInvalid) firstInvalid = el;
  };
  if(cfg.display?.name!==false && !name) flag('name','Please enter your name.');
  if(cfg.display?.email!==false && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) flag('email','Please enter a valid email.');
  // P0 placeholder-option validation: empty service never submits (placeholder is
  // value="" disabled selected). Inline, non-destructive, preserves data, no alert().
  // Visible check so hidden-service state (no selectable services) still submits.
  const _svcEl = form.querySelector('[name="service"]');
  const _svcWrap = _svcEl ? (_svcEl.closest('div') || _svcEl) : null;
  const _svcVisible = !!_svcEl && _svcEl.style.display!=='none' && (!_svcWrap || _svcWrap.style.display!=='none') && cfg.display?.service!==false;
  if(_svcVisible && !service) flag('service','Please choose a service.');
  if(cfg.messageRequired && !message) flag('message','Please tell me about the project.');
  if(firstInvalid){ try{ if(window.Telemetry) Telemetry.event('CONTACT_ERROR', {}); }catch(e){} firstInvalid.focus(); return; }
  // Canonical contact identity (owner decision: gmail). No contradictory fallback.
  const email = (CONTENT?.contact?.email || "").trim() || "sahilvasavahere@gmail.com";
  const subject = encodeURIComponent(`Portfolio inquiry: ${service || 'General'} — from ${name || 'Website visitor'}`);
  const body = encodeURIComponent(`Name: ${name}\nEmail: ${emailVal}\nService: ${service || 'Not specified'}\n\n${message}`);
  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  if(note) note.textContent = "Opening email app... or email directly: " + email;
  try{ if(window.Telemetry) Telemetry.event('CONTACT_SUBMIT', {}); }catch(e){}
});

if(CONTENT){
  if(window.WORK_PAGE && typeof renderWorkPage === 'function') renderWorkPage();
  else renderSite();
  try{ setupSectionTracking(); }catch(_){}
} else document.addEventListener('DOMContentLoaded', ()=>{ renderSite(); try{ setupSectionTracking(); }catch(_){} });

// TELEMETRY SCAFFOLD v1 (inert-by-default) — delete this IIFE + telemetry.js
// <script> tag to remove. Inert proof: returns before Telemetry.init unless
// CONTENT.telemetry.enabled===true AND endpoint non-empty; Telemetry.init
// itself early-returns on DNT/sample-out with zero timers/network. Every hook
// below is a single guarded call that cannot alter existing control flow.
(function(){
  try{
    var _t = (typeof CONTENT !== 'undefined' && CONTENT) ? CONTENT.telemetry : null;
    if(!_t || _t.enabled !== true || !_t.endpoint) return;
    if(!window.Telemetry || !Telemetry.init(_t)) return;
    try{ Telemetry.event('PAGE_VIEW', {}); }catch(e){}
    try{ Telemetry.performanceSample(); }catch(e){}
    try{
      document.querySelectorAll('.hero-cta a, #viewAllWork, .work-cta a').forEach(function(el){
        try{ el.addEventListener('click', function(){ try{ Telemetry.event('CTA_CLICK', { label: (el.textContent || '').slice(0, 80) }); }catch(e){} }); }catch(e){}
      });
    }catch(e){}
    try{
      window.addEventListener('error', function(ev){ try{ Telemetry.error('window.error', (ev && ev.message) || 'error'); }catch(e){} });
      window.addEventListener('unhandledrejection', function(ev){ try{ Telemetry.error('unhandledrejection', (ev && ev.reason && (ev.reason.message || String(ev.reason))) || 'rejection'); }catch(e){} });
    }catch(e){}
  }catch(e){}
})();

window.handleThumbError = handleThumbError;
window.thumbQualityCheck = thumbQualityCheck;
window.closeLightbox = closeLightbox;

// HOVER-POSITION FIX (2026-09-11) — reset-only, no highlight element, no coords.
// All hovers are per-element CSS :hover (the browser clears each one on
// pointerleave automatically — nothing shared to go stale). This only resets
// transient UI chrome on page/section/viewport change so nothing reads as a
// stale highlight elsewhere (menu backdrop after navigating to Services/About,
// preview flag after rapid tab switches or leaving the page). No layout, data,
// filter, playback, ESC, menu, form, or link behavior changed.
(function(){
  function resetHoverChrome(){
    try{ if(typeof hidePreview === 'function' && typeof activePreview !== 'undefined' && activePreview) hidePreview(activePreview); }catch(_){}
    var m = document.getElementById('mobileMenu');
    if(m) m.classList.remove('open');
  }
  window.addEventListener('hashchange', resetHoverChrome);
  window.addEventListener('pagehide', resetHoverChrome);
  document.addEventListener('visibilitychange', function(){ if(document.hidden) resetHoverChrome(); });
  var _rzT = null;
  window.addEventListener('resize', function(){
    if(_rzT) clearTimeout(_rzT);
    _rzT = setTimeout(function(){
      try{
        var btn = document.getElementById('menuBtn');
        if(btn && getComputedStyle(btn).display === 'none') resetHoverChrome();
      }catch(_){}
    }, 120);
  });
})();
