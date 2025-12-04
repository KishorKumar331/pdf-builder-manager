import AWS from "aws-sdk";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import Handlebars from "handlebars";

const s3 = new AWS.S3();

const TEMPLATE_BUCKET = process.env.TEMPLATE_BUCKET || "pdfs-html-collection";
const PDF_BUCKET = process.env.PDF_BUCKET || "quotation-pdfs-collection";

export const handler = async (event) => {
  try {
    const body = parseBody(event);

    const templateKey = body.templateKey; // e.g. "JrQuotationPdf.html"
    const quoteId = body.quoteId || `Q-${Date.now()}`;
    const salesUserId = body.salesUserId || "unknown";

    if (!templateKey) {
      return httpResp(400, { error: "templateKey is required" });
    }

    // --- Build base data for template ---
    let data;
    if (body.data) {
      // You send pre-shaped JSON (company, client, trip, costs, inclusions, etc.)
      data = body.data;
    } else if (body.quoteData || body.companyInfo) {
      // Fallback: derive structure from raw Dynamo-style objects
      data = buildTemplateData(body.quoteData || {}, body.companyInfo || {});
    } else {
      data = {};
    }

    // --- Build view model with paging (hotelPages, itineraryPages) ---
    const viewModel = buildViewModel(data);

    // 1) Load HTML template from S3
    const templateHtml = await getTemplateHtml(templateKey);

    // 2) Fill placeholders with Handlebars
    const finalHtml = renderHtml(templateHtml, viewModel);

    // 3) Generate PDF
    const pdfBuffer = await renderPdf(finalHtml);

    // 4) Store in S3
    const pdfKey = `quotes/${salesUserId}/${quoteId}.pdf`;
    await putPdfToS3(pdfKey, pdfBuffer);

    // 5) Signed URL
    const pdfUrl = await getSignedUrl(pdfKey);

    return httpResp(200, {
      quoteId,
      salesUserId,
      templateKey,
      s3Key: pdfKey,
      pdfUrl,
    });

  } catch (err) {
    console.error("PDF generation error:", err);
    return httpResp(500, { error: err.message || "Internal server error" });
  }
};

// ---------- helpers ----------

function parseBody(event) {
  if (!event) return {};
  if (typeof event.body === "string") {
    try {
      return JSON.parse(event.body);
    } catch {
      return {};
    }
  }
  if (event.body && typeof event.body === "object") return event.body;
  return event;
}

