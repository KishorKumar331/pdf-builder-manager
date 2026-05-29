const fs = require("fs");
const path = require("path");
const express = require("express");
const Handlebars = require("./helpers");

// Register splitLines helper for invoice template
Handlebars.registerHelper("splitLines", function (data) {
  if (!data) return [];

  // If it's a string (like cancellation policy), split by lines
  if (typeof data === 'string') {
    return data.split('\n').filter(line => line.trim() !== '');
  }

  // If it's an array of objects (like deliverables), format each object
  if (Array.isArray(data)) {
    return data.map(item => {
      if (typeof item === 'object' && item !== null) {
        return `${item.item} - Required: ${item.required ? 'Yes' : 'No'}, Provided: ${item.provided ? 'Yes' : 'No'}`;
      }
      return String(item);
    });
  }

  // Fallback for any other type
  return [String(data)];
});

// Register downcase helper for status badges
Handlebars.registerHelper("downcase", function (str) {
  return str ? str.toLowerCase() : '';
});

// Register lt helper
Handlebars.registerHelper("lt", (a, b) => a < b);

// Register firstLetter helper
Handlebars.registerHelper("firstLetter", function (str) {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase();
});

// Register restOfString helper
Handlebars.registerHelper("restOfString", function (str) {
  if (!str || typeof str !== 'string') return '';
  return str.slice(1).toUpperCase();
});

// Format cancellation policy function
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

// Build invoice context function (matching index.js)
function buildInvoiceContext(data) {
  const org = data.organization || {};
  const details = org.details || {};
  const contact = org.contact || {};
  const financials = org.financials || {};
  const compliance = org.compliance || {};

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
      name: details.brandname || data.meta?.companyName || "Journey Routers",
      phone: contact.officephone || "+91 9876543210",
      email: contact.billingemail || "info@journeyrouters.com",
      address: contact.address || "123 Travel Street, Mumbai, India - 400001",
      gst: org.companygstnumber || compliance.gstnumber || data.meta?.companyGst || "27AAAPJ1234C1ZV"
    },
    bank: {
      name: financials.bankname || "Journey Routers Travel Pvt Ltd",
      number: financials.accountnumber || "123456789012",
      type: "Current Account",
      branch: financials.branch || "State Bank of India, Andheri Branch",
      ifsc: financials.ifsc || "SBIN0001234"
    },
    cancellation: data.cancellationPolicy ? formatCancellationPolicy(data.cancellationPolicy) : null,
    deliverables: data.deliverables || [],
    assets: {
      logo: details.logourl || "http://localhost:3000/public/logo.png",
      headerImage: "http://localhost:3000/public/headerImg.png",
      stamp: "http://localhost:3000/public/jrstamp.jpg",
      qr: financials.qrurl || "http://localhost:3000/public/JR_QR.png"
    },
    assetsBaseUrl: "http://localhost:3000/public"
  };
}

const app = express();
const PORT = process.env.PORT || 3000;

// Parse command line arguments
const args = process.argv.slice(2);
const isInvoice = args.includes('--invoice');
const isPdf = args.includes('--pdf') || !isInvoice; // default to pdf

// Dummy data for PDF template


