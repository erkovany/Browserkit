// ==UserScript==
// @name         Calm YouTube (remove Shorts + grayscale thumbnails)
// @namespace    https://github.com/erkovany/Browserkit
// @homepageURL  https://github.com/erkovany/Browserkit
// @version      2.15.1
// @description  Customize YouTube thumbnails, Shorts, comments, feeds, pinned channels and History. Video-page settings control layout, recommendations, card sizes, playlists, description defaults and ambient lighting.
// @author       yerkovan
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @run-at       document-start
// @grant        GM_addStyle
// @noframes
// @updateURL    https://raw.githubusercontent.com/erkovany/Browserkit/main/scripts/calm-youtube.user.js
// @downloadURL  https://raw.githubusercontent.com/erkovany/Browserkit/main/scripts/calm-youtube.user.js
// ==/UserScript==

(function () {
  'use strict';

  function startCalmYouTube() {
    const pageRoot = document.documentElement;
    if (!pageRoot) return false;
    if (pageRoot.dataset.cytRunning === '2.15.1') return true;
    pageRoot.dataset.cytRunning = '2.15.1';

    const WATCH_KEY = 'cyt-watch-settings';
    const watchOptions = [
      { key: 'layout', label: 'Sayfa düzeni', initial: 'tv', choices: [['native', 'YouTube varsayılanı'], ['tv', 'Geniş · Öneriler altta']] },
      { key: 'recommendations', label: 'Önerileri göster', initial: 'show', choices: [['show', 'Açık'], ['hide', 'Kapalı']] },
      { key: 'cards', label: 'Öneri kartı boyutu', initial: 'medium', choices: [['small', 'Küçük'], ['medium', 'Orta'], ['large', 'Büyük']] },
      { key: 'playlist', label: 'Oynatma listesi görünümü', initial: 'horizontal', choices: [['native', 'YouTube varsayılanı'], ['horizontal', 'Yatay şerit']] },
      { key: 'description', label: 'Açıklama başlangıcı', initial: 'remember', choices: [['closed', 'Kapalı'], ['open', 'Açık'], ['remember', 'Son durumu hatırla']] },
      { key: 'ambient', label: 'Arka plan ışığı', initial: 'off', choices: [['native', 'YouTube ayarını kullan'], ['off', 'Kapat']] },
    ];
    function readWatchSettings() {
      let saved;
      try { saved = JSON.parse(localStorage.getItem(WATCH_KEY)); } catch {}
      return Object.fromEntries(watchOptions.map(option => [option.key,
        option.choices.some(([value]) => value === saved?.[option.key]) ? saved[option.key] : option.initial]));
    }
    let watchSettings = readWatchSettings();
    function applyWatchSettings(changed = []) {
      for (const option of watchOptions) pageRoot.setAttribute('data-cyt-watch-' + option.key, watchSettings[option.key]);
      window.dispatchEvent(new CustomEvent('cyt-watch-settings-changed', { detail: changed }));
      if (changed.includes('layout') || changed.includes('recommendations')) {
        requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
      }
    }
    applyWatchSettings();
    window.addEventListener('storage', event => {
      try { if (event.storageArea !== localStorage) return; } catch { return; }
      if (event.key !== WATCH_KEY && event.key !== null) return;
      const next = readWatchSettings();
      const changed = watchOptions.filter(option => next[option.key] !== watchSettings[option.key]).map(option => option.key);
      watchSettings = next;
      applyWatchSettings(changed);
    });

    /* CSS handles Shorts and layout; small controllers add interactive buttons. */

    (function () {
      'use strict';

      // Version stamp — run `document.documentElement.dataset.cytVersion` in the
      // console to confirm which build Tampermonkey actually loaded.
      document.documentElement.dataset.cytVersion = '2.15.1';

      for (const key of ['cyt-color', 'cyt-shorts', 'cyt-comments', 'cyt-hide-mixes']) {
        try {
          document.documentElement.classList.toggle(key, localStorage.getItem(key) === '1');
        } catch {}
      }

      try {
        const columns = localStorage.getItem('cyt-columns');
        if (['4', '5', '6'].includes(columns)) document.documentElement.dataset.cytColumns = columns;
      } catch {}

      const css = `
    /* =========================================================
       1. Shorts SHELVES in the home / subscriptions feeds
       Hide the whole section wrapper so no empty gap remains.
       ========================================================= */
    html:not(.cyt-shorts) grid-shelf-view-model:has(ytm-shorts-lockup-view-model),
    html:not(.cyt-shorts) grid-shelf-view-model:has(ytm-shorts-lockup-view-model-v2),
    html:not(.cyt-shorts) ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts]),
    html:not(.cyt-shorts) ytd-rich-shelf-renderer[is-shorts],
    html:not(.cyt-shorts) ytd-reel-shelf-renderer,
    html:not(.cyt-shorts) ytd-rich-shelf-renderer:has(ytm-shorts-lockup-view-model),
    html:not(.cyt-shorts) ytd-rich-shelf-renderer:has(ytm-shorts-lockup-view-model-v2) {
      display: none !important;
    }

    /* =========================================================
       2. Sidebar guide + collapsed mini-guide "Shorts" entry
       The endpoint anchor carries title="Shorts" (no /shorts href).
       ========================================================= */
    html:not(.cyt-shorts) ytd-guide-entry-renderer:has(a#endpoint[title="Shorts"]),
    html:not(.cyt-shorts) ytd-mini-guide-entry-renderer:has(a[title="Shorts"]),
    html:not(.cyt-shorts) ytd-guide-entry-renderer:has(a[title="Shorts"]) {
      display: none !important;
    }

    /* =========================================================
       3. Individual Shorts anywhere: home grid, search results,
       channel pages, related, etc. Hide the item WRAPPER (not just
       the lockup) so the grid doesn't leave empty cells.
       ========================================================= */
    html:not(.cyt-shorts) ytd-rich-item-renderer:has(ytm-shorts-lockup-view-model),
    html:not(.cyt-shorts) ytd-rich-item-renderer:has(ytm-shorts-lockup-view-model-v2),
    html:not(.cyt-shorts) ytd-rich-item-renderer:has(a[href*="/shorts/"]),
    html:not(.cyt-shorts) ytd-video-renderer:has(a[href*="/shorts/"]),
    html:not(.cyt-shorts) ytd-grid-video-renderer:has(a[href*="/shorts/"]),
    html:not(.cyt-shorts) ytd-compact-video-renderer:has(a[href*="/shorts/"]),
    html:not(.cyt-shorts) yt-lockup-view-model:has(a[href*="/shorts/"]),
    html:not(.cyt-shorts) ytd-reel-item-renderer,
    /* final fallback: the lockup itself, if the wrapper ever differs */
    html:not(.cyt-shorts) ytm-shorts-lockup-view-model,
    html:not(.cyt-shorts) ytm-shorts-lockup-view-model-v2 {
      display: none !important;
    }

    /* =========================================================
       4. Channel-page "Shorts" tab
       ========================================================= */
    html:not(.cyt-shorts) yt-tab-shape[tab-title="Shorts"],
    html:not(.cyt-shorts) tp-yt-paper-tab:has(> .tab-content yt-formatted-string[title="Shorts"]) {
      display: none !important;
    }

    /* =========================================================
       5. Grayscale preview THUMBNAILS (calm scroll)
       Scoped to the thumbnail image inside the two thumbnail
       component types, so the video player, channel avatars,
       logos and icons stay in full color. Color returns on the
       thumbnail you hover, so you can see it clearly when you're
       deliberately choosing.
       ========================================================= */
    ytd-thumbnail img,
    yt-thumbnail-view-model img {
      transition: filter 0.2s ease !important;
    }
    html:not(.cyt-color) ytd-thumbnail img,
    html:not(.cyt-color) yt-thumbnail-view-model img {
      filter: grayscale(1) !important;
    }
    html:not(.cyt-color) ytd-thumbnail:hover img,
    html:not(.cyt-color) yt-thumbnail-view-model:hover img {
      filter: none !important;
    }

    .cyt-masthead-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 40px;
      width: 40px;
      height: 40px;
      padding: 8px;
      margin: 0 8px 0 0;
      box-sizing: border-box;
      border: 0;
      border-radius: 50%;
      background: transparent;
      color: var(--yt-spec-text-primary, #606060);
      cursor: pointer;
    }
    .cyt-masthead-btn:hover {
      background: var(--yt-spec-badge-chip-background, rgba(128, 128, 128, 0.2));
    }
    .cyt-masthead-btn:focus-visible {
      outline: 2px solid var(--yt-spec-call-to-action, #3ea6ff);
      outline-offset: 2px;
    }
    .cyt-masthead-btn svg {
      width: 24px;
      height: 24px;
    }
    .cyt-masthead-btn[data-visibility-toggle][aria-pressed="true"] {
      color: var(--yt-spec-call-to-action, #3ea6ff);
      background: var(--yt-spec-badge-chip-background, rgba(128, 128, 128, 0.2));
    }
    html:not(.cyt-color) #cyt-color-btn svg {
      filter: grayscale(1);
    }


    /* Feed density and Mix filtering. */
    html[data-cyt-columns="4"] { --cyt-columns: 4; }
    html[data-cyt-columns="5"] { --cyt-columns: 5; }
    html[data-cyt-columns="6"] { --cyt-columns: 6; }
    @media (min-width: 1200px) {
      html[data-cyt-columns] ytd-rich-grid-renderer {
        --ytd-rich-grid-items-per-row: var(--cyt-columns) !important;
        --ytd-rich-grid-posts-per-row: var(--cyt-columns) !important;
      }
      html[data-cyt-columns] ytd-rich-grid-renderer > #contents {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 24px 16px !important;
      }
      html[data-cyt-columns] ytd-rich-grid-renderer > #contents > ytd-rich-grid-row:not([hidden]),
      html[data-cyt-columns] ytd-rich-grid-renderer > #contents > ytd-rich-grid-row:not([hidden]) > #contents {
        display: contents !important;
      }
      html[data-cyt-columns] ytd-rich-grid-renderer > #contents > ytd-rich-item-renderer,
      html[data-cyt-columns] ytd-rich-grid-renderer > #contents > ytd-rich-grid-row > #contents > ytd-rich-item-renderer {
        flex: 0 0 calc((100% - (var(--cyt-columns) - 1) * 16px) / var(--cyt-columns)) !important;
        width: calc((100% - (var(--cyt-columns) - 1) * 16px) / var(--cyt-columns)) !important;
        min-width: 0 !important;
        margin: 0 !important;
      }
      html[data-cyt-columns] ytd-rich-grid-renderer > #contents > :not(ytd-rich-item-renderer):not(ytd-rich-grid-row) {
        flex-basis: 100% !important;
      }
    }
    html.cyt-hide-mixes .cyt-mix-card {
      display: none !important;
    }
    #cyt-settings-panel {
      --cyt-menu: var(--yt-spec-menu-background, #fff);
      --cyt-text: var(--yt-spec-text-primary, #0f0f0f);
      --cyt-muted: var(--yt-spec-text-secondary, #606060);
      --cyt-divider: var(--yt-spec-10-percent-layer, rgba(0, 0, 0, 0.1));
      --cyt-hover: var(--yt-spec-badge-chip-background, rgba(0, 0, 0, 0.05));
      --cyt-accent: var(--yt-spec-call-to-action, #065fd4);
      color-scheme: light;
      position: fixed;
      inset: 56px 16px auto auto;
      margin: 0;
      padding: 0 0 8px;
      width: min(420px, calc(100vw - 32px));
      max-height: calc(100vh - 72px);
      max-height: calc(100dvh - 72px);
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
      scrollbar-color: var(--cyt-muted) transparent;
      box-sizing: border-box;
      border: 0;
      border-radius: 12px;
      background: var(--cyt-menu);
      color: var(--cyt-text);
      box-shadow: 0 4px 32px rgba(0, 0, 0, 0.24);
      font: 14px/1.4 Roboto, Arial, sans-serif;
    }
    html[dark] #cyt-settings-panel {
      --cyt-menu: var(--yt-spec-menu-background, #282828);
      --cyt-text: var(--yt-spec-text-primary, #f1f1f1);
      --cyt-muted: var(--yt-spec-text-secondary, #aaa);
      --cyt-divider: var(--yt-spec-10-percent-layer, rgba(255, 255, 255, 0.1));
      --cyt-hover: var(--yt-spec-badge-chip-background, rgba(255, 255, 255, 0.1));
      --cyt-accent: var(--yt-spec-call-to-action, #3ea6ff);
      color-scheme: dark;
    }
    #cyt-settings-panel .cyt-settings-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px 8px 20px;
      position: sticky;
      top: 0;
      z-index: 1;
      background: var(--cyt-menu);
      border-bottom: 1px solid var(--cyt-divider);
    }
    #cyt-settings-panel h2 { margin: 0; font-size: 16px; font-weight: 500; }
    #cyt-settings-panel h3 { margin: 0; padding: 16px 20px 8px; color: var(--cyt-muted); font-size: 12px; font-weight: 500; }
    #cyt-settings-panel section + section { margin-top: 8px; border-top: 1px solid var(--cyt-divider); }
    #cyt-settings-panel .cyt-setting-row, #cyt-settings-panel .cyt-checkbox-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 48px;
      padding: 6px 20px;
      box-sizing: border-box;
    }
    #cyt-settings-panel .cyt-setting-row:hover, #cyt-settings-panel .cyt-checkbox-row:hover { background: var(--cyt-hover); }
    #cyt-settings-panel .cyt-setting-row > label { flex: 1; min-width: 0; cursor: pointer; }
    #cyt-settings-panel .cyt-select-wrap { position: relative; flex: 0 1 54%; min-width: 0; }
    #cyt-settings-panel .cyt-select-wrap > svg { position: absolute; inset-inline-end: 2px; top: calc(50% - 9px); width: 18px; height: 18px; pointer-events: none; color: var(--cyt-muted); }
    #cyt-settings-panel select {
      appearance: none;
      width: 100%;
      min-height: 36px;
      padding: 8px 24px 8px 8px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: var(--cyt-muted);
      font: inherit;
      text-align: end;
      cursor: pointer;
      text-overflow: ellipsis;
    }
    #cyt-settings-panel select:disabled { opacity: 0.45; cursor: default; }
    #cyt-settings-panel option { background: var(--cyt-menu); color: var(--cyt-text); }
    #cyt-settings-panel p { margin: 0; padding: 4px 20px 12px; color: var(--cyt-muted); font-size: 12px; line-height: 1.5; }
    #cyt-settings-panel .cyt-checkbox-row { cursor: pointer; }
    #cyt-settings-panel input[type="checkbox"] {
      appearance: none;
      position: relative;
      order: 1;
      flex: 0 0 36px;
      width: 36px;
      height: 20px;
      margin: 0 4px 0 0;
      border: 0;
      border-radius: 12px;
      background: var(--cyt-muted);
      cursor: pointer;
    }
    #cyt-settings-panel input[type="checkbox"]::after {
      content: '';
      position: absolute;
      top: 3px;
      left: 3px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--cyt-menu);
      transition: transform 0.15s ease;
    }
    #cyt-settings-panel input[type="checkbox"]:checked { background: var(--cyt-accent); }
    #cyt-settings-panel input[type="checkbox"]:checked::after { transform: translateX(16px); }
    #cyt-settings-panel :is(select, input, button, a):focus-visible { outline: 2px solid var(--cyt-accent); outline-offset: 2px; }
    #cyt-settings-panel #cyt-settings-close, #cyt-settings-panel #cyt-pinned-settings-list button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 36px;
      width: 36px;
      height: 36px;
      padding: 8px;
      border: 0;
      border-radius: 50%;
      background: transparent;
      color: var(--cyt-text);
      cursor: pointer;
    }
    #cyt-settings-panel #cyt-settings-close:hover, #cyt-settings-panel #cyt-pinned-settings-list button:hover { background: var(--cyt-hover); }
    #cyt-settings-close svg { width: 20px; height: 20px; }
    #cyt-settings-panel #cyt-pinned-settings a {
      display: inline-flex;
      align-items: center;
      min-height: 36px;
      margin: 0 12px 4px;
      padding: 0 8px;
      border-radius: 18px;
      color: var(--cyt-accent);
      text-decoration: none;
      font-weight: 500;
    }
    #cyt-settings-panel #cyt-pinned-settings a:hover { background: var(--cyt-hover); }
    #cyt-settings-panel #cyt-pinned-settings-list > div { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 40px; padding: 0 12px 0 20px; }
    #cyt-settings-panel #cyt-pinned-settings-list span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    @media (max-width: 480px) {
      #cyt-settings-panel .cyt-setting-row { flex-wrap: wrap; gap: 0; }
      #cyt-settings-panel .cyt-setting-row > label { flex-basis: 100%; padding-top: 6px; }
      #cyt-settings-panel .cyt-select-wrap { flex-basis: 100%; }
      #cyt-settings-panel select { text-align: start; padding-inline-start: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      #cyt-settings-panel input[type="checkbox"]::after { transition: none; }
    }
    #cyt-pinned-settings-list button, .cyt-channel-pin {
      flex: 0 0 28px;
      width: 28px;
      height: 28px;
      border: 0;
      border-radius: 50%;
      background: var(--yt-spec-badge-chip-background, rgba(128, 128, 128, 0.15));
      color: var(--yt-spec-text-primary, #606060);
      font-size: 20px;
      cursor: pointer;
    }
    .cyt-channel-pinnable { position: relative !important; }
    ytd-guide-entry-renderer.cyt-channel-pinnable > a { padding-inline-end: 40px !important; }
    .cyt-channel-pin { position: absolute; inset-inline-end: 6px; top: 6px; z-index: 2; }
    ytd-guide-entry-renderer .cyt-channel-pin { top: 50%; transform: translateY(-50%); }
    ytd-channel-renderer.cyt-channel-pinnable { padding-top: 32px !important; }
    .cyt-channel-pin[aria-pressed="true"] { color: var(--yt-spec-call-to-action, #3ea6ff); }
    .cyt-channel-pin:focus-visible, .cyt-sidebar-links a:focus-visible, #cyt-pinned-settings-list button:focus-visible {
      outline: 2px solid var(--yt-spec-call-to-action, #3ea6ff);
      outline-offset: -2px;
    }
    ytd-mini-guide-renderer { overflow-y: auto !important; max-height: calc(100vh - 56px); }
    .cyt-sidebar-links a { display: flex; align-items: center; gap: 16px; text-decoration: none; color: var(--yt-spec-text-primary, #606060); border-radius: 10px; }
    html[dark] .cyt-sidebar-links a { color: var(--yt-spec-text-primary, #f1f1f1); }
    .cyt-sidebar-links a:hover, .cyt-sidebar-links a[aria-current="page"] { background: var(--yt-spec-badge-chip-background, rgba(128, 128, 128, 0.15)); }
    .cyt-sidebar-links img, .cyt-sidebar-links svg, .cyt-channel-initial {
      flex: 0 0 24px;
      width: 24px;
      height: 24px;
    }
    .cyt-sidebar-links img { border-radius: 50%; object-fit: cover; }
    .cyt-channel-initial { display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--yt-spec-badge-chip-background, #ddd); color: var(--yt-spec-text-primary, #606060); font-size: 13px; }
    #cyt-mini-shortcuts a { flex-direction: column; gap: 6px; box-sizing: border-box; min-height: 72px; padding: 14px 4px; margin: 0 4px; font: 10px/14px Roboto, Arial, sans-serif; }
    #cyt-mini-shortcuts .cyt-channel-name { width: 56px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; }
    #cyt-expanded-pins { margin: 12px; padding-top: 12px; border-top: 1px solid var(--yt-spec-10-percent-layer, #888); }
    #cyt-expanded-pins h3 { margin: 0 12px 8px; font: 500 14px/20px Roboto, Arial, sans-serif; color: var(--yt-spec-text-primary, #606060); }
    html[dark] #cyt-expanded-pins h3, html[dark] .cyt-channel-pin:not([aria-pressed="true"]), html[dark] #cyt-pinned-settings-list button { color: var(--yt-spec-text-primary, #f1f1f1); }
    html[dark] #cyt-pinned-settings a { color: var(--yt-spec-call-to-action, #3ea6ff); }
    #cyt-expanded-pins a { padding: 8px 12px; font: 14px/20px Roboto, Arial, sans-serif; }
    #cyt-expanded-pins .cyt-channel-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    ytd-watch-flexy { --cyt-radius: 12px; --cyt-related-min: 300px; }
    html[data-cyt-watch-cards="small"] ytd-watch-flexy { --cyt-related-min: 240px; }
    html[data-cyt-watch-cards="large"] ytd-watch-flexy { --cyt-related-min: 380px; }
    html:not(.cyt-comments) ytd-watch-flexy #comments { display: none !important; }
    html[data-cyt-watch-recommendations="hide"] ytd-watch-flexy #secondary #related {
      display: none !important;
    }
    html[data-cyt-watch-layout="tv"] ytd-watch-flexy:not([fullscreen]) #columns {
      display: block !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 16px clamp(8px, 2vw, 24px) !important;
      box-sizing: border-box !important;
      min-width: 0 !important;
    }
    html[data-cyt-watch-layout="tv"] ytd-watch-flexy:not([fullscreen]) #primary, html[data-cyt-watch-layout="tv"] ytd-watch-flexy:not([fullscreen]) #primary-inner, html[data-cyt-watch-layout="tv"] ytd-watch-flexy:not([fullscreen]) #secondary, html[data-cyt-watch-layout="tv"] ytd-watch-flexy:not([fullscreen]) #secondary-inner {
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      padding: 0 !important;
      box-sizing: border-box !important;
    }
    html[data-cyt-watch-layout="tv"] ytd-watch-flexy:not([fullscreen]) #secondary ytd-item-section-renderer > #contents {
      display: grid !important;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--cyt-related-min)), 1fr)) !important;
      gap: 16px !important;
      padding: 4px !important;
    }
    html[data-cyt-watch-layout="tv"] ytd-watch-flexy:not([fullscreen]) #secondary yt-lockup-view-model { border-radius: var(--cyt-radius) !important; min-width: 0 !important; }
    html[data-cyt-watch-layout="tv"] ytd-watch-flexy:not([fullscreen]) #secondary .ytLockupViewModelHost { flex-direction: column !important; width: auto !important; }
    html[data-cyt-watch-layout="tv"] ytd-watch-flexy:not([fullscreen]) #secondary a.ytLockupViewModelContentImage { width: 100% !important; max-width: none !important; margin: 0 !important; }
    html[data-cyt-watch-layout="tv"] ytd-watch-flexy:not([fullscreen]) #secondary .ytThumbnailViewModelImage, html[data-cyt-watch-layout="tv"] ytd-watch-flexy:not([fullscreen]) #secondary .ytThumbnailViewModelImage img { width: 100% !important; height: auto !important; }
    html[data-cyt-watch-layout="tv"] ytd-watch-flexy:not([fullscreen]) #secondary .ytLockupViewModelMetadata { padding: 10px 12px 12px !important; }

    html[data-cyt-watch-playlist="horizontal"] ytd-watch-flexy:not([fullscreen]) #secondary ytd-playlist-panel-renderer:not([collapsed]) > #container { height: auto !important; max-height: none !important; position: relative !important; }
    html[data-cyt-watch-playlist="horizontal"] ytd-watch-flexy:not([fullscreen]) #secondary ytd-playlist-panel-renderer:not([collapsed]) #items {
      display: flex !important;
      flex-flow: row nowrap !important;
      overflow-x: auto !important;
      overflow-y: hidden !important;
      overscroll-behavior-x: contain !important;
      height: auto !important;
      max-height: none !important;
      gap: 12px !important;
      padding: 4px 4px 8px !important;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      box-sizing: border-box !important;
      scrollbar-color: var(--yt-spec-text-secondary, #888) transparent;
      scrollbar-width: thin;
    }
    html[data-cyt-watch-playlist="horizontal"] ytd-watch-flexy:not([fullscreen]) #secondary ytd-playlist-panel-renderer:not([collapsed]) #items::-webkit-scrollbar { height: 8px !important; }
    html[data-cyt-watch-playlist="horizontal"] ytd-watch-flexy:not([fullscreen]) #secondary ytd-playlist-panel-renderer:not([collapsed]) #items::-webkit-scrollbar-thumb { background: var(--yt-spec-text-secondary, #888) !important; border-radius: 4px; }
    html[data-cyt-watch-playlist="horizontal"] ytd-watch-flexy:not([fullscreen]) #secondary ytd-playlist-panel-renderer:not([collapsed]) ytd-playlist-panel-video-renderer {
      flex: 0 0 210px !important;
      width: 210px !important;
      min-width: 0 !important;
      margin: 0 !important;
    }
    html[data-cyt-watch-playlist="horizontal"] ytd-watch-flexy:not([fullscreen]) #secondary ytd-playlist-panel-renderer:not([collapsed]) ytd-playlist-panel-video-renderer #container { flex-direction: column !important; align-items: stretch !important; }
    html[data-cyt-watch-playlist="horizontal"] ytd-watch-flexy:not([fullscreen]) #secondary ytd-playlist-panel-renderer:not([collapsed]) ytd-playlist-panel-video-renderer #thumbnail-container {
      width: 100% !important;
      max-width: none !important;
      height: auto !important;
      max-height: none !important;
      aspect-ratio: 16 / 9 !important;
      margin: 0 !important;
      position: relative !important;
    }
    html[data-cyt-watch-playlist="horizontal"] ytd-watch-flexy:not([fullscreen]) #secondary ytd-playlist-panel-renderer:not([collapsed]) ytd-playlist-panel-video-renderer ytd-thumbnail,
    html[data-cyt-watch-playlist="horizontal"] ytd-watch-flexy:not([fullscreen]) #secondary ytd-playlist-panel-renderer:not([collapsed]) ytd-playlist-panel-video-renderer a#thumbnail {
      display: block !important;
      width: 100% !important;
      height: 100% !important;
      max-height: none !important;
    }
    html[data-cyt-watch-playlist="horizontal"] ytd-watch-flexy:not([fullscreen]) #secondary ytd-playlist-panel-renderer:not([collapsed]) ytd-playlist-panel-video-renderer a#thumbnail yt-image,
    html[data-cyt-watch-playlist="horizontal"] ytd-watch-flexy:not([fullscreen]) #secondary ytd-playlist-panel-renderer:not([collapsed]) ytd-playlist-panel-video-renderer a#thumbnail img {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
    }
    html[data-cyt-watch-playlist="horizontal"] ytd-watch-flexy:not([fullscreen]) #secondary ytd-playlist-panel-renderer:not([collapsed]) ytd-playlist-panel-video-renderer #meta { padding: 8px 24px 0 2px !important; }

    /* =========================================================
       7. Description behind a toggle button.
       Hide the description BODY by default (the channel blurb, the
       ...more expander) but keep the views/date line always on. A
       button injected into the actions row (see JS below) toggles
       the .cyt-desc-open class on <html> to reveal it. Hashtags on
       the info line are hidden until opened.
       ========================================================= */
    ytd-watch-flexy:not([fullscreen]) ytd-watch-metadata #description-inline-expander {
      display: none !important;
    }
    html.cyt-desc-open ytd-watch-flexy:not([fullscreen]) ytd-watch-metadata #description-inline-expander {
      display: block !important;
    }
    html:not(.cyt-desc-open) ytd-watch-flexy:not([fullscreen]) ytd-watch-metadata #info a {
      display: none !important;   /* hide #hashtags while collapsed; keep views/date */
    }

    /* The injected toggle button inherits YouTube's tonal icon-button styling from
       the ytSpecButtonShapeNext* classes; these just space it and show active state. */
    #cyt-desc-btn-wrap {
      display: inline-flex !important;
      align-items: center !important;
      margin-left: 8px !important;
    }
    #cyt-desc-btn {
      cursor: pointer !important;
    }
    #cyt-desc-btn svg {
      width: 24px !important;
      height: 24px !important;
      fill: currentColor !important;
    }
    html.cyt-desc-open #cyt-desc-btn {
      color: var(--yt-spec-call-to-action, #3ea6ff) !important;  /* accent when open */
    }

    .cyt-mix-arrow {
      position: absolute;
      z-index: 60;
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.75);
      color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.15s ease;
    }
    ytd-playlist-panel-renderer:hover .cyt-mix-arrow,
    ytd-playlist-panel-renderer:focus-within .cyt-mix-arrow {
      opacity: 0.95;
    }
    .cyt-mix-arrow:hover {
      background: rgba(0, 0, 0, 0.9);
    }
    .cyt-mix-arrow[disabled] {
      opacity: 0 !important;
      pointer-events: none;
    }
    .cyt-mix-arrow svg {
      width: 24px;
      height: 24px;
    }
    .cyt-mix-arrow-left { left: 6px; }
    .cyt-mix-arrow-right { right: 6px; }

    /* =========================================================
       9. Masthead: hide unused buttons.
       - Voice search (#voice-search-button) — language-independent id.
       - "Create" button — matched by aria-label (English UI); its whole
         ytd-button-renderer wrapper is hidden so no gap is left.
       ========================================================= */
    ytd-masthead #voice-search-button,
    ytd-masthead button[aria-label="Search with your voice"],
    ytd-masthead ytd-button-renderer:has(button[aria-label="Create"]) {
      display: none !important;
    }

    /* =========================================================
       10. Disable the ambient glow ("cinematics") — the colored
       light that bleeds from the player into the page background.
       ========================================================= */
    html[data-cyt-watch-ambient="off"] ytd-watch-flexy #cinematics,
    html[data-cyt-watch-ambient="off"] ytd-watch-flexy #cinematics-container {
      display: none !important;
    }

    /* Hide featured shelves, Premium/membership promos and their feed wrappers. */
    ytd-brand-video-shelf-renderer:has(#shelf-header-container .ytBadgeShapePromoted),
    :is(ytd-rich-section-renderer, ytd-rich-item-renderer):has(
      ytd-brand-video-shelf-renderer #shelf-header-container .ytBadgeShapePromoted),
    :is(ytd-brand-video-shelf-renderer,
        ytd-statement-banner-renderer,
        ytd-banner-promo-renderer,
        ytd-mealbar-promo-renderer):has(a:is(
          [href^="/premium"],
          [href^="https://www.youtube.com/premium"],
          [href^="/channel_memberships"],
          [href^="https://www.youtube.com/channel_memberships"])),
    :is(ytd-rich-section-renderer, ytd-rich-item-renderer):has(
      :is(ytd-brand-video-shelf-renderer,
          ytd-statement-banner-renderer,
          ytd-banner-promo-renderer,
          ytd-mealbar-promo-renderer) a:is(
            [href^="/premium"],
            [href^="https://www.youtube.com/premium"],
            [href^="/channel_memberships"],
            [href^="https://www.youtube.com/channel_memberships"])) {
      display: none !important;
    }
    `;

      // GM_addStyle is available under @grant; fall back to manual injection
      // if the manager doesn't provide it (e.g. some Greasemonkey configs).
      if (typeof GM_addStyle === 'function') {
        GM_addStyle(css);
      } else {
        const style = document.createElement('style');
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
      }
    })();

    /* ===========================================================
       Description toggle controller (JS).

       Injects an icon-only button into the watch-metadata actions row,
       next to the Like/Dislike pill, styled with YouTube's own button
       classes. Clicking it toggles the .cyt-desc-open class (CSS section 7
       hides/shows the description body). State persists via localStorage.

       The actions row and the button re-render on SPA navigation, so a
       MutationObserver re-injects when missing; the insert target is a
       normal container child, so there's no insertBefore pitfall.
       =========================================================== */
    (function () {
      'use strict';

      const BTN_ID = 'cyt-desc-btn';
      const OPEN_CLASS = 'cyt-desc-open';
      const KEY = 'cyt-desc-open';

      const isWatch = () => location.pathname === '/watch';
      const isOpen = () => document.documentElement.classList.contains(OPEN_CLASS);

      const SVG_NS = 'http://www.w3.org/2000/svg';

      // Build the "article / description" icon with DOM APIs. YouTube enforces
      // Trusted Types, so assigning innerHTML throws — we must construct nodes.
      function makeIcon() {
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', 'M4 5h16v2H4V5Zm0 4h16v2H4V9Zm0 4h16v2H4v-2Zm0 4h10v2H4v-2Z');
        svg.appendChild(path);
        return svg;
      }

      function setOpen(open) {
        document.documentElement.classList.toggle(OPEN_CLASS, open);
        try { localStorage.setItem(KEY, open ? '1' : '0'); } catch (e) { /* ignore */ }
        const b = document.getElementById(BTN_ID);
        if (b) {
          b.setAttribute('aria-pressed', open ? 'true' : 'false');
          b.title = open ? 'Hide description' : 'Show description';
        }
      }

      function inject() {
        if (!isWatch() || document.getElementById(BTN_ID)) return;
        const row = document.querySelector('ytd-watch-metadata #top-level-buttons-computed');
        if (!row) return;
        try {
          const wrap = document.createElement('div');
          wrap.id = BTN_ID + '-wrap';

          const btn = document.createElement('button');
          btn.id = BTN_ID;
          btn.type = 'button';
          // Match the sibling pill buttons, but icon-only.
          btn.className = 'ytSpecButtonShapeNextHost ytSpecButtonShapeNextTonal ' +
            'ytSpecButtonShapeNextMono ytSpecButtonShapeNextSizeM ytSpecButtonShapeNextIconOnlyDefault';
          btn.setAttribute('aria-pressed', isOpen() ? 'true' : 'false');
          btn.title = isOpen() ? 'Hide description' : 'Show description';
          const iconWrap = document.createElement('div');
          iconWrap.className = 'ytSpecButtonShapeNextIcon';
          iconWrap.appendChild(makeIcon());
          btn.appendChild(iconWrap);
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(!isOpen());
          });
          wrap.appendChild(btn);

          // Place it right after the Like/Dislike segment (a child of this row, so
          // insertBefore is valid), else append to the row.
          const seg = row.querySelector('segmented-like-dislike-button-view-model');
          if (seg && seg.parentNode === row) {
            row.insertBefore(wrap, seg.nextSibling);
          } else {
            row.appendChild(wrap);
          }
        } catch (e) {
          console.warn('[Calm YouTube] description button injection failed:', e);
        }
      }

      function sync() {
        if (!isWatch()) {
          document.documentElement.classList.remove(OPEN_CLASS);
          return;
        }
        inject();
        let open = false;
        try { open = localStorage.getItem(KEY) === '1'; } catch (e) { /* ignore */ }
        if (watchSettings.description !== 'remember') open = watchSettings.description === 'open';
        setOpen(open);
      }

      const observer = new MutationObserver(() => {
        if (isWatch() && !document.getElementById(BTN_ID)) inject();
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });

      window.addEventListener('yt-navigate-finish', sync);
      window.addEventListener('cyt-watch-settings-changed', event => {
        if (event.detail.includes('description')) sync();
      });

      const start = () => sync();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
      } else {
        start();
      }
    })();

    (function () {
      const selector = 'html[data-cyt-watch-playlist="horizontal"] ytd-watch-flexy:not([fullscreen]) #secondary ytd-playlist-panel-renderer:not([collapsed]) #items';
      const controllers = new Map();
      let pending = false;

      function attach(items) {
        const container = items.closest('#container') || items.parentElement;
        const abort = new AbortController();
        const arrows = ['left', 'right'].map(direction => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'cyt-mix-arrow cyt-mix-arrow-' + direction;
          button.setAttribute('aria-label', direction === 'left' ? 'Scroll left' : 'Scroll right');
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('viewBox', '0 0 24 24');
          svg.setAttribute('aria-hidden', 'true');
          const path = document.createElementNS(svg.namespaceURI, 'path');
          path.setAttribute('d', direction === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6');
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke', 'currentColor');
          path.setAttribute('stroke-width', '2');
          svg.appendChild(path);
          button.appendChild(svg);
          button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            items.scrollBy({ left: (direction === 'left' ? -1 : 1) * items.clientWidth * 0.8,
              behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
          }, { signal: abort.signal });
          container.appendChild(button);
          return button;
        });
        function update() {
          const max = Math.max(0, items.scrollWidth - items.clientWidth);
          const rtl = getComputedStyle(items).direction === 'rtl';
          arrows[0].disabled = items.scrollLeft <= (rtl ? -max : 0) + 2;
          arrows[1].disabled = items.scrollLeft >= (rtl ? 0 : max) - 2;
          const top = items.getBoundingClientRect().top - container.getBoundingClientRect().top + items.clientHeight / 2;
          for (const arrow of arrows) {
            arrow.style.top = top + 'px';
            arrow.style.transform = 'translateY(-50%)';
          }
        }
        items.addEventListener('scroll', update, { passive: true, signal: abort.signal });
        items.addEventListener('wheel', event => {
          if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || !items.matches(selector)) return;
          const horizontal = event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY);
          if (!horizontal || items.scrollWidth <= items.clientWidth) return;
          const delta = event.shiftKey && Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
          const unit = event.deltaMode === 1 ? (parseFloat(getComputedStyle(items).lineHeight) || 16) : event.deltaMode === 2 ? items.clientWidth : 1;
          items.scrollLeft += delta * unit;
          event.preventDefault();
        }, { passive: false, signal: abort.signal });
        const resize = new ResizeObserver(update);
        resize.observe(items);
        resize.observe(container);
        update();
        return { container, arrows, update, dispose() {
          abort.abort();
          resize.disconnect();
          for (const arrow of arrows) arrow.remove();
        } };
      }

      function reconcile() {
        pending = false;
        const active = new Set(location.pathname === '/watch' ? document.querySelectorAll(selector) : []);
        for (const [items, controller] of controllers) {
          const container = items.closest('#container') || items.parentElement;
          if (!active.has(items) || container !== controller.container || controller.arrows.some(arrow => arrow.parentElement !== container)) {
            controller.dispose();
            controllers.delete(items);
          }
        }
        for (const items of active) {
          if (!controllers.has(items)) controllers.set(items, attach(items));
          else controllers.get(items).update();
        }
      }
      function schedule() {
        if (pending) return;
        pending = true;
        requestAnimationFrame(reconcile);
      }
      new MutationObserver(schedule).observe(document.documentElement, {
        childList: true, subtree: true, attributes: true, attributeFilter: ['fullscreen', 'collapsed', 'hidden'],
      });
      window.addEventListener('resize', schedule);
      window.addEventListener('yt-navigate-finish', schedule);
      window.addEventListener('cyt-watch-settings-changed', schedule);
      window.cytDebug = () => ({ version: pageRoot.dataset.cytVersion, settings: { ...watchSettings },
        carousels: [...controllers.keys()].map(items => ({ width: items.clientWidth, scrollWidth: items.scrollWidth, scrollLeft: items.scrollLeft })) });
      schedule();
    })();

    (function () {
      'use strict';

      const root = document.documentElement;
      const SVG_NS = 'http://www.w3.org/2000/svg';
      const toggles = [
        { key: 'cyt-color', label: 'Color thumbnails', onTitle: 'Switch to grayscale thumbnails', offTitle: 'Switch to full-color thumbnails' },
        { key: 'cyt-shorts', label: 'Show Shorts', onTitle: 'Hide Shorts', offTitle: 'Show Shorts',
          path: 'M16.5 3a3.5 3.5 0 0 1 1.8 6.5L15.5 11l1.4.6a3.5 3.5 0 0 1 .3 6.3l-9 5a3.5 3.5 0 0 1-3.4-6.1L7.5 15l-1.4-.6a3.5 3.5 0 0 1-.3-6.3l9-5A3.5 3.5 0 0 1 16.5 3Z M10 9v7l6-3.5Z' },
        { key: 'cyt-comments', label: 'Show comments', onTitle: 'Hide comments', offTitle: 'Show comments',
          path: 'M4 4h16v12H8l-4 4V4Z M8 8h8 M8 12h6' },
      ];
      const isOn = (toggle) => root.classList.contains(toggle.key);

      function updateButton(toggle, button) {
        button.setAttribute('aria-pressed', String(isOn(toggle)));
        button.title = isOn(toggle) ? toggle.onTitle : toggle.offTitle;
      }

      function setState(toggle, enabled) {
        root.classList.toggle(toggle.key, enabled);
        try { localStorage.setItem(toggle.key, enabled ? '1' : '0'); } catch {}
        const button = document.getElementById(toggle.key + '-btn');
        if (button) updateButton(toggle, button);
      }

      function makeIcon(toggle) {
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');
        if (toggle.path) {
          const path = document.createElementNS(SVG_NS, 'path');
          path.setAttribute('d', toggle.path);
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke', 'currentColor');
          path.setAttribute('stroke-width', '1.5');
          path.setAttribute('stroke-linejoin', 'round');
          path.setAttribute('stroke-linecap', 'round');
          svg.appendChild(path);
          return svg;
        }
        const outline = document.createElementNS(SVG_NS, 'circle');
        outline.setAttribute('cx', '12');
        outline.setAttribute('cy', '12');
        outline.setAttribute('r', '10');
        outline.setAttribute('fill', 'none');
        outline.setAttribute('stroke', 'currentColor');
        outline.setAttribute('stroke-width', '1.5');
        svg.appendChild(outline);
        for (const [cx, cy, fill] of [[9, 9, '#f25f5c'], [15, 9, '#ffd166'], [9, 15, '#52b788'], [15, 15, '#5390d9']]) {
          const dot = document.createElementNS(SVG_NS, 'circle');
          dot.setAttribute('cx', String(cx));
          dot.setAttribute('cy', String(cy));
          dot.setAttribute('r', '2.5');
          dot.setAttribute('fill', fill);
          svg.appendChild(dot);
        }
        return svg;
      }

      function makeButton(toggle) {
        const button = document.createElement('button');
        button.id = toggle.key + '-btn';
        button.className = 'cyt-masthead-btn';
        button.type = 'button';
        button.setAttribute('aria-label', toggle.label);
        if (toggle.path) button.setAttribute('data-visibility-toggle', '');
        button.appendChild(makeIcon(toggle));
        button.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          setState(toggle, !isOn(toggle));
        });
        updateButton(toggle, button);
        return button;
      }

      const PINS_KEY = 'cyt-pinned-channels';
      let pinnedChannels = [];
      try { pinnedChannels = parsePins(localStorage.getItem(PINS_KEY)); } catch {}

      function channelPath(href) {
        try {
          const url = new URL(href, location.origin);
          if (!['www.youtube.com', 'm.youtube.com', 'youtube.com'].includes(url.hostname)) return null;
          const match = url.pathname.match(/^\/(channel\/[^/]+|@[^/]+|c\/[^/]+|user\/[^/]+)(?:\/(?:featured|videos|shorts|streams))?\/?$/);
          return match ? '/' + match[1] : null;
        } catch { return null; }
      }

      function avatarUrl(value) {
        try {
          const url = new URL(value);
          return url.protocol === 'https:' && /(^|\.)(ggpht\.com|googleusercontent\.com|ytimg\.com)$/.test(url.hostname) ? url.href : '';
        } catch { return ''; }
      }

      function parsePins(value) {
        try {
          const list = JSON.parse(value);
          if (!Array.isArray(list)) return [];
          const seen = new Set();
          return list.flatMap(item => {
            if (!item || typeof item.path !== 'string' || typeof item.name !== 'string') return [];
            const path = channelPath(item.path);
            if (!path || seen.has(path)) return [];
            seen.add(path);
            return [{ path, name: item.name.trim().slice(0, 120) || path, avatar: avatarUrl(item.avatar) }];
          });
        } catch { return []; }
      }

      function readChannel(host) {
        const link = [...host.querySelectorAll('a[href]')].find(anchor => channelPath(anchor.getAttribute('href')));
        if (!link) return null;
        const path = channelPath(link.getAttribute('href'));
        const title = host.querySelector('#channel-title, .title, #text[title], #text');
        const name = (title?.textContent || link.getAttribute('title') || link.textContent || path).trim().replace(/\s+/g, ' ').slice(0, 120);
        const image = host.querySelector('img');
        return { path, name: name || path, avatar: avatarUrl(image?.currentSrc || image?.getAttribute('src')) };
      }

      function togglePin(channel) {
        const index = pinnedChannels.findIndex(item => item.path === channel.path);
        if (index < 0) pinnedChannels.push(channel);
        else pinnedChannels.splice(index, 1);
        try { localStorage.setItem(PINS_KEY, JSON.stringify(pinnedChannels)); } catch {}
        scheduleInject();
      }

      function addPinButtons() {
        const hosts = new Set();
        for (const section of document.querySelectorAll('ytd-guide-section-renderer')) {
          const heading = section.querySelector('#guide-section-title, #header-entry')?.textContent.trim() || '';
          if (!section.querySelector('a[href="/feed/subscriptions"], a[href="/feed/channels"]') && !/^(subscriptions|abonelikler)$/i.test(heading)) continue;
          section.querySelectorAll('ytd-guide-entry-renderer').forEach(host => hosts.add(host));
        }
        if (location.pathname === '/feed/channels') {
          document.querySelectorAll('ytd-channel-renderer').forEach(host => hosts.add(host));
        }
        const eligible = new Set();
        for (const host of hosts) {
          const channel = readChannel(host);
          if (!channel) continue;
          eligible.add(host);
          host.classList.add('cyt-channel-pinnable');
          let pin = host.querySelector(':scope > .cyt-channel-pin');
          if (!pin) {
            pin = document.createElement('button');
            pin.type = 'button';
            pin.className = 'cyt-channel-pin';
            pin.addEventListener('click', event => {
              event.preventDefault();
              event.stopPropagation();
              const current = readChannel(host);
              if (current) togglePin(current);
            });
            host.appendChild(pin);
          }
          const selected = pinnedChannels.some(item => item.path === channel.path);
          const symbol = selected ? '★' : '☆';
          const label = channel.name + (selected ? ' — sabitlemeyi kaldır' : ' — sol menüye sabitle');
          if (pin.textContent !== symbol) pin.textContent = symbol;
          if (pin.title !== label) pin.title = label;
          if (pin.getAttribute('aria-label') !== label) pin.setAttribute('aria-label', label);
          if (pin.getAttribute('aria-pressed') !== String(selected)) pin.setAttribute('aria-pressed', String(selected));
        }
        for (const pin of document.querySelectorAll('.cyt-channel-pin')) {
          if (!eligible.has(pin.parentElement)) {
            pin.parentElement.classList.remove('cyt-channel-pinnable');
            pin.remove();
          }
        }
      }

      function makeShortcut(channel) {
        const link = document.createElement('a');
        link.href = channel.path;
        link.title = channel.name;
        link.setAttribute('data-cyt-shortcut', '');
        if (location.pathname === channel.path || location.pathname.startsWith(channel.path + '/')) link.setAttribute('aria-current', 'page');
        if (channel.path === '/feed/history') {
          link.appendChild(makeIcon({path: 'M3 11a9 9 0 1 1 2.6 7 M3 5v6h6 M12 7v5l3 2'}));
        } else if (channel.avatar) {
          const avatar = document.createElement('img');
          avatar.src = channel.avatar;
          avatar.alt = '';
          avatar.loading = 'lazy';
          avatar.referrerPolicy = 'no-referrer';
          avatar.addEventListener('error', () => avatar.replaceWith(makeInitial(channel.name)), { once: true });
          link.appendChild(avatar);
        } else link.appendChild(makeInitial(channel.name));
        const name = document.createElement('span');
        name.className = 'cyt-channel-name';
        name.textContent = channel.name;
        link.appendChild(name);
        return link;
      }

      function makeInitial(name) {
        const initial = document.createElement('span');
        initial.className = 'cyt-channel-initial';
        initial.setAttribute('aria-hidden', 'true');
        initial.textContent = [...name][0]?.toUpperCase() || '?';
        return initial;
      }

      function renderPinnedSettings() {
        const list = document.getElementById('cyt-pinned-settings-list');
        if (!list) return;
        const signature = JSON.stringify(pinnedChannels);
        if (list.dataset.cytSignature === signature) return;
        list.dataset.cytSignature = signature;
        const content = document.createDocumentFragment();
        for (const channel of pinnedChannels) {
          const row = document.createElement('div');
          const name = document.createElement('span');
          name.textContent = channel.name;
          const remove = document.createElement('button');
          remove.type = 'button';
          remove.textContent = '×';
          remove.setAttribute('aria-label', channel.name + ' — sabitlemeyi kaldır');
          remove.addEventListener('click', () => togglePin(channel));
          row.append(name, remove);
          content.appendChild(row);
        }
        list.replaceChildren(content);
      }

      function enhanceNavigation() {
        addPinButtons();
        const signature = JSON.stringify(pinnedChannels) + location.pathname;
        const mini = document.querySelector('ytd-mini-guide-renderer');
        if (mini) {
          const you = mini.querySelector('a[href="/feed/you"], a[href="/feed/library"]')?.closest('ytd-mini-guide-entry-renderer');
          const parent = you?.parentElement || mini.querySelector('#items');
          if (parent) {
            let nav = mini.querySelector('#cyt-mini-shortcuts');
            if (!nav) {
              nav = document.createElement('nav');
              nav.id = 'cyt-mini-shortcuts';
              nav.className = 'cyt-sidebar-links';
              nav.setAttribute('aria-label', 'History ve sabit kanallar');
            }
            const showHistory = !mini.querySelector('a[href="/feed/history"]:not([data-cyt-shortcut])');
            if (nav.dataset.cytSignature !== signature + showHistory) {
              nav.dataset.cytSignature = signature + showHistory;
              const links = pinnedChannels.map(makeShortcut);
              if (showHistory) links.unshift(makeShortcut({path: '/feed/history', name: 'History'}));
              nav.replaceChildren(...links);
            }
            if (you) {
              if (you.nextElementSibling !== nav) parent.insertBefore(nav, you.nextSibling);
            } else if (nav.parentElement !== parent) parent.appendChild(nav);
          }
        }
        const sections = document.querySelector('ytd-guide-renderer #sections');
        if (sections) {
          let nav = sections.querySelector('#cyt-expanded-pins');
          if (!pinnedChannels.length) nav?.remove();
          else {
            if (!nav) {
              nav = document.createElement('nav');
              nav.id = 'cyt-expanded-pins';
              nav.className = 'cyt-sidebar-links';
              nav.setAttribute('aria-label', 'Sabit kanallar');
              const youSection = sections.querySelector('a[href="/feed/history"]')?.closest('ytd-guide-section-renderer');
              if (youSection?.parentElement === sections) sections.insertBefore(nav, youSection.nextSibling);
              else sections.prepend(nav);
            }
            if (nav.dataset.cytSignature !== signature) {
              nav.dataset.cytSignature = signature;
              const title = document.createElement('h3');
              title.textContent = 'Sabit kanallar';
              nav.replaceChildren(title, ...pinnedChannels.map(makeShortcut));
            }
          }
        }
        renderPinnedSettings();
      }

      const CARD_SELECTOR = 'yt-lockup-view-model, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, ytd-radio-renderer, ytd-compact-radio-renderer';
      let markedMixCards = new Set();

      function markMixCards() {
        const nextMarks = new Set();
        for (const card of document.querySelectorAll(CARD_SELECTOR)) {
          if (card.querySelector(CARD_SELECTOR)) continue;
          const radioLink = card.querySelector('a:is([href*="?list=RD"], [href*="&list=RD"])');
          if (!radioLink) continue;
          const title = card.querySelector('.ytLockupMetadataViewModelTitle, #video-title');
          const mixTitle = title && /^mix(?:\s*[-–—:]|\s*$)/i.test(title.textContent.trim());
          const mixBadge = [...card.querySelectorAll('.ytBadgeShapeText, ytd-thumbnail-overlay-bottom-panel-renderer, ytd-thumbnail-overlay-side-panel-renderer')]
            .some(badge => /^mix$/i.test(badge.textContent.trim()) || /^mix$/i.test(badge.getAttribute('aria-label') || ''));
          if (!mixTitle && !mixBadge) continue;
          nextMarks.add(card);
          const wrapper = card.closest('ytd-rich-item-renderer');
          if (wrapper) {
            const leafCards = [...wrapper.querySelectorAll(CARD_SELECTOR)].filter(item => !item.querySelector(CARD_SELECTOR));
            if (leafCards.length === 1 && leafCards[0] === card) nextMarks.add(wrapper);
          }
        }
        for (const card of markedMixCards) {
          if (!nextMarks.has(card)) card.classList.remove('cyt-mix-card');
        }
        for (const card of nextMarks) card.classList.add('cyt-mix-card');
        markedMixCards = nextMarks;
      }

      function syncSettings() {
        const select = document.getElementById('cyt-columns-select');
        const checkbox = document.getElementById('cyt-mixes-checkbox');
        if (select) select.value = root.dataset.cytColumns || 'auto';
        if (checkbox) checkbox.checked = root.classList.contains('cyt-hide-mixes');
        for (const option of watchOptions) {
          const input = document.getElementById('cyt-watch-' + option.key);
          if (!input) continue;
          input.value = watchSettings[option.key];
          input.disabled = option.key === 'cards' && (watchSettings.layout !== 'tv' || watchSettings.recommendations === 'hide');
        }
      }

      function applyColumns(value) {
        if (['4', '5', '6'].includes(value)) root.dataset.cytColumns = value;
        else delete root.dataset.cytColumns;
      }

      function settingRow(label, select) {
        const row = document.createElement('div');
        row.className = 'cyt-setting-row';
        const control = document.createElement('div');
        control.className = 'cyt-select-wrap';
        control.append(select, makeIcon({ path: 'M6 9l6 6 6-6' }));
        row.append(label, control);
        return row;
      }

      function ensureSettings() {
        let panel = document.getElementById('cyt-settings-panel');
        if (!panel) {
          panel = document.createElement('div');
          panel.id = 'cyt-settings-panel';
          panel.setAttribute('popover', 'auto');
          panel.setAttribute('role', 'dialog');
          panel.setAttribute('aria-labelledby', 'cyt-settings-title');
          const title = document.createElement('h2');
          title.id = 'cyt-settings-title';
          title.textContent = 'Görünüm';
          const header = document.createElement('div');
          header.className = 'cyt-settings-header';
          const close = document.createElement('button');
          close.type = 'button';
          close.id = 'cyt-settings-close';
          close.setAttribute('aria-label', 'Ayarları kapat');
          close.appendChild(makeIcon({ path: 'M6 6l12 12M18 6L6 18' }));
          close.addEventListener('click', () => {
            panel.hidePopover();
            document.getElementById('cyt-settings-btn')?.focus();
          });
          header.append(title, close);
          const label = document.createElement('label');
          label.htmlFor = 'cyt-columns-select';
          label.textContent = 'Kart boyutu';
          const select = document.createElement('select');
          select.id = 'cyt-columns-select';
          select.setAttribute('aria-describedby', 'cyt-columns-help');
          for (const [value, text] of [['auto', 'Otomatik'], ['4', 'Büyük — 4 sütun'], ['5', 'Orta — 5 sütun'], ['6', 'Küçük — 6 sütun']]) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = text;
            select.appendChild(option);
          }
          select.addEventListener('change', () => {
            applyColumns(select.value);
            try { localStorage.setItem('cyt-columns', select.value); } catch {}
          });
          const help = document.createElement('p');
          help.id = 'cyt-columns-help';
          help.textContent = 'Geniş ekranlarda uygulanır. Dar pencerelerde otomatik düzen kullanılır.';
          const mixLabel = document.createElement('label');
          mixLabel.className = 'cyt-checkbox-row';
          const checkbox = document.createElement('input');
          checkbox.id = 'cyt-mixes-checkbox';
          checkbox.type = 'checkbox';
          checkbox.addEventListener('change', () => {
            if (checkbox.checked) markMixCards();
            root.classList.toggle('cyt-hide-mixes', checkbox.checked);
            try { localStorage.setItem('cyt-hide-mixes', checkbox.checked ? '1' : '0'); } catch {}
          });
          mixLabel.append(checkbox, document.createTextNode('Mix önerilerini gizle'));
          const pinsSection = document.createElement('section');
          pinsSection.id = 'cyt-pinned-settings';
          const pinsTitle = document.createElement('h3');
          pinsTitle.textContent = 'Sabit kanallar';
          const choose = document.createElement('a');
          choose.href = '/feed/channels';
          choose.textContent = 'Aboneliklerden kanal seç';
          const hint = document.createElement('p');
          hint.textContent = 'Kanalın yanındaki ☆ düğmesiyle sol menüye sabitle.';
          const pinsList = document.createElement('div');
          pinsList.id = 'cyt-pinned-settings-list';
          pinsSection.append(pinsTitle, choose, hint, pinsList);
          const watchSection = document.createElement('section');
          watchSection.id = 'cyt-watch-settings';
          const watchTitle = document.createElement('h3');
          watchTitle.textContent = 'Video sayfası';
          watchSection.appendChild(watchTitle);
          for (const option of watchOptions) {
            const fieldLabel = document.createElement('label');
            fieldLabel.htmlFor = 'cyt-watch-' + option.key;
            fieldLabel.textContent = option.label;
            const input = document.createElement('select');
            input.id = fieldLabel.htmlFor;
            for (const [value, text] of option.choices) {
              const choice = document.createElement('option');
              choice.value = value;
              choice.textContent = text;
              input.appendChild(choice);
            }
            input.addEventListener('change', () => {
              watchSettings[option.key] = input.value;
              try { localStorage.setItem(WATCH_KEY, JSON.stringify(watchSettings)); } catch {}
              applyWatchSettings([option.key]);
            });
            watchSection.appendChild(settingRow(fieldLabel, input));
          }
          const watchHelp = document.createElement('p');
          watchHelp.textContent = 'Öneri kartı boyutu geniş düzende uygulanır. Açıklama tercihi her yeni videoda kullanılır.';
          watchSection.appendChild(watchHelp);
          const feedSection = document.createElement('section');
          const feedTitle = document.createElement('h3');
          feedTitle.textContent = 'Ana sayfa';
          feedSection.append(feedTitle, settingRow(label, select), help, mixLabel);
          panel.append(header, feedSection, watchSection, pinsSection);
          panel.addEventListener('toggle', (event) => {
            const gear = document.getElementById('cyt-settings-btn');
            if (gear) gear.setAttribute('aria-expanded', String(event.newState === 'open'));
          });
          (document.body || root).appendChild(panel);
          syncSettings();
          renderPinnedSettings();
        }
        let gear = document.getElementById('cyt-settings-btn');
        if (!gear) {
          gear = document.createElement('button');
          gear.id = 'cyt-settings-btn';
          gear.className = 'cyt-masthead-btn';
          gear.type = 'button';
          gear.title = 'Görünüm ayarları';
          gear.setAttribute('aria-label', 'Görünüm ayarları');
          gear.setAttribute('aria-haspopup', 'dialog');
          gear.setAttribute('aria-controls', panel.id);
          gear.setAttribute('aria-expanded', String(panel.matches(':popover-open')));
          gear.setAttribute('popovertarget', panel.id);
          gear.appendChild(makeIcon({path: 'M9.5 3h5l.5 2 2 1.2 2-.6 2.5 4.3-1.5 1.4v2.4l1.5 1.4-2.5 4.3-2-.6-2 1.2-.5 2h-5l-.5-2-2-1.2-2 .6-2.5-4.3L4 13.7v-2.4L2.5 9.9 5 5.6l2 .6L9 5l.5-2Z M12 9a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z'}));
        }
        return gear;
      }

      function inject() {
        enhanceNavigation();
        const bell = document.querySelector('ytd-masthead ytd-notification-topbar-button-renderer');
        if (!bell || !bell.parentElement) return;
        const gear = ensureSettings();
        if (gear.nextElementSibling !== bell) bell.parentElement.insertBefore(gear, bell);
        let anchor = gear;
        for (let i = toggles.length - 1; i >= 0; i--) {
          const toggle = toggles[i];
          const button = document.getElementById(toggle.key + '-btn') || makeButton(toggle);
          if (button.nextElementSibling !== anchor) bell.parentElement.insertBefore(button, anchor);
          anchor = button;
        }
      }

      let pending = false;
      function scheduleInject() {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => {
          pending = false;
          if (root.classList.contains('cyt-hide-mixes')) markMixCards();
          inject();
        });
      }

      new MutationObserver(scheduleInject).observe(root, {
        childList: true, subtree: true, characterData: true,
        attributes: true, attributeFilter: ['href', 'title', 'aria-label'],
      });
      window.addEventListener('yt-navigate-finish', scheduleInject);
      window.addEventListener('cyt-watch-settings-changed', syncSettings);
      window.addEventListener('storage', (event) => {
        try { if (event.storageArea !== localStorage) return; } catch { return; }
        if (event.key === PINS_KEY || event.key === null) pinnedChannels = parsePins(event.newValue);
        if (event.key === 'cyt-columns' || event.key === null) applyColumns(event.newValue);
        if (event.key === 'cyt-hide-mixes' || event.key === null) root.classList.toggle('cyt-hide-mixes', event.newValue === '1');
        syncSettings();
        scheduleInject();
        for (const toggle of toggles) {
          if (event.key !== toggle.key && event.key !== null) continue;
          root.classList.toggle(toggle.key, event.newValue === '1');
          const button = document.getElementById(toggle.key + '-btn');
          if (button) updateButton(toggle, button);
        }
      });
      scheduleInject();
    })();

    return true;
  }

  if (!startCalmYouTube()) {
    const rootObserver = new MutationObserver(() => {
      if (startCalmYouTube()) rootObserver.disconnect();
    });
    rootObserver.observe(document, { childList: true });
  }
})();
