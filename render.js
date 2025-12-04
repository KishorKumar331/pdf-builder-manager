import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Handlebars from "handlebars";
import puppeteer from "puppeteer";

// Resolve __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- helpers for paging ----------
function chunk(arr, size) {
  if (!Array.isArray(arr) || size <= 0) return [];
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function buildViewModel(data = {}) {
  const hotels = Array.isArray(data.hotels) ? data.hotels : [];
  const itineraries = Array.isArray(data.itineraries) ? data.itineraries : [];
  const segments =
    data.flight && Array.isArray(data.flight.segments)
      ? data.flight.segments
      : [];

  const hotelPages = chunk(hotels, 2); // 2 hotels per page
  const itineraryPages = chunk(itineraries, 3); // 4 detailed days per page
  const flightPages = chunk(segments, 4);
  return {
    ...data,
    hotelPages,
    itineraryPages,
    flightPages,
  };
}

async function main() {
  // 1) Load template HTML
  const templatePath = path.join(__dirname, "finaltest.html");
  const templateHtml = fs.readFileSync(templatePath, "utf-8");

  // 2) Load data JSON
  const dataPath = path.join(__dirname, "data.json");
  const dataRaw = fs.readFileSync(dataPath, "utf-8");
  const data = JSON.parse(dataRaw);

  // 3) Build view model (adds hotelPages, itineraryPages)
  const viewModel = buildViewModel(data);

  // 4) Compile with Handlebars
  const compiled = Handlebars.compile(templateHtml);
  const finalHtml = compiled(viewModel);

  // 5) Launch local Chrome via puppeteer
  const browser = await puppeteer.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();

    await page.setContent(finalHtml, {
      waitUntil: "networkidle0",
    });

    await page.pdf({
      path: path.join(__dirname, "output.pdf"),
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
    });

    console.log("✅ PDF generated at:", path.join(__dirname, "output.pdf"));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Error generating PDF:", err);
  process.exit(1);
});
