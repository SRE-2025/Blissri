/* ===========================================================
   Blissri — cart engine + slide-in checkout drawer.
   Works site-wide (badge + drawer). Talks to /api/checkout,
   which creates a Square hosted-checkout link.
   =========================================================== */
(function () {
  "use strict";

  var STORAGE_KEY = "blissri_cart_v1";
  var cart = load();          // { id: qty }
  var itemIndex = {};         // id -> menu item (filled from /api/menu)

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch (e) {}
  }

  function count() {
    return Object.keys(cart).reduce(function (n, id) { return n + cart[id]; }, 0);
  }
  function totalCents() {
    return Object.keys(cart).reduce(function (sum, id) {
      var it = itemIndex[id];
      return sum + (it ? Math.round(it.price * 100) * cart[id] : 0);
    }, 0);
  }

  // ---- public API -----------------------------------------------------------
  var API = {
    add: function (id) { cart[id] = (cart[id] || 0) + 1; changed(); },
    setQty: function (id, qty) {
      qty = Math.max(0, Math.min(99, qty | 0));
      if (qty === 0) delete cart[id]; else cart[id] = qty;
      changed();
    },
    qty: function (id) { return cart[id] || 0; },
    count: count,
    open: openDrawer,
    close: closeDrawer,
  };
  window.BlissriCart = API;

  function changed() {
    save();
    updateBadge();
    renderDrawer();
    document.dispatchEvent(new CustomEvent("blissri:cart-changed"));
  }

  function updateBadge() {
    var badge = document.getElementById("cartCount");
    if (!badge) return;
    var c = count();
    badge.textContent = c;
    badge.hidden = c === 0;
  }

  // ---- drawer ---------------------------------------------------------------
  var overlay, drawer, bodyEl, footEl;

  function buildDrawer() {
    overlay = document.createElement("div");
    overlay.className = "cart-overlay";
    overlay.id = "cartOverlay";

    drawer = document.createElement("aside");
    drawer.className = "cart-drawer";
    drawer.setAttribute("aria-hidden", "true");
    drawer.innerHTML =
      '<div class="cart-head"><h3>Your Box 🩷</h3>' +
        '<button class="cart-close" id="cartClose" aria-label="Close cart">×</button></div>' +
      '<div class="cart-body" id="cartBody"></div>' +
      '<div class="cart-foot" id="cartFoot"></div>';

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    bodyEl = drawer.querySelector("#cartBody");
    footEl = drawer.querySelector("#cartFoot");

    overlay.addEventListener("click", closeDrawer);
    drawer.querySelector("#cartClose").addEventListener("click", closeDrawer);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeDrawer();
    });

    var cartBtn = document.getElementById("cartBtn");
    if (cartBtn) cartBtn.addEventListener("click", openDrawer);
  }

  function openDrawer() { renderDrawer(); overlay.classList.add("open"); drawer.classList.add("open"); drawer.setAttribute("aria-hidden", "false"); }
  function closeDrawer() { overlay.classList.remove("open"); drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); }

  function renderDrawer() {
    if (!bodyEl) return;
    var ids = Object.keys(cart);

    if (ids.length === 0) {
      bodyEl.innerHTML = '<div class="cart-empty"><div class="big">🎁</div>' +
        '<p>Your box is empty.<br>Add some treats to get started!</p>' +
        '<a class="btn btn-primary btn-sm" style="margin-top:16px;" href="order-lantana.html">Browse treats</a></div>';
      footEl.innerHTML = "";
      return;
    }

    bodyEl.innerHTML = ids.map(function (id) {
      var it = itemIndex[id] || { name: id, price: 0, emoji: "🧁" };
      var qty = cart[id];
      var lineCents = Math.round(it.price * 100) * qty;
      return '' +
        '<div class="cart-line">' +
          '<div class="ci">' + (it.emoji || "🧁") + '</div>' +
          '<div class="cinfo"><strong>' + esc(it.name) + '</strong>' +
            '<span class="cp">' + window.Blissri.money(Math.round(it.price * 100)) + ' each</span></div>' +
          '<div class="cright">' +
            '<strong>' + window.Blissri.money(lineCents) + '</strong>' +
            '<span class="stepper">' +
              '<button data-dec="' + id + '" aria-label="Decrease">−</button>' +
              '<span class="q">' + qty + '</span>' +
              '<button data-inc="' + id + '" aria-label="Increase">+</button>' +
            '</span>' +
          '</div>' +
        '</div>';
    }).join("");

    bodyEl.querySelectorAll("[data-inc]").forEach(function (b) {
      b.addEventListener("click", function () { API.setQty(b.getAttribute("data-inc"), API.qty(b.getAttribute("data-inc")) + 1); });
    });
    bodyEl.querySelectorAll("[data-dec]").forEach(function (b) {
      b.addEventListener("click", function () { API.setQty(b.getAttribute("data-dec"), API.qty(b.getAttribute("data-dec")) - 1); });
    });

    footEl.innerHTML = '' +
      '<form class="pickup-form" id="pickupForm" novalidate>' +
        '<div class="field2"><label for="pf-name">Pickup name *</label><input id="pf-name" name="name" type="text" placeholder="Name for the order" required></div>' +
        '<div class="field2"><label for="pf-phone">Phone *</label><input id="pf-phone" name="phone" type="tel" placeholder="(561) 000-0000" required></div>' +
        '<div class="field2"><label for="pf-email">Email</label><input id="pf-email" name="email" type="email" placeholder="you@example.com"></div>' +
        '<div class="field2"><label for="pf-notes">Notes</label><textarea id="pf-notes" name="notes" placeholder="Allergies, pickup time, etc."></textarea></div>' +
      '</form>' +
      '<div class="row"><span>Subtotal</span><span>' + window.Blissri.money(totalCents()) + '</span></div>' +
      '<div class="row"><span>Pickup</span><span>In-store · Lantana</span></div>' +
      '<div class="row total"><span>Total</span><span>' + window.Blissri.money(totalCents()) + '</span></div>' +
      '<button class="btn btn-primary btn-block" id="checkoutBtn">Checkout with Square →</button>' +
      '<div class="checkout-msg" id="checkoutMsg"></div>';

    footEl.querySelector("#checkoutBtn").addEventListener("click", checkout);
  }

  function msg(text, kind) {
    var el = document.getElementById("checkoutMsg");
    if (!el) return;
    el.textContent = text;
    el.className = "checkout-msg show " + (kind || "info");
  }

  function checkout() {
    var form = document.getElementById("pickupForm");
    var name = (form.querySelector("#pf-name").value || "").trim();
    var phone = (form.querySelector("#pf-phone").value || "").trim();
    var email = (form.querySelector("#pf-email").value || "").trim();
    var notes = (form.querySelector("#pf-notes").value || "").trim();

    if (!name || !phone) { msg("Please add a pickup name and phone number.", "err"); return; }
    if (Object.keys(cart).length === 0) { msg("Your cart is empty.", "err"); return; }

    var btn = document.getElementById("checkoutBtn");
    btn.disabled = true;
    btn.textContent = "Starting checkout…";

    var items = Object.keys(cart).map(function (id) { return { id: id, qty: cart[id] }; });

    fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: items, customer: { name: name, phone: phone, email: email, notes: notes } }),
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok) { throw new Error(res.d.error || "Checkout failed."); }
        if (res.d.demo) {
          // No Square keys yet — confirm locally so the flow is testable.
          msg(res.d.message || "Demo mode — order recorded locally.", "info");
          localStorage.setItem("blissri_last_order", JSON.stringify({ items: items, customer: { name: name, phone: phone }, total: res.d.totalCents }));
          clearCart();
          setTimeout(function () { window.location.href = res.d.url || "order-confirmed.html?demo=1"; }, 900);
          return;
        }
        // Real Square hosted checkout.
        clearCart();
        window.location.href = res.d.url;
      })
      .catch(function (err) {
        msg(err.message || "Something went wrong. Please try again.", "err");
        btn.disabled = false;
        btn.textContent = "Checkout with Square →";
      });
  }

  function clearCart() { cart = {}; save(); updateBadge(); }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  // ---- boot -----------------------------------------------------------------
  document.addEventListener("blissri:chrome-ready", function () {
    buildDrawer();
    updateBadge();
    window.Blissri.getMenu().then(function (menu) {
      (menu.items || []).forEach(function (it) { itemIndex[it.id] = it; });
      // Drop any stored items that no longer exist on the menu.
      Object.keys(cart).forEach(function (id) { if (!itemIndex[id]) delete cart[id]; });
      save();
      updateBadge();
      renderDrawer();
      document.dispatchEvent(new CustomEvent("blissri:menu-ready", { detail: menu }));
    });
  });
})();
