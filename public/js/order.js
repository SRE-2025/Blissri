/* ===========================================================
   Blissri — ordering page: category tabs + product cards.
   Crumbl-style "Add +" with fly-to-cart and inline steppers.
   Only loaded on the ordering page (order-lantana.html).
   =========================================================== */
(function () {
  "use strict";

  var menu = null;
  var activeCat = "all";

  function render() {
    var tabsEl = document.getElementById("catTabs");
    var gridEl = document.getElementById("productGrid");
    if (!tabsEl || !gridEl || !menu) return;

    // Tabs
    var cats = [{ id: "all", name: "All", emoji: "✨" }].concat(menu.categories || []);
    tabsEl.innerHTML = cats.map(function (c) {
      var active = c.id === activeCat ? " active" : "";
      return '<button class="tab' + active + '" data-cat="' + c.id + '">' +
        '<span>' + (c.emoji || "") + '</span> ' + esc(c.name) + '</button>';
    }).join("");
    tabsEl.querySelectorAll(".tab").forEach(function (b) {
      b.addEventListener("click", function () { activeCat = b.getAttribute("data-cat"); render(); });
    });

    // Products
    var items = (menu.items || []).filter(function (it) {
      return activeCat === "all" || it.category === activeCat;
    });

    gridEl.innerHTML = items.map(cardHTML).join("");
    wireCards(gridEl);
  }

  function cardHTML(it) {
    var cents = Math.round(it.price * 100);
    var thumb = it.img
      ? '<img src="' + esc(it.img) + '" alt="' + esc(it.name) + '" onerror="this.replaceWith(document.createTextNode(\'' + (it.emoji || "🧁") + '\'))">'
      : (it.emoji || "🧁");
    var badge = it.badge ? '<span class="pbadge">' + esc(it.badge) + "</span>" : "";
    return '' +
      '<article class="product" data-id="' + it.id + '">' +
        '<div class="pthumb">' + badge + thumb + '</div>' +
        '<div class="pbody">' +
          '<h3>' + esc(it.name) + '</h3>' +
          '<p>' + esc(it.desc || "") + '</p>' +
          '<div class="pmeta">' +
            '<span class="pprice">' + window.Blissri.money(cents) + '</span>' +
            '<span class="addslot" data-slot="' + it.id + '"></span>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  function controlHTML(id) {
    var qty = window.BlissriCart.qty(id);
    if (qty <= 0) {
      return '<button class="add-btn" data-add="' + id + '">Add +</button>';
    }
    return '<span class="stepper">' +
      '<button data-dec="' + id + '" aria-label="Decrease">−</button>' +
      '<span class="q">' + qty + '</span>' +
      '<button data-inc="' + id + '" aria-label="Increase">+</button>' +
    '</span>';
  }

  function paintControls(scope) {
    (scope || document).querySelectorAll(".addslot").forEach(function (slot) {
      var id = slot.getAttribute("data-slot");
      slot.innerHTML = controlHTML(id);
    });
    wireControls(scope || document);
  }

  function wireCards(gridEl) {
    paintControls(gridEl);
  }

  function wireControls(scope) {
    scope.querySelectorAll("[data-add]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-add");
        flyToCart(b);
        window.BlissriCart.add(id);
      });
    });
    scope.querySelectorAll("[data-inc]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-inc");
        window.BlissriCart.setQty(id, window.BlissriCart.qty(id) + 1);
      });
    });
    scope.querySelectorAll("[data-dec]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-dec");
        window.BlissriCart.setQty(id, window.BlissriCart.qty(id) - 1);
      });
    });
  }

  function flyToCart(fromEl) {
    var cartBtn = document.getElementById("cartBtn");
    if (!cartBtn) return;
    var s = fromEl.getBoundingClientRect();
    var t = cartBtn.getBoundingClientRect();
    var pellet = document.createElement("div");
    pellet.className = "fly";
    pellet.textContent = "🧁";
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

  // When the cart changes elsewhere, keep card controls in sync.
  document.addEventListener("blissri:cart-changed", function () { paintControls(document); });

  document.addEventListener("blissri:menu-ready", function (e) {
    menu = e.detail;
    render();
  });
})();