const companydatas = {
  cancellation: 'test case\nha y \nsamjaha',
  updatedate: "2026-03-26T08:00:54.666278+00:00",
  settings: {
    language: "en",
    plan: "premium",
    timezone: "asia/kolkata",
    status: "active"
  },
  createdate: "2026-03-26T08:00:54.666278+00:00",
  company: "WH",
  contact: {
    officephone: "+919799794008",
    address: "H-213, D Block, Sector 63, Noida, Uttar Pradesh 201309",
    billingemail: "info@winterfellholidays.com",
    supportemail: "info@winterfellholidays.com"
  },
  financials: {
    accountnumber: "259899060977",
    qrurl: "https://d2w6ooepk5o1m0.cloudfront.net/winterfell_holidays/profile/WhatsApp_Image_2026-04-03_at_5.00.31_PM.jpeg",
    currency: "INR",
    bankname: "Indusind bank",
    ifsc: "INDB0000383",
    upiid: "",
    branch: "Indirapuram, Ghaziabad"
  },
  preferences: {
    invoicepdf: "781b406c6e44e789e6a0000a5f9233dc5be611d4117c3ec72041f323e7792b11.hbs",
    quotationpdf: "90f36ac4d5a289cd9a073424b0f2565aa55bbd7449b89584adc7ccc61d7a94d5.hbs"
  },
  details: {
    tagline: "",
    website: "https://winterfellholidays.com/",
    brandname: "Winterfell Holidays",
    companyname: "winterfell holidays",
    logourl: "https://d2w6ooepk5o1m0.cloudfront.net/winterfell_holidays/profile/WH_web.png"
  },
  compliance: {
    gstnumber: "07aadfw9948a1zy",
    pan: "",
    registrationnumber: "",
    taxregion: "Delhi, India"
  },
  companygstnumber: "07AADFW9948A1ZY",
  sk: "METADATA"
}
const pdfDummyData = {
  trip: {
    tripId: "JRP-12345",
    destination: "DUBAI",
    days: 5,
    nights: 4,
    travelDate: "15 Feb 2026",
    pax: 2
  },
  customer: {
    name: "John Doe",
    phone: "9876543210",
    email: "john.doe@example.com"
  },
  pricing: {
    totalCost: 45000,
    priceType: "Per Person",
    currency: "INR"
  },
  inclusions: [
    "Airport Transfers",
    "Hotel Accommodation",
    "Daily Breakfast",
    "City Tour",
    "Desert Safari",
    "Dhow Cruise"
  ],
  exclusions: [
    "Airfare",
    "Lunch & Dinner",
    "Travel Insurance",
    "Personal Expenses",
    "Visa Fees"
  ],
  otherInclusions: [
    "Welcome Drink",
    "Guide Services",
    "Entrance Fees"
  ],
  otherExclusions: [
    "Tips & Gratuities",
    "Optional Tours"
  ],
  itinerary: [
    {
      Day: 1,
      Date: 1,
      Title: "Arrival & City Tour",
      Description: "Arrive at Dubai International Airport, transfer to hotel. Afternoon city tour including Dubai Museum, Gold Souk, and Spice Souk.",
      ImageUrl: "https://products.journeyrouters.com/product_assets/maldives/f858133702138c559cc112fc7bffd759d001e77c.jpg"
    },
    {
      Day: 2,
      Date: 2,
      Title: "Desert Safari",
      Description: "Morning at leisure. Evening desert safari with dune bashing, camel ride, and BBQ dinner under the stars.",
      ImageUrl: "https://journeyrouters-webassets.s3.ap-south-1.amazonaws.com/2025/uploads/destination/DUBAI/day2.jpg"
    },
    {
      Day: 3,
      Date: 3,
      Title: "Burj Khalifa & Dubai Mall",
      Description: "Visit the world's tallest building - Burj Khalifa. Shopping at Dubai Mall and watch the Dubai Fountain show.",
      ImageUrl: "https://journeyrouters-webassets.s3.ap-south-1.amazonaws.com/2025/uploads/destination/DUBAI/day3.jpg"
    },
    {
      Day: 4,
      Date: 4,
      Title: "Abu Dhabi Tour",
      Description: "Full day tour to Abu Dhabi. Visit Sheikh Zayed Grand Mosque, Emirates Palace, and Yas Island.",
      ImageUrl: "https://journeyrouters-webassets.s3.ap-south-1.amazonaws.com/2025/uploads/destination/DUBAI/day4.jpg"
    },
    {
      Day: 5,
      Date: 5,
      Title: "Dhow Cruise & Departure",
      Description: "Morning Dhow Cruise on Dubai Creek. Transfer to airport for departure.",
      ImageUrl: "https://journeyrouters-webassets.s3.ap-south-1.amazonaws.com/2025/uploads/destination/DUBAI/day5.jpg"
    },
    {
      Day: 6,
      Date: 6,
      Title: "Dhow Cruise & Departurse",
      Description: "Morning Dhow Cruise on Dubai Creek. Transfer to airport for departure.",
      ImageUrl: "https://journeyrouters-webassets.s3.ap-south-1.amazonaws.com/2025/uploads/destination/DUBAI/day5.jpg"
    }
  ],
  hotels: [
    {
      City: "Dubai",
      Name: "Burj Al Arab",
      RoomType: "Deluxe Suite",
      Category: 5,
      CheckInDate: "15 Feb 2026",
      CheckOutDate: "17 Feb 2026",
      Meals: ["Breakfast"]
    },
    {
      City: "Dubai",
      Name: "Atlantis The Palm",
      RoomType: "Ocean View Room",
      Category: 5,
      CheckInDate: "17 Feb 2026",
      CheckOutDate: "19 Feb 2026",
      Meals: ["Breakfast", "Dinner"]
    }
  ],
  flags: {
    hasHotels: true
  },
  company: {
    name: "Journey 5g",
    email: "devesh@journeyrouters.com",
    address: "Saket ,45Building ",
    phone: "78u878787897987",
    bankName: "Indian Banks",
    branchName: "Faridabad Branch",
    accountNumber: "78785366333",
    ifsc: "blb09787888",
    gst: "27AAAAA0000A1Z5",
    currency: "INR",
    upi: "devesh@journeyrouters@paytm"
  },
  user: {
    organization: companydatas,
    Email: "info@winterfellholidays.com",
    company: "WH",
    createdate: "2026-03-26T08:00:54.666278+00:00",
    fullname: "tezal negi",
    plan_id: "premium",
    role: "admin",
    stripe_customer_id: "",
    subscription_end_date: "2026-05-02T18:34:48.676172+00:00",
    subscription_status: "active",
    Phone: "+919799794008"
  },
  organization: {
    updatedate: "2026-03-26T08:00:54.666278+00:00",
    settings: {
      language: "en",
      plan: "premium",
      timezone: "asia/kolkata",
      status: "active"
    },
    createdate: "2026-03-26T08:00:54.666278+00:00",
    company: "WH",
    contact: {
      officephone: "+919799794008",
      address: "H-213, D Block, Sector 63, Noida, Uttar Pradesh 201309",
      billingemail: "info@winterfellholidays.com",
      supportemail: "info@winterfellholidays.com"
    },
    financials: {
      accountnumber: "259899060977",
      qrurl: "https://d2w6ooepk5o1m0.cloudfront.net/winterfell_holidays/profile/WhatsApp_Image_2026-04-03_at_5.00.31_PM.jpeg",
      currency: "INR",
      bankname: "Indusind bank",
      ifsc: "INDB0000383",
      upiid: "",
      branch: "Indirapuram, Ghaziabad"
    },
    preferences: {
      invoicepdf: "a9c5a119555821f83e3f7b22b75e6ea850dc624f7a8877084a4dda7629770ffd.hbs",
      quotationpdf: "39f3872c101bdcfbc003d05b09e92adfada423a0f86f5c1432a4c643647bd624.hbs"
    },
    details: {
      tagline: "",
      website: "https://winterfellholidays.com/",
      brandname: "Winterfell Holidays",
      companyname: "winterfell holidays",
      logourl: "https://d2w6ooepk5o1m0.cloudfront.net/winterfell_holidays/profile/WH_web.png"
    },
    compliance: {
      gstnumber: "07aadfw9948a1zy",
      pan: "",
      registrationnumber: "",
      taxregion: "Delhi, India"
    },
    companygstnumber: "07AADFW9948A1ZY",
    sk: "METADATA"
  },
  access_restricted: false,
  cancellation: "Cancellation Policy:\n\n• 30+ days before departure: 10% cancellation charge\n• 15-29 days before departure: 25% cancellation charge\n• 7-14 days before departure: 50% cancellation charge\n• Less than 7 days before departure: 100% cancellation charge\n• No-show: No refund\n\nAll cancellations must be made in writing. Refunds will be processed within 15 working days.",
  assetsBaseUrl: "http://localhost:3000/public"
};


