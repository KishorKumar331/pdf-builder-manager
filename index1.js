const fs = require("fs");
const path = require("path");
const AWS = require("aws-sdk");
const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

// IMPORTANT: helpers must be loaded BEFORE compiling templates
const Handlebars = require("./helpers");

const s3 = new AWS.S3({ region: "ap-south-1" });
const dynamo = new AWS.DynamoDB.DocumentClient({ region: "ap-south-1" });

// ✅ GLOBAL BROWSER (REUSED)
let browser;

// 🔹 CACHE COMPANY CONFIG (S3)
let cachedCompanyConfig = null;

/* -----------------------------
   🔹 UTILS
-------------------------------- */

function detectCompanyType(tripId) {
  if (/^JRP-\d+$/.test(tripId)) return "proprietor";
  if (/^\d+$/.test(tripId)) return "private_limited";
  throw new Error("Invalid TripId format");
}

async function loadCompanyConfig() {
  if (cachedCompanyConfig) return cachedCompanyConfig;

  const res = await s3.getObject({
    Bucket: "jr-configs",
    Key: "company-config.json",
  }).promise();

  cachedCompanyConfig = JSON.parse(res.Body.toString("utf-8"));
  return cachedCompanyConfig;
}

function formatDate(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* -----------------------------
   🔹 INVOICE MAPPER
-------------------------------- */

async function mapInvoiceToContext(invoiceData) {
  const companyType = detectCompanyType(invoiceData.TripId);
  const config = await loadCompanyConfig();
  const companyCfg = config[companyType];

  return {
    customer: {
      name: invoiceData.CustomerDetails?.Name || "",
      phone: invoiceData.CustomerDetails?.Contact || "",
      email: invoiceData.CustomerDetails?.Email || "",
    },

    invoice: {
      tripId: invoiceData.TripId,
      invoiceId: invoiceData.InvoiceID,
      date: formatDate(invoiceData.InvoiceDetails?.Date),
    },

    payments: (invoiceData.Installments || []).map(i => ({
      date: formatDate(i.InstallmentDate),
      amount: Number(i.InstallmentAmount),
      status: i.Status,
      utr: i.UTR_Number,
    })),

    pricing: {
      base: invoiceData.InvoiceDetails?.LandPackage || 0,
      gst: companyCfg.showGST ? invoiceData.InvoiceDetails?.GST || 0 : 0,
      tcs: invoiceData.InvoiceDetails?.TCS || 0,
      total: invoiceData.InvoiceDetails?.FinalAmount || 0,
    },

    company: companyCfg.company,
    bank: companyCfg.bank,
    assets: companyCfg.assets,

    flags: {
      showGST: companyCfg.showGST,
    },

    cancellation: invoiceData.CancellationPolicy?.CancellationDetails || "",
    deliverables: invoiceData.Deliverables || "",
  };
}

/* -----------------------------
   🔹 LAMBDA HANDLER
-------------------------------- */

exports.handler = async (event) => {
  let page;

  try {
    // -------------------------
    // 1️⃣ Parse input
    // -------------------------
    const body =
      typeof event === "string"
        ? JSON.parse(event)
        : event.body
        ? JSON.parse(event.body)
        : event;

    const { tripId, quoteId, type = "package" } = body;
    // type = package | invoice

    if (!tripId) {
      throw new Error("tripId is required");
    }

    // -------------------------
    // 2️⃣ FETCH DATA
    // -------------------------

    let context;
    let templateFile;
    let outputKey;

    /* ===== PACKAGE PDF (AS-IS) ===== */
    if (type === "package") {
      if (!quoteId) {
        throw new Error("quoteId is required for package PDF");
      }

      const dbRes = await dynamo.get({
        TableName: "AllQuotes",
        Key: { TripId: tripId, quoteId },
      }).promise();

      if (!dbRes.Item) {
        throw new Error("Quote not found");
      }

      const data = dbRes.Item;

      context = {
        trip: {
          tripId: data.TripId,
          destination: data.DestinationName,
          days: data.Days,
          nights: data.Nights,
          travelDate: data.TravelDate,
          pax: data.NoOfPax,
        },

        customer: {
          name: data.FullName,
          phone: data.Contact,
        },

        pricing: {
          totalCost: data.TotalCost,
          priceType: data.PriceType,
          currency: "INR",
        },

        inclusions: data.Inclusions || [],
        exclusions: data.Exclusions || [],

        otherInclusions: data.OtherInclusions?.split("\n") || [],
        otherExclusions: data.OtherExclusions?.split("\n") || [],

        itinerary: (data.Itinearies || []).map((i, idx) => ({
          day: idx + 1,
          title: i.title,
          description: i.description,
          image: i.activityImg,
        })),

        hotels: data.Hotels || [],

        flags: {
          hasHotels: (data.Hotels || []).length > 0,
        },

        assetsBaseUrl:
          "https://journeyrouters-webassets.s3.ap-south-1.amazonaws.com/2025/uploads",
      };

      templateFile = "pdf.hbs";
      outputKey = `pdf/${tripId}/${quoteId}.pdf`;
    }

    /* ===== INVOICE PDF ===== */
    else if (type === "invoice") {
      const invoiceRes = await dynamo.get({
        TableName: "PackageInvoice",
        Key: { TripId: tripId },
      }).promise();

      if (!invoiceRes.Item) {
        throw new Error("Invoice not found");
      }

      context = await mapInvoiceToContext(invoiceRes.Item);
      templateFile = "invoice.hbs";
      outputKey = `pdf/${tripId}/invoice.pdf`;
    }

    else {
      throw new Error("Invalid type");
    }

    // -------------------------
    // 3️⃣ LOAD TEMPLATE + CSS
    // -------------------------
    const cssPath = path.join(process.cwd(), "template", "PreviewPdf.css");
    let cssContent = "";

    try {
      cssContent = fs.readFileSync(cssPath, "utf8");
    } catch {}

    const templatePath = path.join(process.cwd(), "template", templateFile);
    let templateHtml = fs.readFileSync(templatePath, "utf8");

    if (cssContent) {
      templateHtml = templateHtml.replace(
        '<link rel="stylesheet" href="{{assetsBaseUrl}}/PreviewPdf.css" />',
        `<style>${cssContent}</style>`
      );
    }

    const template = Handlebars.compile(templateHtml);
    const finalHtml = template(context);

    // -------------------------
    // 4️⃣ CHROMIUM (REUSED)
    // -------------------------
    if (!browser) {
      browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        defaultViewport: { width: 794, height: 1123 },
      });
    }

    page = await browser.newPage();
    await page.emulateMediaType("screen");
    await page.setContent(finalHtml, { waitUntil: "networkidle0" });

    // Wait for Paged.js to finish rendering if it is present on the page
    await page.evaluate(() => {
      return new Promise((resolve) => {
        if (typeof window.PagedPolyfill !== 'undefined' && document.querySelector('.pagedjs_pages')) {
          resolve();
        } else if (typeof window.PagedPolyfill !== 'undefined') {
          window.addEventListener('pagedjs:ready', resolve);
        } else {
          resolve();
        }
      });
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });

    await page.close();

    // -------------------------
    // 5️⃣ UPLOAD TO S3
    // -------------------------
    await s3.putObject({
      Bucket: "kishorlearningbucket",
      Key: outputKey,
      Body: pdfBuffer,
      ContentType: "application/pdf",
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        url: `https://kishorlearningbucket.s3.ap-south-1.amazonaws.com/${outputKey}`,
      }),
    };
  } catch (err) {
    console.error("PDF generation error:", err);
    if (page) try { await page.close(); } catch {}
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
