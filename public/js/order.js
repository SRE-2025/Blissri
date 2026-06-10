/* ===========================================================
   Blissri — ordering page, Crumbl-style.
   - "This Week's Lineup" featured band
   - category tabs + square product cards
   - tap a card → detail modal with quantity + "Add to Box"
   - "Add" buttons with fly-to-cart, inline steppers
   Loaded only on the ordering page (order-lantana.html).
   =========================================================== */
(function () {
  "use strict";

  var menu = null;
  var activeCat = "all";
  var itemById = {};

  function render() {
    if (!menu) return;
    renderWeek();
    renderTabs();
    renderGrid();
  }

  // ---- This Week's Lineup ---------------------------------------------------
  function renderWeek() {
    var host = document.getElementById("weekBand");
    if (!host) return;
    var feat = (menu.items || []).filter(function (it) { return it.featured; }).slice(0, 6);
    if (!feat.length) { host.innerHTML = ""; return; }
    host.innerHTML =
      '<div class="week-head">' +
        '<span class="kicker">★ This Week’s Lineup ★</span>' +
        '<h2>Six treats, baked fresh this week</h2>' +
        '<p>Tap any treat to see the details and add it to your box.</p>' +
      '</div>' +
      '<div class="week-grid">' + feat.map(cardHTML).join("") + '</div>';
    wire(host);
  }

  // ---- Tabs -----------------------------------------------------------------
  function renderTabs() {
    var tabsEl = document.getElementById("catTabs");
    if (!tabsEl) return;
    var cats = [{ id: "all", name: "All Treats", emoji: "✨" }].concat(menu.categories || []);
    tabsEl.innerHTML = cats.map(function (c) {
      return '<button class="tab' + (c.id === activeCat ? " active" : "") + '" data-cat="' + c.id + '">' +
        '<span>' + (c.emoji || "") + '</span> ' + esc(c.name) + '</button>';
    }).join("");
    tabsEl.querySelectorAll(".tab").forEach(function (b) {
      b.addEventListener("click", function () { activeCat = b.getAttribute("data-cat"); renderTabs(); renderGrid(); });
    });
  }

  // ---- Product grid ---------------------------------------------------------
  function renderGrid() {
    var gridEl = document.getElementById("productGrid");
    if (!gridEl) return;
    var items = (menu.items || []).filter(function (it) { return activeCat === "all" || it.category === activeCat; });
    gridEl.innerHTML = items.map(cardHTML).join("");
    wire(gridEl);
  }

  function thumbHTML(it, big) {
    if (it.img) {
      return '<img src="' + esc(it.img) + '" alt="' + esc(it.name) + '" ' +
        'onerror="this.replaceWith(document.createTextNode(\'' + (it.emoji || "🧁") + '\'))">';
    }
    return it.emoji || "🧁";
  }

  function cardHTML(it) {
    var cents = Math.round(it.price * 100);
    var badge = it.badge ? '<span class="pbadge">' + esc(it.badge) + "</span>" : "";
    return '' +
      '<article class="product crumbl" data-id="' + it.id + '">' +
        '<div class="pthumb" data-open="' + it.id + '">' + badge + thumbHTML(it) + '</div>' +
        '<div class="pbody">' +
          '<h3 data-open="' + it.id + '">' + esc(it.name) + '</h3>' +
          '<p>' + esc(it.desc || "") + '</p>' +
          '<div class="pmeta">' +
            '<span class="pprice">' + window.Blissri.money(cents) + '</span>' +
            '<span class="addslot" data-slot="' + it.id + '"></span>' +
          '</div>' +
          '<span class="tap-hint" data-open="' + it.id + '">🔍 Tap for details</span>' +
        '</div>' +
      '</article>';
  }

  function controlHTML(id) {
    var qty = window.BlissriCart.qty(id);
    if (qty <= 0) return '<button class="add-btn" data-add="' + id + '">Add +</button>';
    return '<span class="stepper">' +
      '<button data-dec="' + id + '" aria-label="Decrease">−</button>' +
      '<span class="q">' + qty + '</span>' +
      '<button data-inc="' + id + '" aria-label="Increase">+</button></span>';
  }

  function paintControls(scope) {
    (scope || document).querySelectorAll(".addslot").forEach(function (slot) {
      slot.innerHTML = controlHTML(slot.getAttribute("data-slot"));
    });
    wireControls(scope || document);
  }

  function wire(scope) {
    paintControls(scope);
    scope.querySelectorAll("[data-open]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.stopPropagation();
        openModal(el.getAttribute("data-open"));
      });
    });
  }

  function wireControls(scope) {
    scope.querySelectorAll("[data-add]").forEach(function (b) {
      b.addEventListener("click", function (e) { e.stopPropagation(); flyToCart(b); window.BlissriCart.add(b.getAttribute("data-add")); });
    });
    scope.querySelectorAll("[data-inc]").forEach(function (b) {
      b.addEventListener("click", function (e) { e.stopPropagation(); var id = b.getAttribute("data-inc"); window.BlissriCart.setQty(id, window.BlissriCart.qty(id) + 1); });
    });
    scope.querySelectorAll("[data-dec]").forEach(function (b) {
      b.addEventListener("click", function (e) { e.stopPropagation(); var id = b.getAttribute("data-dec"); window.BlissriCart.setQty(id, window.BlissriCart.qty(id) - 1); });
    });
  }

  // ---- Detail modal ---------------------------------------------------------
  var modalRoot, modalQty = 1, modalId = null;

  function ensureModal() {
    if (modalRoot) return;
    modalRoot = document.createElement("div");
    modalRoot.className = "pmodal-overlay";
    modalRoot.id = "pmodal";
    document.body.appendChild(modalRoot);
    modalRoot.addEventListener("click", function (e) { if (e.target === modalRoot) closeModal(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });
  }

  function openModal(id) {
    ensureModal();
    var it = itemById[id];
    if (!it) return;
    modalId = id; modalQty = 1;
    var cents = Math.round(it.price * 100);
    var badge = it.badge ? '<span class="pmodal-badge">' + esc(it.badge) + "</span>" : "";
    modalRoot.innerHTML =
      '<div class="pmodal" role="dialog" aria-modal="true">' +
        '<div class="pmodal-grid">' +
          '<div class="pmodal-img">' + thumbHTML(it) + '</div>' +
          '<div class="pmodal-info">' +
            '<button class="pmodal-close" id="pmClose" aria-label="Close">×</button>' +
            badge +
            '<h2>' + esc(it.name) + '</h2>' +
            '<p class="pdesc">' + esc(it.desc || "") + '</p>' +
            '<div class="pprice2">' + window.Blissri.money(cents) + '</div>' +
            '<div class="pnutri">Freshly baked in Lantana. Our kitchen handles wheat, dairy, eggs, nuts &amp; soy — please ask if you have an allergy.</div>' +
            '<div class="qty-row">' +
              '<span class="stepper">' +
                '<button id="pmDec" aria-label="Decrease">−</button>' +
                '<span class="q" id="pmQty">1</span>' +
                '<button id="pmInc" aria-label="Increase">+</button>' +
              '</span>' +
              '<button class="btn btn-primary add-to-box" id="pmAdd">Add to Box · ' + window.Blissri.money(cents) + '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    modalRoot.querySelector("#pmClose").addEventListener("click", closeModal);
    modalRoot.querySelector("#pmDec").addEventListener("click", function () { setModalQty(modalQty - 1); });
    modalRoot.querySelector("#pmInc").addEventListener("click", function () { setModalQty(modalQty + 1); });
    modalRoot.querySelector("#pmAdd").addEventListener("click", function () {
      window.BlissriCart.setQty(modalId, window.BlissriCart.qty(modalId) + modalQty);
      closeModal();
      window.BlissriCart.open();
    });
    requestAnimationFrame(function () { modalRoot.classList.add("open"); });
  }

  function setModalQty(q) {
    modalQty = Math.max(1, Math.min(99, q));
    var el = modalRoot.querySelector("#pmQty");
    if (el) el.textContent = modalQty;
    var add = modalRoot.querySelector("#pmAdd");
    var it = itemById[modalId];
    if (add && it) add.textContent = "Add to Box · " + window.Blissri.money(Math.round(it.price * 100) * modalQty);
  }

  function closeModal() { if (modalRoot) modalRoot.classList.remove("open"); }

  // ---- fly to cart ----------------------------------------------------------
  function flyToCart(fromEl) {
    var cartBtn = document.getElementById("cartBtn");
    if (!cartBtn) return;
    var s = fromEl.getBoundingClientRect(), t = cartBtn.getBoundingClientRect();
    var pellet = document.createElement("div");
    pellet.className = "fly"; pellet.textContent = "🧁";
    pellet.style.left = s.left + s.width / 2 + "px";
    pellet.style.top = s.top + "px";
    document.body.appendChild(pellet);
    requestAnimationFrame(function () {
      pellet.style.transform = "translate(" + (t.left - s.left) + "px," + (t.top - s.top) + "px) scale(.4)";
      pellet.style.opacity = "0";
    });
    setTimeout(function () { pellet.remove(); }, 750);
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  document.addEventListener("blissri:cart-changed", function () { paintControls(document); });
  document.addEventListener("blissri:menu-ready", function (e) {
    menu = e.detail;
    (menu.items || []).forEach(function (it) { itemById[it.id] = it; });
    render();
  });
})();
