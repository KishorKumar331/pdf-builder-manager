const Handlebars = require("handlebars");

/* ===============================
   EXISTING HELPERS (kept)
   =============================== */
Handlebars.registerHelper("uppercase", v =>
  typeof v === "string" ? v.toUpperCase() : v
);

Handlebars.registerHelper("isEven", v => v % 2 === 0);
Handlebars.registerHelper("inc", v => v + 1);

/* ===============================
   NEW HELPERS (REQUIRED)
   =============================== */

// modulo (for pagination)
Handlebars.registerHelper("mod", (a, b) => a % b);

// addition (index math)
Handlebars.registerHelper("add", (a, b) => a + b);

// equality check
Handlebars.registerHelper("eq", (a, b) => a === b);

// logical OR
Handlebars.registerHelper("or", (a, b) => a || b);

/* NEW: Title Case */
Handlebars.registerHelper("titlecase", v => {
  if (!v || typeof v !== "string") return v;
  return v
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
});


module.exports = Handlebars;
