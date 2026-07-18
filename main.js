/* ============================================ */
/* SubTopo-GNSS — Web App Logic                 */
/* Simulation GNSS, moyenne pondérée, exports  */
/* ============================================ */

(function () {
  'use strict';

  /* ========================================== */
  /* WEBVIEW INTEGRATION (Android WebIntoApp)   */
  /* ========================================== */
  function initWebView() {
    // Detect if running in a WebView (WebIntoApp or similar)
    const isWebView = /wv|WebView|wv\\.browser/i.test(navigator.userAgent);
    document.body.classList.toggle('in-webview', isWebView);

    // Android back button: navigate tabs in reverse order, then exit
    let backStack = [];
    window.addEventListener('hashchange', () => {
      const hash = location.hash.replace('#', '');
      if (hash && hash !== state.activeTab) {
        backStack.push(state.activeTab);
      }
    });
    document.addEventListener('backbutton', () => {
      // Cordova / WebIntoApp back button
      if (backStack.length > 0) {
        const prev = backStack.pop();
        switchTab(prev);
      } else {
        // Navigate back through tabs
        const tabs = ['releve', 'carte', 'search', 'mesures', 'resultats', 'parametres'];
        const idx = tabs.indexOf(state.activeTab);
        if (idx > 0) switchTab(tabs[idx - 1]);
        else if (navigator.app && navigator.app.exitApp) navigator.app.exitApp();
      }
    }, false);

    // Prevent overscroll/bounce in WebView
    document.addEventListener('touchmove', (e) => {
      if (e.scale && e.scale !== 1) return;
      e.preventDefault();
    }, { passive: false });

    // Disable text selection on UI elements
    const style = document.createElement('style');
    style.textContent = `
      .in-webview * {
        -webkit-user-select: none !important;
        -webkit-touch-callout: none !important;
        -webkit-tap-highlight-color: transparent !important;
        user-select: none !important;
      }
      .in-webview input, .in-webview textarea, .in-webview [contenteditable] {
        -webkit-user-select: text !important;
        user-select: text !important;
      }
      .in-webview {
        overscroll-behavior: none !important;
        -webkit-overflow-scrolling: touch;
      }
    `;
    document.head.appendChild(style);

    // Bridge to native (if available) for splash hide
    if (window.SubTopoNative && window.SubTopoNative.hideSplash) {
      setTimeout(() => window.SubTopoNative.hideSplash(), 500);
    }
  }

  /* ========================================== */
  /* i18n (internationalization)                 */
  /* ========================================== */
  const I18N = {
    fr: {
      'app-title': 'SubTopo-GNSS',
      'nav-releve': 'Relevé', 'nav-carte': 'Carte', 'nav-search': 'Recherche',
      'nav-mesures': 'Mesures', 'nav-resultats': 'Résultats', 'nav-parametres': 'Plus',
      'search-title': '🔍 Recherche de lieux',
      'search-desc': 'Cherche un lieu, une ville, un point d\'intérêt. Sélectionne un résultat pour le voir sur la carte.',
      'search-placeholder': 'ex: Tour Eiffel, Tunis, Mont Blanc...',
      'search-loading': 'Recherche en cours...',
      'search-empty': 'Aucun résultat. Essaie avec d\'autres mots-clés.',
      'search-error': 'Erreur de recherche. Vérifie ta connexion.',
    },
    en: {
      'app-title': 'SubTopo-GNSS',
      'nav-releve': 'Survey', 'nav-carte': 'Map', 'nav-search': 'Search',
      'nav-mesures': 'Measures', 'nav-resultats': 'Results', 'nav-parametres': 'More',
      'search-title': '🔍 Place search',
      'search-desc': 'Search for a place, city, point of interest. Pick a result to see it on the map.',
      'search-placeholder': 'e.g: Eiffel Tower, Tunis, Mont Blanc...',
      'search-loading': 'Searching...',
      'search-empty': 'No results. Try different keywords.',
      'search-error': 'Search error. Check your connection.',
    },
    ar: {
      'app-title': 'SubTopo-GNSS',
      'nav-releve': 'مسح', 'nav-carte': 'خريطة', 'nav-search': 'بحث',
      'nav-mesures': 'قياسات', 'nav-resultats': 'نتائج', 'nav-parametres': 'المزيد',
      'search-title': '🔍 بحث عن الأماكن',
      'search-desc': 'ابحث عن مكان أو مدينة أو نقطة اهتمام.',
      'search-placeholder': 'مثال: برج إيفل، تونس، جبل الجبل الأبيض...',
      'search-loading': 'جارٍ البحث...',
      'search-empty': 'لا توجد نتائج. جرب كلمات أخرى.',
      'search-error': 'خطأ في البحث. تحقق من اتصالك.',
    },
  };
  let currentLang = 'fr';

  function applyI18n() {
    const dict = I18N[currentLang] || I18N.fr;
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    $$('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      if (dict[key]) el.textContent = dict[key];
    });
    $$('[data-i18n-placeholder]').forEach((el) => {
      const key = el.dataset.i18nPlaceholder;
      if (dict[key]) el.placeholder = dict[key];
    });
    // Update lang toggle button
    const langBtn = $('langToggle');
    if (langBtn) {
      langBtn.textContent = currentLang === 'fr' ? '🇫🇷' : currentLang === 'en' ? '🇬🇧' : '🇸🇦';
    }
  }

  function toggleLang() {
    const langs = ['fr', 'en', 'ar'];
    const idx = langs.indexOf(currentLang);
    currentLang = langs[(idx + 1) % langs.length];
    localStorage.setItem('subtopo-lang', currentLang);
    applyI18n();
    showToast('🌐 ' + (currentLang === 'fr' ? 'Français' : currentLang === 'en' ? 'English' : 'العربية'), 'success');
  }

  /* ========================================== */
  /* THEME TOGGLE (dark/light)                  */
  /* ========================================== */
  function initTheme() {
    const saved = localStorage.getItem('subtopo-theme');
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    updateThemeBtn();
  }
  function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('subtopo-theme', 'light');
      showToast('☀️ Mode clair', 'success');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('subtopo-theme', 'dark');
      showToast('🌙 Mode sombre', 'success');
    }
    updateThemeBtn();
  }
  function updateThemeBtn() {
    const btn = $('themeToggle');
    if (btn) {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      btn.textContent = isDark ? '☀️' : '🌙';
    }
  }

  /* ========================================== */
  /* SEARCH (Nominatim OpenStreetMap)           */
  /* ========================================== */
  let searchResultsList = [];
  function initSearch() {
    const btn = $('searchBtn');
    const input = $('searchInput');
    if (!btn || !input) return;
    btn.addEventListener('click', performSearch);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') performSearch();
    });
  }
  async function performSearch() {
    const q = $('searchInput').value.trim();
    if (!q) return;
    const status = $('searchStatus');
    status.innerHTML = '<span class="search-loader"></span> ' + (I18N[currentLang]['search-loading']);
    $('searchResults').innerHTML = '';
    try {
      const url = 'https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=10&q=' + encodeURIComponent(q);
      const resp = await fetch(url, {
        headers: { 'Accept-Language': currentLang === 'ar' ? 'ar' : currentLang },
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      searchResultsList = data;
      renderSearchResults(data);
      if (data.length === 0) {
        status.textContent = I18N[currentLang]['search-empty'];
      } else {
        status.textContent = data.length + ' résultats';
      }
    } catch (e) {
      status.textContent = I18N[currentLang]['search-error'] + ' (' + e.message + ')';
    }
  }
  function renderSearchResults(results) {
    const container = $('searchResults');
    container.innerHTML = '';
    results.forEach((r, idx) => {
      const div = document.createElement('div');
      div.className = 'search-result';
      const u = latLonToUTM(parseFloat(r.lat), parseFloat(r.lon));
      const icon = r.type === 'city' || r.class === 'place' ? '🏙️' :
                   r.type === 'peak' ? '⛰️' :
                   r.type === 'restaurant' || r.category === 'amenity' ? '🍽️' :
                   r.type === 'hotel' ? '🏨' :
                   r.type === 'museum' ? '🏛️' :
                   r.type === 'park' ? '🌳' :
                   r.type === 'railway' ? '🚉' :
                   r.type === 'aerodrome' || r.type === 'airport' ? '✈️' :
                   '📍';
      const name = r.display_name.split(',').slice(0, 2).join(',');
      div.innerHTML =
        '<div class="search-result-icon">' + icon + '</div>' +
        '<div class="search-result-info">' +
          '<div class="search-result-type">' + (r.type || r.class || 'lieu') + '</div>' +
          '<div class="search-result-name">' + name + '</div>' +
          '<div class="search-result-coords">' + parseFloat(r.lat).toFixed(5) + '°, ' + parseFloat(r.lon).toFixed(5) + '° · UTM ' + u.zone + u.hemisphere + ' X=' + u.x.toFixed(0) + ' Y=' + u.y.toFixed(0) + '</div>' +
        '</div>' +
        '<div class="search-result-actions">' +
          '<button class="search-result-btn" data-idx="' + idx + '" data-action="goto">📍 Voir</button>' +
          '<button class="search-result-btn" data-idx="' + idx + '" data-action="add">+ WP</button>' +
        '</div>';
      container.appendChild(div);
    });
    container.querySelectorAll('.search-result-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx, 10);
        const action = btn.dataset.action;
        const r = searchResultsList[idx];
        if (!r) return;
        if (action === 'goto') {
          switchTab('carte');
          setTimeout(() => {
            if (fullMapState.initialized) {
              fullMapState.map.setView([parseFloat(r.lat), parseFloat(r.lon)], 16);
              // Add a temporary marker
              const icon = L.divIcon({
                className: 'search-marker',
                html: '<div style="background:#1976D2;width:24px;height:24px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>',
                iconSize: [24, 24],
                iconAnchor: [12, 12],
              });
              L.marker([parseFloat(r.lat), parseFloat(r.lon)], { icon: icon })
                .addTo(fullMapState.map)
                .bindPopup('<b>' + r.display_name.split(',')[0] + '</b><br>' + r.display_name)
                .openPopup();
            }
          }, 100);
        } else if (action === 'add') {
          const stored = JSON.parse(localStorage.getItem('subtopo-waypoints') || '[]');
          stored.push({
            name: r.display_name.split(',').slice(0, 2).join(','),
            lat: parseFloat(r.lat),
            lon: parseFloat(r.lon),
            alt: 0,
            accuracy: 0,
            quality: '—',
            timestamp: new Date().toISOString(),
          });
          localStorage.setItem('subtopo-waypoints', JSON.stringify(stored));
          drawAllSavedWaypoints();
          showToast('✅ Waypoint ajouté', 'success');
        }
      });
    });
  }

  /* ========================================== */
  /* STATE                                      */
  /* ========================================== */
  const state = {
    activeTab: 'releve',
    mode: 'navigation', // 'navigation' | 'leving'
    isSurveying: false,
    measurements: [],
    startTime: null,
    durationTimer: null,
    measurementTimer: null,
    basePosition: { lat: 36.8065, lon: 10.1815, alt: 4 }, // Tunis par défaut
    coordFormat: 'utm', // 'utm' | 'geo'
    utmZoneOverride: 'auto', // 'auto' | '1N'..'60N'
    // Tracking
    isTracking: false,
    currentTrack: null,
    tracks: [],
    trackTimer: null,
    trackGeolocId: null,
    mapLayer: 'topo', // 'topo' | 'osm' | 'satellite'
    // Navigation
    targetWaypoint: null, // { name, lat, lon, alt }
    targetMarker: null,   // Leaflet marker
    targetLine: null,     // Line from user to target
    pickerMap: null,      // Map in modal
    pickerMarker: null,   // Marker in picker map
    lastUserPos: null,    // For nav updates
    settings: {
      avgDuration: 300,
      ntripEnabled: false,
      ntripServer: '',
      ntripMount: '',
      ntripUser: '',
      ntripPass: '',
      elevMask: 15,
      snrThresh: 30,
      useGps: true,
      useGalileo: true,
      useGlonass: true,
      useBeidou: true,
    },
  };

  /* ========================================== */
  /* DOM SHORTCUTS                              */
  /* ========================================== */
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => document.querySelectorAll(sel);

  /* ========================================== */
  /* SPLASH                                     */
  /* ========================================== */
  function initSplash() {
    setTimeout(() => {
      $('splash').classList.remove('active');
      $('splash').classList.add('hidden');
      $('app').classList.remove('hidden');
    }, 2200);
  }

  /* ========================================== */
  /* TABS                                       */
  /* ========================================== */
  function switchTab(tabId) {
    state.activeTab = tabId;
    $$('.tab').forEach((t) => t.classList.remove('active'));
    $$('.nav-item').forEach((n) => n.classList.remove('active'));
    const tab = $(`tab-${tabId}`);
    if (tab) tab.classList.add('active');
    const navBtn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    if (navBtn) navBtn.classList.add('active');
    closeDrawer();
    if (tabId === 'mesures') renderMesures();
    if (tabId === 'resultats') {
      renderResultats();
      setTimeout(() => {
        if (!mapState.initialized) {
          initMap();
          initMapControls();
          if (mapState.geolocActive) initGeolocation();
        } else {
          mapState.map.invalidateSize();
        }
        const r = computeWeightedResult();
        if (r) showResultOnMap(r);
      }, 50);
    }
    if (tabId === 'carte') {
      setTimeout(() => {
        if (!fullMapState.initialized) {
          initFullMap();
          initCarteControls();
          loadTarget();
        } else {
          fullMapState.map.invalidateSize();
        }
        // If mini map isn't initialized, do it now
        if (!miniMapState.initialized) initMiniMap();
        // If user is tracking, redraw the track on the full map
        if (state.isTracking && state.currentTrack) {
          updateTrackOnMap(fullMapState.map, fullMapState, state.currentTrack.points, true);
        }
        drawAllSavedTracks();
        drawAllSavedWaypoints();
        // If we have a target waypoint, show it
        if (state.targetWaypoint) {
          showTargetOnMap();
          updateNavigationDisplay();
        }
      }, 50);
    }
    if (tabId === 'releve') {
      // Init mini map if needed
      setTimeout(() => {
        if (!miniMapState.initialized) initMiniMap();
        else miniMapState.map.invalidateSize();
        // If tracking, show current track
        if (state.isTracking && state.currentTrack) {
          updateTrackOnMap(miniMapState.map, miniMapState, state.currentTrack.points, true);
        }
      }, 50);
    }
  }

  function initTabs() {
    $$('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    $$('.drawer-nav a').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab(a.dataset.tab);
      });
    });
  }

  /* ========================================== */
  /* DRAWER                                     */
  /* ========================================== */
  function openDrawer() {
    $('drawer').classList.add('open');
    $('drawerOverlay').classList.add('visible');
  }

  function closeDrawer() {
    $('drawer').classList.remove('open');
    $('drawerOverlay').classList.remove('visible');
  }

  function initDrawer() {
    $('menuBtn').addEventListener('click', openDrawer);
    $('drawerOverlay').addEventListener('click', closeDrawer);
    $('aboutBtn').addEventListener('click', () => switchTab('about'));
  }

  /* ========================================== */
  /* MODE TOGGLE                                */
  /* ========================================== */
  function initModeToggle() {
    $$('.mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (state.isSurveying) {
          showToast('Arrête le relevé avant de changer de mode', 'warn');
          return;
        }
        $$('.mode-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.mode = btn.dataset.mode;
        showToast(
          state.mode === 'navigation'
            ? '🧭 Mode Navigation activé (temps réel, moins précis)'
            : '🎯 Mode Levé de précision activé (moyennage + corrections)',
          'success'
        );
      });
    });
  }

  /* ========================================== */
  /* SURVEY CONTROL                             */
  /* ========================================== */
  function initSurvey() {
    $('startBtn').addEventListener('click', startSurvey);
    $('stopBtn').addEventListener('click', stopSurvey);
  }

  // Real GPS mode: use actual W3C Geolocation positions
  const surveyState = {
    useRealGps: true, // toggle in settings
    surveyGeolocId: null,
    lastGpsFix: null,
  };

  function generateMeasurement() {
    if (surveyState.useRealGps && surveyState.lastGpsFix) {
      // Use real GPS data
      const fix = surveyState.lastGpsFix;
      const cfg = state.mode === 'leving'
        ? { noiseLat: 0.0000001, noiseLon: 0.0000001, noiseAlt: 0.05, accBase: Math.max(0.5, fix.accuracy * 0.8) }
        : { noiseLat: 0.0000005, noiseLon: 0.0000005, noiseAlt: 0.3, accBase: Math.max(1.5, fix.accuracy) };
      const t = (Date.now() - state.startTime) / 1000;
      const dLat = (Math.random() - 0.5) * cfg.noiseLat;
      const dLon = (Math.random() - 0.5) * cfg.noiseLon;
      const dAlt = (Math.random() - 0.5) * cfg.noiseAlt;
      const measurement = {
        timestamp: Date.now(),
        lat: fix.lat + dLat,
        lon: fix.lon + dLon,
        alt: fix.alt + dAlt,
        accuracy: cfg.accBase * (0.85 + Math.random() * 0.3),
        satellites: fix.satellites || 12,
        fixType: fix.accuracy < 2 ? 'RTK FIXED' : fix.accuracy < 5 ? 'DGPS' : 'STANDALONE',
        hdop: 0.5 + Math.random() * 0.5,
        vdop: 1.0 + Math.random() * 0.5,
        pdop: 0,
        snrList: generateSnrList({ gps: 8, galileo: 6, glonass: 4, beidou: 5 }),
        satellitesBySystem: { gps: 8, galileo: 6, glonass: 4, beidou: 5 },
      };
      measurement.pdop = Math.sqrt(measurement.hdop ** 2 + measurement.vdop ** 2);
      state.measurements.push(measurement);
      updateMeasurementDisplay(measurement);
    } else {
      // Fallback: simulated measurement
      generateSimulatedMeasurement();
    }
  }

  function generateSimulatedMeasurement() {
    const t = (Date.now() - state.startTime) / 1000;
    const config = state.mode === 'leving'
      ? { noiseLat: 0.0000008, noiseLon: 0.0000008, noiseAlt: 0.3, accBase: 0.6 }
      : { noiseLat: 0.000005,  noiseLon: 0.000005,  noiseAlt: 1.2, accBase: 2.5 };
    const base = state.basePosition;
    const dLat = (Math.random() - 0.5) * config.noiseLat + Math.sin(t * 0.1) * config.noiseLat * 0.3;
    const dLon = (Math.random() - 0.5) * config.noiseLon + Math.cos(t * 0.1) * config.noiseLon * 0.3;
    const dAlt = (Math.random() - 0.5) * config.noiseAlt;
    const lat = base.lat + dLat;
    const lon = base.lon + dLon;
    const alt = base.alt + dAlt;
    let fixType, accMul;
    if (state.mode === 'leving' && state.settings.ntripEnabled) {
      if (t > 8)        { fixType = 'RTK FIXED'; accMul = 0.5; }
      else if (t > 4)   { fixType = 'RTK FLOAT'; accMul = 1.0; }
      else if (t > 2)   { fixType = 'DGPS';      accMul = 1.8; }
      else              { fixType = 'STANDALONE'; accMul = 3.0; }
    } else if (state.mode === 'leving') {
      if (t > 3)        { fixType = 'DGPS';      accMul = 1.8; }
      else              { fixType = 'STANDALONE'; accMul = 3.0; }
    } else {
      fixType = 'STANDALONE';
      accMul = 2.0;
    }
    const accuracy = (config.accBase * accMul) * (0.7 + Math.random() * 0.6);
    const satellites = {
      gps: state.settings.useGps ? 6 + Math.floor(Math.random() * 5) : 0,
      galileo: state.settings.useGalileo ? 4 + Math.floor(Math.random() * 4) : 0,
      glonass: state.settings.useGlonass ? 3 + Math.floor(Math.random() * 4) : 0,
      beidou: state.settings.useBeidou ? 3 + Math.floor(Math.random() * 5) : 0,
    };
    const totalSats = satellites.gps + satellites.galileo + satellites.glonass + satellites.beidou;
    const hdop = 0.5 + (15 / Math.max(totalSats, 5)) + (Math.random() - 0.5) * 0.2;
    const vdop = 1.0 + (15 / Math.max(totalSats, 5)) + (Math.random() - 0.5) * 0.3;
    const pdop = Math.sqrt(hdop * hdop + vdop * vdop);
    const snrList = generateSnrList(satellites);
    const measurement = {
      timestamp: Date.now(),
      lat, lon, alt,
      accuracy, satellites: totalSats, satellitesBySystem: satellites,
      hdop, vdop, pdop, snrList, fixType,
    };
    state.measurements.push(measurement);
    updateMeasurementDisplay(measurement);
  }

  function startSurveyGeoloc() {
    if (!navigator.geolocation) {
      showToast('Géolocalisation non disponible', 'warn');
      return;
    }
    surveyState.surveyGeolocId = navigator.geolocation.watchPosition(
      (pos) => {
        surveyState.lastGpsFix = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          alt: pos.coords.altitude || 0,
          accuracy: pos.coords.accuracy,
          satellites: 12,
        };
      },
      (err) => console.warn('Survey geoloc:', err.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  }

  function stopSurveyGeoloc() {
    if (surveyState.surveyGeolocId !== null) {
      navigator.geolocation.clearWatch(surveyState.surveyGeolocId);
      surveyState.surveyGeolocId = null;
    }
    surveyState.lastGpsFix = null;
  }

  function startSurvey() {
    if (state.isSurveying) return;
    state.isSurveying = true;
    state.measurements = [];
    state.startTime = Date.now();

    $('startBtn').classList.add('hidden');
    $('stopBtn').classList.remove('hidden');
    $('lastMeasureCard').hidden = false;
    $('snrCard').hidden = false;

    const status = $('status');
    status.textContent = 'En cours';
    status.className = 'status-active';

    if (!state.isTracking) {
      startTracking();
    }
    if (surveyState.useRealGps) {
      startSurveyGeoloc();
    }

    setTimeout(() => generateMeasurement(), 200);
    state.measurementTimer = setInterval(generateMeasurement, 2000);
    state.durationTimer = setInterval(updateDuration, 1000);

    showToast(
      state.mode === 'leving'
        ? '🎯 Levé de précision démarré (tracking + GPS actif)'
        : '🧭 Mode Navigation démarré (tracking + GPS actif)',
      'success'
    );
  }

  function stopSurvey() {
    if (!state.isSurveying) return;
    state.isSurveying = false;
    clearInterval(state.measurementTimer);
    clearInterval(state.durationTimer);
    stopSurveyGeoloc();

    $('startBtn').classList.remove('hidden');
    $('stopBtn').classList.add('hidden');

    const status = $('status');
    status.textContent = 'Arrêté';
    status.className = 'status-stopped';

    showToast('⏹ Relevé arrêté — ' + state.measurements.length + ' mesures', 'success');

    if (state.measurements.length >= 3) {
      setTimeout(() => switchTab('resultats'), 600);
    }
  }

  function updateDuration() {
    if (!state.startTime) return;
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
    const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    $('duration').textContent = `${h}:${m}:${s}`;
  }

  /* ========================================== */
  /* SIMULATED GNSS MEASUREMENT                 */
  /* ========================================== */
  function generateMeasurement() {
    const t = (Date.now() - state.startTime) / 1000;
    const config = state.mode === 'leving'
      ? { noiseLat: 0.0000008, noiseLon: 0.0000008, noiseAlt: 0.3, accBase: 0.6 }
      : { noiseLat: 0.000005,  noiseLon: 0.000005,  noiseAlt: 1.2, accBase: 2.5 };

    // Random walk noise
    const base = state.basePosition;
    const dLat = (Math.random() - 0.5) * config.noiseLat + Math.sin(t * 0.1) * config.noiseLat * 0.3;
    const dLon = (Math.random() - 0.5) * config.noiseLon + Math.cos(t * 0.1) * config.noiseLon * 0.3;
    const dAlt = (Math.random() - 0.5) * config.noiseAlt;

    const lat = base.lat + dLat;
    const lon = base.lon + dLon;
    const alt = base.alt + dAlt;

    // Fix type progression
    let fixType, accMul;
    if (state.mode === 'leving' && state.settings.ntripEnabled) {
      // RTK-fixed after some time
      if (t > 8)        { fixType = 'RTK FIXED'; accMul = 0.5; }
      else if (t > 4)   { fixType = 'RTK FLOAT'; accMul = 1.0; }
      else if (t > 2)   { fixType = 'DGPS';      accMul = 1.8; }
      else              { fixType = 'STANDALONE'; accMul = 3.0; }
    } else if (state.mode === 'leving') {
      if (t > 3)        { fixType = 'DGPS';      accMul = 1.8; }
      else              { fixType = 'STANDALONE'; accMul = 3.0; }
    } else {
      fixType = 'STANDALONE';
      accMul = 2.0;
    }

    const accuracy = (config.accBase * accMul) * (0.7 + Math.random() * 0.6);

    // Satellites per constellation
    const satellites = {
      gps:    state.settings.useGps    ? 6 + Math.floor(Math.random() * 5) : 0,
      galileo: state.settings.useGalileo ? 4 + Math.floor(Math.random() * 4) : 0,
      glonass: state.settings.useGlonass ? 3 + Math.floor(Math.random() * 4) : 0,
      beidou:  state.settings.useBeidou  ? 3 + Math.floor(Math.random() * 5) : 0,
    };

    // DOP values
    const totalSats = satellites.gps + satellites.galileo + satellites.glonass + satellites.beidou;
    const hdop = 0.5 + (15 / Math.max(totalSats, 5)) + (Math.random() - 0.5) * 0.2;
    const vdop = 1.0 + (15 / Math.max(totalSats, 5)) + (Math.random() - 0.5) * 0.3;
    const pdop = Math.sqrt(hdop * hdop + vdop * vdop);

    // Per-satellite SNR (sample of total visible)
    const snrList = generateSnrList(satellites);

    const measurement = {
      timestamp: Date.now(),
      lat, lon, alt,
      accuracy,
      satellites: totalSats,
      satellitesBySystem: satellites,
      hdop, vdop, pdop,
      snrList,
      fixType,
    };

    state.measurements.push(measurement);
    updateMeasurementDisplay(measurement);
  }

  function generateSnrList(satellites) {
    const list = [];
    const addSat = (system, count) => {
      for (let i = 0; i < count; i++) {
        list.push({
          system,
          prn: `${system.toUpperCase().slice(0, 3)}${String(Math.floor(Math.random() * 32) + 1).padStart(2, '0')}`,
          snr: 28 + Math.random() * 18, // 28-46 dB·Hz
        });
      }
    };
    addSat('gps', satellites.gps);
    addSat('gal', satellites.galileo);
    addSat('glo', satellites.glonass);
    addSat('bds', satellites.beidou);
    return list;
  }

  function updateMeasurementDisplay(m) {
    $('measurementCount').textContent = state.measurements.length;
    const u = formatCoord(m);
    const unit = state.coordFormat === 'geo' ? '' : ' m';
    $('lastLat').textContent = u.x + unit;
    $('lastLon').textContent = u.y + unit;
    $('lastAlt').textContent = u.z + ' m';
    if (u.zone) $('lastZone').textContent = u.zone;
    else $('lastZone').textContent = '';
    $('lastAccuracy').textContent = '±' + m.accuracy.toFixed(2) + ' m';
    $('lastSats').textContent = m.satellites;
    $('lastDop').textContent = `${m.hdop.toFixed(2)} / ${m.vdop.toFixed(2)} / ${m.pdop.toFixed(2)}`;
    $('lastFix').textContent = m.fixType;

    $('gpsCount').textContent = m.satellitesBySystem.gps;
    $('galCount').textContent = m.satellitesBySystem.galileo;
    $('gloCount').textContent = m.satellitesBySystem.glonass;
    $('bdsCount').textContent = m.satellitesBySystem.beidou;

    renderSnrChart(m.snrList);
  }

  function renderSnrChart(snrList) {
    const chart = $('snrChart');
    chart.innerHTML = '';
    snrList.forEach((sat) => {
      const bar = document.createElement('div');
      bar.className = `snr-bar ${sat.system}`;
      const heightPct = Math.max(20, ((sat.snr - 20) / 30) * 100);
      bar.style.height = heightPct + '%';
      bar.dataset.snr = sat.snr.toFixed(0);
      bar.title = `${sat.prn} — ${sat.snr.toFixed(1)} dB·Hz`;
      chart.appendChild(bar);
    });
  }

  /* ========================================== */
  /* WEIGHTED AVERAGE & RMS                     */
  /* ========================================== */
  function computeWeightedResult() {
    const ms = state.measurements;
    if (ms.length === 0) return null;

    let sumW = 0;
    let sumLat = 0, sumLon = 0, sumAlt = 0;
    ms.forEach((m) => {
      const w = 1 / (m.accuracy * m.accuracy);
      sumW += w;
      sumLat += m.lat * w;
      sumLon += m.lon * w;
      sumAlt += m.alt * w;
    });

    const result = {
      lat: sumLat / sumW,
      lon: sumLon / sumW,
      alt: sumAlt / sumW,
    };

    // RMS 2D in meters
    const cosLat = Math.cos((result.lat * Math.PI) / 180);
    const mPerDegLat = 111320;
    const mPerDegLon = 111320 * cosLat;

    let sumW2D = 0, sumW3D = 0;
    ms.forEach((m) => {
      const w = 1 / (m.accuracy * m.accuracy);
      const dLatM = (m.lat - result.lat) * mPerDegLat;
      const dLonM = (m.lon - result.lon) * mPerDegLon;
      const dAltM = m.alt - result.alt;
      sumW2D += (dLatM * dLatM + dLonM * dLonM) * w;
      sumW3D += (dLatM * dLatM + dLonM * dLonM + dAltM * dAltM) * w;
    });

    result.rms2D = Math.sqrt(sumW2D / sumW);
    result.rms3D = Math.sqrt(sumW3D / sumW);
    result.accuracy95 = result.rms3D * 1.96;
    result.quality = getQuality(result.rms3D);
    result.count = ms.length;
    result.duration = Math.floor((Date.now() - state.startTime) / 1000);

    return result;
  }

  function getQuality(rms3D) {
    if (rms3D < 0.5)  return { label: 'Excellente', cls: 'quality-excellent' };
    if (rms3D < 1.0)  return { label: 'Bonne',      cls: 'quality-good' };
    if (rms3D < 2.0)  return { label: 'Moyenne',    cls: 'quality-medium' };
    if (rms3D < 5.0)  return { label: 'Faible',     cls: 'quality-poor' };
    return { label: 'Insuffisante', cls: 'quality-poor' };
  }

  /* ========================================== */
  /* MESURES LIST                               */
  /* ========================================== */
  function renderMesures() {
    const list = $('mesuresList');
    const empty = $('mesuresEmpty');

    if (state.measurements.length === 0) {
      empty.style.display = 'block';
      list.innerHTML = '';
      return;
    }
    empty.style.display = 'none';
    list.innerHTML = '';

    state.measurements.slice().reverse().forEach((m) => {
      const li = document.createElement('li');
      li.className = 'mesure-item';
      const d = new Date(m.timestamp);
      const time = d.toLocaleTimeString('fr-FR', { hour12: false });
      const u = formatCoord(m);
      const unit = state.coordFormat === 'geo' ? '' : ' m';
      const lblX = state.coordFormat === 'geo' ? 'φ' : 'X';
      const lblY = state.coordFormat === 'geo' ? 'λ' : 'Y';
      const lblZ = 'Z';
      li.innerHTML = `
        <div class="mesure-header">
          <span class="mesure-time">${time}${u.zone ? ' <span class="mesure-zone">' + u.zone + '</span>' : ''}</span>
          <span class="mesure-fix">${m.fixType}</span>
        </div>
        <div class="mesure-coords">
          <span class="coord-label">${lblX}</span> <span class="coord-val">${u.x}</span>${unit}<br>
          <span class="coord-label">${lblY}</span> <span class="coord-val">${u.y}</span>${unit}<br>
          <span class="coord-label">${lblZ}</span> <span class="coord-val">${u.z}</span> m
        </div>
        <div class="mesure-stats">
          <span>🛰 ${m.satellites} sats</span>
          <span>📏 ±${m.accuracy.toFixed(2)} m</span>
          <span>PDOP ${m.pdop.toFixed(2)}</span>
        </div>
      `;
      list.appendChild(li);
    });
  }

  /* ========================================== */
  /* RÉSULTATS                                  */
  /* ========================================== */
  function renderResultats() {
    const result = computeWeightedResult();
    const empty = $('resultatsEmpty');
    const content = $('resultatsContent');

    if (!result) {
      empty.style.display = 'block';
      content.classList.add('hidden');
      return;
    }
    empty.style.display = 'none';
    content.classList.remove('hidden');

    const u = formatCoord(result);
    const unit = state.coordFormat === 'geo' ? '' : ' m';
    $('resultLat').textContent = u.x + unit;
    $('resultLon').textContent = u.y + unit;
    $('resultAlt').textContent = u.z + ' m';
    $('resultZone').textContent = u.zone || '—';
    $('resultRms2D').textContent = result.rms2D.toFixed(3) + ' m';
    $('resultRms3D').textContent = result.rms3D.toFixed(3) + ' m';
    $('resultAccuracy').textContent = '±' + result.accuracy95.toFixed(2) + ' m';

    const q = $('resultQuality');
    q.textContent = result.quality.label;
    q.className = 'quality-badge ' + result.quality.cls;

    $('resultCount').textContent = result.count;
    const dur = result.duration;
    $('resultDuration').textContent = `${Math.floor(dur / 60)}m ${dur % 60}s`;
  }

  /* ========================================== */
  /* COORDINATE FORMAT TOGGLE                   */
  /* ========================================== */
  function initCoordToggle() {
    const btn = $('coordToggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      state.coordFormat = state.coordFormat === 'utm' ? 'geo' : 'utm';
      localStorage.setItem('subtopo-coord-format', state.coordFormat);
      updateCoordLabels();
      // Re-render current displays
      if (state.measurements.length > 0) {
        const last = state.measurements[state.measurements.length - 1];
        updateMeasurementDisplay(last);
        const r = computeWeightedResult();
        if (r) {
          renderResultats();
          showResultOnMap(r);
        }
        if (state.activeTab === 'mesures') renderMesures();
      }
      showToast(
        state.coordFormat === 'utm'
          ? '📐 Mode UTM (X, Y, Z)'
          : '🌍 Mode Géographique (Lat, Lon)',
        'success'
      );
    });
  }

  function populateUtmZoneOptions() {
    const sel = $('utmZoneOverride');
    if (!sel) return;
    sel.innerHTML = '<option value="auto">🔄 Auto (calculée depuis la longitude)</option>';
    // Zones 1-60N par défaut
    for (let z = 1; z <= 60; z++) {
      const opt = document.createElement('option');
      opt.value = z + 'N';
      opt.textContent = `📍 Force zone ${z}N`;
      sel.appendChild(opt);
    }
  }

  /* ========================================== */
  /* EXPORT                                     */
  /* ========================================== */
  function getWaypoints() {
    const result = computeWeightedResult();
    if (!result) return [];
    const u = formatXYZ(result); // exports always use UTM (industry standard for topo)
    return [{
      name: 'SubTopo Point',
      lat: result.lat,
      lon: result.lon,
      alt: result.alt,
      x: parseFloat(u.x),
      y: parseFloat(u.y),
      z: parseFloat(u.z),
      zone: u.zone,
      rms3D: result.rms3D,
      accuracy: result.accuracy95,
      quality: result.quality.label,
      timestamp: new Date().toISOString(),
    }];
  }

  function exportGPX() {
    const wps = getWaypoints();
    if (wps.length === 0) { showToast('Aucun point à exporter', 'warn'); return; }
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<gpx version="1.1" creator="SubTopo-GNSS" xmlns="http://www.topografix.com/GPX/1/1">\n';
    wps.forEach((w) => {
      xml += `  <wpt lat="${w.lat}" lon="${w.lon}">\n`;
      xml += `    <ele>${w.alt}</ele>\n`;
      xml += `    <time>${w.timestamp}</time>\n`;
      xml += `    <name>${w.name}</name>\n`;
      xml += `    <desc>UTM ${w.zone} | X=${w.x.toFixed(4)} m | Y=${w.y.toFixed(4)} m | Z=${w.z.toFixed(4)} m | RMS 3D=${w.rms3D.toFixed(3)} m | Précision 95%=±${w.accuracy.toFixed(2)} m | Qualité=${w.quality}</desc>\n`;
      xml += `    <sym>Pin, Red</sym>\n`;
      xml += '  </wpt>\n';
    });
    xml += '</gpx>\n';
    downloadFile(xml, 'subtopo-waypoint.gpx', 'application/gpx+xml');
    showToast('✅ Fichier GPX téléchargé', 'success');
  }

  function exportKML() {
    const wps = getWaypoints();
    if (wps.length === 0) { showToast('Aucun point à exporter', 'warn'); return; }
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<kml xmlns="http://www.opengis.net/kml/2.2">\n';
    xml += '  <Document>\n';
    xml += '    <name>SubTopo-GNSS Waypoints</name>\n';
    wps.forEach((w) => {
      const desc = `<![CDATA[
<b>Coordonnées UTM (${w.zone})</b><br>
X (Easting): ${w.x.toFixed(4)} m<br>
Y (Northing): ${w.y.toFixed(4)} m<br>
Z (Altitude): ${w.z.toFixed(4)} m<br>
<br>
<b>Qualité</b><br>
RMS 3D: ${w.rms3D.toFixed(3)} m<br>
Précision 95%: ±${w.accuracy.toFixed(2)} m<br>
Qualité: ${w.quality}
]]>`;
      xml += '    <Placemark>\n';
      xml += `      <name>${w.name}</name>\n`;
      xml += `      <description>${desc}</description>\n`;
      xml += '      <Point>\n';
      xml += `        <coordinates>${w.lon},${w.lat},${w.alt}</coordinates>\n`;
      xml += '      </Point>\n';
      xml += '    </Placemark>\n';
    });
    xml += '  </Document>\n</kml>\n';
    downloadFile(xml, 'subtopo-waypoint.kml', 'application/vnd.google-earth.kml+xml');
    showToast('✅ Fichier KML téléchargé', 'success');
  }

  function exportCSV() {
    const wps = getWaypoints();
    if (wps.length === 0) { showToast('Aucun point à exporter', 'warn'); return; }
    let csv = 'name,utm_zone,X_easting_m,Y_northing_m,Z_altitude_m,latitude,longitude,rms3D_m,accuracy95_m,quality,timestamp\n';
    wps.forEach((w) => {
      csv += `${w.name},${w.zone},${w.x.toFixed(4)},${w.y.toFixed(4)},${w.z.toFixed(4)},${w.lat.toFixed(7)},${w.lon.toFixed(7)},${w.rms3D.toFixed(3)},${w.accuracy.toFixed(2)},${w.quality},${w.timestamp}\n`;
    });
    downloadFile(csv, 'subtopo-waypoint.csv', 'text/csv');
    showToast('✅ Fichier CSV téléchargé (colonnes UTM)', 'success');
  }

  function downloadFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  function initExports() {
    $$('.export-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const format = btn.dataset.format;
        if (format === 'gpx') exportGPX();
        else if (format === 'kml') exportKML();
        else if (format === 'csv') exportCSV();
        else if (format === 'geojson') exportGeoJSON();
      });
    });
    $$('.export-card').forEach((card) => {
      card.addEventListener('click', () => {
        const format = card.dataset.format;
        if (format === 'gpx') exportGPX();
        else if (format === 'kml') exportKML();
        else if (format === 'csv') exportCSV();
        else if (format === 'geojson') exportGeoJSON();
      });
    });
    $('saveWaypointBtn').addEventListener('click', () => {
      const r = computeWeightedResult();
      if (!r) { showToast('Aucun point à enregistrer', 'warn'); return; }
      saveWaypoint(r);
    });
    $('exportCsvBtn').addEventListener('click', exportCSV);
  }

  function saveWaypoint(r) {
    const stored = JSON.parse(localStorage.getItem('subtopo-waypoints') || '[]');
    stored.push({
      name: 'Point ' + (stored.length + 1),
      lat: r.lat, lon: r.lon, alt: r.alt,
      accuracy: r.accuracy95, rms3D: r.rms3D, quality: r.quality.label,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem('subtopo-waypoints', JSON.stringify(stored));
    showToast('📍 Waypoint enregistré localement', 'success');
  }

  /* ========================================== */
  /* SETTINGS                                   */
  /* ========================================== */
  function loadSettings() {
    const stored = localStorage.getItem('subtopo-settings');
    if (stored) {
      try {
        Object.assign(state.settings, JSON.parse(stored));
      } catch (e) { /* ignore */ }
    }
    // Coord format & zone override
    const cf = localStorage.getItem('subtopo-coord-format');
    if (cf === 'utm' || cf === 'geo') state.coordFormat = cf;
    const uz = localStorage.getItem('subtopo-utm-zone');
    if (uz) state.utmZoneOverride = uz;

    $('avgDuration').value       = state.settings.avgDuration;
    $('ntripEnabled').checked    = state.settings.ntripEnabled;
    $('ntripServer').value       = state.settings.ntripServer;
    $('ntripMount').value        = state.settings.ntripMount;
    $('ntripUser').value         = state.settings.ntripUser;
    $('ntripPass').value         = state.settings.ntripPass;
    $('elevMask').value          = state.settings.elevMask;
    $('snrThresh').value         = state.settings.snrThresh;
    $('useGps').checked          = state.settings.useGps;
    $('useGalileo').checked      = state.settings.useGalileo;
    $('useGlonass').checked      = state.settings.useGlonass;
    $('useBeidou').checked       = state.settings.useBeidou;
    $('coordFormat').value       = state.coordFormat;
    $('utmZoneOverride').value   = state.utmZoneOverride;
    updateCoordLabels();
  }

  function saveSettings() {
    state.settings.avgDuration   = parseInt($('avgDuration').value, 10);
    state.settings.ntripEnabled  = $('ntripEnabled').checked;
    state.settings.ntripServer   = $('ntripServer').value.trim();
    state.settings.ntripMount    = $('ntripMount').value.trim();
    state.settings.ntripUser     = $('ntripUser').value.trim();
    state.settings.ntripPass     = $('ntripPass').value;
    state.settings.elevMask      = parseFloat($('elevMask').value);
    state.settings.snrThresh     = parseFloat($('snrThresh').value);
    state.settings.useGps        = $('useGps').checked;
    state.settings.useGalileo    = $('useGalileo').checked;
    state.settings.useGlonass    = $('useGlonass').checked;
    state.settings.useBeidou     = $('useBeidou').checked;
    state.coordFormat            = $('coordFormat').value;
    state.utmZoneOverride        = $('utmZoneOverride').value;
    localStorage.setItem('subtopo-settings', JSON.stringify(state.settings));
    localStorage.setItem('subtopo-coord-format', state.coordFormat);
    localStorage.setItem('subtopo-utm-zone', state.utmZoneOverride);
    updateCoordLabels();
    // Re-render any visible coord display
    if (state.measurements.length > 0) {
      const last = state.measurements[state.measurements.length - 1];
      updateMeasurementDisplay(last);
      const r = computeWeightedResult();
      if (r) {
        renderResultats();
        showResultOnMap(r);
      }
      if (state.activeTab === 'mesures') renderMesures();
    }
    const status = $('settingsStatus');
    status.textContent = '✅ Paramètres enregistrés';
    setTimeout(() => { status.textContent = ''; }, 2500);
  }

  function initSettings() {
    populateUtmZoneOptions();
    $('saveSettings').addEventListener('click', saveSettings);
  }

  /* ========================================== */
  /* UTM CONVERSION (WGS84 → UTM)               */
  /* ========================================== */
  function latLonToUTM(lat, lon) {
    const a = 6378137.0;            // WGS84 semi-major
    const f = 1 / 298.257223563;    // WGS84 flattening
    const e2 = 2 * f - f * f;       // first eccentricity squared
    const ePrime2 = e2 / (1 - e2);  // second eccentricity squared
    const k0 = 0.9996;              // UTM scale factor on central meridian

    const zone = Math.floor((lon + 180) / 6) + 1;
    const lonOrigin = (zone - 1) * 6 - 180 + 3; // central meridian
    const lonOriginRad = (lonOrigin * Math.PI) / 180;
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;

    const N = a / Math.sqrt(1 - e2 * Math.sin(latRad) * Math.sin(latRad));
    const T = Math.tan(latRad) * Math.tan(latRad);
    const C = ePrime2 * Math.cos(latRad) * Math.cos(latRad);
    const A = Math.cos(latRad) * (lonRad - lonOriginRad);

    const M = a * (
      (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256) * latRad
      - (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 * e2 * e2 / 1024) * Math.sin(2 * latRad)
      + (15 * e2 * e2 / 256 + 45 * e2 * e2 * e2 / 1024) * Math.sin(4 * latRad)
      - (35 * e2 * e2 * e2 / 3072) * Math.sin(6 * latRad)
    );

    const easting = k0 * N * (
      A + (1 - T + C) * Math.pow(A, 3) / 6
      + (5 - 18 * T + T * T + 72 * C - 58 * ePrime2) * Math.pow(A, 5) / 120
    ) + 500000.0;

    let northing = k0 * (
      M + N * Math.tan(latRad) * (
        A * A / 2
        + (5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4) / 24
        + (61 - 58 * T + T * T + 600 * C - 330 * ePrime2) * Math.pow(A, 6) / 720
      )
    );

    if (lat < 0) northing += 10000000.0; // Southern hemisphere offset

    return {
      x: easting,
      y: northing,
      zone: zone,
      hemisphere: lat >= 0 ? 'N' : 'S',
    };
  }

  function formatXYZ(m) {
    const u = latLonToUTM(m.lat, m.lon);
    let zone = u.zone + u.hemisphere;
    if (state.utmZoneOverride && state.utmZoneOverride !== 'auto') {
      // Force override — recalculate in forced zone using same algorithm
      const forced = latLonToUTMForcedZone(m.lat, m.lon, parseInt(state.utmZoneOverride, 10));
      return {
        x: forced.x.toFixed(4),
        y: forced.y.toFixed(4),
        z: (m.alt || 0).toFixed(4),
        zone: state.utmZoneOverride,
      };
    }
    return {
      x: u.x.toFixed(4),
      y: u.y.toFixed(4),
      z: (m.alt || 0).toFixed(4),
      zone: zone,
    };
  }

  // Same as latLonToUTM but with explicit zone (for override)
  function latLonToUTMForcedZone(lat, lon, zone) {
    const a = 6378137.0;
    const f = 1 / 298.257223563;
    const e2 = 2 * f - f * f;
    const ePrime2 = e2 / (1 - e2);
    const k0 = 0.9996;
    const lonOrigin = (zone - 1) * 6 - 180 + 3;
    const lonOriginRad = (lonOrigin * Math.PI) / 180;
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;
    const N = a / Math.sqrt(1 - e2 * Math.sin(latRad) * Math.sin(latRad));
    const T = Math.tan(latRad) * Math.tan(latRad);
    const C = ePrime2 * Math.cos(latRad) * Math.cos(latRad);
    const A = Math.cos(latRad) * (lonRad - lonOriginRad);
    const M = a * (
      (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256) * latRad
      - (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 * e2 * e2 / 1024) * Math.sin(2 * latRad)
      + (15 * e2 * e2 / 256 + 45 * e2 * e2 * e2 / 1024) * Math.sin(4 * latRad)
      - (35 * e2 * e2 * e2 / 3072) * Math.sin(6 * latRad)
    );
    const easting = k0 * N * (
      A + (1 - T + C) * Math.pow(A, 3) / 6
      + (5 - 18 * T + T * T + 72 * C - 58 * ePrime2) * Math.pow(A, 5) / 120
    ) + 500000.0;
    let northing = k0 * (
      M + N * Math.tan(latRad) * (
        A * A / 2
        + (5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4) / 24
        + (61 - 58 * T + T * T + 600 * C - 330 * ePrime2) * Math.pow(A, 6) / 720
      )
    );
    if (lat < 0) northing += 10000000.0;
    return { x: easting, y: northing };
  }

  // Format lat/lon as DMS or decimal depending on state
  function formatLatLon(m) {
    return {
      x: m.lat.toFixed(7) + '°',
      y: m.lon.toFixed(7) + '°',
      z: (m.alt || 0).toFixed(2) + ' m',
      zone: '',
    };
  }

  // Main format dispatcher
  function formatCoord(m) {
    if (state.coordFormat === 'geo') return formatLatLon(m);
    return formatXYZ(m);
  }

  // Update all coord labels in the UI based on current format
  function updateCoordLabels() {
    const isGeo = state.coordFormat === 'geo';
    const xLabel = isGeo ? 'Latitude' : 'X (Easting)';
    const yLabel = isGeo ? 'Longitude' : 'Y (Northing)';
    const zLabel = isGeo ? 'Altitude' : 'Z (Altitude)';
    const xUnit = isGeo ? '' : ' m';
    const yUnit = isGeo ? '' : ' m';
    const zUnit = ' m';

    const setEl = (id, txt) => { const e = $(id); if (e) e.textContent = txt; };
    setEl('lastLabelX', xLabel);
    setEl('lastLabelY', yLabel);
    setEl('lastLabelZ', zLabel);
    setEl('resultLabelX', xLabel);
    setEl('resultLabelY', yLabel);
    setEl('resultLabelZ', zLabel);

    const zoneLabelEl = $('resultZoneLabel');
    if (zoneLabelEl) {
      zoneLabelEl.textContent = isGeo ? '— Géographique' : '— UTM';
    }

    // Update toggle button
    const toggleBtn = $('coordToggle');
    if (toggleBtn) {
      toggleBtn.textContent = isGeo ? '🌍' : '📐';
      toggleBtn.title = isGeo ? 'Mode: Lat/Lon (cliquer pour UTM)' : 'Mode: UTM (cliquer pour Lat/Lon)';
    }
  }

  /* ========================================== */
  /* MAP (LEAFLET) & GEOLOCATION                */
  /* ========================================== */
  const mapState = {
    map: null,
    waypointMarker: null,
    userMarker: null,
    userCircle: null,
    geolocId: null,
    geolocActive: true,
    initialized: false,
  };

  const fullMapState = {
    map: null,
    tileLayer: null,
    userMarker: null,
    userCircle: null,
    currentTrackLine: null,
    savedTrackLines: [],
    waypointMarkers: [],
    initialized: false,
  };

  const miniMapState = {
    map: null,
    tileLayer: null,
    userMarker: null,
    userCircle: null,
    currentTrackLine: null,
    initialized: false,
  };

  // Tile layer sources
  const TILE_LAYERS = {
    topo: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: '© <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA) | © <a href="https://openstreetmap.org">OSM</a>',
      maxZoom: 17,
    },
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '© <a href="https://www.esri.com/">Esri</a> World Imagery',
      maxZoom: 19,
    },
  };

  // Overlay layers
  const OVERLAY_LAYERS = {
    hillshade: {
      url: 'https://tiles.wmflabs.org/hillshading/{z}/{x}/{y}.png',
      attribution: '© Wikimedia Labs',
      opacity: 0.5,
    },
    contours: {
      url: 'https://tiles.wmflabs.org/hillshading/{z}/{x}/{y}.png', // Same source for demo
      attribution: '© Wikimedia Labs',
      opacity: 0.3,
    },
  };

  const overlayState = {
    hillshade: null,
    contours: null,
  };

  function toggleOverlay(name, enabled) {
    if (!fullMapState.initialized) return;
    const cfg = OVERLAY_LAYERS[name];
    if (!cfg) return;
    if (enabled) {
      if (!overlayState[name]) {
        overlayState[name] = L.tileLayer(cfg.url, {
          attribution: cfg.attribution,
          opacity: cfg.opacity,
          maxZoom: 17,
        });
      }
      overlayState[name].addTo(fullMapState.map);
    } else {
      if (overlayState[name]) {
        fullMapState.map.removeLayer(overlayState[name]);
      }
    }
  }

  function createTileLayer(layerName) {
    const cfg = TILE_LAYERS[layerName] || TILE_LAYERS.topo;
    return L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    });
  }

  function initMap() {
    if (mapState.initialized) return;
    if (typeof L === 'undefined') {
      console.warn('Leaflet not loaded');
      return;
    }
    const mapEl = $('resultMap');
    if (!mapEl) return;
    mapState.map = L.map('resultMap', {
      zoomControl: true,
      attributionControl: true,
    }).setView([36.8065, 10.1815], 13);
    const resultTileLayer = createTileLayer(state.mapLayer);
    resultTileLayer.addTo(mapState.map);
    mapState.initialized = true;
    setTimeout(() => mapState.map.invalidateSize(), 200);
  }

  function showResultOnMap(result) {
    if (!mapState.map) return;
    if (mapState.waypointMarker) {
      mapState.map.removeLayer(mapState.waypointMarker);
    }
    const u = formatCoord(result);
    const isGeo = state.coordFormat === 'geo';
    const redIcon = L.divIcon({
      className: 'waypoint-marker',
      html: '<div style="background:#C62828;width:20px;height:20px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
    let coordBlock;
    if (isGeo) {
      coordBlock =
        '<b>Lat:</b> ' + u.x + '<br>' +
        '<b>Lon:</b> ' + u.y + '<br>' +
        '<b>Alt:</b> ' + u.z;
    } else {
      coordBlock =
        '<b>UTM ' + u.zone + '</b><br>' +
        '<b>X:</b> ' + u.x + ' m<br>' +
        '<b>Y:</b> ' + u.y + ' m<br>' +
        '<b>Z:</b> ' + u.z + ' m';
    }
    mapState.waypointMarker = L.marker([result.lat, result.lon], { icon: redIcon })
      .addTo(mapState.map)
      .bindPopup(
        '<b>📍 Waypoint SubTopo</b><br>' +
        coordBlock + '<br>' +
        '<hr style="margin:4px 0;border:none;border-top:1px solid #ccc;">' +
        'RMS 3D: ' + result.rms3D.toFixed(3) + ' m<br>' +
        'Précision 95%: ±' + result.accuracy95.toFixed(2) + ' m<br>' +
        'Qualité: <b>' + result.quality.label + '</b>'
      );
    mapState.map.setView([result.lat, result.lon], 17);
  }

  function initGeolocation() {
    if (!navigator.geolocation) {
      showToast("Géolocalisation non supportée par ce navigateur", 'warn');
      mapState.geolocActive = false;
      return;
    }
    if (mapState.geolocId !== null) return;
    mapState.geolocId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!mapState.map) return;
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const acc = pos.coords.accuracy;
        rememberUserPosition(lat, lon);
        if (mapState.userMarker) mapState.map.removeLayer(mapState.userMarker);
        if (mapState.userCircle) mapState.map.removeLayer(mapState.userCircle);
        const greenIcon = L.divIcon({
          className: 'user-marker',
          html: '<div style="background:#0D9488;width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px #0D9488, 0 2px 6px rgba(0,0,0,0.4);"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        const u = { lat, lon, alt: 0 };
        const fc = formatCoord(u);
        let userCoordBlock;
        if (state.coordFormat === 'geo') {
          userCoordBlock =
            'Lat: ' + fc.x + '<br>' +
            'Lon: ' + fc.y;
        } else {
          userCoordBlock =
            '<b>UTM ' + fc.zone + '</b><br>' +
            'X: ' + fc.x + ' m<br>' +
            'Y: ' + fc.y + ' m';
        }
        mapState.userMarker = L.marker([lat, lon], { icon: greenIcon })
          .addTo(mapState.map)
          .bindPopup(
            '<b>📡 Ma position (W3C Geolocation)</b><br>' +
            userCoordBlock + '<br>' +
            'Précision: ±' + acc.toFixed(1) + ' m'
          );
        mapState.userCircle = L.circle([lat, lon], {
          radius: acc,
          color: '#0D9488',
          fillColor: '#0D9488',
          fillOpacity: 0.1,
          weight: 1,
        }).addTo(mapState.map);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        if (err.code === 1) {
          showToast("Autorisation de géolocalisation refusée", 'warn');
        } else if (err.code === 2) {
          showToast("Position indisponible", 'warn');
        } else if (err.code === 3) {
          showToast("Timeout géolocalisation", 'warn');
        }
        mapState.geolocActive = false;
        const btn = $('toggleGeoloc');
        if (btn) {
          btn.classList.remove('active');
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  }

  function stopGeolocation() {
    if (mapState.geolocId !== null) {
      navigator.geolocation.clearWatch(mapState.geolocId);
      mapState.geolocId = null;
    }
    if (mapState.userMarker && mapState.map) {
      mapState.map.removeLayer(mapState.userMarker);
      mapState.userMarker = null;
    }
    if (mapState.userCircle && mapState.map) {
      mapState.map.removeLayer(mapState.userCircle);
      mapState.userCircle = null;
    }
  }

  function initMapControls() {
    const centerOnResult = $('centerOnResult');
    if (centerOnResult) {
      centerOnResult.addEventListener('click', () => {
        const r = computeWeightedResult();
        if (!r) { showToast("Aucun waypoint à centrer", 'warn'); return; }
        if (mapState.map) mapState.map.setView([r.lat, r.lon], 18);
      });
    }
    const centerOnMe = $('centerOnMe');
    if (centerOnMe) {
      centerOnMe.addEventListener('click', () => {
        if (!navigator.geolocation) { showToast("Géoloc non supportée", 'warn'); return; }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (mapState.map) mapState.map.setView([pos.coords.latitude, pos.coords.longitude], 18);
          },
          (err) => showToast("Impossible d'obtenir la position", 'error'),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    }
    const toggleGeoloc = $('toggleGeoloc');
    if (toggleGeoloc) {
      toggleGeoloc.addEventListener('click', () => {
        if (mapState.geolocActive) {
          stopGeolocation();
          mapState.geolocActive = false;
          toggleGeoloc.classList.remove('active');
          showToast('📡 Géolocalisation désactivée', 'success');
        } else {
          initGeolocation();
          mapState.geolocActive = true;
          toggleGeoloc.classList.add('active');
          showToast('📡 Géolocalisation activée', 'success');
        }
      });
    }
  }

  /* ========================================== */
  /* FULL MAP (Carte tab) & MINI MAP            */
  /* ========================================== */
  function initFullMap() {
    if (fullMapState.initialized) return;
    if (typeof L === 'undefined') return;
    const el = $('fullMap');
    if (!el) return;
    fullMapState.map = L.map('fullMap', { zoomControl: true }).setView([36.8065, 10.1815], 13);
    fullMapState.tileLayer = createTileLayer(state.mapLayer);
    fullMapState.tileLayer.addTo(fullMapState.map);
    fullMapState.initialized = true;
    setTimeout(() => fullMapState.map.invalidateSize(), 200);
    // Draw existing tracks & waypoints
    drawAllSavedTracks();
    drawAllSavedWaypoints();
  }

  function initMiniMap() {
    if (miniMapState.initialized) return;
    if (typeof L === 'undefined') return;
    const el = $('miniMap');
    if (!el) return;
    miniMapState.map = L.map('miniMap', {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
    }).setView([36.8065, 10.1815], 13);
    miniMapState.tileLayer = createTileLayer(state.mapLayer);
    miniMapState.tileLayer.addTo(miniMapState.map);
    miniMapState.initialized = true;
    setTimeout(() => miniMapState.map.invalidateSize(), 200);
  }

  function switchMapLayer(layerName) {
    state.mapLayer = layerName;
    localStorage.setItem('subtopo-map-layer', layerName);
    // Update full map
    if (fullMapState.initialized) {
      if (fullMapState.tileLayer) fullMapState.map.removeLayer(fullMapState.tileLayer);
      fullMapState.tileLayer = createTileLayer(layerName);
      fullMapState.tileLayer.addTo(fullMapState.map);
    }
    // Update mini map
    if (miniMapState.initialized) {
      if (miniMapState.tileLayer) miniMapState.map.removeLayer(miniMapState.tileLayer);
      miniMapState.tileLayer = createTileLayer(layerName);
      miniMapState.tileLayer.addTo(miniMapState.map);
    }
  }

  function updateUserMarkerOnMap(map, marker, circle, lat, lon, acc) {
    if (marker) map.removeLayer(marker);
    if (circle) map.removeLayer(circle);
    const greenIcon = L.divIcon({
      className: 'user-marker',
      html: '<div style="background:#0D9488;width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px #0D9488, 0 2px 6px rgba(0,0,0,0.4);"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    const newMarker = L.marker([lat, lon], { icon: greenIcon }).addTo(map);
    newMarker.bindPopup(
      '<b>📡 Ma position</b><br>' +
      'Lat: ' + lat.toFixed(6) + '°<br>' +
      'Lon: ' + lon.toFixed(6) + '°<br>' +
      'Précision: ±' + acc.toFixed(1) + ' m'
    );
    const newCircle = L.circle([lat, lon], {
      radius: acc, color: '#0D9488', fillColor: '#0D9488',
      fillOpacity: 0.1, weight: 1,
    }).addTo(map);
    return { marker: newMarker, circle: newCircle };
  }

  function updateTrackOnMap(map, stateRef, trackPoints, isCurrent) {
    if (stateRef.currentTrackLine) {
      map.removeLayer(stateRef.currentTrackLine);
      stateRef.currentTrackLine = null;
    }
    if (trackPoints.length < 2) return;
    const latlngs = trackPoints.map((p) => [p.lat, p.lon]);
    const color = isCurrent ? '#0D9488' : '#5A6A5A';
    const weight = isCurrent ? 4 : 2;
    const dashArray = isCurrent ? null : '4,4';
    stateRef.currentTrackLine = L.polyline(latlngs, {
      color, weight, opacity: 0.85, dashArray,
      lineJoin: 'round',
    }).addTo(map);
  }

  function drawAllSavedTracks() {
    if (!fullMapState.initialized) return;
    // Clear existing
    fullMapState.savedTrackLines.forEach((line) => fullMapState.map.removeLayer(line));
    fullMapState.savedTrackLines = [];
    state.tracks.forEach((track) => {
      if (track.points.length < 2) return;
      const latlngs = track.points.map((p) => [p.lat, p.lon]);
      const line = L.polyline(latlngs, {
        color: '#5A6A5A', weight: 2, opacity: 0.6, dashArray: '4,4',
        lineJoin: 'round',
      }).addTo(fullMapState.map);
      line.bindPopup(
        '<b>📍 Track enregistré</b><br>' +
        'Mode: ' + (track.mode || 'navigation') + '<br>' +
        'Points: ' + track.points.length + '<br>' +
        'Distance: ' + (track.totalDistance ? track.totalDistance.toFixed(0) + ' m' : '—') + '<br>' +
        'Durée: ' + formatDuration(track.duration)
      );
      fullMapState.savedTrackLines.push(line);
    });
    // Draw saved routes (in blue, solid)
    routeState.routes.forEach((route) => {
      if (route.points.length < 2) return;
      const latlngs = route.points.map((p) => [p.lat, p.lon]);
      const line = L.polyline(latlngs, {
        color: '#1976D2', weight: 3, opacity: 0.85, lineJoin: 'round',
      }).addTo(fullMapState.map);
      line.bindPopup(
        '<b>🛣️ ' + route.name + '</b><br>' +
        'Waypoints: ' + route.points.length + '<br>' +
        'Créée: ' + new Date(route.createdAt).toLocaleString('fr-FR')
      );
      fullMapState.savedTrackLines.push(line);
    });
  }

  function drawAllSavedWaypoints() {
    if (!fullMapState.initialized) return;
    fullMapState.waypointMarkers.forEach((m) => fullMapState.map.removeLayer(m));
    fullMapState.waypointMarkers = [];
    const stored = JSON.parse(localStorage.getItem('subtopo-waypoints') || '[]');
    stored.forEach((w) => {
      const u = latLonToUTM(w.lat, w.lon);
      const mgrs = latLonToMGRS(w.lat, w.lon);
      const redIcon = L.divIcon({
        className: 'waypoint-marker',
        html: '<div style="background:#C62828;width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      let photoHtml = '';
      if (w.photo) {
        photoHtml = '<br><img src="' + w.photo + '" class="wp-photo-popup" alt="Photo">';
      }
      const marker = L.marker([w.lat, w.lon], { icon: redIcon })
        .addTo(fullMapState.map)
        .bindPopup(
          '<div class="waypoint-with-photo">' +
          (w.photo ? '<div class="wp-photo-thumb" style="background-image:url(\'' + w.photo + '\')"></div>' : '<div class="wp-photo-thumb" style="background:#E0F2F1;display:flex;align-items:center;justify-content:center;font-size:18px;">📍</div>') +
          '<div><b>📍 ' + (w.name || 'Waypoint') + '</b><br>' +
          '<b>UTM ' + u.zone + u.hemisphere + '</b> X=' + u.x.toFixed(0) + ' Y=' + u.y.toFixed(0) + '<br>' +
          'Z: ' + w.alt.toFixed(2) + ' m<br>' +
          '<b>MGRS:</b> ' + mgrs + '<br>' +
          'Précision: ±' + (w.accuracy || 0).toFixed(2) + ' m<br>' +
          'Qualité: ' + (w.quality || '—') + '</div></div>' + photoHtml
        );
      fullMapState.waypointMarkers.push(marker);
    });
  }

  /* ========================================== */
  /* TRACKING                                    */
  /* ========================================== */
  function haversineMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return h + 'h ' + String(m).padStart(2, '0') + 'm';
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function startTracking() {
    if (state.isTracking) return;
    if (!navigator.geolocation) {
      showToast("Géolocalisation non supportée", 'error');
      return;
    }
    state.isTracking = true;
    state.currentTrack = {
      id: 'track-' + Date.now(),
      startTime: Date.now(),
      endTime: null,
      mode: state.mode,
      points: [],
      totalDistance: 0,
      duration: 0,
    };
    state.trackGeolocId = navigator.geolocation.watchPosition(
      (pos) => {
        const p = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          alt: pos.coords.altitude || 0,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp || Date.now(),
        };
        // Add battery + network info periodically
        if (state.currentTrack.points.length % 5 === 0) {
          getBatteryInfo().then((b) => {
            p.battery = b.level;
            p.charging = b.charging;
          });
          p.network = getNetworkInfo().type;
        }
        rememberUserPosition(p.lat, p.lon);
        checkProximity();
        // Add to current track
        if (state.currentTrack.points.length > 0) {
          const last = state.currentTrack.points[state.currentTrack.points.length - 1];
          const d = haversineMeters(last.lat, last.lon, p.lat, p.lon);
          if (d > 0.5) { // ignore jitter < 50cm
            state.currentTrack.totalDistance += d;
            state.currentTrack.points.push(p);
          }
        } else {
          state.currentTrack.points.push(p);
        }
        // Update markers & polylines on both maps
        const updateMap = (mapSt) => {
          if (!mapSt.map) return;
          const r = updateUserMarkerOnMap(mapSt.map, mapSt.userMarker, mapSt.userCircle, p.lat, p.lon, p.accuracy);
          mapSt.userMarker = r.marker;
          mapSt.userCircle = r.circle;
          updateTrackOnMap(mapSt.map, mapSt, state.currentTrack.points, true);
          // Center map on user if first point
          if (state.currentTrack.points.length === 1) {
            mapSt.map.setView([p.lat, p.lon], 16);
          }
        };
        updateMap(fullMapState);
        updateMap(miniMapState);
        // Also update the small result map
        if (mapState.map) {
          const r = updateUserMarkerOnMap(mapState.map, mapState.userMarker, mapState.userCircle, p.lat, p.lon, p.accuracy);
          mapState.userMarker = r.marker;
          mapState.userCircle = r.circle;
        }
        // Auto-center full map on user if tracking just started or if they're moving
        if (fullMapState.map && state.currentTrack.points.length % 10 === 1) {
          fullMapState.map.panTo([p.lat, p.lon]);
        }
      },
      (err) => {
        console.warn('Track geoloc error:', err.message);
        if (err.code === 1) showToast("Autorisation géoloc refusée", 'error');
        else if (err.code === 2) showToast("Position GPS indisponible", 'error');
        else if (err.code === 3) showToast("Timeout géoloc", 'warn');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
    // Track duration timer
    state.trackTimer = setInterval(() => {
      if (!state.currentTrack) return;
      state.currentTrack.duration = Math.floor((Date.now() - state.currentTrack.startTime) / 1000);
      updateTrackUI();
    }, 1000);
    // Update UI
    $('startTrack').classList.add('hidden');
    $('stopTrack').classList.remove('hidden');
    const status = $('trackStatus');
    status.textContent = 'En cours';
    status.className = 'status-active';
    showToast('🛰 Tracking démarré', 'success');
    updateTrackUI();
  }

  function stopTracking() {
    if (!state.isTracking) return;
    state.isTracking = false;
    if (state.trackGeolocId !== null) {
      navigator.geolocation.clearWatch(state.trackGeolocId);
      state.trackGeolocId = null;
    }
    if (state.trackTimer) {
      clearInterval(state.trackTimer);
      state.trackTimer = null;
    }
    if (state.currentTrack && state.currentTrack.points.length > 0) {
      state.currentTrack.endTime = Date.now();
      state.currentTrack.duration = Math.floor((state.currentTrack.endTime - state.currentTrack.startTime) / 1000);
      // Save to tracks
      state.tracks.push(state.currentTrack);
      saveTracks();
      showToast('✅ Track enregistré (' + state.currentTrack.points.length + ' points)', 'success');
    }
    state.currentTrack = null;
    // Update UI
    $('startTrack').classList.remove('hidden');
    $('stopTrack').classList.add('hidden');
    const status = $('trackStatus');
    status.textContent = 'Arrêté';
    status.className = 'status-stopped';
    updateTrackUI();
    drawAllSavedTracks();
  }

  function clearCurrentTrack() {
    if (!state.currentTrack) {
      showToast('Aucun track en cours', 'warn');
      return;
    }
    if (state.currentTrack.points.length === 0) {
      showToast('Track déjà vide', 'warn');
      return;
    }
    state.currentTrack.points = [];
    state.currentTrack.totalDistance = 0;
    if (fullMapState.currentTrackLine && fullMapState.map) {
      fullMapState.map.removeLayer(fullMapState.currentTrackLine);
      fullMapState.currentTrackLine = null;
    }
    if (miniMapState.currentTrackLine && miniMapState.map) {
      miniMapState.map.removeLayer(miniMapState.currentTrackLine);
      miniMapState.currentTrackLine = null;
    }
    updateTrackUI();
    showToast('🗑️ Track effacé', 'success');
  }

  function clearAllSavedTracks() {
    if (state.tracks.length === 0) {
      showToast('Aucun track enregistré à effacer', 'warn');
      return;
    }
    if (!confirm('Effacer tous les tracks enregistrés (' + state.tracks.length + ') ?')) return;
    state.tracks = [];
    saveTracks();
    drawAllSavedTracks();
    showToast('🗑️ Tous les tracks effacés', 'success');
  }

  function updateTrackUI() {
    if (!state.currentTrack) {
      $('trackPoints').textContent = '0';
      $('trackDistance').textContent = '0 m';
      $('trackDuration').textContent = '00:00';
      return;
    }
    $('trackPoints').textContent = state.currentTrack.points.length;
    const dist = state.currentTrack.totalDistance || 0;
    $('trackDistance').textContent = dist < 1000 ? dist.toFixed(0) + ' m' : (dist / 1000).toFixed(2) + ' km';
    const dur = state.currentTrack.duration || Math.floor((Date.now() - state.currentTrack.startTime) / 1000);
    $('trackDuration').textContent = formatDuration(dur);
  }

  function saveTracks() {
    try {
      localStorage.setItem('subtopo-tracks', JSON.stringify(state.tracks));
    } catch (e) {
      console.warn('Could not save tracks:', e);
    }
  }

  function loadTracks() {
    try {
      const stored = localStorage.getItem('subtopo-tracks');
      if (stored) state.tracks = JSON.parse(stored);
    } catch (e) {
      state.tracks = [];
    }
  }

  function exportTrackGPX() {
    // Export current track (or all tracks) as GPX
    const allTracks = state.currentTrack ? [...state.tracks, state.currentTrack] : state.tracks;
    if (allTracks.length === 0) {
      showToast('Aucun track à exporter', 'warn');
      return;
    }
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<gpx version="1.1" creator="SubTopo-GNSS" xmlns="http://www.topografix.com/GPX/1/1">\n';
    // Add waypoints first
    const waypoints = JSON.parse(localStorage.getItem('subtopo-waypoints') || '[]');
    waypoints.forEach((w) => {
      const u = latLonToUTM(w.lat, w.lon);
      xml += '  <wpt lat="' + w.lat + '" lon="' + w.lon + '">\n';
      xml += '    <ele>' + w.alt + '</ele>\n';
      xml += '    <time>' + w.timestamp + '</time>\n';
      xml += '    <name>' + w.name + '</name>\n';
      xml += '    <desc>UTM ' + u.zone + u.hemisphere + ' | X=' + u.x.toFixed(2) + ' Y=' + u.y.toFixed(2) + ' Z=' + w.alt.toFixed(2) + ' | Précision=±' + (w.accuracy || 0).toFixed(2) + 'm | ' + (w.quality || '') + '</desc>\n';
      xml += '  </wpt>\n';
    });
    // Add tracks
    allTracks.forEach((track) => {
      if (!track.points || track.points.length < 2) return;
      xml += '  <trk>\n';
      xml += '    <name>SubTopo Track ' + new Date(track.startTime).toLocaleString('fr-FR') + '</name>\n';
      xml += '    <type>' + (track.mode || 'navigation') + '</type>\n';
      xml += '    <trkseg>\n';
      track.points.forEach((p) => {
        xml += '      <trkpt lat="' + p.lat + '" lon="' + p.lon + '">\n';
        xml += '        <ele>' + p.alt + '</ele>\n';
        xml += '        <time>' + new Date(p.timestamp).toISOString() + '</time>\n';
        xml += '      </trkpt>\n';
      });
      xml += '    </trkseg>\n';
      xml += '  </trk>\n';
    });
    xml += '</gpx>\n';
    downloadFile(xml, 'subtopo-track.gpx', 'application/gpx+xml');
    showToast('✅ Track exporté (GPX avec waypoints + trk)', 'success');
  }

  function initCarteControls() {
    $('startTrack').addEventListener('click', startTracking);
    $('stopTrack').addEventListener('click', stopTracking);
    $('clearTrack').addEventListener('click', clearAllSavedTracks);
    $('centerOnMeCarte').addEventListener('click', () => {
      if (!navigator.geolocation) { showToast("Géoloc non supportée", 'warn'); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (fullMapState.map) {
            fullMapState.map.setView([pos.coords.latitude, pos.coords.longitude], 17);
            showToast('🎯 Centré sur ta position', 'success');
          }
        },
        (err) => showToast("Position indisponible", 'error'),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
    $('goToPoint').addEventListener('click', openAddWaypointModal);
    $('closeNav').addEventListener('click', clearTargetWaypoint);
    $('drawArea').addEventListener('click', startAreaDrawing);
    $('toggleMapRotation').addEventListener('click', toggleMapRotation);
    $('saveAreaOffline').addEventListener('click', saveAreaOffline);
    initAreaControls();
    // Layer toggle
    $$('input[name="mapLayer"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) switchMapLayer(e.target.value);
      });
    });
    // Mini map toggle
    const toggleBtn = $('toggleMiniMap');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const mini = $('miniMap');
        if (mini.classList.contains('collapsed')) {
          mini.classList.remove('collapsed');
          toggleBtn.textContent = '−';
          if (miniMapState.initialized) {
            setTimeout(() => miniMapState.map.invalidateSize(), 250);
          }
        } else {
          mini.classList.add('collapsed');
          toggleBtn.textContent = '+';
        }
      });
    }
  }

  /* ========================================== */
  /* NAVIGATION (Go to point)                   */
  /* ========================================== */
  function calculateBearing(lat1, lon1, lat2, lon2) {
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);
    return ((θ * 180) / Math.PI + 360) % 360;
  }

  function bearingToCardinal(deg) {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
  }

  function openAddWaypointModal() {
    $('addWaypointModal').classList.remove('hidden');
    // Populate zone select
    const sel = $('wpZone');
    sel.innerHTML = '<option value="auto">🔄 Auto (depuis coordonnées)</option>';
    for (let z = 1; z <= 60; z++) {
      const opt = document.createElement('option');
      opt.value = z + 'N';
      opt.textContent = '📍 Zone ' + z + 'N';
      sel.appendChild(opt);
    }
    // Initialize picker map after a small delay
    setTimeout(initPickerMap, 100);
  }

  function closeAddWaypointModal() {
    $('addWaypointModal').classList.add('hidden');
  }

  function initPickerMap() {
    if (state.pickerMap) return;
    if (typeof L === 'undefined') return;
    const el = $('pickerMap');
    if (!el) return;
    const center = state.lastUserPos
      ? [state.lastUserPos.lat, state.lastUserPos.lon]
      : [36.8065, 10.1815];
    state.pickerMap = L.map('pickerMap').setView(center, 14);
    createTileLayer(state.mapLayer).addTo(state.pickerMap);
    state.pickerMap.on('click', (e) => {
      const { lat, lng } = e.latlng;
      if (state.pickerMarker) state.pickerMap.removeLayer(state.pickerMarker);
      const redIcon = L.divIcon({
        className: 'picker-marker',
        html: '<div style="background:#C62828;width:20px;height:20px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      state.pickerMarker = L.marker([lat, lng], { icon: redIcon }).addTo(state.pickerMap);
      // Store picked coords in hidden state for later use
      state.pickedCoords = { lat, lon, alt: 0 };
      // Update coord display
      const u = latLonToUTM(lat, lng);
      $('pickerCoords').innerHTML =
        '<b>Lat:</b> ' + lat.toFixed(7) + '° &nbsp; <b>Lon:</b> ' + lng.toFixed(7) + '°<br>' +
        '<b>UTM ' + u.zone + u.hemisphere + ':</b> X=' + u.x.toFixed(2) + ' Y=' + u.y.toFixed(2) + ' m';
    });
    setTimeout(() => state.pickerMap.invalidateSize(), 200);
  }

  function initModalTabs() {
    $$('.modal-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        $$('.modal-tab').forEach((t) => t.classList.remove('active'));
        $$('.modal-panel').forEach((p) => p.classList.remove('active'));
        tab.classList.add('active');
        const panel = $('mode' === mode ? 'mode' : mode + 'Inputs');
        if (panel) panel.classList.add('active');
        if (mode === 'map') {
          setTimeout(() => {
            if (!state.pickerMap) initPickerMap();
            else state.pickerMap.invalidateSize();
          }, 100);
        }
      });
    });
  }

  function saveTargetWaypoint() {
    const activeMode = document.querySelector('.modal-tab.active').dataset.mode;
    let wp = null;
    if (activeMode === 'utm') {
      const x = parseFloat($('wpX').value);
      const y = parseFloat($('wpY').value);
      const z = parseFloat($('wpZ').value) || 0;
      const name = $('wpName').value.trim() || 'Waypoint';
      const zoneStr = $('wpZone').value;
      if (isNaN(x) || isNaN(y)) {
        showToast('X et Y sont requis', 'error');
        return;
      }
      const ll = utmToLatLon(x, y, zoneStr === 'auto' ? null : parseInt(zoneStr, 10));
      wp = { name, lat: ll.lat, lon: ll.lon, alt: z };
    } else if (activeMode === 'geo') {
      const lat = parseFloat($('wpLat').value);
      const lon = parseFloat($('wpLon').value);
      const alt = parseFloat($('wpAlt').value) || 0;
      const name = $('wpNameGeo').value.trim() || 'Waypoint';
      if (isNaN(lat) || isNaN(lon)) {
        showToast('Latitude et longitude sont requises', 'error');
        return;
      }
      if (lat < -90 || lat > 90) { showToast('Latitude entre -90 et 90', 'error'); return; }
      if (lon < -180 || lon > 180) { showToast('Longitude entre -180 et 180', 'error'); return; }
      wp = { name, lat, lon, alt };
    } else if (activeMode === 'map') {
      if (!state.pickedCoords) {
        showToast('Clique sur la carte pour placer le waypoint', 'error');
        return;
      }
      wp = {
        name: 'Waypoint cliqué',
        lat: state.pickedCoords.lat,
        lon: state.pickedCoords.lon,
        alt: state.pickedCoords.alt || 0,
      };
    }
    if (!wp) return;
    // Attach photo if uploaded
    if (currentPhotoBase64) {
      wp.photo = currentPhotoBase64;
    }
    state.targetWaypoint = wp;
    saveTarget();
    closeAddWaypointModal();
    showTargetOnMap();
    updateNavigationDisplay();
    $('navPanel').classList.remove('hidden');
    currentPhotoBase64 = null;
    showToast('🎯 Navigation activée vers ' + wp.name, 'success');
  }

  // UTM → lat/lon
  function utmToLatLon(easting, northing, zone) {
    const a = 6378137.0;
    const f = 1 / 298.257223563;
    const e2 = 2 * f - f * f;
    const ePrime2 = e2 / (1 - e2);
    const k0 = 0.9996;
    const x = easting - 500000.0;
    let y = northing;
    // Northern hemisphere only for now
    if (y < 0) y += 10000000.0;
    if (zone === null) {
      // Estimate zone from northing (works for Northern hemisphere)
      zone = Math.floor((x / 1000) / 1000) + 31;
    }
    const lonOrigin = (zone - 1) * 6 - 180 + 3;
    const M = y / k0;
    const μ = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256));
    const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
    const φ1 = μ +
      (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * μ) +
      (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * μ) +
      (151 * e1 * e1 * e1 / 96) * Math.sin(6 * μ) +
      (1097 * e1 * e1 * e1 * e1 / 512) * Math.sin(8 * μ);
    const C1 = ePrime2 * Math.cos(φ1) * Math.cos(φ1);
    const T1 = Math.tan(φ1) * Math.tan(φ1);
    const N1 = a / Math.sqrt(1 - e2 * Math.sin(φ1) * Math.sin(φ1));
    const R1 = a * (1 - e2) / Math.pow(1 - e2 * Math.sin(φ1) * Math.sin(φ1), 1.5);
    const D = x / (N1 * k0);
    const lat = φ1 - (N1 * Math.tan(φ1) / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ePrime2) * Math.pow(D, 4) / 24 + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ePrime2 - 3 * C1 * C1) * Math.pow(D, 6) / 720);
    const lon = (D - (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ePrime2 + 24 * T1 * T1) * Math.pow(D, 5) / 120) / Math.cos(φ1);
    return {
      lat: (lat * 180) / Math.PI,
      lon: lonOrigin + (lon * 180) / Math.PI,
    };
  }

  function showTargetOnMap() {
    if (!state.targetWaypoint) return;
    const wp = state.targetWaypoint;
    if (fullMapState.initialized) {
      if (state.targetMarker) fullMapState.map.removeLayer(state.targetMarker);
      const targetIcon = L.divIcon({
        className: 'target-marker',
        html: '<div style="position:relative"><div style="background:#C62828;width:24px;height:24px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 3px rgba(198,40,40,0.3), 0 2px 8px rgba(0,0,0,0.4);"></div><div style="position:absolute;top:-26px;left:50%;transform:translateX(-50%);background:#C62828;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;white-space:nowrap;">🎯 CIBLE</div></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      const u = latLonToUTM(wp.lat, wp.lon);
      const mgrs = latLonToMGRS(wp.lat, wp.lon);
      let photoHtml = '';
      if (wp.photo) {
        photoHtml = '<br><img src="' + wp.photo + '" class="wp-photo-popup" alt="Photo">';
      }
      state.targetMarker = L.marker([wp.lat, wp.lon], { icon: targetIcon, zIndexOffset: 1000 })
        .addTo(fullMapState.map)
        .bindPopup(
          '<div class="waypoint-with-photo">' +
          (wp.photo ? '<div class="wp-photo-thumb" style="background-image:url(\'' + wp.photo + '\')"></div>' : '') +
          '<div><b>🎯 ' + wp.name + '</b><br>' +
          '<b>UTM ' + u.zone + u.hemisphere + ':</b> X=' + u.x.toFixed(2) + ' Y=' + u.y.toFixed(2) + '<br>' +
          '<b>Z:</b> ' + wp.alt.toFixed(2) + ' m<br>' +
          '<b>MGRS:</b> ' + mgrs + '</div></div>' + photoHtml
        );
      fullMapState.map.setView([wp.lat, wp.lon], 16);
    }
  }

  function clearTargetWaypoint() {
    state.targetWaypoint = null;
    if (state.targetMarker && fullMapState.initialized) {
      fullMapState.map.removeLayer(state.targetMarker);
    }
    if (state.targetLine && fullMapState.initialized) {
      fullMapState.map.removeLayer(state.targetLine);
    }
    state.targetMarker = null;
    state.targetLine = null;
    $('navPanel').classList.add('hidden');
    localStorage.removeItem('subtopo-target-waypoint');
    showToast('Navigation arrêtée', 'success');
  }

  function saveTarget() {
    if (state.targetWaypoint) {
      localStorage.setItem('subtopo-target-waypoint', JSON.stringify(state.targetWaypoint));
    }
  }

  function loadTarget() {
    try {
      const stored = localStorage.getItem('subtopo-target-waypoint');
      if (stored) {
        state.targetWaypoint = JSON.parse(stored);
        if (state.targetWaypoint && fullMapState.initialized) {
          showTargetOnMap();
          $('navPanel').classList.remove('hidden');
          updateNavigationDisplay();
        }
      }
    } catch (e) { /* ignore */ }
  }

  function updateNavigationDisplay() {
    if (!state.targetWaypoint) return;
    const wp = state.targetWaypoint;
    $('navTargetName').textContent = wp.name;
    // Coords
    const u = latLonToUTM(wp.lat, wp.lon);
    $('navCoords').innerHTML =
      'UTM ' + u.zone + u.hemisphere + ' · X=' + u.x.toFixed(2) + ' Y=' + u.y.toFixed(2) + ' Z=' + wp.alt.toFixed(2) + ' m';
    // If we have a user position, calculate distance & bearing
    if (state.lastUserPos) {
      const dist = haversineMeters(state.lastUserPos.lat, state.lastUserPos.lon, wp.lat, wp.lon);
      const bearing = calculateBearing(state.lastUserPos.lat, state.lastUserPos.lon, wp.lat, wp.lon);
      // Update distance
      $('navDistance').textContent = dist < 1000 ? dist.toFixed(1) + ' m' : (dist / 1000).toFixed(2) + ' km';
      // Update bearing
      $('navBearing').textContent = bearing.toFixed(0) + '°';
      $('navCardinal').textContent = bearingToCardinal(bearing);
      // Rotate compass arrow
      const arrow = $('compassArrow');
      if (arrow) arrow.setAttribute('transform', 'rotate(' + bearing + ' 100 100)');
      // ETA (assuming 1.4 m/s walking)
      if (dist < 5) {
        $('navArrived').classList.remove('hidden');
        $('navEta').textContent = '0 s';
      } else {
        $('navArrived').classList.add('hidden');
        const speed = 1.4; // m/s
        const eta = Math.round(dist / speed);
        if (eta < 60) $('navEta').textContent = eta + ' s';
        else if (eta < 3600) $('navEta').textContent = Math.round(eta / 60) + ' min';
        else $('navEta').textContent = Math.round(eta / 3600) + ' h ' + Math.round((eta % 3600) / 60) + ' min';
      }
      // Update line on map
      if (fullMapState.initialized) {
        if (state.targetLine) fullMapState.map.removeLayer(state.targetLine);
        state.targetLine = L.polyline(
          [[state.lastUserPos.lat, state.lastUserPos.lon], [wp.lat, wp.lon]],
          { color: '#C62828', weight: 3, opacity: 0.6, dashArray: '8,8' }
        ).addTo(fullMapState.map);
      }
    } else {
      $('navDistance').textContent = '—';
      $('navBearing').textContent = '—';
      $('navCardinal').textContent = '—';
      $('navEta').textContent = '—';
    }
  }

  // Update lastUserPos whenever tracking or geolocation gives a position
  function rememberUserPosition(lat, lon) {
    state.lastUserPos = { lat, lon, timestamp: Date.now() };
    if (state.targetWaypoint) updateNavigationDisplay();
  }

  function initCompassTicks() {
    const ticks = $('compassTicks');
    if (!ticks) return;
    for (let i = 0; i < 36; i++) {
      const angle = i * 10;
      const isMajor = i % 9 === 0;
      const inner = isMajor ? 80 : 84;
      const outer = 90;
      const rad = (angle - 90) * Math.PI / 180;
      const x1 = 100 + Math.cos(rad) * inner;
      const y1 = 100 + Math.sin(rad) * inner;
      const x2 = 100 + Math.cos(rad) * outer;
      const y2 = 100 + Math.sin(rad) * outer;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y2);
      line.setAttribute('stroke', isMajor ? '#0D9488' : '#5A6A6A');
      line.setAttribute('stroke-width', isMajor ? 2 : 1);
      ticks.appendChild(line);
    }
  }

  function initAddWaypointModal() {
    $('closeModal').addEventListener('click', closeAddWaypointModal);
    $('cancelWp').addEventListener('click', closeAddWaypointModal);
    $('saveWp').addEventListener('click', saveTargetWaypoint);
    document.querySelector('.modal-backdrop').addEventListener('click', closeAddWaypointModal);
    initModalTabs();
    initCompassTicks();
    initPhotoInputs();
  }

  /* ========================================== */
  /* PHOTO WAYPOINTS                            */
  /* ========================================== */
  let currentPhotoBase64 = null;
  function initPhotoInputs() {
    const handlePhoto = (inputId, previewId) => {
      const input = $(inputId);
      const preview = $(previewId);
      if (!input || !preview) return;
      input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
          showToast('Photo trop volumineuse (max 5 Mo)', 'error');
          return;
        }
        const reader = new FileReader();
        reader.onload = (evt) => {
          // Compress image to 1024px max width
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxW = 1024;
            const scale = img.width > maxW ? maxW / img.width : 1;
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            currentPhotoBase64 = canvas.toDataURL('image/jpeg', 0.75);
            preview.innerHTML = '';
            const imgEl = document.createElement('img');
            imgEl.src = currentPhotoBase64;
            preview.appendChild(imgEl);
          };
          img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
      });
    };
    handlePhoto('wpPhoto', 'wpPhotoPreview');
    handlePhoto('wpPhotoGeo', 'wpPhotoPreviewGeo');
  }

  /* ========================================== */
  /* SURFACE MEASUREMENT                        */
  /* ========================================== */
  const areaState = {
    drawing: false,
    points: [],
    polyline: null,
    polygon: null,
    markers: [],
    closed: false,
  };

  function startAreaDrawing() {
    areaState.drawing = true;
    areaState.points = [];
    areaState.closed = false;
    $('areaPanel').classList.remove('hidden');
    $('areaInstructions').textContent = '🖱️ Clique sur la carte pour placer les sommets — double-clic pour terminer';
    if (fullMapState.map) {
      fullMapState.map.getContainer().style.cursor = 'crosshair';
      fullMapState.map.on('click', onAreaMapClick);
      fullMapState.map.on('dblclick', finishAreaPolygon);
    }
    showToast('📐 Mode mesure activé — clique sur la carte', 'success');
  }

  function onAreaMapClick(e) {
    if (!areaState.drawing || areaState.closed) return;
    areaState.points.push(e.latlng);
    addAreaMarker(e.latlng);
    updateAreaDraw();
    updateAreaStats();
  }

  function addAreaMarker(latlng) {
    const dotIcon = L.divIcon({
      className: 'area-marker',
      html: '<div style="background:#F9A825;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    const m = L.marker(latlng, { icon: dotIcon }).addTo(fullMapState.map);
    areaState.markers.push(m);
  }

  function updateAreaDraw() {
    if (areaState.polyline) { fullMapState.map.removeLayer(areaState.polyline); areaState.polyline = null; }
    if (areaState.polygon) { fullMapState.map.removeLayer(areaState.polygon); areaState.polygon = null; }
    if (areaState.points.length < 2) return;
    areaState.polyline = L.polyline(areaState.points, { color: '#F9A825', weight: 2, dashArray: '4,4' }).addTo(fullMapState.map);
    if (areaState.points.length >= 3 && areaState.closed) {
      areaState.polygon = L.polygon(areaState.points, { color: '#F9A825', weight: 2, fillColor: '#F9A825', fillOpacity: 0.2 }).addTo(fullMapState.map);
    }
  }

  function updateAreaStats() {
    const n = areaState.points.length;
    $('areaPoints').textContent = n;
    if (n < 2) {
      $('areaPerimeter').textContent = '0 m';
      $('areaSurface').textContent = '0 m²';
      $('areaHectares').textContent = '0 ha';
      return;
    }
    let perimeter = 0;
    for (let i = 0; i < n - 1; i++) {
      perimeter += haversineMeters(areaState.points[i].lat, areaState.points[i].lng, areaState.points[i+1].lat, areaState.points[i+1].lng);
    }
    if (areaState.closed) {
      perimeter += haversineMeters(areaState.points[n-1].lat, areaState.points[n-1].lng, areaState.points[0].lat, areaState.points[0].lng);
    }
    $('areaPerimeter').textContent = perimeter < 1000 ? perimeter.toFixed(0) + ' m' : (perimeter / 1000).toFixed(2) + ' km';
    if (n >= 3 && areaState.closed) {
      const area = polygonArea(areaState.points);
      $('areaSurface').textContent = area < 10000 ? area.toFixed(0) + ' m²' : (area / 10000).toFixed(2) + ' ha';
      $('areaHectares').textContent = (area / 10000).toFixed(4) + ' ha';
    } else {
      $('areaSurface').textContent = '— (besoin 3+ points fermés)';
      $('areaHectares').textContent = '—';
    }
  }

  function polygonArea(latlngs) {
    // Spherical excess formula for area on a sphere
    const R = 6378137; // WGS84 equatorial radius
    let total = 0;
    const n = latlngs.length;
    for (let i = 0; i < n; i++) {
      const p1 = latlngs[i];
      const p2 = latlngs[(i + 1) % n];
      total += ((p2.lng - p1.lng) * Math.PI / 180) *
               (2 + Math.sin(p1.lat * Math.PI / 180) + Math.sin(p2.lat * Math.PI / 180));
    }
    return Math.abs(total * R * R / 2);
  }

  function finishAreaPolygon() {
    if (areaState.points.length < 3) {
      showToast('Il faut au moins 3 points pour fermer un polygone', 'warn');
      return;
    }
    areaState.closed = true;
    updateAreaDraw();
    updateAreaStats();
    $('areaInstructions').textContent = '✅ Polygone fermé — surface calculée';
    if (fullMapState.map) fullMapState.map.doubleClickZoom.enable();
    showToast('✅ Surface calculée', 'success');
  }

  function undoAreaPoint() {
    if (areaState.points.length === 0) return;
    areaState.points.pop();
    const m = areaState.markers.pop();
    if (m) fullMapState.map.removeLayer(m);
    areaState.closed = false;
    updateAreaDraw();
    updateAreaStats();
  }

  function clearAreaDrawing() {
    if (areaState.polyline) { fullMapState.map.removeLayer(areaState.polyline); areaState.polyline = null; }
    if (areaState.polygon) { fullMapState.map.removeLayer(areaState.polygon); areaState.polygon = null; }
    areaState.markers.forEach((m) => fullMapState.map.removeLayer(m));
    areaState.markers = [];
    areaState.points = [];
    areaState.closed = false;
    $('areaPanel').classList.add('hidden');
    if (fullMapState.map) {
      fullMapState.map.off('click', onAreaMapClick);
      fullMapState.map.off('dblclick', finishAreaPolygon);
      fullMapState.map.getContainer().style.cursor = '';
    }
  }

  function initAreaControls() {
    $('drawArea').addEventListener('click', startAreaDrawing);
    $('closeAreaPanel').addEventListener('click', clearAreaDrawing);
    $('undoAreaPoint').addEventListener('click', undoAreaPoint);
    $('finishArea').addEventListener('click', finishAreaPolygon);
    $('clearArea').addEventListener('click', clearAreaDrawing);
    $('drawRoute').addEventListener('click', startRouteDrawing);
    $('closeRoutePanel').addEventListener('click', clearRouteDrawing);
    $('undoRoutePoint').addEventListener('click', undoRoutePoint);
    $('finishRoute').addEventListener('click', finishRoute);
    $('reverseRoute').addEventListener('click', reverseRoute);
    $('showProfile').addEventListener('click', openProfileModal);
    $('closeProfileModal').addEventListener('click', closeProfileModal);
    $('closeProfileFooter').addEventListener('click', closeProfileModal);
    document.querySelector('#profileModal .modal-backdrop').addEventListener('click', closeProfileModal);
    $('exportProfile').addEventListener('click', exportProfileCSV);
  }

  /* ========================================== */
  /* ROUTE DRAWING                              */
  /* ========================================== */
  const routeState = {
    drawing: false,
    points: [],
    markers: [],
    polyline: null,
    routes: [],
  };

  function startRouteDrawing() {
    if (!fullMapState.initialized) { showToast('Carte pas prête', 'error'); return; }
    routeState.drawing = true;
    routeState.points = [];
    $('routePanel').classList.remove('hidden');
    $('routeInstructions').textContent = '🖱️ Clique sur la carte pour ajouter des waypoints — double-clic pour terminer';
    fullMapState.map.getContainer().style.cursor = 'crosshair';
    fullMapState.map.on('click', onRouteMapClick);
    fullMapState.map.on('dblclick', finishRoute);
    showToast('🛣️ Mode route activé', 'success');
  }

  function onRouteMapClick(e) {
    if (!routeState.drawing) return;
    routeState.points.push({ lat: e.latlng.lat, lon: e.latlng.lng, alt: 0 });
    addRouteMarker(e.latlng);
    updateRouteDraw();
    updateRouteStats();
  }

  function addRouteMarker(latlng) {
    const dotIcon = L.divIcon({
      className: 'route-marker',
      html: '<div style="background:#1976D2;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    const m = L.marker(latlng, { icon: dotIcon, draggable: true }).addTo(fullMapState.map);
    m.on('drag', () => {
      const idx = routeState.markers.indexOf(m);
      if (idx >= 0 && routeState.points[idx]) {
        routeState.points[idx].lat = m.getLatLng().lat;
        routeState.points[idx].lon = m.getLatLng().lng;
        updateRouteDraw();
        updateRouteStats();
      }
    });
    routeState.markers.push(m);
  }

  function updateRouteDraw() {
    if (routeState.polyline) {
      fullMapState.map.removeLayer(routeState.polyline);
      routeState.polyline = null;
    }
    if (routeState.points.length < 2) return;
    const latlngs = routeState.points.map((p) => [p.lat, p.lon]);
    routeState.polyline = L.polyline(latlngs, {
      color: '#1976D2', weight: 4, opacity: 0.85, lineJoin: 'round',
    }).addTo(fullMapState.map);
  }

  function updateRouteStats() {
    const n = routeState.points.length;
    $('routePoints').textContent = n;
    if (n < 2) {
      $('routeDistance').textContent = '0 m';
      $('routeClimb').textContent = '0 m';
      $('routeDescent').textContent = '0 m';
      return;
    }
    let dist = 0, climb = 0, descent = 0;
    for (let i = 0; i < n - 1; i++) {
      dist += haversineMeters(routeState.points[i].lat, routeState.points[i].lon,
                              routeState.points[i+1].lat, routeState.points[i+1].lon);
      const dAlt = (routeState.points[i+1].alt || 0) - (routeState.points[i].alt || 0);
      if (dAlt > 0) climb += dAlt;
      else descent += -dAlt;
    }
    $('routeDistance').textContent = dist < 1000 ? dist.toFixed(0) + ' m' : (dist / 1000).toFixed(2) + ' km';
    $('routeClimb').textContent = climb.toFixed(0) + ' m';
    $('routeDescent').textContent = descent.toFixed(0) + ' m';
  }

  function finishRoute() {
    if (routeState.points.length < 2) {
      showToast('Au moins 2 points requis', 'warn');
      return;
    }
    routeState.drawing = false;
    if (fullMapState.map) {
      fullMapState.map.off('click', onRouteMapClick);
      fullMapState.map.off('dblclick', finishRoute);
      fullMapState.map.getContainer().style.cursor = '';
    }
    const name = prompt('Nom de la route ?', 'Route ' + (routeState.routes.length + 1)) || 'Route';
    const route = {
      id: 'route-' + Date.now(),
      name,
      points: routeState.points.map((p) => ({ ...p })),
      createdAt: new Date().toISOString(),
    };
    routeState.routes.push(route);
    saveRoutes();
    showToast('✅ Route "' + name + '" sauvegardée', 'success');
    $('routeInstructions').textContent = '✅ Route sauvegardée (' + routeState.points.length + ' points)';
    routeState.drawing = false;
  }

  function undoRoutePoint() {
    if (routeState.points.length === 0) return;
    routeState.points.pop();
    const m = routeState.markers.pop();
    if (m) fullMapState.map.removeLayer(m);
    updateRouteDraw();
    updateRouteStats();
  }

  function reverseRoute() {
    if (routeState.points.length < 2) { showToast('Au moins 2 points requis', 'warn'); return; }
    routeState.points.reverse();
    routeState.markers.reverse();
    // Update marker positions
    routeState.points.forEach((p, i) => {
      if (routeState.markers[i]) {
        routeState.markers[i].setLatLng([p.lat, p.lon]);
      }
    });
    updateRouteDraw();
    updateRouteStats();
  }

  function clearRouteDrawing() {
    if (routeState.polyline) { fullMapState.map.removeLayer(routeState.polyline); routeState.polyline = null; }
    routeState.markers.forEach((m) => fullMapState.map.removeLayer(m));
    routeState.markers = [];
    routeState.points = [];
    routeState.drawing = false;
    $('routePanel').classList.add('hidden');
    if (fullMapState.map) {
      fullMapState.map.off('click', onRouteMapClick);
      fullMapState.map.off('dblclick', finishRoute);
      fullMapState.map.getContainer().style.cursor = '';
    }
  }

  function saveRoutes() {
    try { localStorage.setItem('subtopo-routes', JSON.stringify(routeState.routes)); } catch (e) {}
  }

  function loadRoutes() {
    try {
      const stored = localStorage.getItem('subtopo-routes');
      if (stored) routeState.routes = JSON.parse(stored);
    } catch (e) { routeState.routes = []; }
  }

  /* ========================================== */
  /* ELEVATION PROFILE                           */
  /* ========================================== */
  let profileData = null;

  function openProfileModal() {
    // Use the most recent track (current if recording, or last saved)
    let points = null;
    let source = '';
    if (state.isTracking && state.currentTrack && state.currentTrack.points.length >= 2) {
      points = state.currentTrack.points;
      source = 'Source : track en cours';
    } else if (state.tracks.length > 0) {
      const last = state.tracks[state.tracks.length - 1];
      if (last.points && last.points.length >= 2) {
        points = last.points;
        source = 'Source : ' + (last.mode || 'dernier track');
      }
    }
    if (!points) {
      showToast('Aucun track à afficher. Démarre un tracking ou un relevé.', 'warn');
      return;
    }
    profileData = points;
    $('profileSource').textContent = source;
    drawElevationProfile(points);
    computeProfileStats(points);
    $('profileModal').classList.remove('hidden');
  }

  function closeProfileModal() {
    $('profileModal').classList.add('hidden');
  }

  function computeProfileStats(points) {
    if (points.length < 2) return;
    let dist = 0, climb = 0, descent = 0;
    let minAlt = Infinity, maxAlt = -Infinity;
    for (let i = 0; i < points.length; i++) {
      const alt = points[i].alt || 0;
      if (alt < minAlt) minAlt = alt;
      if (alt > maxAlt) maxAlt = alt;
      if (i > 0) {
        dist += haversineMeters(points[i-1].lat, points[i-1].lon, points[i].lat, points[i].lon);
        const dAlt = alt - (points[i-1].alt || 0);
        if (dAlt > 0) climb += dAlt;
        else descent += -dAlt;
      }
    }
    const slope = dist > 0 ? ((climb - descent) / dist) * 100 : 0;
    $('profileDistance').textContent = dist < 1000 ? dist.toFixed(0) + ' m' : (dist / 1000).toFixed(2) + ' km';
    $('profileMin').textContent = minAlt.toFixed(0) + ' m';
    $('profileMax').textContent = maxAlt.toFixed(0) + ' m';
    $('profileClimb').textContent = '↑' + climb.toFixed(0) + ' / ↓' + descent.toFixed(0) + ' m';
    $('profileSlope').textContent = (slope >= 0 ? '+' : '') + slope.toFixed(1) + ' %';
    $('profilePoints').textContent = points.length;
  }

  function drawElevationProfile(points) {
    const canvas = $('profileCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    // Compute distances
    const dists = [0];
    for (let i = 1; i < points.length; i++) {
      dists.push(dists[i-1] + haversineMeters(points[i-1].lat, points[i-1].lon, points[i].lat, points[i].lon));
    }
    const totalDist = dists[dists.length - 1];
    const alts = points.map((p) => p.alt || 0);
    const minAlt = Math.min(...alts);
    const maxAlt = Math.max(...alts);
    const rangeAlt = Math.max(1, maxAlt - minAlt);
    const padX = 30, padY = 20;
    const innerW = w - padX * 2;
    const innerH = h - padY * 2;

    // Background gradient
    const grad = ctx.createLinearGradient(0, padY, 0, h - padY);
    grad.addColorStop(0, 'rgba(13, 148, 136, 0.4)');
    grad.addColorStop(1, 'rgba(13, 148, 136, 0.05)');
    ctx.fillStyle = grad;

    // Draw the elevation curve
    ctx.beginPath();
    ctx.moveTo(padX, h - padY);
    for (let i = 0; i < points.length; i++) {
      const x = padX + (totalDist > 0 ? (dists[i] / totalDist) * innerW : 0);
      const y = padY + (1 - (alts[i] - minAlt) / rangeAlt) * innerH;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(padX + innerW, h - padY);
    ctx.closePath();
    ctx.fill();

    // Stroke
    ctx.strokeStyle = '#0D9488';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const x = padX + (totalDist > 0 ? (dists[i] / totalDist) * innerW : 0);
      const y = padY + (1 - (alts[i] - minAlt) / rangeAlt) * innerH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Y axis labels (altitude)
    ctx.fillStyle = '#5A6A6A';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(maxAlt.toFixed(0) + ' m', padX - 4, padY + 4);
    ctx.fillText(minAlt.toFixed(0) + ' m', padX - 4, h - padY);

    // X axis labels (distance)
    ctx.textAlign = 'center';
    ctx.fillText('0', padX, h - 4);
    ctx.fillText(totalDist < 1000 ? totalDist.toFixed(0) + ' m' : (totalDist / 1000).toFixed(1) + ' km',
                 padX + innerW, h - 4);
  }

  function exportProfileCSV() {
    if (!profileData) return;
    let csv = 'point,distance_m,altitude_m\n';
    let dist = 0;
    csv += '0,0,' + (profileData[0].alt || 0).toFixed(2) + '\n';
    for (let i = 1; i < profileData.length; i++) {
      dist += haversineMeters(profileData[i-1].lat, profileData[i-1].lon, profileData[i].lat, profileData[i].lon);
      csv += i + ',' + dist.toFixed(2) + ',' + (profileData[i].alt || 0).toFixed(2) + '\n';
    }
    downloadFile(csv, 'subtopo-profile.csv', 'text/csv');
    showToast('✅ Profil exporté', 'success');
  }

  /* ========================================== */
  /* OFFLINE MAPS (Service Worker)              */
  /* ========================================== */
  let tileCache = { count: 0 };
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('sw.js').then(
      () => console.log('✅ Service Worker registered'),
      (err) => console.warn('SW registration failed:', err)
    );
    // Update tile cache count from localStorage
    updateOfflineStatus();
    setInterval(updateOfflineStatus, 5000);
    window.addEventListener('online', () => {
      document.getElementById('offlineStatus').classList.remove('offline');
      $('offlineText').textContent = 'En ligne';
    });
    window.addEventListener('offline', () => {
      document.getElementById('offlineStatus').classList.add('offline');
      $('offlineText').textContent = 'Hors ligne';
    });
    if (!navigator.onLine) {
      document.getElementById('offlineStatus').classList.add('offline');
      $('offlineText').textContent = 'Hors ligne';
    }
  }

  async function updateOfflineStatus() {
    if (!('caches' in window)) return;
    try {
      let count = 0;
      const names = await caches.keys();
      for (const name of names) {
        if (name.includes('tile')) {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          count += keys.length;
        }
      }
      tileCache.count = count;
      $('offlineCount').textContent = count + ' tuiles';
    } catch (e) { /* ignore */ }
  }

  async function saveAreaOffline() {
    if (!fullMapState.initialized) {
      showToast('Carte pas encore chargée', 'error');
      return;
    }
    const map = fullMapState.map;
    const bounds = map.getBounds();
    const zoom = map.getZoom();
    const minZ = Math.max(10, zoom - 1);
    const maxZ = Math.min(17, zoom + 2);
    showToast('💾 Téléchargement des tuiles en cours...', 'success');
    let downloaded = 0;
    let failed = 0;
    for (let z = minZ; z <= maxZ; z++) {
      const tileBounds = boundsToTileRange(bounds, z);
      for (let x = tileBounds.minX; x <= tileBounds.maxX; x++) {
        for (let y = tileBounds.minY; y <= tileBounds.maxY; y++) {
          const url = getTileUrl(z, x, y);
          try {
            const resp = await fetch(url, { mode: 'cors' });
            if (resp.ok) {
              const cache = await caches.open('tiles-v1');
              await cache.put(url, resp.clone());
              downloaded++;
            } else {
              failed++;
            }
          } catch (e) {
            failed++;
          }
        }
      }
    }
    await updateOfflineStatus();
    showToast('✅ ' + downloaded + ' tuiles mises en cache (' + failed + ' échouées)', downloaded > 0 ? 'success' : 'error');
  }

  function boundsToTileRange(bounds, z) {
    const nw = latLonToTile(bounds.getNorth(), bounds.getWest(), z);
    const se = latLonToTile(bounds.getSouth(), bounds.getEast(), z);
    return {
      minX: Math.min(nw.x, se.x),
      maxX: Math.max(nw.x, se.x),
      minY: Math.min(nw.y, se.y),
      maxY: Math.max(nw.y, se.y),
    };
  }

  function latLonToTile(lat, lon, z) {
    const n = Math.pow(2, z);
    const x = Math.floor((lon + 180) / 360 * n);
    const latRad = lat * Math.PI / 180;
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
    return { x, y };
  }

  function getTileUrl(z, x, y) {
    const cfg = TILE_LAYERS[state.mapLayer] || TILE_LAYERS.topo;
    return cfg.url.replace('{s}', 'a').replace('{z}', z).replace('{x}', x).replace('{y}', y);
  }

  /* ========================================== */
  /* MGRS / USNG                                */
  /* ========================================== */
  function latLonToMGRS(lat, lon) {
    // UTM zone from longitude
    const zone = Math.floor((lon + 180) / 6) + 1;
    // Convert lat/lon to UTM first
    const utm = latLonToUTM(lat, lon);
    // MGRS: zone + band letter + 100km square + easting + northing (5 digits each)
    const bandLetter = mgrsBandLetter(lat);
    const set = mgrs100kmSet(utm.x, utm.y, zone);
    const sq1 = set[0];
    const sq2 = set[1];
    const e100k = utm.x - Math.floor(utm.x / 100000) * 100000;
    const n100k = utm.y - Math.floor(utm.y / 100000) * 100000;
    return zone + bandLetter + ' ' + sq1 + sq2 + ' ' +
           String(Math.floor(e100k / 1)).padStart(5, '0') + ' ' +
           String(Math.floor(n100k / 1)).padStart(5, '0');
  }

  function mgrsBandLetter(lat) {
    if (lat < -80) return 'A';
    if (lat > 84) return 'X';
    const bands = 'CDEFGHJKLMNPQRSTUVWX';
    const idx = Math.floor((lat + 80) / 8);
    return bands[Math.max(0, Math.min(19, idx))];
  }

  function mgrs100kmSet(easting, northing, zone) {
    const setParity = (zone - 1) % 6;
    const e = Math.floor(easting / 100000);
    const n = Math.floor(northing / 100000);
    const cols = 'ABCDEFGH';
    const rows = ['ABCDEFGHJKLMNPQRSTUV', 'FGHJKLMNPQRSTUVABCDE', 'ABCDEFGHJKLMNPQRSTUV'];
    const col = cols[(e - 1) % 8];
    const row = rows[setParity][(n - 1) % 20];
    return [col, row];
  }

  /* ========================================== */
  /* PROXIMITY ALERTS                           */
  /* ========================================== */
  const proximityState = {
    zone: null, // { center: {lat, lon}, radius: meters }
    circle: null,
    lastAlert: 0,
  };

  function setProximityZone() {
    if (!state.lastUserPos) {
      showToast('Position non disponible', 'error');
      return;
    }
    const radius = 100; // meters
    proximityState.zone = { center: { ...state.lastUserPos }, radius };
    if (proximityState.circle && fullMapState.initialized) {
      fullMapState.map.removeLayer(proximityState.circle);
    }
    if (fullMapState.initialized) {
      proximityState.circle = L.circle([state.lastUserPos.lat, state.lastUserPos.lon], {
        radius, color: '#F9A825', fillColor: '#F9A825', fillOpacity: 0.15, weight: 2, dashArray: '6,6',
      }).addTo(fullMapState.map);
    }
    showToast('🎯 Zone de proximité définie (rayon ' + radius + ' m)', 'success');
  }

  function checkProximity() {
    if (!proximityState.zone || !state.lastUserPos) return;
    const dist = haversineMeters(state.lastUserPos.lat, state.lastUserPos.lon, proximityState.zone.center.lat, proximityState.zone.center.lon);
    if (dist > proximityState.zone.radius) {
      const now = Date.now();
      if (now - proximityState.lastAlert > 30000) { // alert every 30s
        proximityState.lastAlert = now;
        showToast('⚠️ Tu as quitté la zone de proximité ! (' + dist.toFixed(0) + ' m)', 'error');
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }
    }
  }

  /* ========================================== */
  /* MAP ROTATION (heading)                     */
  /* ========================================== */
  const mapRotationState = { northUp: true, currentHeading: 0 };
  function toggleMapRotation() {
    mapRotationState.northUp = !mapRotationState.northUp;
    const btn = $('toggleMapRotation');
    if (btn) {
      btn.textContent = mapRotationState.northUp ? '🧭 Nord-haut' : '🧭 Cap-haut';
    }
    if (!mapRotationState.northUp) {
      // Subscribe to device orientation if available
      if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', handleOrientation);
      }
      showToast('🧭 Mode cap-haut (rotation selon orientation appareil)', 'success');
    } else {
      window.removeEventListener('deviceorientation', handleOrientation);
      if (fullMapState.initialized) {
        // Reset rotation by re-applying a small invalid rotation
        const container = fullMapState.map.getContainer();
        if (container) container.style.transform = '';
      }
      showToast('🧭 Mode nord-haut (carte fixe)', 'success');
    }
  }

  function handleOrientation(e) {
    let heading = 0;
    if (e.webkitCompassHeading !== undefined) {
      heading = e.webkitCompassHeading; // iOS
    } else if (e.alpha !== null) {
      heading = 360 - e.alpha; // Android
    }
    mapRotationState.currentHeading = heading;
    if (fullMapState.initialized && !mapRotationState.northUp) {
      const container = fullMapState.map.getContainer();
      if (container) {
        container.style.transform = 'rotate(' + (-heading) + 'deg)';
        container.style.transformOrigin = 'center center';
      }
    }
  }

  /* ========================================== */
  /* BATTERY / NETWORK RECORDING                */
  /* ========================================== */
  function getBatteryInfo() {
    if (navigator.getBattery) {
      return navigator.getBattery().then((b) => ({
        level: Math.round(b.level * 100),
        charging: b.charging,
      }));
    }
    return Promise.resolve({ level: null, charging: null });
  }

  function getNetworkInfo() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      return {
        type: conn.effectiveType || conn.type || 'unknown',
        downlink: conn.downlink,
      };
    }
    return { type: 'unknown', downlink: null };
  }

  /* ========================================== */
  /* GEOJSON IMPORT/EXPORT                      */
  /* ========================================== */
  function exportGeoJSON() {
    const waypoints = JSON.parse(localStorage.getItem('subtopo-waypoints') || '[]');
    const tracks = state.tracks;
    const features = [];
    // Waypoints
    waypoints.forEach((w) => {
      const u = latLonToUTM(w.lat, w.lon);
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [w.lon, w.lat, w.alt] },
        properties: {
          name: w.name,
          utm_zone: u.zone + u.hemisphere,
          utm_x: u.x,
          utm_y: u.y,
          utm_z: w.alt,
          accuracy: w.accuracy,
          quality: w.quality,
          timestamp: w.timestamp,
        },
      });
    });
    // Tracks
    tracks.forEach((t) => {
      if (!t.points || t.points.length < 2) return;
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: t.points.map((p) => [p.lon, p.lat, p.alt]),
        },
        properties: {
          name: 'Track ' + new Date(t.startTime).toISOString(),
          mode: t.mode,
          startTime: new Date(t.startTime).toISOString(),
          endTime: t.endTime ? new Date(t.endTime).toISOString() : null,
          totalDistance: t.totalDistance,
          pointCount: t.points.length,
        },
      });
    });
    const geojson = {
      type: 'FeatureCollection',
      features,
    };
    downloadFile(JSON.stringify(geojson, null, 2), 'subtopo-data.geojson', 'application/geo+json');
    showToast('✅ Export GeoJSON (' + features.length + ' éléments)', 'success');
  }

  function importGeoJSON(content) {
    try {
      const data = JSON.parse(content);
      const features = data.features || (data.type === 'Feature' ? [data] : []);
      let wpCount = 0;
      let trackCount = 0;
      const stored = JSON.parse(localStorage.getItem('subtopo-waypoints') || '[]');
      features.forEach((f) => {
        if (f.geometry.type === 'Point') {
          const [lon, lat, alt] = f.geometry.coordinates;
          stored.push({
            name: (f.properties && f.properties.name) || 'Imported',
            lat, lon, alt: alt || 0,
            accuracy: (f.properties && f.properties.accuracy) || 0,
            quality: (f.properties && f.properties.quality) || '—',
            timestamp: (f.properties && f.properties.timestamp) || new Date().toISOString(),
          });
          wpCount++;
        } else if (f.geometry.type === 'LineString') {
          state.tracks.push({
            id: 'track-' + Date.now() + '-' + Math.random(),
            startTime: Date.now(),
            endTime: Date.now(),
            mode: (f.properties && f.properties.mode) || 'imported',
            points: f.geometry.coordinates.map((c) => ({
              lat: c[1], lon: c[0], alt: c[2] || 0, timestamp: Date.now(),
            })),
            totalDistance: 0,
            duration: 0,
          });
          trackCount++;
        }
      });
      localStorage.setItem('subtopo-waypoints', JSON.stringify(stored));
      saveTracks();
      showToast('✅ Importé : ' + wpCount + ' waypoints, ' + trackCount + ' tracks', 'success');
      drawAllSavedTracks();
      drawAllSavedWaypoints();
    } catch (e) {
      showToast('❌ Fichier GeoJSON invalide : ' + e.message, 'error');
    }
  }

  function importGPX(content) {
    try {
      const parser = new DOMParser();
      const xml = parser.parseFromString(content, 'application/xml');
      const wpts = xml.getElementsByTagName('wpt');
      const trkpts = xml.getElementsByTagName('trkpt');
      const stored = JSON.parse(localStorage.getItem('subtopo-waypoints') || '[]');
      let wpCount = 0, trackCount = 0;
      for (const w of wpts) {
        const lat = parseFloat(w.getAttribute('lat'));
        const lon = parseFloat(w.getAttribute('lon'));
        const ele = w.getElementsByTagName('ele')[0];
        const name = w.getElementsByTagName('name')[0];
        stored.push({
          name: name ? name.textContent : 'Imported',
          lat, lon, alt: ele ? parseFloat(ele.textContent) : 0,
          accuracy: 0, quality: '—',
          timestamp: new Date().toISOString(),
        });
        wpCount++;
      }
      for (const trk of xml.getElementsByTagName('trk')) {
        const trkptsInTrk = trk.getElementsByTagName('trkpt');
        if (trkptsInTrk.length < 2) continue;
        const points = [];
        for (const p of trkptsInTrk) {
          points.push({
            lat: parseFloat(p.getAttribute('lat')),
            lon: parseFloat(p.getAttribute('lon')),
            alt: parseFloat((p.getElementsByTagName('ele')[0] || {textContent: 0}).textContent) || 0,
            timestamp: new Date().toISOString(),
          });
        }
        state.tracks.push({
          id: 'track-' + Date.now() + '-' + Math.random(),
          startTime: Date.now(), endTime: Date.now(),
          mode: 'imported', points, totalDistance: 0, duration: 0,
        });
        trackCount++;
      }
      localStorage.setItem('subtopo-waypoints', JSON.stringify(stored));
      saveTracks();
      drawAllSavedTracks();
      drawAllSavedWaypoints();
      showToast('✅ GPX importé : ' + wpCount + ' waypoints, ' + trackCount + ' tracks', 'success');
    } catch (e) {
      showToast('❌ Fichier GPX invalide : ' + e.message, 'error');
    }
  }

  function initImportExport() {
    $('importBtn').addEventListener('click', () => $('importFile').click());
    $('importFile').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const content = evt.target.result;
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext === 'geojson' || ext === 'json') importGeoJSON(content);
        else if (ext === 'gpx') importGPX(content);
        else if (ext === 'kml' || ext === 'kmz') importKML(content);
        else showToast('Format non supporté : ' + ext, 'error');
        e.target.value = '';
      };
      reader.readAsText(file);
    });
  }

  function importKML(content) {
    try {
      const parser = new DOMParser();
      const xml = parser.parseFromString(content, 'application/xml');
      const stored = JSON.parse(localStorage.getItem('subtopo-waypoints') || '[]');
      let wpCount = 0;
      // Placemarks can contain Point, LineString, Polygon
      const placemarks = xml.getElementsByTagName('Placemark');
      for (const pm of placemarks) {
        const nameEl = pm.getElementsByTagName('name')[0];
        const name = nameEl ? nameEl.textContent : 'Imported';
        const point = pm.getElementsByTagName('Point')[0];
        const lineString = pm.getElementsByTagName('LineString')[0];
        if (point) {
          const coords = (point.getElementsByTagName('coordinates')[0] || {}).textContent || '';
          const [lon, lat, alt] = coords.trim().split(',').map(parseFloat);
          if (!isNaN(lat) && !isNaN(lon)) {
            stored.push({
              name, lat, lon, alt: alt || 0,
              accuracy: 0, quality: '—',
              timestamp: new Date().toISOString(),
            });
            wpCount++;
          }
        } else if (lineString) {
          const coords = (lineString.getElementsByTagName('coordinates')[0] || {}).textContent || '';
          const points = [];
          coords.trim().split(/\s+/).forEach((p) => {
            const [lon, lat, alt] = p.split(',').map(parseFloat);
            if (!isNaN(lat) && !isNaN(lon)) {
              points.push({ lat, lon, alt: alt || 0, timestamp: new Date().toISOString() });
            }
          });
          if (points.length >= 2) {
            state.tracks.push({
              id: 'track-' + Date.now() + '-' + Math.random(),
              startTime: Date.now(), endTime: Date.now(),
              mode: 'imported (KML)', points, totalDistance: 0, duration: 0,
            });
          }
        }
      }
      localStorage.setItem('subtopo-waypoints', JSON.stringify(stored));
      saveTracks();
      drawAllSavedTracks();
      drawAllSavedWaypoints();
      showToast('✅ KML importé : ' + wpCount + ' éléments', 'success');
    } catch (e) {
      showToast('❌ Fichier KML invalide : ' + e.message, 'error');
    }
  }

  /* ========================================== */
  /* PWA INSTALL PROMPT                         */
  /* ========================================== */
  let deferredInstallPrompt = null;
  function initPWA() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      showInstallButton();
    });
    window.addEventListener('appinstalled', () => {
      hideInstallButton();
      showToast('✅ SubTopo-GNSS installé !', 'success');
      deferredInstallPrompt = null;
    });
  }
  function showInstallButton() {
    let btn = $('pwaInstallBtn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'pwaInstallBtn';
      btn.className = 'pwa-install-btn';
      btn.innerHTML = '📲 Installer l\'app';
      btn.addEventListener('click', async () => {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          showToast('Installation en cours...', 'success');
        }
        deferredInstallPrompt = null;
        hideInstallButton();
      });
      document.body.appendChild(btn);
    }
    btn.classList.add('visible');
  }
  function hideInstallButton() {
    const btn = $('pwaInstallBtn');
    if (btn) btn.classList.remove('visible');
  }

  /* ========================================== */
  /* ONBOARDING TOUR                            */
  /* ========================================== */
  let onboardingStep = 0;
  const ONBOARDING_STEPS = 4;

  function initOnboarding() {
    const seen = localStorage.getItem('subtopo-onboarding-seen');
    if (!seen) {
      setTimeout(() => $('onboardingModal').classList.remove('hidden'), 800);
    }
    $('onboardingNext').addEventListener('click', () => {
      if (onboardingStep < ONBOARDING_STEPS - 1) {
        onboardingStep++;
        updateOnboardingStep();
      } else {
        closeOnboarding();
      }
    });
    $('onboardingPrev').addEventListener('click', () => {
      if (onboardingStep > 0) {
        onboardingStep--;
        updateOnboardingStep();
      }
    });
    $('onboardingSkip').addEventListener('click', closeOnboarding);
  }

  function updateOnboardingStep() {
    $$('.onboarding-step').forEach((s) => s.classList.add('hidden'));
    $$('.onboarding-dot').forEach((d) => {
      d.classList.remove('active', 'completed');
      if (parseInt(d.dataset.step, 10) === onboardingStep) d.classList.add('active');
      else if (parseInt(d.dataset.step, 10) < onboardingStep) d.classList.add('completed');
    });
    const current = document.querySelector('.onboarding-step[data-step="' + onboardingStep + '"]');
    if (current) current.classList.remove('hidden');
    $('onboardingPrev').disabled = onboardingStep === 0;
    $('onboardingNext').textContent = onboardingStep === ONBOARDING_STEPS - 1 ? '✓ Commencer' : 'Suivant →';
  }

  function closeOnboarding() {
    $('onboardingModal').classList.add('hidden');
    localStorage.setItem('subtopo-onboarding-seen', '1');
  }

  function initOverlays() {
    const hillshadeToggle = $('overlayHillshade');
    if (hillshadeToggle) {
      hillshadeToggle.addEventListener('change', (e) => toggleOverlay('hillshade', e.target.checked));
    }
    const contoursToggle = $('overlayContours');
    if (contoursToggle) {
      contoursToggle.addEventListener('change', (e) => toggleOverlay('contours', e.target.checked));
    }
  }

  /* ========================================== */
  /* TOAST                                      */
  /* ========================================== */
  let toastTimer = null;
  function showToast(message, type) {
    const t = $('toast');
    t.textContent = message;
    t.className = 'toast visible ' + (type || '');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.classList.remove('visible');
    }, 2800);
  }

  /* ========================================== */
  /* INIT                                       */
  /* ========================================== */
  function init() {
    // Load language
    const savedLang = localStorage.getItem('subtopo-lang');
    if (savedLang && I18N[savedLang]) currentLang = savedLang;
    applyI18n();
    initTheme();
    loadSettings();
    loadTracks();
    loadRoutes();
    // Load map layer pref
    const ml = localStorage.getItem('subtopo-map-layer');
    if (ml && TILE_LAYERS[ml]) {
      state.mapLayer = ml;
      const radio = document.querySelector('input[name="mapLayer"][value="' + ml + '"]');
      if (radio) radio.checked = true;
    }
    initSplash();
    initTabs();
    initDrawer();
    initCoordToggle();
    initModeToggle();
    initSurvey();
    initExports();
    initSettings();
    initAddWaypointModal();
    initImportExport();
    initSearch();
    initOverlays();
    initOnboarding();
    initPWA();
    initWebView();
    registerServiceWorker();
    $('themeToggle').addEventListener('click', toggleTheme);
    $('langToggle').addEventListener('click', toggleLang);
    // Init mini-map after splash (the Relevé tab is the default active tab)
    setTimeout(() => {
      if (!miniMapState.initialized) initMiniMap();
    }, 2400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
