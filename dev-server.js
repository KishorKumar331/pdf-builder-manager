const fs = require("fs");
const path = require("path");
const express = require("express");
const Handlebars = require("./helpers");

const app = express();
const PORT = 3000;

// Dummy data matching the template structure
const dummyData = {
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
      day: 1,
      title: "Arrival & City Tour",
      description: "Arrive at Dubai International Airport, transfer to hotel. Afternoon city tour including Dubai Museum, Gold Souk, and Spice Souk.",
      image: "https://journeyrouters-webassets.s3.ap-south-1.amazonaws.com/2025/uploads/destination/DUBAI/day1.jpg"
    },
    {
      day: 2,
      title: "Desert Safari",
      description: "Morning at leisure. Evening desert safari with dune bashing, camel ride, and BBQ dinner under the stars.",
      image: "https://journeyrouters-webassets.s3.ap-south-1.amazonaws.com/2025/uploads/destination/DUBAI/day2.jpg"
    },
    {
      day: 3,
      title: "Burj Khalifa & Dubai Mall",
      description: "Visit the world's tallest building - Burj Khalifa. Shopping at Dubai Mall and watch the Dubai Fountain show.",
      image: "https://journeyrouters-webassets.s3.ap-south-1.amazonaws.com/2025/uploads/destination/DUBAI/day3.jpg"
    },
    {
      day: 4,
      title: "Abu Dhabi Tour",
      description: "Full day tour to Abu Dhabi. Visit Sheikh Zayed Grand Mosque, Emirates Palace, and Yas Island.",
      image: "https://journeyrouters-webassets.s3.ap-south-1.amazonaws.com/2025/uploads/destination/DUBAI/day4.jpg"
    },
    {
      day: 5,
      title: "Dhow Cruise & Departure",
      description: "Morning Dhow Cruise on Dubai Creek. Transfer to airport for departure.",
      image: "https://journeyrouters-webassets.s3.ap-south-1.amazonaws.com/2025/uploads/destination/DUBAI/day5.jpg"
    },
    {
      Day: 6,
      Date: 6,
      Title: "Dhow Cruise & Departurse",
      Description: "Morning Dhow Cruise on Dubai Creek. Transfer to airport for departure.",
      ImageUrl: "https://journeyrouters-webassets.s3.ap-south-1.amazonaws.com/2025/uploads/destination/DUBAI/day5.jpg"
    },
    {
      Day: 6,
      Date: 6,
      Title: "Dhow Cruise & Departurse",
      Description: "Morning Dhow Cruise on Dubai Creek. Transfer to airport for departure.",
      ImageUrl: "https://journeyrouters-webassets.s3.ap-south-1.amazonaws.com/2025/uploads/destination/DUBAI/day5.jpg"
    },
    {
      Day: 6,
      Date: 6,
      Title: "Dhow Cruise & Departurse",
      Description: "Morning Dhow Cruise on Dubai Creek. Transfer to airport for departure.",
      ImageUrl: "https://journeyrouters-webassets.s3.ap-south-1.amazonaws.com/2025/uploads/destination/DUBAI/day5.jpg"
    }, {
      Day: 6,
      Date: 6,
      Title: "Dhow Cruise & Departurse",
      Description: "Morning Dhow Cruise on Dubai Creek. Transfer to airport for departure.",
      ImageUrl: "https://journeyrouters-webassets.s3.ap-south-1.amazonaws.com/2025/uploads/destination/DUBAI/day5.jpg"
    },
    {
      Day: 6,
      Date: 6,
      Title: "Dhow Cruise & Departurse",
      Description: "Morning Dhow Cruise on Dubai Creek. Transfer to airport for departure.",
      ImageUrl: "https://journeyrouters-webassets.s3.ap-south-1.amazonaws.com/2025/uploads/destination/DUBAI/day5.jpg"
    },
    {
      Day: 6,
      Date: 6,
      Title: "Dhow Cruise & Departurse",
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
      name: "Burj Al Arab",
      rating: 5,
      location: "Jumeirah Beach",
      image: "https://journeyrouters-webassets.s3.ap-south-1.amazonaws.com/2025/uploads/hotels/burj-al-arab.jpg"
    },
    {
      name: "Atlantis The Palm",
      rating: 5,
      location: "Palm Jumeirah",
      image: "https://journeyrouters-webassets.s3.ap-south-1.amazonaws.com/2025/uploads/hotels/atlantis.jpg"
    }
  ],
  flags: {
    hasHotels: true
  },
  company: {
    name: "Journey Routers",
    email: "info@journeyrouters.com",
    address: "123 Travel Street, Mumbai, India"
  },
  cancellation: "Cancellation Policy:\n\n• 30+ days before departure: 10% cancellation charge\n• 15-29 days before departure: 25% cancellation charge\n• 7-14 days before departure: 50% cancellation charge\n• Less than 7 days before departure: 100% cancellation charge\n• No-show: No refund\n\nAll cancellations must be made in writing. Refunds will be processed within 15 working days.",
  assetsBaseUrl: "http://localhost:3000/public"
};

let cachedTemplate = null;
let templatePath = path.join(__dirname, "template", "pdf.hbs");
let cssPath = path.join(__dirname, "template", "PreviewPdf.css");

function loadTemplate() {
  try {
    let templateHtml = fs.readFileSync(templatePath, "utf8");

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

function renderPDF() {
  if (!cachedTemplate) {
    if (!loadTemplate()) {
      return "<html><body><h1>Error loading template</h1></body></html>";
    }
  }

  try {
    return cachedTemplate(dummyData);
  } catch (err) {
    console.error("❌ Error rendering template:", err.message);
    return `<html><body><h1>Template rendering error: ${err.message}</h1></body></html>`;
  }
}

// Watch for template changes
fs.watchFile(templatePath, { interval: 1000 }, (curr, prev) => {
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
  const html = renderPDF();
  res.send(html);
});

app.get("/json", (req, res) => {
  res.json(dummyData);
});

// Serve static files from template and public directories
app.use("/template", express.static(path.join(__dirname, "template")));
app.use("/public", express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`🚀 Development server running at http://localhost:${PORT}`);
  console.log(`📄 PDF preview: http://localhost:${PORT}`);
  console.log(`📊 Dummy data: http://localhost:${PORT}/json`);
  console.log("👀 Watching for template changes...");
});
