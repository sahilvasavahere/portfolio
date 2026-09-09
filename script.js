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
    img.src = getYouTubeThumb(yid, "hq");
    return;
  }
  if(src.includes("/hqdefault.jpg") && yid){
    img.dataset.tried = "hq";
    img.src = getYouTubeThumb(yid, "mq");
    return;
  }
  if(src.includes("mqdefault") || src.includes("maxres")){
    img.dataset.tried = "mq";
    img.onerror = null;
    img.src = PLACEHOLDER_SVG;
    return;
  }
  img.onerror = null;
  img.src = PLACEHOLDER_SVG;
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
      if(sec.visible===false){
        el.style.display='none';
        el.setAttribute('aria-hidden','true');
      } else {
        el.style.display='';
        el.removeAttribute('aria-hidden');
      }
    });
  }
  // Navigation — separate showInNav from visibility (control center)
  const navIds = sections.filter(s=>{
    const isNav = s.showInNav !== undefined ? s.showInNav : !['hero','showreel'].includes(s.id);
    return isNav && s.visible!==false;
  }).map(s=>s.id);
  // Also include custom sections if they have been injected
  const customRoot = document.getElementById('customSectionsRoot');
  if(customRoot){
    // render all custom sections (visible or not, hidden will be display:none)
    sections.filter(s=> s.type==='custom').forEach(sec=>{
      let el = document.getElementById(sec.id);
      const isVisible = sec.visible!==false;
      if(!el){
        el = document.createElement('section');
        el.id = sec.id;
        el.className = 'section container';
        el.setAttribute('data-section','custom');
        customRoot.appendChild(el);
      }
      el.style.display = isVisible ? '' : 'none';
      if(isVisible){
        // build content from elements
        const elements = (sec.elements||[]).filter(e=> e.visible!==false).sort((a,b)=>(a.order||0)-(b.order||0));
        let html = `<div class="section-head"><h2>${(sec.title||'Section').replace(/</g,'&lt;')}</h2></div>`;
        if(elements.length){
          html += elements.map(el=>{
            const t = (el.type||'paragraph').toLowerCase();
            const content = (el.content||'').replace(/</g,'&lt;');
            const url = (el.url||'').replace(/"/g,'&quot;');
            const alt = (el.alt||'').replace(/"/g,'&quot;');
            if(t==='heading') return `<h3 style="font-family:Space Grotesk,sans-serif;font-size:clamp(20px,3vw,28px);margin:12px 0">${content}</h3>`;
            if(t==='paragraph') return `<p style="color:#a1a1aa;margin:8px 0;line-height:1.6">${content}</p>`;
            if(t==='image' && el.url) return `<div style="margin:12px 0;border-radius:12px;overflow:hidden;border:1px solid #252529"><img src="${url}" alt="${alt}" style="width:100%;height:auto;display:block;object-fit:cover" loading="lazy" onerror="this.style.display='none'"></div>`;
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
      if(!isVisible && el) el.innerHTML='';
    });
  }
  // Build nav links
  const navContainer = document.querySelector('.nav-links');
  const mobileMenu = document.getElementById('mobileMenu');
  if(navContainer){
    const labelMap = {work:'Work', about:'About', services:'Services', contact:'Contact'};
    const contactVisible = navIds.includes('contact');
    let html = '';
    // Respect order: navIds already sorted by sections order via filter on sorted sections
    navIds.forEach(id=>{
      if(id==='contact') return; // handle as button last
      const sec = sections.find(s=>s.id===id);
      const label = (sec?.title) || labelMap[id] || id;
      const href = (sec?.href && sec.href.trim()) ? sec.href.trim() : `#${id}`;
      const isExternal = /^https?:\/\//.test(href) || href.startsWith('mailto:') || href.startsWith('tel:');
      const target = isExternal ? ' target="_blank" rel="noopener"' : '';
      html += `<a href="${href.replace(/"/g,'&quot;')}"${target}>${label.replace(/</g,'&lt;')}</a>`;
    });
    if(contactVisible){
      const contactSec = sections.find(s=>s.id==='contact');
      const contactHref = (contactSec?.href && contactSec.href.trim()) ? contactSec.href.trim() : '#contact';
      const isExt = /^https?:\/\//.test(contactHref) || contactHref.startsWith('mailto:');
      const target = isExt ? ' target="_blank" rel="noopener"' : '';
      const contactLabel = contactSec?.title || 'Contact';
      // Contact as button style unless external
      if(isExt){
        html += `<a href="${contactHref.replace(/"/g,'&quot;')}"${target}>${contactLabel.replace(/</g,'&lt;')}</a>`;
      } else {
        html += `<a href="#contact" class="btn btn-sm">${contactLabel.replace(/</g,'&lt;')}</a>`;
      }
    }
    if(!navIds.length){
      html = `<span style="color:#52525b;font-size:13px">No sections</span>`;
    }
    navContainer.innerHTML = html;
    if(mobileMenu){
      let mHtml='';
      navIds.forEach(id=>{
        const sec = sections.find(s=>s.id===id);
        const label = (sec?.title) || labelMap[id] || id;
        const href = (sec?.href && sec.href.trim()) ? sec.href.trim() : `#${id}`;
        const isExternal = /^https?:\/\//.test(href) || href.startsWith('mailto:');
        const target = isExternal ? ' target="_blank" rel="noopener"' : '';
        // mobile keeps simple <a> without button style
        mHtml += `<a href="${href.replace(/"/g,'&quot;')}"${target}>${label.replace(/</g,'&lt;')}</a>`;
      });
      // Mobile always includes contact if not in navIds but sections has contact visible? For consistency, use navIds check
      if(mHtml) mobileMenu.innerHTML = mHtml;
    }
  }
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
      heroTaglineEl.style.display = heroDisp.eyebrow===false ? 'none' : '';
    }
    const heroTitleEl = document.getElementById('heroTitle');
    if(heroTitleEl){
      heroTitleEl.innerHTML = `${c.hero?.title || ""}<br><span>${c.hero?.titleAccent || ""}</span>`;
      heroTitleEl.style.display = heroDisp.title===false ? 'none' : '';
    }
    const heroDescEl = document.getElementById('heroDesc');
    if(heroDescEl){
      heroDescEl.textContent = c.hero?.description || "";
      heroDescEl.style.display = heroDisp.description===false ? 'none' : '';
    }
    // CTA buttons — data-driven + granular
    const ctaPrimary = c.hero?.ctaPrimary || {text:"View My Work →", href:"#work", visible:true};
    const ctaSecondary = c.hero?.ctaSecondary || {text:"Let's Talk", href:"#contact", visible:true};
    const ctaContainer = document.querySelector('.hero-cta');
    if(ctaContainer){
      const btns = ctaContainer.querySelectorAll('a.btn');
      if(btns[0]){
        btns[0].textContent = ctaPrimary.text || "View My Work →";
        btns[0].setAttribute('href', ctaPrimary.href || "#work");
        btns[0].style.display = (ctaPrimary.visible===false || heroDisp.cta===false) ? 'none' : '';
      }
      if(btns[1]){
        btns[1].textContent = ctaSecondary.text || "Let's Talk";
        btns[1].setAttribute('href', ctaSecondary.href || "#contact");
        btns[1].style.display = (ctaSecondary.visible===false || heroDisp.cta===false) ? 'none' : '';
      }
      if((ctaPrimary.visible===false || heroDisp.cta===false) && (ctaSecondary.visible===false || heroDisp.cta===false)){
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
    const sectionShowreelVisible = sectionShowreel ? sectionShowreel.visible !== false : true;
    const showreelVisible = c.showreel?.visible !== false && sectionShowreelVisible;
    const heroMediaEl = document.querySelector('.hero-media');
    if(heroMediaEl){
      if(!heroMediaDisp || !showreelVisible){
        heroMediaEl.style.display='none';
        const heroEl = document.querySelector('.hero');
        if(heroEl) heroEl.style.gridTemplateColumns='1fr';
      } else {
        heroMediaEl.style.display='';
        const heroEl = document.querySelector('.hero');
        if(heroEl) heroEl.style.gridTemplateColumns='';
      }
    }
  }
  const thumb = c.showreel?.thumbnail || "";
  const thumbAlt = c.showreel?.thumbnailAlt || c.showreel?.title || "Showreel";
  if(thumb) {
    const heroImg = document.getElementById('heroThumb');
    heroImg.src = thumb;
    heroImg.alt = thumbAlt;
    heroImg.onerror = function(){ this.onerror=null; this.src = PLACEHOLDER_SVG; };
  } else {
    const heroImg = document.getElementById('heroThumb');
    if(heroImg && c.showreel?.visible!==false){
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
    const groupVisible = heroDisp2.stats !== false;
    const visibleStats = stats.filter(s=> s.visible!==false && s.display!==false);
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
  }
  const aboutSection = document.getElementById('about');
  if(c.about && c.about.visible === false){
    if(aboutSection) aboutSection.style.display='none';
  } else {
    if(aboutSection) aboutSection.style.display='';
    const aboutImg = document.getElementById('aboutImg');
    if(aboutImg){
      const imgSrc = c.about?.image || "";
      aboutImg.src = imgSrc || PLACEHOLDER_SVG;
      aboutImg.alt = c.about?.imageAlt || c.about?.title || "About photo";
      aboutImg.onerror = function(){ this.onerror=null; this.src = PLACEHOLDER_SVG; };
      const aboutImgWrap = document.querySelector('.about-img');
      if(aboutImgWrap){
        aboutImgWrap.style.display = aboutDisp.image===false ? 'none' : '';
        if(aboutDisp.image===false) aboutImgWrap.style.display='none';
        else aboutImgWrap.style.display='';
      }
      // hide image if display false
      if(aboutDisp.image===false && aboutImgWrap) aboutImgWrap.style.display='none';
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
        return p.visible!==false;
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
        return t.visible!==false;
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
  const visibleServices = (c.services || []).filter(s => s.visible !== false);
  const servicesGrid = document.getElementById('servicesGrid');
  const servicesSection = document.getElementById('services');
  if(servicesGrid){
    if(visibleServices.length){
      servicesGrid.innerHTML = visibleServices.map(s=>{
        const d = s.display || {};
        const icon = d.icon===false ? '' : `<div class="icon">${(s.icon||"🎬").replace(/</g,'&lt;')}</div>`;
        const title = d.title===false ? '' : `<h3>${(s.title||'').replace(/</g,'&lt;')}</h3>`;
        const desc = d.description===false ? '' : `<p>${(s.description||'').replace(/</g,'&lt;')}</p>`;
        const price = d.price===false ? '' : (s.price ? `<span class="price">${s.price.replace(/</g,'&lt;')}</span>` : '');
        const showCTA = d.cta!==false && s.ctaText && s.ctaText.trim();
        const cta = !showCTA ? '' : `<a href="${(s.ctaHref||"#contact").replace(/"/g,'&quot;')}" ${s.ctaNewTab ? 'target="_blank" rel="noopener"' : ''} class="btn btn-sm" style="margin-top:10px;">${s.ctaText.replace(/</g,'&lt;')}</a>`;
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
    serviceSelect.innerHTML = `<option value="">${placeholder.replace(/</g,'&lt;')}</option>`;
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
      html += `<a href="mailto:${email}">${email}</a>`;
    }
    const links = c.contact?.links || [];
    const visibleLinks = links.filter(l => l.visible !== false && (l.url||"").trim());
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
        // Check if no selectable services
        const selectable = (c.services||[]).filter(s=> s.visible!==false && s.selectable!==false);
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
      if(formCfg.servicePlaceholder) serviceSelect2.options[0].textContent = formCfg.servicePlaceholder;
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
    const backToTopEl = document.querySelector('.footer-inner a[href="#"]');
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
    const footerLinksData = (c.footer?.links || []).filter(l=> l.visible!==false && (l.url||"").trim());
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
        footerLinksEl.innerHTML = footerLinksData.map(l=> `<a href="${l.url.replace(/"/g,'&quot;')}" target="_blank" rel="noopener" style="color:#a1a1aa;text-decoration:underline;text-underline-offset:4px;font-size:13px;">${(l.label||'Link').replace(/</g,'&lt;')}</a>`).join('');
        footerLinksEl.style.display='flex';
      } else {
        footerLinksEl.innerHTML='';
        footerLinksEl.style.display='none';
      }
    }
  }

  const allProjects = (c.projects || []).filter(p => p.visible !== false);
  const longProjects = allProjects.filter(p => (p.format||'long') === 'long');
  const shortProjects = allProjects.filter(p => p.format === 'short');

  const gridLong = document.getElementById('projectGridLong');
  const gridShort = document.getElementById('projectGridShort');

  function renderGrid(projects, gridEl){
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
      const primaryThumb = showThumb ? (customThumb || (isVideo ? getYouTubeThumb(yid, "hq") : PLACEHOLDER_SVG)) : PLACEHOLDER_SVG;
      const badge = d.category===false ? '' : `<span class="badge">${(p.category || (p.format==='short' ? "Reels" : "Video")).replace(/</g,'&lt;')}</span>`;
      const play = (d.playButton===false || !isVideo) ? '' : `<span class="play-badge">▶</span>`;
      const youtubeUrl = p.youtubeUrl || (yid ? `https://www.youtube.com/watch?v=${yid}` : "");
      const format = p.format || 'long';
      const safeThumb = (customThumb || (isVideo ? getYouTubeThumb(yid, "hq") : "")).replace(/"/g,'&quot;');
      const alt = (p.thumbnailAlt || p.title || "").replace(/"/g,'&quot;');
      const desc = (p.description||"").replace(/"/g,'&quot;');
      const fit = p.thumbnailFit || 'cover';
      const title = d.title===false ? '' : `<h3>${(p.title||"Untitled").replace(/</g,'&lt;')}</h3>`;
      const meta = d.meta===false ? '' : `<p>${(p.meta||"").replace(/</g,'&lt;')}</p>`;
      const descHtml = (d.description===false || !desc) ? '' : `<p style="font-size:11px;color:#71717a;white-space:normal;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;margin-top:2px">${desc.replace(/</g,'&lt;')}</p>`;
      return `
      <article class="card" data-youtube-url="${youtubeUrl}" data-youtube-id="${yid||""}" data-format="${format}" data-title="${(p.title||"").replace(/"/g,'&quot;')}" data-thumb="${safeThumb}" data-desc="${desc}" data-thumb-alt="${alt}" tabindex="0">
        <div class="card-media" style="${showThumb ? '' : 'display:none'}">
          <img src="${primaryThumb}" data-custom="${customThumb}" data-yid="${yid||""}" alt="${alt}" loading="lazy" onerror="handleThumbError(this)" style="object-fit:${fit};${showThumb ? '' : 'display:none'}">
          ${badge}
          ${play}
        </div>
        <div class="card-body">${title}${meta}${descHtml}</div>
      </article>`;
    }).join('');
  }

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
    document.querySelectorAll('.tab-btn').forEach(b=> {b.classList.remove('active'); b.setAttribute('aria-selected','false');});
    document.querySelector(`.tab-btn[data-tab="${initialTab}"]`)?.classList.add('active');
    document.querySelector(`.tab-btn[data-tab="${initialTab}"]`)?.setAttribute('aria-selected','true');
    gridLong.style.display = initialTab==="long" ? 'grid' : 'none';
    gridShort.style.display = initialTab==="short" ? 'grid' : 'none';
  } else {
    // No tabs, long grid already shows all
    gridLong.style.display='grid';
    gridShort.style.display='none';
  }
}

function setupTabs(){
  const tabs = document.querySelectorAll('.tab-btn');
  const longGrid = document.getElementById('projectGridLong');
  const shortGrid = document.getElementById('projectGridShort');
  tabs.forEach(btn=>{
    btn.onclick = ()=>{
      tabs.forEach(b=>{b.classList.remove('active'); b.setAttribute('aria-selected','false')});
      btn.classList.add('active'); btn.setAttribute('aria-selected','true');
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
    };
  });
}

function yidOverride(){
  const c = CONTENT;
  return c.showreel?.youtubeId || youtubeIdFromUrl(c.showreel?.youtubeUrl||"");
}

// Video viewer — ONE native YouTube iframe only, minimal shell, ratio-aware
function playVideo(youtubeUrl, youtubeId, format, title, thumb, desc){
  let yid = (youtubeId && /^[A-Za-z0-9_-]{11}$/.test(youtubeId)) ? youtubeId : youtubeIdFromUrl(youtubeId || youtubeUrl || "");
  if(!yid) yid = youtubeIdFromUrl(youtubeUrl || "");
  const url = youtubeUrl || (yid ? `https://www.youtube.com/watch?v=${yid}` : "");
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
  const oldClose = document.getElementById('lightboxClose');
  if(oldClose) oldClose.style.display = 'none';

  if(!yid || yid.length !== 11){
    const errHtml = `
      <div class="video-viewer" style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:24px;max-width:min(92vw,480px);background:#111113;border-radius:16px;">
        <p style="color:#fafafa;font-weight:600;">Video unavailable here.</p>
        ${url ? `<a href="${url}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;background:#facc15;color:#000;padding:10px 18px;border-radius:999px;font-weight:600;font-size:13px;text-decoration:none">Watch on YouTube ↗</a>` : ``}
        <button onclick="closeLightbox()" style="background:none;border:none;color:#a1a1aa;font-size:13px;cursor:pointer">Close</button>
      </div>`;
    openLightbox(errHtml);
    return;
  }

  // Close any existing viewer — one viewer, one iframe
  if(document.getElementById('lightbox')?.classList.contains('open')){
    const oldFrame = document.getElementById('lightboxContent')?.querySelector('iframe');
    if(oldFrame){ try{ oldFrame.src='about:blank'; }catch(_){} oldFrame.remove(); }
  }

  const playerHtml = `<iframe data-youtube-id="${yid}" src="https://www.youtube-nocookie.com/embed/${yid}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="YouTube video player — ${displayTitleAttr}" style="position:absolute;inset:0;width:100%;height:100%;border:none;background:#000"></iframe>`;

  const stageStyle = isShort
    ? 'position:relative;overflow:hidden;background:#000;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.5);width:min(92vw,420px);aspect-ratio:9/16;display:flex;align-items:center;justify-content:center;'
    : 'position:relative;overflow:hidden;background:#000;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.5);width:min(92vw,1200px);aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;';
  const modalHtml = `
    <div class="video-viewer" style="position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;background:#000;border-radius:16px;padding:12px;box-shadow:0 20px 60px rgba(0,0,0,.5);max-width:none;max-height:none;">
      <div style="display:flex;justify-content:flex-end;align-items:center;width:100%;flex-shrink:0;">
        <button onclick="closeLightbox()" aria-label="Close video" style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);color:#fafafa;display:grid;place-items:center;font-size:16px;cursor:pointer;flex-shrink:0;">✕</button>
      </div>
      <div class="video-stage" data-format="${isShort ? 'short' : 'long'}" style="${stageStyle};border-radius:12px;box-shadow:none;">
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

  // Ratio-aware sizing: viewport → available → video ratio → ideal size (hug video, no giant empty)
  try{
    const stage = box?.querySelector('.video-stage');
    if(stage){
      const isShortStage = stage.dataset.format === 'short';
      const headerH = 0; // no portfolio header — viewer hugs video per spec
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const availableWidth = Math.min(1200, Math.floor(vw * 0.92));
      const availableHeight = Math.floor(vh * 0.9) - 24;
      let width, height;
      if(isShortStage){
        // Short: height-first, prioritize vertical
        height = Math.min(availableHeight, availableWidth * 16/9);
        height = Math.max(320, Math.min(height, vh * 0.85 - headerH));
        width = height * 9/16;
        if(width > availableWidth){
          width = availableWidth;
          height = width * 16/9;
        }
      } else {
        // Long: width-first, maximize 16:9
        width = Math.min(availableWidth, availableHeight * 16/9, 1200);
        height = width * 9/16;
        if(height > availableHeight){
          height = availableHeight;
          width = height * 16/9;
        }
      }
      // Apply — viewer hugs video, no clamp that breaks ratio
      stage.style.width = Math.round(width) + 'px';
      stage.style.height = Math.round(height) + 'px';
      stage.style.maxWidth = 'none';
      stage.style.maxHeight = 'none';
      // Handle resize while open
      const roHandler = () => {
        // Re-calc on resize, debounced
        clearTimeout(stage._resizeTimer);
        stage._resizeTimer = setTimeout(()=>{
          const vw2 = window.innerWidth;
          const vh2 = window.innerHeight;
          const aw2 = Math.min(1200, Math.floor(vw2 * 0.92));
          const ah2 = Math.floor(vh2 * 0.9) - 24;
          let w2,h2;
          if(isShortStage){
            h2 = Math.min(ah2, aw2 * 16/9);
            h2 = Math.max(300, Math.min(h2, vh2 * 0.88 - headerH));
            w2 = h2 * 9/16;
            if(w2 > aw2){ w2=aw2; h2=w2*16/9; }
          } else {
            w2 = Math.min(aw2, ah2 * 16/9, 1200);
            h2 = w2 * 9/16;
            if(h2 > ah2){ h2=ah2; w2=h2*16/9; }
          }
          stage.style.width = Math.round(w2)+'px';
          stage.style.height = Math.round(h2)+'px';
        }, 100);
      };
      window.addEventListener('resize', roHandler);
      // Cleanup on close
      const origClose = window.closeLightbox;
      const cleanup = () => {
        window.removeEventListener('resize', roHandler);
        clearTimeout(stage._resizeTimer);
      };
      // Patch closeLightbox to cleanup
      if(!stage._patchedClose){
        stage._patchedClose = true;
        const prevClose = window.closeLightbox;
        window.closeLightbox = function(){
          cleanup();
          window.closeLightbox = prevClose;
          return prevClose.apply(this, arguments);
        };
      }
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
    const msgHandler = (e)=>{
      try{
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if(data && data.event === 'onError') showFallback();
      }catch(_){}
    };
    window.addEventListener('message', msgHandler, {once:true});
    setTimeout(()=> window.removeEventListener('message', msgHandler), 5000);
  }
}

document.getElementById('menuBtn')?.addEventListener('click', ()=> document.getElementById('mobileMenu').classList.toggle('open'));
document.querySelectorAll('#mobileMenu a').forEach(a=> a.addEventListener('click', ()=> document.getElementById('mobileMenu').classList.remove('open')));

const lightbox = document.getElementById('lightbox');
const lightboxContent = document.getElementById('lightboxContent');
let _prevFocus = null;
let _scrollY = 0;
function openLightbox(html){
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
  // focus close
  requestAnimationFrame(()=>{
    const btn = lightboxContent.querySelector('button');
    if(btn) btn.focus();
    else lightboxContent.focus();
  });
}
function closeLightbox(){
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
  // Restore old close button for next non-minimal use
  const oldCloseRestore = document.getElementById('lightboxClose');
  if(oldCloseRestore) oldCloseRestore.style.display='';
  if(activePreview) hidePreview(activePreview);
  if(_prevFocus && _prevFocus.focus) try{ _prevFocus.focus(); }catch(_){}
}
document.getElementById('lightboxClose')?.addEventListener('click', closeLightbox);
lightbox?.addEventListener('click', e=>{ if(e.target===lightbox) closeLightbox(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeLightbox(); });

function bindCards(heroId){
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
  if(heroBtn) heroBtn.onclick = onHeroClick;
  if(heroCard){
    heroCard.onclick = onHeroClick;
    heroCard.addEventListener('keydown', e=>{ if(e.key==='Enter') onHeroClick(e); });
    heroCard.setAttribute('role','button'); heroCard.setAttribute('tabindex','0'); heroCard.style.cursor='pointer';
  }

  document.querySelectorAll('.card').forEach(card=>{
    if(card.dataset.bound) return; card.dataset.bound="1";
    card.addEventListener('click', ()=>{
      const yid = card.dataset.youtubeId || "";
      const url = card.dataset.youtubeUrl || "";
      const format = card.dataset.format || 'long';
      const title = card.dataset.title || "";
      const thumb = card.dataset.thumb || "";
      const desc = card.dataset.desc || "";
      const isVideo = yid && yid.length===11;
      if(isVideo){
        playVideo(url, yid, format, title, thumb, desc);
      } else {
        const img = card.querySelector('img');
        const src = img?.dataset.custom || img?.src || "";
        if(src && src !== PLACEHOLDER_SVG) openLightbox(`<div style="padding:16px;background:#111113;color:#fafafa;display:flex;justify-content:space-between;align-items:center"><h3>${title.replace(/</g,'&lt;')}</h3><button onclick="closeLightbox()" style="background:none;border:none;color:#a1a1aa;font-size:18px;cursor:pointer">✕</button></div><img src="${src}" alt="" style="max-width:100%;max-height:80vh;object-fit:contain"><p style="padding:12px 16px;color:#a1a1aa;font-size:13px">${desc.replace(/</g,'&lt;')}</p>`);
      }
    });
    card.addEventListener('keydown', e=>{ if(e.key==='Enter') card.click(); });
  });
}

document.getElementById('contactForm')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const d = new FormData(e.target);
  const email = CONTENT?.contact?.email || "hello@sahil.studio";
  const subject = encodeURIComponent(`Portfolio inquiry: ${d.get('service')} — from ${d.get('name')}`);
  const body = encodeURIComponent(`Name: ${d.get('name')}\nEmail: ${d.get('email')}\nService: ${d.get('service')}\n\n${d.get('message')}`);
  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  document.getElementById('formNote').textContent = "Opening email app... or email directly: " + email;
  e.target.reset();
});

if(CONTENT) renderSite();
else document.addEventListener('DOMContentLoaded', renderSite);

window.handleThumbError = handleThumbError;
window.closeLightbox = closeLightbox;
