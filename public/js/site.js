/* ===========================================================
   Blissri — shared site chrome: header, footer, nav, helpers.
   Loaded on every page (before cart.js).
   =========================================================== */
(function () {
  "use strict";

  var NAV = [
    { href: "index.html", label: "Home" },
    { href: "menu.html", label: "Menu" },
    { href: "order.html", label: "Order Now" },
    { href: "about.html", label: "About" },
    { href: "faqs.html", label: "FAQs" },
    { href: "contact.html", label: "Contact" },
  ];

  var BRAND = '' +
    '<a class="brand" href="index.html">' +
      '<span class="logo">B</span>' +
      '<span class="brand-text"><strong>Blissri</strong><span>The Bakeshoppe</span></span>' +
    '</a>';

  function currentPage() {
    var p = window.location.pathname.split("/").pop();
    return p === "" ? "index.html" : p;
  }

  function buildHeader() {
    var here = currentPage();
    var links = NAV.map(function (n) {
      var active = n.href === here ? " active" : "";
      return '<li><a class="' + active.trim() + '" href="' + n.href + '">' + n.label + "</a></li>";
    }).join("");

    return '' +
      '<div class="container nav">' +
        BRAND +
        '<div class="nav-right">' +
          '<nav><ul class="nav-links" id="navLinks">' + links + '</ul></nav>' +
          '<button class="cart-btn" id="cartBtn" aria-label="Open cart">' +
            '🛍️<span class="cart-count" id="cartCount" hidden>0</span>' +
          '</button>' +
          '<button class="nav-toggle" id="navToggle" aria-label="Toggle menu" aria-expanded="false" aria-controls="navLinks">' +
            '<span></span><span></span><span></span>' +
          '</button>' +
        '</div>' +
      '</div>';
  }

  function buildFooter() {
    return '' +
      '<div class="container">' +
        '<div class="footer-grid">' +
          '<div class="footer-brand">' + BRAND +
            '<p style="margin-top:16px;">Freshly baked happiness, handmade fresh in Lantana.</p>' +
            '<div class="socials"><a href="#" aria-label="Instagram">📷</a><a href="#" aria-label="Facebook">📘</a><a href="#" aria-label="TikTok">🎵</a></div>' +
          '</div>' +
          '<div><h4>Explore</h4><ul>' +
            '<li><a href="index.html">Home</a></li><li><a href="menu.html">Menu</a></li>' +
            '<li><a href="order.html">Order Now</a></li><li><a href="custom-order.html">Custom Orders</a></li>' +
          '</ul></div>' +
          '<div><h4>Visit Us</h4><ul>' +
            '<li>Lantana, FL</li><li>Tue–Sat: 11am – 7pm</li><li>Sun–Mon: Closed</li>' +
          '</ul></div>' +
          '<div><h4>Get in Touch</h4><ul>' +
            '<li><a href="mailto:hello@blissribakeshoppe.com">hello@blissribakeshoppe.com</a></li>' +
            '<li><a href="contact.html">Contact us</a></li><li><a href="faqs.html">FAQs</a></li>' +
          '</ul></div>' +
        '</div>' +
        '<div class="footer-bottom">© <span id="year"></span> Blissri the Bakeshoppe. All rights reserved. Made with 🧁 &amp; love.</div>' +
      '</div>';
  }

  function initNav() {
    var toggle = document.getElementById("navToggle");
    var links = document.getElementById("navLinks");
    if (!toggle || !links) return;
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("open");
        toggle.classList.remove("open");
      });
    });
  }

  function initReveal() {
    var els = document.querySelectorAll(".reveal");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  }

  // ---- shared helpers -------------------------------------------------------
  var menuPromise = null;
  function getMenu() {
    if (!menuPromise) {
      menuPromise = fetch("/api/menu")
        .then(function (r) {
          if (!r.ok) throw new Error("menu");
          return r.json();
        })
        .catch(function () {
          // Fallback to the static file (works even without the API server).
          return fetch("data/menu.json").then(function (r) { return r.json(); });
        });
    }
    return menuPromise;
  }

  function money(cents) {
    return "$" + (cents / 100).toFixed(2);
  }

  window.Blissri = { getMenu: getMenu, money: money };

  document.addEventListener("DOMContentLoaded", function () {
    var header = document.getElementById("site-header");
    var footer = document.getElementById("site-footer");
    if (header) header.innerHTML = buildHeader();
    if (footer) footer.innerHTML = buildFooter();
    var yr = document.getElementById("year");
    if (yr) yr.textContent = new Date().getFullYear();
    initNav();
    initReveal();
    document.dispatchEvent(new CustomEvent("blissri:chrome-ready"));
  });
})();
