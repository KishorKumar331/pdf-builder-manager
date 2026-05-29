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

// sum multiple numbers
Handlebars.registerHelper("sum", (...args) => {
  const values = args.slice(0, -1);
  return values.reduce((acc, curr) => acc + (Number(curr) || 0), 0);
});

// equality check
Handlebars.registerHelper("eq", (a, b) => a === b);

// logical OR
Handlebars.registerHelper("or", (a, b) => a || b);

// Register downcase helper for status badges
Handlebars.registerHelper("downcase", function (str) {
  return str ? str.toLowerCase() : '';
});

/* NEW: Title Case */
Handlebars.registerHelper("titlecase", v => {
  if (!v || typeof v !== "string") return v;
  return v
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
});

/* NEW: Split text into lines (for multi-line text) */
Handlebars.registerHelper("splitLines", (v, options) => {
  if (!v || typeof v !== "string") return "";
  const lines = v.split("\n");
  return lines.map(line => options.fn(line)).join("");
});


Handlebars.registerHelper("lowercase", v =>
  typeof v === "string" ? v.toLowerCase() : v
);

Handlebars.registerHelper("formatDate", (v) => {
  if (!v) return "";
  const date = new Date(v);
  return isNaN(date.getTime()) ? v : date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
});

/* NEW: Split Helper */
Handlebars.registerHelper("split", (str, delimiter) => {
  if (typeof str !== "string") return "";
  return str.split(delimiter);
});

/* NEW: Less than Helper */
Handlebars.registerHelper("lt", (a, b) => a < b);

/* NEW: First Letter Helper */
Handlebars.registerHelper("firstLetter", v => {
  if (!v || typeof v !== "string") return "";
  return v.charAt(0).toUpperCase();
});

/* NEW: Rest of String Helper */
Handlebars.registerHelper("restOfString", v => {
  if (!v || typeof v !== "string") return "";
  return v.slice(1).toUpperCase();
});

/* NEW: Format Title with Commas for pointers */
Handlebars.registerHelper("formatTitleWithCommas", function (title) {
  if (!title || typeof title !== "string") return "";
  if (title.indexOf(",") === -1) {
    return title.toUpperCase();
  }
  return title
    .split(",")
    .map(item => `• ${item.trim().toUpperCase()}`)
    .join("<br/>");
});

/* NEW: Optimize Unsplash Image */
Handlebars.registerHelper("optimizeUnsplash", (url, width, quality) => {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("images.unsplash.com")) return url;
  
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set("w", width);
    urlObj.searchParams.set("q", quality);
    urlObj.searchParams.set("auto", "format");
    urlObj.searchParams.set("fit", "crop");
    return urlObj.toString();
  } catch (e) {
    return url;
  }
});

module.exports = Handlebars;
