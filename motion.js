/* ============================================================================
   MOTION UPDATE v1 — DELETE THIS BLOCK TO REVERT (rollback-safe, optional)
   ----------------------------------------------------------------------------
   WHAT: One-time IntersectionObserver reveal (.is-visible, never removed),
         filter fade helper, BFCache no-replay guard. No scroll-event per-frame,
         no responsive re-animation, no background anim, no loader/spinner.
   HOW TO DISABLE (no delete): <html data-motion="off"> — this script exits
         early and leaves all content visible (base).
   HOW TO REMOVE (one step, restores base):
         1. Delete this file (motion.js) + motion.css,
         2. Delete the "MOTION UPDATE v1" blocks in index.html + work.html.
         style.css / script.js / config.js were NOT touched by this update.
   BACKUP: _backups/motion-update-v1-2026-09-11-16-15-39/index.html + work.html
   PERF: opacity/transform only (CSS). Observer fires once per element then
         unobserves. No scroll/resize listeners for animation. MutationObserver
         only re-arms dynamically rendered cards (renderGrid recreates on
         filter). No console noise on success.
   ============================================================================ */
(function(){
  "use strict";
  try{
    var root = document.documentElement;

    /* Kill switch: data-motion="off" => do nothing, ensure visible. */
    if(root.getAttribute("data-motion") === "off") return;

    /* Mark enabled (hidden states in motion.css only apply when present,
       so no-JS fallback stays fully visible). Inline head snippet may have
       already added it before first paint (no FOUC); re-assert here. */
    if(!root.classList.contains("motion-enabled")) root.classList.add("motion-enabled");

    /* BFCache: Back/Forward restores without replay. pageshow.persisted means
       the page came from cache — reveal everything instantly, kill anims. */
    window.addEventListener("pageshow", function(e){
      if(e && e.persisted){
        root.classList.add("motion-restored");
        try{
          document.querySelectorAll(".motion-reveal").forEach(function(el){
            el.classList.add("is-visible");
          });
        }catch(_){}
      }
    });

    /* Reduced motion: still reveal, CSS shortens to opacity-only (120ms). */
    var reduceMotion = false;
    try{ reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch(_){}

    /* Reveal targets: hero sequence, work intro, cards, about, services,
       contact groups, footer. Missing selectors (e.g. work page vs home)
       are simply skipped — one script serves both pages. */
    var SELECTORS = [
      ".nav",
      "#heroTagline", "#heroTitle", "#heroDesc", ".hero-cta", "#stats", ".hero-media",
      "#work .section-head h2", ".work-page .section-head h2",
      "#workSubtitle", ".work-page .section-head p", "#workCount",
      "#work .work-tabs", ".work-page .work-tabs",
      "#workSectionLong .work-subhead", "#workSectionShort .work-subhead",
      ".work-subhead",
      "#projectGridLong .card", "#projectGridShort .card",
      "#workGridLong .card", "#workGridShort .card",
      ".grid .card",
      ".about-img", ".about-text",
      "#servicesTitle", ".service-card",
      ".contact-grid > div",
      ".footer"
    ];

    var seen = new Set();
    var io = null;

    try{
      io = new IntersectionObserver(function(entries){
        entries.forEach(function(en){
          if(en.isIntersecting){
            en.target.classList.add("is-visible");
            try{ io.unobserve(en.target); }catch(_){}
            /* Never removed: one-time reveal, no re-animation on scroll,
               resize, or responsive change. */
          }
        });
      }, { threshold: 0.1, rootMargin: "0px" });
      /* NOTE: rootMargin MUST NOT shrink the bottom (e.g. -8% hid the footer,
         the last element, from intersection forever). 0px keeps every target
         reachable, including .footer at page end. */
    }catch(_){ io = null; }

    function isOffNode(el){
      // Pipeline gate (P1): never arm config-OFF nodes (hidden/aria-hidden
      // subtrees set by script.js). Inline-style + hidden walk only — no
      // getComputedStyle (no layout), no CSS changes.
      try{
        var n = el;
        while(n && n !== document.documentElement){
          if(n.hasAttribute && n.hasAttribute("hidden")) return true;
          if(n.getAttribute && n.getAttribute("aria-hidden") === "true" && n.style && n.style.display === "none") return true;
          if(n.style && n.style.display === "none") return true;
          n = n.parentElement;
        }
      }catch(_){}
      return false;
    }
    function arm(el){
      if(!el || seen.has(el)) return;
      if(isOffNode(el)) return; // OFF content: no observer, no classes
      seen.add(el);
      if(!el.classList.contains("motion-reveal")) el.classList.add("motion-reveal");
      /* If already in view on load (e.g. header/hero), observer fires
         immediately — no separate load path needed. Fallback: reveal. */
      if(io){
        try{ io.observe(el); }catch(_){ el.classList.add("is-visible"); }
      }else{
        el.classList.add("is-visible");
      }
      /* Safety: if element never intersects (e.g. display:none tab grid),
         it stays hidden until its grid is shown — filter handler reveals. */
    }

    function armAll(scope){
      try{
        SELECTORS.forEach(function(sel){
          var list;
          try{ list = (scope || document).querySelectorAll(sel); }
          catch(_){ return; }
          list.forEach(arm);
        });
      }catch(_){}
    }

    /* Initial arm (script.js renderSite/renderWorkPage already ran, since
       this script loads after them — cards exist). */
    if(document.readyState === "loading"){
      document.addEventListener("DOMContentLoaded", function(){ armAll(document); }, { once: true });
    }else{
      armAll(document);
    }

    /* Dynamic cards: renderGrid() recreates .card nodes on Work-page filter.
       MutationObserver re-arms only NEW cards — no scroll listeners. */
    var gridIds = ["projectGridLong", "projectGridShort", "workGridLong", "workGridShort", "servicesGrid"];
    function instantRevealCard(card){
      if(!card) return;
      if(!card.classList.contains("motion-reveal")) card.classList.add("motion-reveal");
      seen.add(card);
      /* Filter path = fade only (CSS zeroes delay/translate via
         data-motion-filter + .motion-filtering). rAF lets grid fade start. */
      requestAnimationFrame(function(){
        requestAnimationFrame(function(){ card.classList.add("is-visible"); });
      });
    }
    try{
      var mo = new MutationObserver(function(muts){
        var filtering = root.getAttribute("data-motion-filter") === "true";
        muts.forEach(function(m){
          m.addedNodes.forEach(function(n){
            if(!(n instanceof Element)) return;
            if(n.matches && (n.matches(".card") || n.matches(".service-card"))){
              if(filtering) instantRevealCard(n);
              else arm(n);
            }
            if(n.querySelectorAll){
              n.querySelectorAll(".card, .service-card").forEach(function(c){
                if(filtering) instantRevealCard(c);
                else arm(c);
              });
            }
          });
        });
      });
      gridIds.forEach(function(id){
        var g = document.getElementById(id);
        if(g) mo.observe(g, { childList: true });
      });
      /* Services grid + generic grids (home re-render edge). */
      document.querySelectorAll(".grid").forEach(function(g){
        try{ mo.observe(g, { childList: true }); }catch(_){}
      });
    }catch(_){}

    /* Filter fade 200-300ms, no flying cards: on tab click, mark grids
       filtering (CSS fades grid opacity, zeroes card delay/translate), reveal
       any cards hidden in a display:none grid, clear flag after 350ms. */
    function onFilterClick(){
      try{
        root.setAttribute("data-motion-filter", "true");
        document.querySelectorAll(".grid").forEach(function(g){
          g.classList.add("motion-filtering");
        });
        /* Reveal cards inside newly shown grids (IntersectionObserver ignores
           display:none, so arm them explicitly). */
        document.querySelectorAll(".grid").forEach(function(g){
          if(g.style.display === "none") return;
          var r = g.getBoundingClientRect();
          var inView = r.top < window.innerHeight && r.bottom > 0;
          if(inView){
            g.querySelectorAll(".card:not(.is-visible)").forEach(instantRevealCard);
          }
        });
        setTimeout(function(){
          root.removeAttribute("data-motion-filter");
          document.querySelectorAll(".grid.motion-filtering").forEach(function(g){
            g.classList.remove("motion-filtering");
          });
          /* After fade, arm any still-hidden cards normally (scroll path). */
          armAll(document);
        }, reduceMotion ? 130 : 350);
      }catch(_){}
    }
    try{
      document.querySelectorAll(".tab-btn, .wtab").forEach(function(b){
        // Bind-after-gate: OFF pills (aria-hidden/tabindex -1 from script.js)
        // get no motion listener.
        try{
          if(b.getAttribute && b.getAttribute("aria-hidden") === "true") return;
          if(b.tabIndex === -1) return;
          if(b.style && b.style.display === "none") return;
        }catch(_){}
        b.addEventListener("click", onFilterClick, { passive: true });
      });
    }catch(_){}

    /* Navigation: native View Transitions (CSS @view-transition) handle
       cross-document index<->work with 200-350ms. This script deliberately
       does NOT intercept clicks, add waits, or show loaders — unsupported
       browsers just navigate instantly (base). Nothing to do here. */

    /* Mobile menu / lightbox / form / player: untouched (no motion hooks). */
  }catch(err){
    /* Fail open: any error leaves content visible, never broken. */
    try{ document.querySelectorAll(".motion-reveal").forEach(function(el){ el.classList.add("is-visible"); }); }
    catch(_){}
  }
})();