// Dummy data for Invoice template (matching the actual API data structure)
const invoiceDummyData = {
  organization: {
    updatedate: "2026-03-26T08:00:54.666278+00:00",
    settings: {
      language: "en",
      plan: "premium",
      timezone: "asia/kolkata",
      status: "active"
    },
    createdate: "2026-03-26T08:00:54.666278+00:00",
    company: "WH",
    contact: {
      officephone: "+919799794008",
      address: "H-213, D Block, Sector 63, Noida, Uttar Pradesh 201309",
      billingemail: "info@winterfellholidays.com",
      supportemail: "info@winterfellholidays.com"
    },
    financials: {
      accountnumber: "259899060977",
      qrurl: "https://d2w6ooepk5o1m0.cloudfront.net/winterfell_holidays/profile/WhatsApp_Image_2026-04-03_at_5.00.31_PM.jpeg",
      currency: "INR",
      bankname: "Indusind bank",
      ifsc: "INDB0000383",
      upiid: "",
      branch: "Indirapuram, Ghaziabad"
    },
    preferences: {
      invoicepdf: "a9c5a119555821f83e3f7b22b75e6ea850dc624f7a8877084a4dda7629770ffd.hbs",
      quotationpdf: "39f3872c101bdcfbc003d05b09e92adfada423a0f86f5c1432a4c643647bd624.hbs"
    },
    details: {
      tagline: "",
      website: "https://winterfellholidays.com/",
      brandname: "Winterfell Holidays",
      companyname: "winterfell holidays",
      logourl: "https://d2w6ooepk5o1m0.cloudfront.net/winterfell_holidays/profile/WH_web.png"
    },
    compliance: {
      gstnumber: "07aadfw9948a1zy",
      pan: "",
      registrationnumber: "",
      taxregion: "Delhi, India"
    },
    companygstnumber: "07AADFW9948A1ZY",
    sk: "METADATA"
  },
  user: {
    Email: "info@winterfellholidays.com",
    company: "WH",
    createdate: "2026-03-26T08:00:54.666278+00:00",
    fullname: "tezal negi",
    plan_id: "premium",
    role: "admin",
    Phone: "+919799794008"
  },
  cancellationPolicy: {
    jrCancellationChargePerPax: 2500,
    latePaymentFee: {
      amount: 5000,
      notes: "Within allowable limits"
    },
    hotel: "As per the hotel policy",
    land: [
      {
        chargeType: "PERCENT",
        toDaysBeforeTravel: null,
        fromDaysBeforeTravel: 20,
        value: 25
      },
      {
        chargeType: "PERCENT",
        toDaysBeforeTravel: 19,
        fromDaysBeforeTravel: 0,
        value: 100
      }
    ],
    nonRefundableComponents: [
      "Visa",
      "TCS",
      "Taxes",
      "Remittance charges"
    ],
    flights: "As per airline policy",
    rescheduleChargePerPax: {
      amount: 2000,
      notes: "Per pax + fare difference for flights and land part"
    }
  },
  endDate: "2026-02-28",
  auditTrail: [
    {
      changes: {
        invoiceNumber: "INV-WH-260301",
        status: "FullFilled"
      },
      action: "Created",
      performedBy: "tezal.negi@winterfell.com",
      timestamp: "2026-03-26T08:33:46.395Z"
    }
  ],
  meta: {
    bankDetails: {},
    companyProfileId: "WH-PREMIUM-001",
    source: "Premium Portal",
    createdBy: "Tezal Negi",
    companyName: "Winterfell Holidays"
  },
  deliverables: [
    {
      item: "Hotel Confirmation Vouchers",
      required: true,
      provided: true
    },
    {
      item: "Flight Tickets (E-tickets)",
      required: true,
      provided: true
    },
    {
      item: "Visa Approval Document",
      required: true,
      provided: true
    },
    {
      item: "Travel Insurance Policy",
      required: false,
      provided: true
    },
    {
      item: "Day-wise Detail Itinerary",
      required: true,
      provided: true
    }
  ],
  createdAt: "2026-03-26T12:33:46.572Z",
  travelDate: "2026-04-15",
  tripId: "WH-DXB-4492",
  invoiceDate: "2026-03-26",
  finalPackageQuotationId: "QUO-DXB-2026-001",
  updatedAt: "2026-03-26T12:33:46.572Z",
  notes: "Hope you have a wonderful trip to Dubai with Winterfell Holidays! Payment for the land package is due as per schedule.",
  payment: {
    installments: [
      {
        sequence: 1,
        installmentDate: "2026-03-28",
        installmentAmount: 45000,
        status: "Paid"
      },
      {
        sequence: 2,
        installmentDate: "2026-04-05",
        installmentAmount: 35000,
        status: "Pending"
      },
      {
        sequence: 2,
        installmentDate: "2026-04-05",
        installmentAmount: 35000,
        status: "Pending"
      }, {
        sequence: 2,
        installmentDate: "2026-04-05",
        installmentAmount: 35000,
        status: "Pending"
      }, {
        sequence: 2,
        installmentDate: "2026-04-05",
        installmentAmount: 35000,
        status: "Pending"
      }, {
        sequence: 2,
        installmentDate: "2026-04-05",
        installmentAmount: 35000,
        status: "Pending"
      }, {
        sequence: 2,
        installmentDate: "2026-04-05",
        installmentAmount: 35000,
        status: "Pending"
      }
    ]
  },
  startDate: "2026-04-15",
  destination: "Dubai & Abu Dhabi (Premium Expo)",
  travelerSummary: {
    infants: 0,
    children: 0,
    totalTravelers: 2,
    adults: 2
  },
  customer: {
    name: "Rajesh Kumar",
    address: {
      zipCode: "110001",
      country: "India",
      state: "Delhi",
      city: "New Delhi",
      street: "45, Barakhamba Road, Connaught Place"
    },
    email: "rajesh.kumar@example.com",
    contact: "9812345678"
  },
  invoiceId: "INV-WH-260301",
  pricing: {
    tcsPercentage: 5,
    taxableAmount: 76190,
    gstAmount: 3810,
    totalAmount: 80000,
    amountInWords: "Eighty Thousand Rupees Only",
    otherCharges: [],
    gstPercentage: 5,
    discountAmount: 0,
    tcsClaim: [],
    baseAmount: 76000,
    tcsAmount: 3800
  },
  invoiceNumber: "INV-WH-260301"
};

