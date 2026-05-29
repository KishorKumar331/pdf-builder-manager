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

// Build quotation context function (matching index.js structure + fallback data)
function buildQuotationContext(data) {
  const user = data.user || {
    Email: "info@winterfellholidays.com",
    Phone: "+919799794008",
    fullname: "tezal negi",
    CompanyName: "Winterfell Holidays",
    BankName: "Indusind bank",
    BranchName: "Indirapuram, Ghaziabad",
    AccountNumber: "259899060977",
    IfscCode: "INDB0000383",
    organization: {
      details: {
        brandname: "Winterfell Holidays",
        logourl: "https://d2w6ooepk5o1m0.cloudfront.net/winterfell_holidays/profile/WH_web.png",
        website: "https://winterfellholidays.com/",
      },
      financials: {
        qrurl: "https://d2w6ooepk5o1m0.cloudfront.net/winterfell_holidays/profile/WhatsApp_Image_2026-04-03_at_5.00.31_PM.jpeg"
      }
    }
  };

  const company = {
    name: "Winterfell Holidays",
    upi: "pay@winterfell"
  };

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
      priceType: data.PriceType || "Total",
    },
    inclusions: (data.Inclusions || []).map(i => i.item),
    exclusions: (data.Exclusions || []).map(e => e.item),
    itinerary: data.Itinearies || [],
    hotels: data.Hotels || [],
    user: user,
    company: company,
    assetsBaseUrl: "http://localhost:3000/public",
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
  "LeadId": "L-20260526-000003",
  "TripId": "K2J3FZG",
  "Client-Name": "krishna",
  "Client-Contact": "78787876567",
  "Client-Email": "krishna@gmail.com",
  "TravelDate": "2026-09-30",
  "TravelDateKey": 20260930,
  "AssignDate": "2026-05-29T07:19:21.388Z",
  "NoOfPax": 4,
  "Child": "0",
  "Infant": "0",
  "Budget": 299999,
  "DepartureCity": "mumbai",
  "DestinationName": "Maldives",
  "IsMultiDestination": false,
  "Destinations": [
    "Maldives"
  ],
  "Days": 4,
  "Nights": 3,
  "PriceType": "Total",
  "Currency": "INR",
  "Costs": {
    "TotalCost": 450000,
    "LandPackageCost": 100000,
    "FlightCost": 0,
    "TotalTax": 0,
    "GSTAmount": 0,
    "VisaCost": 350000,
    "TCSAmount": 0
  },
  "GST": {
    "WaivedOffOtps": [],
    "Enabled": true,
    "WaivedOffAmount": 0
  },
  "TCS": {
    "WaivedOffOtps": [],
    "Enabled": true,
    "WaivedOffAmount": 0
  },
  "Images": {
    "Inclusions": [],
    "Flights": []
  },
  "Hotels": [
    {
      "CheckInDateKey": 20260526,
      "CheckOutDateKey": 20260527,
      "RoomType": "suit",
      "Category": 0,
      "CheckInDate": "2026-05-26",
      "Comments": "",
      "Nights": 1,
      "City": "mumbai",
      "Meals": [
        "Dinner"
      ],
      "Name": "Vilas Das Hotel",
      "CheckOutDate": "2026-05-27",
      "propertyName": "adaaran_club_rannalhi",
      "transferType": "SpeedBoat",
      "mealPlan": 1,
      "noOfRoom": "suit",
      "roomCategory": [
        {
          "roomtype": "standard_room",
          "nights": [
            "1N"
          ],
          "checkInDate": "2026-05-29",
          "checkOutDate": "2026-05-30",
          "RoomImage": "https://iphotels-cache-dev.s3.ap-south-1.amazonaws.com/images/adaaran_club_rannalhi/standard_room.png",
          "RoomId": "standard_room"
        },
        {
          "roomtype": "water_bungalow",
          "nights": [
            "1N"
          ],
          "checkInDate": "2026-05-29",
          "checkOutDate": "2026-05-30",
          "RoomImage": "https://iphotels-cache-dev.s3.ap-south-1.amazonaws.com/images/adaaran_club_rannalhi/water_bungalow.png",
          "RoomId": "water_bungalow"
        },
        {
          "roomtype": "standard_room",
          "nights": [
            "1N"
          ],
          "checkInDate": "2026-05-29",
          "checkOutDate": "2026-05-30",
          "RoomImage": "https://iphotels-cache-dev.s3.ap-south-1.amazonaws.com/images/adaaran_club_rannalhi/standard_room.png",
          "RoomId": "standard_room"
        },
        {
          "roomtype": "water_bungalow",
          "nights": [
            "1N"
          ],
          "checkInDate": "2026-05-29",
          "checkOutDate": "2026-05-30",
          "RoomImage": "https://iphotels-cache-dev.s3.ap-south-1.amazonaws.com/images/adaaran_club_rannalhi/water_bungalow.png",
          "RoomId": "water_bungalow"
        }
      ],
      "HotelImage": "https://iphotels-cache-dev.s3.ap-south-1.amazonaws.com/images/adaaran_club_rannalhi/standard_room.png",
      "PropertyId": "adaaran_club_rannalhi"
    },
    {
      "Nights": 1,
      "Name": "hotel island",
      "City": "dubai",
      "RoomType": "delux",
      "Category": "5",
      "Meals": [
        "Breakfast",
        "Lunch",
        "Dinner"
      ],
      "CheckInDate": "2026-05-29",
      "CheckOutDate": "2026-05-30",
      "Comments": "",
      "HotelImage": "https://iphotels-cache-dev.s3.ap-south-1.amazonaws.com/images/adaaran_prestige_vadoo/honeymoon_villa.png",
      "PropertyId": "adaaran_prestige_vadoo",
      "RoomImage": "",
      "RoomId": "",
      "propertyName": "adaaran_prestige_vadoo",
      "transferType": "Seaplane",
      "mealPlan": "HalfBoard",
      "noOfRoom": "01",
      "roomCategory": [
        {
          "roomtype": "sunrise_water_villa",
          "nights": [
            "1N"
          ],
          "checkInDate": "2026-05-29",
          "checkOutDate": "2026-05-30",
          "RoomImage": "https://iphotels-cache-dev.s3.ap-south-1.amazonaws.com/images/adaaran_prestige_vadoo/sunrise_water_villa.png",
          "RoomId": "sunrise_water_villa"
        },
        {
          "roomtype": "sunrise_water_villa",
          "nights": [
            "1N"
          ],
          "checkInDate": "2026-05-29",
          "checkOutDate": "2026-05-30",
          "RoomImage": "https://iphotels-cache-dev.s3.ap-south-1.amazonaws.com/images/adaaran_prestige_vadoo/sunrise_water_villa.png",
          "RoomId": "sunrise_water_villa"
        }
      ]
    },
    {
      "Nights": 1,
      "Name": "3red hotel",
      "City": "mumbai",
      "RoomType": "delux",
      "Category": "4",
      "Meals": [
        "Breakfast",
        "Lunch",
        "Dinner"
      ],
      "CheckInDate": "2026-05-29",
      "CheckOutDate": "2026-05-30",
      "Comments": "",
      "HotelImage": "https://iphotels-cache-dev.s3.ap-south-1.amazonaws.com/images/adaaran_select_hudhuranfushi/beach_villa.png",
      "PropertyId": "adaaran_select_hudhuranfushi",
      "RoomImage": "",
      "RoomId": "",
      "propertyName": "adaaran_select_hudhuranfushi",
      "transferType": "DomesticFlight",
      "mealPlan": "HalfBoard",
      "noOfRoom": "01",
      "roomCategory": [
        {
          "roomtype": "family_beach_villa",
          "nights": [
            "1N"
          ],
          "checkInDate": "2026-05-29",
          "checkOutDate": "2026-05-30",
          "RoomImage": "https://iphotels-cache-dev.s3.ap-south-1.amazonaws.com/images/adaaran_select_hudhuranfushi/family_beach_villa.png",
          "RoomId": "family_beach_villa"
        }
      ]
    },
    {
      "Nights": 1,
      "Name": "4th hotel",
      "City": "mumbai",
      "RoomType": "test",
      "Category": "5star",
      "Meals": [
        "Breakfast",
        "Lunch",
        "Dinner"
      ],
      "CheckInDate": "2026-05-29",
      "CheckOutDate": "2026-05-30",
      "Comments": "",
      "HotelImage": "https://iphotels-cache-dev.s3.ap-south-1.amazonaws.com/images/atmosphere_kanifushi/kanifushi_grand_pool_villa.png",
      "PropertyId": "atmosphere_kanifushi",
      "RoomImage": "",
      "RoomId": "",
      "propertyName": "atmosphere_kanifushi",
      "transferType": "DomesticFlight",
      "mealPlan": "FullBoard",
      "noOfRoom": "01",
      "roomCategory": [
        {
          "roomtype": "sunset_beach_villa",
          "nights": [
            "1N"
          ],
          "checkInDate": "2026-05-29",
          "checkOutDate": "2026-05-30",
          "RoomImage": "https://iphotels-cache-dev.s3.ap-south-1.amazonaws.com/images/atmosphere_kanifushi/sunset_beach_villa.png",
          "RoomId": "sunset_beach_villa"
        }
      ]
    }
  ],
  "Inclusions": [
    {
      "item": "Daily Breakfast"
    },
    {
      "item": "Airport Transfers"
    },
    {
      "item": "Entrance Fees"
    },
    {
      "item": "All GST & Taxes"
    },
    {
      "item": "Sightseeing"
    },
    {
      "item": "Tour Guide"
    },
    {
      "item": "Accommodation"
    },
    {
      "item": "Entrance Fees"
    },
    {
      "item": "Tour Guide"
    },
    {
      "item": "Travel Insurance"
    },
    {
      "item": "Entrance Fees"
    }
  ],
  "Exclusions": [
    {
      "item": "Emergency Costs"
    },
    {
      "item": "Early Check-in"
    },
    {
      "item": "Tips & Gratuities"
    },
    {
      "item": "Extra Meals"
    },
    {
      "item": "Visa Fees"
    },
    {
      "item": "Emergency Costs"
    },
    {
      "item": "International Flights"
    },
    {
      "item": "Emergency Costs"
    },
    {
      "item": "Optional Tours"
    },
    {
      "item": "Extra Meals"
    },
    {
      "item": "Visa Fees"
    },
    {
      "item": "International Flights"
    }
  ],
  "Itinearies": [
    {
      "Activities": "",
      "Description": "Perched high above emerald rice paddies and lush jungles, the Bali Swing offers an exclusive, breathtaking panorama. Feel the exhilarating rush of wind as you soar gracefully, suspended between sky and earth. This isn't just a swing; it's a moment of profound freedom, a luxurious embrace of Bali's unparalleled natural beauty. Capture iconic photographs and memories, enveloped in an atmosphere of serene adventure and sophisticated wonder. An unforgettable ascent into paradise awaits your discerning spirit.\n\nIndulge in an exquisite, private candlelit dinner at Sadara, where the gentle ocean breeze caresses your senses under a canopy of stars. Savour a gourmet feast, impeccably served, as the rhythmic lull of the waves provides a symphony for your intimate evening. This bespoke experience, set against Bali's stunning coastline, promises unparalleled romance and cherished memories, crafted exclusively for you.",
      "OtherActivityImages": [
        "https://d38jn0rpth8ttn.cloudfront.net/bali/bali_swing1772221580667a480b5.jpg",
        "https://d38jn0rpth8ttn.cloudfront.net/bali/sadara_candle_light_dinner1772221869648f1064e.jpg"
      ],
      "Title": "Soar Above Bali's Jungle: An Elevated Escape, Bali Sadara: Infinite Love, Candlelit Ocean Whispers",
      "ImageUrl": "https://d38jn0rpth8ttn.cloudfront.net/bali/bali_swing1772221580667a480b5.jpg",
      "Activity": "Bali Swing, Sadara Candle Light Dinner",
      "Date": "2026-09-30",
      "DateKey": 20260930
    },
    {
      "Description": "Perched high above emerald rice paddies and lush jungles, the Bali Swing offers an exclusive, breathtaking panorama. Feel the exhilarating rush of wind as you soar gracefully, suspended between sky and earth. This isn't just a swing; it's a moment of profound freedom, a luxurious embrace of Bali's unparalleled natural beauty. Capture iconic photographs and memories, enveloped in an atmosphere of serene adventure and sophisticated wonder. An unforgettable ascent into paradise awaits your discerning spirit.",
      "OtherActivityImages": [
        "https://d38jn0rpth8ttn.cloudfront.net/bali/bali_swing1772221580667a480b5.jpg"
      ],
      "Title": "Soar Above Bali's Jungle: An Elevated Escape",
      "Activity": "Bali Swing",
      "ImageUrl": "https://d38jn0rpth8ttn.cloudfront.net/bali/bali_swing1772221580667a480b5.jpg",
      "day": 2,
      "Date": "2026-10-01",
      "DateKey": 20261001
    },
    {
      "Description": "Indulge in an exclusive journey through Bali's lush, emerald coffee plantations. Awaken your senses to the rich, earthy aromas as you discover the intricate craftsmanship behind the island's renowned beans. Experience unparalleled serenity amidst verdant landscapes, sipping freshly brewed artisanal coffee. This private immersion offers a sophisticated blend of natural beauty and premium indulgence, revealing the unique legacy of Balinese coffee culture in a truly captivating atmosphere, tailored for discerning connoisseurs.\n\nIndulge in an exquisite, private candlelit dinner at Sadara, where the gentle ocean breeze caresses your senses under a canopy of stars. Savour a gourmet feast, impeccably served, as the rhythmic lull of the waves provides a symphony for your intimate evening. This bespoke experience, set against Bali's stunning coastline, promises unparalleled romance and cherished memories, crafted exclusively for you.\n\nPerched high above emerald rice paddies and lush jungles, the Bali Swing offers an exclusive, breathtaking panorama. Feel the exhilarating rush of wind as you soar gracefully, suspended between sky and earth. This isn't just a swing; it's a moment of profound freedom, a luxurious embrace of Bali's unparalleled natural beauty. Capture iconic photographs and memories, enveloped in an atmosphere of serene adventure and sophisticated wonder. An unforgettable ascent into paradise awaits your discerning spirit.\n\nStep into Ubud's ancient Monkey Forest, a sanctuary where emerald canopies filter the sun, revealing playful, revered inhabitants. Experience a unique immersion into Bali's spiritual heart, far from the ordinary. Wander through lush, moss-covered temples and towering banyan trees, listening to the jungle's symphony. This exclusive encounter offers an unparalleled connection with nature's wild elegance, a truly bespoke journey for the discerning traveler.",
      "OtherActivityImages": [
        "https://d38jn0rpth8ttn.cloudfront.net/bali/coffee_plantation1772220377243bf0700.jpg",
        "https://d38jn0rpth8ttn.cloudfront.net/bali/sadara_candle_light_dinner1772221869648f1064e.jpg",
        "https://d38jn0rpth8ttn.cloudfront.net/bali/bali_swing1772221580667a480b5.jpg",
        "https://d38jn0rpth8ttn.cloudfront.net/bali/monkey_forest1772221852093efcfda.jpg"
      ],
      "Title": "Sip Bali's Essence: A Luxury Coffee Plantation Escape, Bali Sadara: Infinite Love, Candlelit Ocean Whispers, Soar Above Bali's Jungle: An Elevated Escape, Enchanting Ubud: Sacred Monkeys, Timeless Jungle Beauty",
      "Activity": "Coffee Plantation, Sadara Candle Light Dinner, Bali Swing, Monkey Forest",
      "ImageUrl": "https://d38jn0rpth8ttn.cloudfront.net/bali/coffee_plantation1772220377243bf0700.jpg",
      "day": 3,
      "Date": "2026-10-02",
      "DateKey": 20261002
    },
    {
      "Description": "Indulge in an exquisite, private candlelit dinner at Sadara, where the gentle ocean breeze caresses your senses under a canopy of stars. Savour a gourmet feast, impeccably served, as the rhythmic lull of the waves provides a symphony for your intimate evening. This bespoke experience, set against Bali's stunning coastline, promises unparalleled romance and cherished memories, crafted exclusively for you.\n\nPerched high above emerald rice paddies and lush jungles, the Bali Swing offers an exclusive, breathtaking panorama. Feel the exhilarating rush of wind as you soar gracefully, suspended between sky and earth. This isn't just a swing; it's a moment of profound freedom, a luxurious embrace of Bali's unparalleled natural beauty. Capture iconic photographs and memories, enveloped in an atmosphere of serene adventure and sophisticated wonder. An unforgettable ascent into paradise awaits your discerning spirit.\n\nEmbark on an extraordinary photographic journey at Toya Devasya, where Bali's dramatic volcanic landscape meets serene hot springs. Witness mist-kissed mornings unfold into golden hour splendor, providing a breathtaking canvas for your love story. Our exclusive session captures your cherished moments amidst this primeval beauty, offering an intimate, sophisticated experience. Feel the earth's ancient warmth as professional artistry immortalizes your bond, creating timeless memories framed by nature's grandeur and unparalleled tranquility.\n\nStep into an unparalleled world at Bali's premier wildlife sanctuary. Meander through lush, meticulously designed landscapes, discovering a curated collection of exotic animals thriving in pristine, spacious habitats. Experience intimate, personalized encounters and exclusive behind-the-scenes access, transforming your visit into a journey of discovery. Embrace the serene, harmonious atmosphere, a perfect fusion of wild grandeur and refined comfort, ensuring unforgettable memories of Bali’s captivating natural heritage.",
      "OtherActivityImages": [
        "https://d38jn0rpth8ttn.cloudfront.net/bali/sadara_candle_light_dinner1772221869648f1064e.jpg",
        "https://d38jn0rpth8ttn.cloudfront.net/bali/bali_swing1772221580667a480b5.jpg",
        "https://d38jn0rpth8ttn.cloudfront.net/bali/toya_devasya_couple_photo177222191534430f89d.jpg",
        "https://d38jn0rpth8ttn.cloudfront.net/bali/bali_zoo17722215905504c698d.jpg"
      ],
      "Title": "Bali Sadara: Infinite Love, Candlelit Ocean Whispers, Soar Above Bali's Jungle: An Elevated Escape, Toya Devasya: Bali's Fiery Heart, Your Love Illuminated., Exclusive Wildlife Immersion: Bali's Pristine Sanctuary",
      "Activity": "Sadara Candle Light Dinner, Bali Swing, Toya Devasya Couple Photo, Bali Zoo",
      "ImageUrl": "https://d38jn0rpth8ttn.cloudfront.net/bali/sadara_candle_light_dinner1772221869648f1064e.jpg",
      "day": 4,
      "Date": "2026-10-03",
      "DateKey": 20261003
    }
  ],
  "CreatedAt": "2026-05-29T07:05:48.741Z",
  "LastUpdateStatus": {
    "UpdatedBy": "Draft",
    "UpdatedTime": "2026-05-29T07:05:48.741Z"
  },
  "TravelEndDate": "2026-10-03",
  "TravelEndDateKey": 20261003,
  "OutboundFlight": {},
  "AssignDateKey": 20260529,
  "company": "WH",
  "adminemailid": "info@winterfellholidays.com"
}


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