function httpResp(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

async function getTemplateHtml(templateKey) {
  const resp = await s3
    .getObject({
      Bucket: TEMPLATE_BUCKET,
      Key: templateKey,
    })
    .promise();

  return resp.Body.toString("utf-8");
}

function renderHtml(templateHtml, data) {
  const compiled = Handlebars.compile(templateHtml);
  return compiled(data);
}

async function renderPdf(html) {
  const executablePath = await chromium.executablePath();

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

async function putPdfToS3(key, buffer) {
  await s3
    .putObject({
      Bucket: PDF_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: "application/pdf",
    })
    .promise();
}

async function getSignedUrl(key) {
  return s3.getSignedUrl("getObject", {
    Bucket: PDF_BUCKET,
    Key: key,
    Expires: 3600,
  });
}

// ---------- view-model + paging helpers ----------

function chunk(arr, size) {
  if (!Array.isArray(arr) || size <= 0) return [];
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

/**
 * Takes the base `data` (company, client, trip, costs, inclusions, exclusions,
 * itineraries, hotels, flight, etc.) and adds paging:
 *   hotelPages: [ [hotel, hotel], [hotel, hotel], ... ]
 *   itineraryPages: [ [day1, day2, day3], [day4, day5, day6], ... ]
 */
function buildViewModel(data = {}) {
  const hotels = Array.isArray(data.hotels) ? data.hotels : [];
  const itineraries = Array.isArray(data.itineraries) ? data.itineraries : [];

  const hotelPages = chunk(hotels, 2);        // 2 hotels per physical page
  const itineraryPages = chunk(itineraries, 3); // 3 detailed days per page

  return {
    ...data,
    hotelPages,
    itineraryPages,
  };
}

/**
 * Fallback mapper:
 * If you pass `quoteData` + `companyInfo` instead of `data`,
 * this will build the same structure we agreed:
 * {
 *   company, client, trip, costs,
 *   inclusions, exclusions, dayWise, itineraries, hotels, flight
 * }
 */
function buildTemplateData(quote = {}, company = {}) {
  const costs = quote.Costs || {};
  const hotels = Array.isArray(quote.Hotels) ? quote.Hotels : [];
  const itins = Array.isArray(quote.Itinearies) ? quote.Itinearies : [];
  const inclusions = Array.isArray(quote.Inclusions) ? quote.Inclusions : [];
  const exclusions = Array.isArray(quote.Exclusions) ? quote.Exclusions : [];
  const selectedFlight =
    Array.isArray(quote.selectedFlights) && quote.selectedFlights[0]
      ? quote.selectedFlights[0]
      : null;

  // --- company ---
  const companyData = {
    name: company.CompanyName || "",
    email: company.Email || "",
    phone: company.Phone || "",
    address: company.CompanyAddress || "",
    website: company.CompanyWebsite || "",
    gstNumber: company.CompanyGSTNumber || "",
    logoUrl: company.CompanyLogoUrl || "",
    bankName: company.BankName || "",
    branchName: company.BranchName || "",
    accountNumber: company.AccountNumber || "",
    ifsc: company.IfscCode || "",
    upi: company.UpiId || "",
    currency: company.Currency || quote.Currency || "INR",
  };

  // --- client ---
  const clientData = {
    name: (quote["Client-Name"] || "").trim(),
    email: quote["Client-Email"] || "",
    phone: quote["Client-Contact"] || "",
  };

  // --- trip ---
  const tripData = {
    tripId: quote.TripId || "",
    quoteId: quote.QuoteId || "",
    destination: quote.DestinationName || "",
    departureCity: quote.DepartureCity || "",
    travelDate: quote.TravelDate || "",
    travelEndDate: quote.TravelEndDate || "",
    days: quote.Days || 0,
    nights: quote.Nights || 0,
    adults: quote.NoOfPax || 0,
    children: Number(quote.Child || 0),
    infants: Number(quote.Infant || 0),
    priceType: quote.PriceType || "Total",
  };

  // --- costs ---
  const costsData = {
    total: costs.TotalCost || 0,
    land: costs.LandPackageCost || 0,
    flights: costs.FlightCost || 0,
    visa: costs.VisaCost || 0,
    gst: costs.GSTAmount || 0,
    tcs: costs.TCSAmount || 0,
    totalTax: costs.TotalTax || 0,
  };

  // --- itineraries (detailed) ---
  const itineraryData = itins.map((it, idx) => ({
    dayNumber: it.day || idx + 1,
    date: it.Date || "",
    title: it.Title || it.Activity || "",
    descriptionHtml: it.Description || "",
    imageUrl: it.ImageUrl || "",
  }));

  // --- day-wise simple list ---
  const dayWiseData = itineraryData.map((it) => ({
    dayNumber: it.dayNumber,
    title: it.title,
  }));

  // --- hotels ---
  const hotelsData = hotels.map((h) => ({
    city: h.City || "",
    name: h.Name || "",
    nights: h.Nights || 0,
    checkInDate: h.CheckInDate || "",
    checkOutDate: h.CheckOutDate || "",
    roomType: h.RoomType || "",
    category: h.Category || "",
    meals: Array.isArray(h.Meals) ? h.Meals : h.Meals ? [h.Meals] : [],
    imageUrl: "", // plug real URLs later
  }));

  // --- inclusions / exclusions ---
  const inclData = inclusions.map((x) => x.item || String(x));
  const exclData = exclusions.map((x) => x.item || String(x));

  // --- flight ---
  let flightData = null;
  if (selectedFlight) {
    const segs = Array.isArray(selectedFlight.flights)
      ? selectedFlight.flights
      : [];
    flightData = {
      type: selectedFlight.type || "",
      price: selectedFlight.price || 0,
      segments: segs.map((f) => ({
        airline: f.airline || "",
        fromCode: f.departure_airport?.id || "",
        fromName: f.departure_airport?.name || "",
        departureTime: f.departure_airport?.time || "",
        toCode: f.arrival_airport?.id || "",
        toName: f.arrival_airport?.name || "",
        arrivalTime: f.arrival_airport?.time || "",
        durationMinutes: f.duration || 0,
        travelClass: f.travel_class || "",
      })),
    };
  }

  return {
    company: companyData,
    client: clientData,
    trip: tripData,
    costs: costsData,
    inclusions: inclData,
    exclusions: exclData,
    dayWise: dayWiseData,
    itineraries: itineraryData,
    hotels: hotelsData,
    flight: flightData,
  };
}