function loadTemplate() {
  try {
    let templateHtml = fs.readFileSync(templateFile, "utf8");

    // Load CSS if exists
    let cssContent = "";
    try {
      cssContent = fs.readFileSync(cssPath, "utf8");
    } catch (err) {
      console.log("CSS file not found, using external link");
    }

    // Inline CSS or use external link
    if (cssContent) {
      templateHtml = templateHtml.replace(
        '<link rel="stylesheet" href="{{assetsBaseUrl}}/PreviewPdf.css" />',
        `<style>${cssContent}</style>`
      );
    }

    cachedTemplate = Handlebars.compile(templateHtml);
    console.log("✅ Template recompiled successfully");
    return true;
  } catch (err) {
    console.error("❌ Error loading template:", err.message);
    return false;
  }
}

function renderTemplate() {
  if (!cachedTemplate) {
    if (!loadTemplate()) {
      return "<html><body><h1>Error loading template</h1></body></html>";
    }
  }

  try {
    const rawData = isInvoice ? invoiceDummyData : pdfDummyData;
    const processedData = isInvoice ? buildInvoiceContext(rawData) : rawData;
    return cachedTemplate(processedData);
  } catch (err) {
    console.error("❌ Error rendering template:", err.message);
    return `<html><body><h1>Template rendering error: ${err.message}</h1></body></html>`;
  }
}