function renderTemplate(targetTemplateFile, isInv) {
  try {
    let templateHtml = fs.readFileSync(targetTemplateFile, "utf8");

    // Load CSS if exists
    let cssContent = "";
    const targetCssPath = isInv
      ? path.join(__dirname, "template", "invoice.css")
      : path.join(__dirname, "template", "PreviewPdf.css");
    try {
      cssContent = fs.readFileSync(targetCssPath, "utf8");
    } catch (err) {
      // Ignored
    }

    // Inline CSS or use external link
    if (cssContent) {
      templateHtml = templateHtml.replace(
        '<link rel="stylesheet" href="{{assetsBaseUrl}}/PreviewPdf.css" />',
        `<style>${cssContent}</style>`
      );
    }

    const compiled = Handlebars.compile(templateHtml);
    const rawData = isInv ? invoiceDummyData : pdfDummyData;
    const processedData = isInv ? buildInvoiceContext(rawData) : buildQuotationContext(rawData);
    return compiled(processedData);
  } catch (err) {
    console.error("❌ Error rendering template:", err.message);
    return `<html><body><h1>Template rendering error: ${err.message}</h1></body></html>`;
  }
}

// Initialize template and CSS paths for primary watcher
if (isInvoice) {
  templateFile = path.join(__dirname, "template", "invoiceip.hbs");
  cssPath = path.join(__dirname, "template", "invoice.css");
} else {
  templateFile = path.join(__dirname, "template", "airlinepdf.hbs");
  cssPath = path.join(__dirname, "template", "PreviewPdf.css");
}

