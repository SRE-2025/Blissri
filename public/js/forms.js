/* ===========================================================
   Blissri — contact / custom-order form validation.
   Shows an on-screen confirmation (no backend email yet —
   see DEPLOY.md "Optional add-ons" to wire to email/SES).
   =========================================================== */
(function () {
  "use strict";

  function init() {
    var form = document.getElementById("order-form");
    if (!form) return;
    var note = form.querySelector(".form-note");

    function validateField(field) {
      var input = field.querySelector("input, select, textarea");
      if (!input) return true;
      var value = (input.value || "").trim();
      var ok = true;
      if (input.hasAttribute("required") && value === "") ok = false;
      if (ok && input.type === "email" && value !== "") ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      if (ok && input.type === "tel" && value !== "") ok = value.replace(/[^0-9]/g, "").length >= 7;
      field.classList.toggle("invalid", !ok);
      return ok;
    }

    form.querySelectorAll(".field").forEach(function (field) {
      var input = field.querySelector("input, select, textarea");
      if (!input) return;
      input.addEventListener("blur", function () { validateField(field); });
      input.addEventListener("input", function () { if (field.classList.contains("invalid")) validateField(field); });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var allOk = true;
      form.querySelectorAll(".field").forEach(function (field) { if (!validateField(field)) allOk = false; });
      if (!allOk) {
        if (note) note.classList.remove("show");
        var bad = form.querySelector(".field.invalid input, .field.invalid select, .field.invalid textarea");
        if (bad) bad.focus();
        return;
      }
      if (note) {
        var nameEl = form.querySelector("#name");
        var name = nameEl ? nameEl.value.trim() : "there";
        note.textContent = "Thank you, " + (name || "there") + "! Your message has been received — we'll be in touch within one business day. 🧁";
        note.classList.add("show");
        note.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      form.reset();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