// Initialize template and CSS paths
if (isInvoice) {
  templateFile = path.join(__dirname, "template", "invoiceip.hbs");
  cssPath = path.join(__dirname, "template", "invoice.css");
} else {
  templateFile = path.join(__dirname, "template", "pdf.hbs");
  cssPath = path.join(__dirname, "template", "PreviewPdf.css");
}

// Watch for template changes
fs.watchFile(templateFile, { interval: 1000 }, (curr, prev) => {
  console.log("🔄 Template file changed, reloading...");
  loadTemplate();
});

// Watch for CSS changes
fs.watchFile(cssPath, { interval: 1000 }, (curr, prev) => {
  console.log("🔄 CSS file changed, reloading...");
  loadTemplate();
});

// Initial template load
loadTemplate();

// Routes
app.get("/", (req, res) => {
  const html = renderTemplate();
  res.send(html);
});

app.get("/json", (req, res) => {
  const rawData = isInvoice ? invoiceDummyData : pdfDummyData;
  const processedData = isInvoice ? buildInvoiceContext(rawData) : rawData;
  res.json(processedData);
});

// Serve static files from template and public directories
app.use("/template", express.static(path.join(__dirname, "template")));
app.use("/public", express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  const templateType = isInvoice ? "Invoice" : "PDF";
  console.log(`🚀 Development server running at http://localhost:${PORT}`);
  console.log(`📄 ${templateType} preview: http://localhost:${PORT}`);
  console.log(`📊 Dummy data: http://localhost:${PORT}/json`);
  console.log("👀 Watching for template changes...");
  console.log(`💡 Use --invoice flag for invoice template, --pdf flag for PDF template`);
});