// Watch for template changes
fs.watchFile(templateFile, { interval: 1000 }, (curr, prev) => {
  console.log("🔄 Primary template file changed, reloading...");
});

// Watch for CSS changes
fs.watchFile(cssPath, { interval: 1000 }, (curr, prev) => {
  console.log("🔄 CSS file changed, reloading...");
});

// Routes
app.get("/", (req, res) => {
  res.send(renderTemplate(templateFile, isInvoice));
});

app.get("/airline", (req, res) => {
  res.send(renderTemplate(path.join(__dirname, "template", "airlinepdf.hbs"), false));
});

app.get("/minimal", (req, res) => {
  res.send(renderTemplate(path.join(__dirname, "template", "minimalpdf.hbs"), false));
});

app.get("/nature", (req, res) => {
  res.send(renderTemplate(path.join(__dirname, "template", "naturepdf.hbs"), false));
});

app.get("/pdf", (req, res) => {
  res.send(renderTemplate(path.join(__dirname, "template", "pdf.hbs"), false));
});

app.get("/pdf2", (req, res) => {
  res.send(renderTemplate(path.join(__dirname, "template", "pdf2.hbs"), false));
});

app.get("/invoice", (req, res) => {
  res.send(renderTemplate(path.join(__dirname, "template", "invoiceip.hbs"), true));
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
