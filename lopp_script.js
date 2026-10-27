/**
 * Enköpingsloppet — main script
 * No external frameworks. Vanilla JS with modern APIs.
 */

(function () {
  'use strict';

  // ── DOM references ──────────────────────────────────────
  const header      = document.getElementById('site-header');
  const navToggle   = document.getElementById('nav-toggle');
  const navMenu     = document.getElementById('nav-menu');
  const navLinks    = navMenu.querySelectorAll('.navbar_link');
  const modal       = document.getElementById('image-modal');
  const modalImg    = document.getElementById('modal-img');
  const modalCap    = document.getElementById('modal-caption');
  const modalClose  = document.getElementById('modal-close');
  const gallery     = document.querySelector('.gallery');
  const form        = document.getElementById('contact-form');
  const toastBox    = document.getElementById('toast-container');
  const yearSpan    = document.getElementById('year');

  // Set footer year
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  // ── Utility: throttle ───────────────────────────────────
  function throttle(fn, ms) {
    let last = 0;
    return function (...args) {
      const now = Date.now();
      if (now - last >= ms) {
        last = now;
        fn.apply(this, args);
      }
    };
  }

  // ── 1. Navbar scroll effect ─────────────────────────────
  function updateNavbar() {
    header.classList.toggle('scrolled', window.scrollY > 80);
  }

  window.addEventListener('scroll', throttle(updateNavbar, 80), { passive: true });
  updateNavbar(); // initial state (handles page refresh mid-scroll)

  // ── 2. Mobile menu toggle ───────────────────────────────
  function openMenu() {
    navToggle.classList.add('active');
    navToggle.setAttribute('aria-expanded', 'true');
    navMenu.classList.add('open');
  }

  function closeMenu() {
    navToggle.classList.remove('active');
    navToggle.setAttribute('aria-expanded', 'false');
    navMenu.classList.remove('open');
  }

  navToggle.addEventListener('click', function () {
    const isOpen = navMenu.classList.contains('open');
    isOpen ? closeMenu() : openMenu();
  });

  // Close menu when a link is clicked
  navLinks.forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });

  // Close menu on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && navMenu.classList.contains('open')) {
      closeMenu();
      navToggle.focus();
    }
  });

  // ── 3. Image modal (lightbox) ───────────────────────────
  function openModal(src, alt) {
    modalImg.src = src;
    modalImg.alt = alt || '';
    modalCap.textContent = alt || '';
    modal.removeAttribute('hidden');
    // Force reflow before adding .open so the transition fires
    void modal.offsetWidth;
    modal.classList.add('open');
    modalClose.focus();
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
    // Wait for transition, then hide
    modal.addEventListener('transitionend', function handler() {
      modal.setAttribute('hidden', '');
      modalImg.src = '';
      modal.removeEventListener('transitionend', handler);
    });
  }

  // Delegate clicks on gallery items
  if (gallery) {
    gallery.addEventListener('click', function (e) {
      const img = e.target.closest('.gallery_item img');
      if (!img) return;
      openModal(img.src, img.alt);
    });
  }

  // Close modal
  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeModal();
    }
  });

  // ── 4. Scroll-reveal (IntersectionObserver) ─────────────
  const revealObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  document.querySelectorAll('.reveal').forEach(function (el) {
    revealObserver.observe(el);
  });

  // ── 5. Animate stat counters ───────────────────────────
  // (Previous skill-bar observer removed — no .skill elements exist in the HTML.)
  // Format a stat number — preserves 1 decimal when needed (e.g. 5.5),
  // but renders integers without a trailing .0 (so "10" stays "10", not "10.0").
  function formatStatNumber(value) {
    var rounded = Math.round(value * 10) / 10;
    return (rounded % 1 === 0) ? String(rounded) : rounded.toFixed(1);
  }

  function animateCounter(el, target, duration) {
    var startTime = null;
    var isDecimal = target % 1 !== 0;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease-out quad
      var eased = 1 - (1 - progress) * (1 - progress);
      var current = eased * target;
      el.textContent = isDecimal ? current.toFixed(1) : Math.floor(current);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = formatStatNumber(target);
      }
    }

    requestAnimationFrame(step);
  }

  var statsAnimated = false;

  var statsObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !statsAnimated) {
          statsAnimated = true;
          document.querySelectorAll('.stat_number').forEach(function (el) {
            var raw = el.getAttribute('data-target');
            var target = parseFloat(raw);
            if (isNaN(target)) return;
            animateCounter(el, target, 1400);
          });
          statsObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.3 }
  );

  var statsSection = document.querySelector('.stats');
  if (statsSection) {
    statsObserver.observe(statsSection);
  }

  // ── 7. Form handling ───────────────────────────────────
  // Custom Swedish validation messages — overrides the browser's default
  // English strings when checkValidity() / reportValidity() runs.
  function setupSwedishValidation() {
    if (!form) return;
    var messages = {
      valueMissing: function (label) { return 'Vänligen fyll i ' + label + '.'; },
      typeMismatch: function (label) { return 'Ogiltigt format för ' + label + '.'; },
      tooShort: function (label, min) { return label + ' måste vara minst ' + min + ' tecken.'; }
    };

    function validateField(field) {
      var label = field.getAttribute('data-label') || field.name;
      var validity = field.validity;
      var msg = '';
      if (validity.valueMissing) msg = messages.valueMissing(label);
      else if (validity.typeMismatch) msg = messages.typeMismatch(label);
      else if (validity.tooShort) msg = messages.tooShort(label, field.getAttribute('minlength'));
      field.setCustomValidity(msg);
    }

    form.querySelectorAll('input, textarea').forEach(function (field) {
      field.addEventListener('input', function () { validateField(field); });
      field.addEventListener('blur', function () { validateField(field); });
      validateField(field);
    });
  }

  setupSwedishValidation();

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Native HTML5 validation (with Swedish messages set above)
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      // Collect data (for demonstration — no backend)
      var data = new FormData(form);
      var name = data.get('name');

      showToast('Tack, ' + name + '! Ditt meddelande har skickats.', 'success');
      form.reset();
    });
  }

  // ── 8. Interactive route map (OpenStreetMap via Leaflet) ─────────────────
  function buildFallbackRouteData() {
    return {
      map: {
        center_lat: 59.6355,
        center_lng: 17.0890,
        zoom: 14
      },
      routes: [
        {
          id: 'knatte',
          label: 'Barnloppet',
          color: '#ffba43',
          coordinates: [
            [59.632536, 17.068934],
            [59.633404, 17.068055],
            [59.633111, 17.06681],
            [59.632157, 17.067733],
            [59.632482, 17.068892]
          ]
        },
        {
          id: '5,5km',
          label: '5,5 km',
          color: '#ff642d',
          coordinates: [
            [59.632204, 17.06762],
            [59.633009, 17.066821],
            [59.633402, 17.067288],
            [59.633394, 17.067921],
            [59.632998, 17.068527],
            [59.632456, 17.068924],
            [59.632138, 17.068961],
            [59.631713, 17.069208],
            [59.631637, 17.0699],
            [59.633599, 17.073108],
            [59.633934, 17.072046],
            [59.634115, 17.071745],
            [59.634755, 17.071279],
            [59.634871, 17.070925],
            [59.63486, 17.07042],
            [59.634322, 17.066982],
            [59.634238, 17.065984],
            [59.634216, 17.06511],
            [59.634343, 17.063876],
            [59.634124, 17.06169],
            [59.634075, 17.0604],
            [59.634294, 17.059193],
            [59.634709, 17.058383],
            [59.635197, 17.057841],
            [59.635344, 17.057868],
            [59.635385, 17.057567],
            [59.635084, 17.05673],
            [59.634750, 17.057610],
            [59.633763, 17.059101],
            [59.633541, 17.059675],
            [59.633475, 17.060319],
            [59.63347, 17.060716],
            [59.633906, 17.062288],
            [59.634042, 17.063758],
            [59.633825, 17.064729],
            [59.633774, 17.065356],
            [59.633812, 17.065737],
            [59.631943, 17.066408],
            [59.631797, 17.066612],
            [59.631498, 17.068757],
            [59.631618, 17.069315],
            [59.632105, 17.06893],
            [59.632496, 17.06894],
            [59.633332, 17.06806],
            [59.633375, 17.067218],
            [59.632998, 17.066869],
            [59.632195, 17.067561]
          ]
        },
        {
          id: 'enkopingsloppet-10-km-tavlingsloppet',
          label: '10 km',
          color: '#3d608a',
          coordinates: [
            [59.632358, 17.067718],
            [59.632955, 17.067070],
            [59.633380, 17.067394],
            [59.633229, 17.068245],
            [59.632333, 17.069060],
            [59.632020, 17.068700],
            [59.631640, 17.069242],//Rondellen utanför ENA-vallen
            [59.633607, 17.073108],
            [59.633518, 17.0738],
            [59.633586, 17.073945],
            [59.633678, 17.07424],
            [59.633778, 17.074776],
            [59.63377, 17.07477],
            [59.633875, 17.075301],
            [59.633676, 17.075689],
            [59.631672, 17.080122],
            [59.63114, 17.080884],
            [59.629896, 17.081685],
            [59.628898, 17.082318],
            [59.627677, 17.081353],
            [59.626027, 17.079856],
            [59.61992, 17.07741],
            [59.618746, 17.077153],
            [59.617682, 17.076831],
            [59.617487, 17.076981],
            [59.617641, 17.077031],
            [59.618262, 17.078082],
            [59.618456, 17.078559],
            [59.620272, 17.080964],
            [59.62109, 17.081852],
            [59.621417, 17.082119],
            [59.621884, 17.082441],
            [59.623837, 17.086453],
            [59.625626, 17.089791],
            [59.626137, 17.090121],
            [59.626734, 17.090207],
            [59.627964, 17.091417],//Innan rondell (badhus)
            [59.629053, 17.093381],//Tvär högersväng (badhus)
            [59.628971, 17.093693],//Tvär vänstersväng (badhus)
            [59.629972, 17.095319],//Tvär vänstersväng i vattenparken
            [59.630759, 17.094305],
            [59.630939, 17.093784],//Förbi lilla stugan i vattenparken
            [59.631952, 17.092331],//Efter lilla bron i vattenparken, högersväng
            [59.632880, 17.094780],//Innan stora bron i vattenparken
            [59.632416, 17.095854],//Innan vattendepå 1
            [59.632422, 17.096239],
            [59.632498, 17.097441],
            [59.632591, 17.098578],
            [59.632862, 17.098857],
            [59.633482, 17.098767],
            [59.633883, 17.098617],
            [59.634838, 17.097694],
            [59.635489, 17.097415],
            [59.63589, 17.096665],
            [59.636034, 17.096808],
            [59.636224, 17.096964],
            [59.636317, 17.096996],
            [59.636504, 17.096905],
            [59.636626, 17.096872],
            [59.6354, 17.093289],
            [59.635033, 17.092352],
            [59.634727, 17.091122],
            [59.634686, 17.090078],
            [59.63348, 17.087989],
            [59.632243, 17.086465],
            [59.630034, 17.082256],
            [59.629798, 17.081849],
            [59.631013, 17.081055],
            [59.631447, 17.080663],
            [59.631807, 17.080031],
            [59.632336, 17.078786],
            [59.634414, 17.07448],
            [59.633752, 17.073054],
            [59.634072, 17.071927],
            [59.634587, 17.071445],
            [59.634924, 17.070619],
            [59.634523, 17.068528],
            [59.634144, 17.066211],
            [59.634198, 17.06473],
            [59.63435, 17.063876],
            [59.634328, 17.063751],//Längs ån efter korsning
            [59.634045, 17.060796],//Längs ån efter korsning
            [59.634163, 17.059793],//Längs ån efter korsning
            [59.634559, 17.058662],
            [59.635113, 17.057907],
            [59.635414, 17.057739],//Bron (Västerleden) börjar
            [59.635116, 17.056835],//Efter bron
            [59.634828, 17.057444],
            [59.633872, 17.058838],
            [59.633519, 17.059503],
            [59.63345, 17.060147],
            [59.633535, 17.061069],
            [59.633915, 17.062281],
            [59.634034, 17.06388],
            [59.633779, 17.065714],
            [59.632423, 17.066239],
            [59.631735, 17.066701],
            [59.63156, 17.068784],
            [59.631554, 17.069075],
            [59.631993, 17.068593],//Inne på vallen, ska svänga höger in på banan
            [59.632496, 17.06894],
            [59.633332, 17.06806],
            [59.633375, 17.067218],
            [59.632998, 17.066869],
            [59.632195, 17.067561]
          ]
        }
      ]
    };
  }

  var routeMapState = {
    map: null,
    routeGroup: null,
    selectedRaceId: null,
    races: []
  };

  function getRouteLabelsMap(data) {
    var labels = {};

    if (data && Array.isArray(data.raceClasses)) {
      data.raceClasses.forEach(function (raceClass) {
        if (raceClass && raceClass.id) {
          labels[raceClass.id] = raceClass.nameSv || raceClass.name || raceClass.distance || raceClass.id;
        }
      });
    }

    labels.knatte = labels.knatte || 'Barnloppet';
    labels['5,5km'] = labels['5,5km'] || '5,5 km';
    labels['enkopingsloppet-10-km-tavlingsloppet'] = labels['enkopingsloppet-10-km-tavlingsloppet'] || '10 km';

    return labels;
  }

  function initRouteMapControls(data) {
    var routeSelector = document.getElementById('route-selector');
    if (!routeSelector) return;

    var labels = getRouteLabelsMap(data);
    var routeOrder = ['enkopingsloppet-10-km-tavlingsloppet', '5,5km', 'knatte'];
    var routes = (data && Array.isArray(data.raceRoutes) ? data.raceRoutes : buildFallbackRouteData().routes);
    var mapRoutes = routeOrder
      .map(function (raceId) {
        var match = routes.find(function (route) { return route && route.id === raceId; });
        if (!match) return null;

        match.label = labels[raceId] || match.label || raceId;
        return match;
      })
      .filter(Boolean);

    routeMapState.races = mapRoutes.length ? mapRoutes : buildFallbackRouteData().routes;
    routeSelector.innerHTML = '';

    routeMapState.races.forEach(function (race) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'route-toggle';
      button.textContent = race.label;
      button.setAttribute('data-race-id', race.id);
      button.addEventListener('click', function () {
        renderRouteOnMap(race.id);
      });
      routeSelector.appendChild(button);
    });

    routeMapState.selectedRaceId = 'enkopingsloppet-10-km-tavlingsloppet';

    renderRouteOnMap(routeMapState.selectedRaceId);
  }

  function renderRouteOnMap(raceId) {
    if (!document.getElementById('route-map') || typeof L === 'undefined') return;

    var route = routeMapState.races.find(function (item) {
      return item && item.id === raceId;
    });

    if (!route) return;

    routeMapState.selectedRaceId = raceId;

    var selectorButtons = document.querySelectorAll('.route-toggle');
    selectorButtons.forEach(function (button) {
      button.classList.remove('is-active');
    });

    selectorButtons.forEach(function (button) {
      if (button.getAttribute('data-race-id') === raceId) {
        button.classList.add('is-active');
      }
    });

    if (!routeMapState.map) {
      routeMapState.map = L.map('route-map', {
        zoomControl: true,
        scrollWheelZoom: true
      }).setView([59.6355, 17.0890], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap-bidragare'
      }).addTo(routeMapState.map);

      routeMapState.routeGroup = L.layerGroup().addTo(routeMapState.map);
    }

    if (routeMapState.routeGroup) {
      routeMapState.routeGroup.clearLayers();
    }

    var points = Array.isArray(route.coordinates) && route.coordinates.length ? route.coordinates : [];
    var latLngs = points.map(function (point) {
      return [point[0], point[1]];
    });

    if (!latLngs.length) {
      routeMapState.map.setView([59.6355, 17.0890], 14);
      return;
    }

    var routeLine = L.polyline(latLngs, {
      color: route.color || '#c0392b',
      weight: 6,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(routeMapState.routeGroup);

    L.marker(latLngs[0]).addTo(routeMapState.routeGroup)
      .bindPopup('<strong>Start</strong><br>Enavallens IP');

    L.marker(latLngs[latLngs.length - 1]).addTo(routeMapState.routeGroup)
      .bindPopup('<strong>Mål</strong><br>Enavallens IP');

    if (Array.isArray(route.points)) {
      route.points.forEach(function (point) {
        if (!Array.isArray(point) || point.length < 2) return;
        L.circleMarker([point[0], point[1]], {
          radius: 7,
          color: '#16a34a',
          fillColor: '#16a34a',
          fillOpacity: 0.9,
          weight: 2
        }).addTo(routeMapState.routeGroup);
      });
    }

    routeMapState.map.fitBounds(routeLine.getBounds(), { padding: [22, 22] });
  }

  function loadRouteData() {
    if (!document.getElementById('route-map')) return;

    var localRouteData = buildFallbackRouteData();
    routeMapState.races = localRouteData.routes;
    routeMapState.selectedRaceId = routeMapState.selectedRaceId || localRouteData.routes[0].id;

    initRouteMapControls(localRouteData);
  }

  loadRouteData();

  // ── 9. Toast notifications ─────────────────────────────
  function showToast(message, type) {
    type = type || 'success';
    var toast = document.createElement('div');
    toast.className = 'toast toast--' + type;
    toast.textContent = message;
    toastBox.appendChild(toast);

    // Trigger reflow then animate in
    void toast.offsetWidth;
    toast.classList.add('visible');

    setTimeout(function () {
      toast.classList.remove('visible');
      toast.addEventListener('transitionend', function () {
        toast.remove();
      });
    }, 3500);
  }

})();