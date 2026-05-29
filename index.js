const fs = require("fs");
const path = require("path");
const AWS = require("aws-sdk");
const https = require("https");

const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");
const Handlebars = require("./helpers");

const REGION = process.env.AWS_REGION || "ap-south-1";
const TEMP_BUCKET = process.env.TEMP_PDF_BUCKET;

const dynamo = new AWS.DynamoDB.DocumentClient({ region: REGION });
const s3 = new AWS.S3({ region: REGION });

exports.handler = async (event) => {
  try {
    const body =
      typeof event === "string"
        ? JSON.parse(event)
        : event?.body
        ? JSON.parse(event.body)
        : event || {};

    /* =====================================================
       CASE 3 — HTML ➜ PDF
       ===================================================== */
    if (body.mode === "pdf") {
      if (!body.html) {
        throw new Error("html is required when mode=pdf");
      }
      if (!TEMP_BUCKET) {
        throw new Error("TEMP_PDF_BUCKET env var not set");
      }

      const browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        defaultViewport: chromium.defaultViewport,
      });

      const page = await browser.newPage();
      await page.setContent(body.html, { waitUntil: "networkidle0" });

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

      await browser.close();

      const fileName = `pdf-${Date.now()}.pdf`;
      const s3Key = `temp-pdfs/${fileName}`;

      await s3.putObject({
        Bucket: TEMP_BUCKET,
        Key: s3Key,
        Body: pdfBuffer,
        ContentType: "application/pdf",
        // ContentDisposition: "inline; filename=" + fileName ,
      }).promise();

      const signedUrl = s3.getSignedUrl("getObject", {
        Bucket: TEMP_BUCKET,
        Key: s3Key,
        Expires: 300,
      });

      return {
        statusCode: 200,
        body: JSON.stringify({
          url: signedUrl,
          expiresIn: 300,
        }),
      };
    }

    /* =====================================================
       CASE 1 & 2 — DATA ➜ HTML
       ===================================================== */
    if (body.mode === "html") {
      const { type, templateName } = body;

      if (!templateName) {
        throw new Error("templateName is required for mode=html");
      }
      if (!["quotation", "invoice"].includes(type)) {
        throw new Error("type must be quotation or invoice");
      }

      let data;

      // CASE 1 — Data passed directly
      if (body.data) {
        data = body.data;
      }
      // CASE 2 — Fetch from DynamoDB
      else {
        if (type === "quotation") {
          if (!body.tripId || !body.quoteId) {
            throw new Error("tripId and quoteId required");
          }

          const res = await dynamo.get({
            TableName: "Quotations",
            Key: {
              TripId: body.tripId,
              QuoteId: body.quoteId,
            },
          }).promise();

          if (!res.Item) throw new Error("Quotation not found");
          data = res.Item;
        }

        if (type === "invoice") {
          if (!body.tripId || !body.invoiceId) {
            throw new Error("tripId and invoiceId required");
          }

          const res = await dynamo.get({
            TableName: "Invoices",
            Key: {
              TripId: body.tripId,
              InvoiceId: body.invoiceId,
            },
          }).promise();

          if (!res.Item) throw new Error("Invoice not found");
          data = res.Item;
        }
      }

      const context =
        type === "quotation"
          ? buildQuotationContext(data)
          : buildInvoiceContext(data);

      const templateHtml = await fetchFromUrl(
        `https://journeyrouters-webassets.s3.ap-south-1.amazonaws.com/2025/uploads/pdfcollection/${templateName}`
      );

      const compiledHtml = Handlebars.compile(templateHtml)(context);

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
        body: compiledHtml,
      };
    }

    throw new Error("Invalid request");

  } catch (err) {
    console.error("Lambda error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

/* ================= HELPERS ================= */

function fetchFromUrl(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

/* ================= CONTEXT BUILDERS ================= */

function buildQuotationContext(data) {
  return {
    trip: {
      id: data.TripId,
      tripId: data.TripId,
      destination: data.DestinationName,
      days: data.Days,
      nights: data.Nights,
      travelDate: data.TravelDate,
      pax: data.NoOfPax,
    },
    customer: {
      name: data["Client-Name"],
      phone: data["Client-Contact"],
      email: data["Client-Email"],
    },
    pricing: {
      totalCost: data.Costs?.TotalCost || 0,
      currency: data.Currency || "INR",
    },
    inclusions: (data.Inclusions || []).map(i => i.item),
    exclusions: (data.Exclusions || []).map(e => e.item),
    itinerary: data.Itinearies || [],
    hotels: data.Hotels || [],
    user:data.user,
    company: {
      name: data.user?.organization?.details?.brandname || data.company || "Journey Routers",
      upi: data.user?.organization?.financials?.upiid || "",
    },
    assetsBaseUrl:
      "https://journeyrouters-webassets.s3.ap-south-1.amazonaws.com/2025/uploads",
  };
}

function buildInvoiceContext(data) {
  return {
    invoice: {
      date: data.invoiceDate,
      bookingId: data.invoiceId,
      tripId: data.tripId,
      destination: data.destination,
      travelDate: data.travelDate,
      startDate: data.startDate,
      endDate: data.endDate,
      invoiceId: data.invoiceId,
      invoiceNumber: data.invoiceNumber,
      notes: data.notes,
      travelerSummary: data.travelerSummary,
      pricing: data.pricing,
      payment: data.payment,
      cancellationPolicy: data.cancellationPolicy,
      deliverables: data.deliverables,
      meta: data.meta,
      auditTrail: data.auditTrail,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    },
    customer: data.customer,
    payments: data.payment?.installments || [],
    company: {
      name: data.meta?.companyName || "Journey Routers",
      phone: "+91 9876543210",
      email: "info@journeyrouters.com",
      address: "123 Travel Street, Mumbai, India - 400001",
      gst: "27AAAPJ1234C1ZV"
    },
    bank: data.meta?.bankDetails || {
      name: "Journey Routers Travel Pvt Ltd",
      number: "123456789012",
      type: "Current Account",
      branch: "State Bank of India, Andheri Branch",
      ifsc: "SBIN0001234"
    },
    cancellation: data.cancellationPolicy ? formatCancellationPolicy(data.cancellationPolicy) : null,
    deliverables: data.deliverables || [],
    assets: {
      logo: "https://journeyrouters-webassets.s3.ap-south-1.amazonaws.com/2025/uploads/logo.png",
      headerImage: "https://journeyrouters-webassets.s3.ap-south-1.amazonaws.com/2025/uploads/headerImg.png",
      stamp: "https://journeyrouters-webassets.s3.ap-south-1.amazonaws.com/2025/uploads/jrstamp.jpg",
      qr: "https://journeyrouters-webassets.s3.ap-south-1.amazonaws.com/2025/uploads/JR_QR.png"
    },
    assetsBaseUrl: "https://journeyrouters-webassets.s3.ap-south-1.amazonaws.com/2025/uploads"
  };
}

function formatCancellationPolicy(policy) {
  if (!policy) return null;

  let policyText = "Cancellation Policy:\n\n";

  if (policy.land && Array.isArray(policy.land)) {
    policy.land.forEach(item => {
      if (item.chargeType === "PERCENT") {
        if (item.fromDaysBeforeTravel === 20) {
          policyText += `• 20+ days before departure: ${item.value}% cancellation charge\n`;
        } else if (item.fromDaysBeforeTravel === 0) {
          policyText += `• 0-${item.toDaysBeforeTravel} days before departure: ${item.value}% cancellation charge\n`;
        }
      }
    });
  }

  policyText += "• No-show: No refund\n\n";
  policyText += "All cancellations must be made in writing. Refunds will be processed within 15 working days.\n\n";

  if (policy.nonRefundableComponents && Array.isArray(policy.nonRefundableComponents)) {
    policyText += "Non-refundable components: " + policy.nonRefundableComponents.join(", ") + "\n\n";
  }

  if (policy.hotel) {
    policyText += `Hotel policy: ${policy.hotel}\n\n`;
  }

  if (policy.flights) {
    policyText += `Airline policy: ${policy.flights}\n\n`;
  }

  if (policy.rescheduleChargePerPax) {
    policyText += `Reschedule charges: ₹${policy.rescheduleChargePerPax.amount} per person + fare difference`;
  }

  return policyText;
}
