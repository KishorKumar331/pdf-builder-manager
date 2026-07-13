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
  "LeadId": "L-20260709-000001",
  "TripId": "LHYGXW6",
  "Client-Name": "Priyank Jain",
  "Client-Contact": "9999999999",
  "Client-Email": "abc@gmail.com",
  "TravelDate": "2026-07-17",
  "TravelDateKey": 20260717,
  "AssignDate": "2026-07-13T06:18:21.868Z",
  "NoOfPax": 2,
  "Child": "0",
  "Infant": "0",
  "Budget": "",
  "DepartureCity": "India",
  "DestinationName": "Vietnam",
  "IsMultiDestination": false,
  "Destinations": [
    "Vietnam"
  ],
  "Days": 6,
  "Nights": 5,
  "PriceType": "Total",
  "Currency": "INR",
  "Costs": {
    "TotalCost": 98000,
    "LandPackageCost": 92000,
    "FlightCost": 0,
    "TotalTax": 0,
    "GSTAmount": 0,
    "VisaCost": 6000,
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
      "CheckInDateKey": 20260717,
      "CheckOutDateKey": 20260719,
      "RoomType": "KING BED ROOM ",
      "Category": "4",
      "CheckInDate": "2026-07-17",
      "Comments": "",
      "Nights": 2,
      "City": "Hanoi",
      "Meals": [
        "Breakfast"
      ],
      "Name": "TRU BY HILTON",
      "CheckOutDate": "2026-07-19"
    },
    {
      "CheckInDateKey": 20260719,
      "Category": "4",
      "CheckInDate": "2026-07-19",
      "roomCategory": [
        {
          "checkOutDate": null,
          "checkInDate": null,
          "nights": [
            ""
          ],
          "roomtype": ""
        }
      ],
      "Comments": "",
      "Nights": 3,
      "City": "Da Nang",
      "RoomId": "",
      "Name": "GRAND GOLD HOTEL",
      "PropertyId": "",
      "CheckOutDateKey": 20260722,
      "RoomType": "GRAND SUITE SEA VIEW ",
      "HotelImage": "",
      "propertyName": "",
      "RoomImage": "",
      "transferType": "",
      "noOfRoom": "01",
      "Meals": [
        "Breakfast"
      ],
      "CheckOutDate": "2026-07-22",
      "mealPlan": ""
    }
  ],
  "Inclusions": [
    {
      "item": "Accommodation"
    },
    {
      "item": "Daily Breakfast"
    },
    {
      "item": "Visa"
    },
    {
      "item": "All Tours On Group Basis"
    },
    {
      "item": "Pickup & Drop Off At The Airport On Private Basis"
    },
    {
      "item": "Halong Bay Day Cruise (5*) With Lunch"
    },
    {
      "item": "Coconut Village, Marble Mountains & Hoi An Tour With Lunch"
    },
    {
      "item": "Bana Hills Tour & Golden Bridge With Lunch"
    },
    {
      "item": "All Entrance Fees And Sightseeing As Mentioned In The Program"
    },
    {
      "item": "Local English-speaking Guides"
    }
  ],
  "Exclusions": [
    {
      "item": "International Flights"
    },
    {
      "item": "Tours Which Are Not Included In The Package"
    },
    {
      "item": "Meals Not Mentioned In The Program"
    },
    {
      "item": "Early Check-in And Late Check-out. Hotel/Room Upgrade"
    },
    {
      "item": "Drinks, Personal Expenses, And Any Services Not Mentioned In The Itinerary"
    },
    {
      "item": "Tips For Guide And Driver Extra"
    }
  ],
  "Itinearies": [
    {
      "Activities": "",
      "Description": "Step into Vietnam's captivating embrace, where ancient traditions blend seamlessly with modern luxury. Your bespoke journey unveils emerald rice paddies, sapphire coastlines, and the mystical allure of heritage sites. Savor exquisite culinary delights, private sampan cruises through hidden grottoes, and the tranquil serenity of boutique resorts. Every moment is curated for discerning travelers, promising an unforgettable tapestry of vibrant culture, breathtaking beauty, and unparalleled sophistication.",
      "OtherActivityImages": [
        "https://d38jn0rpth8ttn.cloudfront.net/vietnam/arrival_vietnam17722226697308b81b0.jpg"
      ],
      "Title": "Vietnam's Emerald Embrace: A Journey of Timeless Splendor",
      "ImageUrl": "https://d38jn0rpth8ttn.cloudfront.net/vietnam/arrival_vietnam17722226697308b81b0.jpg",
      "Activity": "Arrival Vietnam",
      "Date": "2026-07-17",
      "DateKey": 20260717
    },
    {
      "Description": "8.15-8.50: Get Picked Up At The Hotel In Hanoi Old Quarter/ Opera House To Depart For Halong Bay Our Journey Follows Hanoi Haiphong- Tuan Chau Highway (about A 3 Hour Drive) \n12:00: Arrive At Tuan Chau Harbor, Get On 5 STARS LUXURY CRUISE With Our Crew\u0019s Warmly Welcome Enjoy Welcome Drink Then Start The Excursion To Discover The Beauty Of The World Heritage Site \n12:30: Enjoy Buffet Lunch With More Than 30 Dishes On The Boat .While Having Lunch, The Boat Will Passing By The Beautiful Scenery On Both Sides With Thousands Of Limestone Such As Fighting Chicken And Incense Burner Islets \u0013 2 Symbols Of Halong Bay \n14.00: Arrive At Bo Hon Island, And You Will Visit Sung Sot Cave \u0013 The Most Beautiful Cave With A Lot Of Stalagmites And Stalactites \n14.45: Do Kayaking Or Bamboo Boat Through Luon Cave To Discover The Beautiful Lagoon. \n15.15: Visit TiTop Island With Its Sandy Beach. You Can Go Swimming Here Or Trek Up To The Top Of The Island For Sightseeing All Of Halong Bay \n16.00: Back To The Boat For The Sunset Party (with Wine, Tea, Fruits, And Biscuits) Meanwhile The Boat Is Cruising Back To The Harbour \n17.45: Arrive Back At The Harbour. Get On The Bus And Return To Hanoi \n20:30: Get Dropped Off At The Hotel. Tour Ends.",
      "OtherActivityImages": [
        "https://d38jn0rpth8ttn.cloudfront.net/vietnam/halong_bay1772222703181f38d5a.jpg"
      ],
      "Title": "HALONG BAY FULL DAY TOUR WITH LUNCH (GROUP BASIS)",
      "Activity": "Halong Bay",
      "ImageUrl": "https://d38jn0rpth8ttn.cloudfront.net/vietnam/halong_bay1772222703181f38d5a.jpg",
      "day": 2,
      "Date": "2026-07-18",
      "DateKey": 20260718
    },
    {
      "Description": "Check Out From Your Hotel In Hanoi. \nTransfer To Noi Bai Airport For Your Flight To Da Nang. \nArrive In Da Nang And Transfer To Your Hotel. \nExplore The City At Your Leisure Or Relax On The Beach.",
      "OtherActivityImages": [
        "https://d38jn0rpth8ttn.cloudfront.net/vietnam/cab_transfer17722226788964191d9.jpg"
      ],
      "Title": "FLIGHT TRANSFER TO DA NANG + TRANSFER TO DA NANG ACCOMMODATION (PRIVATE BASIS)",
      "Activity": "Cab Transfer",
      "ImageUrl": "https://d38jn0rpth8ttn.cloudfront.net/vietnam/cab_transfer17722226788964191d9.jpg",
      "day": 3,
      "Date": "2026-07-19",
      "DateKey": 20260719
    },
    {
      "Description": "12.00 PM From Da Nang 7:30 PM At Da Nang\nAbout 1:00 Pm : The Van And Tour Guide Will Pick You Up At Your Hotel (Da Nang Area)\nStart Your Adventure With Cam Thanh Coconut For Being A Fisherman At Cam Thanh\nCoconut Village, You Will Experience Learning Traditional Fishing Techniques\nAnd How To Row Unique Vietnamese Bamboo Basket Boats While Exploring The\nTranquil Coconut Palm Waterways Of The Past War. On This Tour, We Provide Authentic\nSocial And Cultural Insight Into The Local Way Of Life In Vietnam. Furthermore, You\nWill Take Part In Some Hands-on Activities Which Are Fun, Safe, And Interesting And\nAre Suitable For Everybody.\nAbout 2.30 Pm: Visit To The Next Destination To Hoi An Old Town.\nGo To The Phuc Kien Chinese Assembly Hall, A Colorful MØlange Of Bright Gates,\nDragon Statues, And Elaborate Rooftops. Get An Introduction To Ancestor\nWorship While Visiting The Family Altar And Watching Local Devotees Making\nOfferings.\nYou Will See Remarkably Well-preserved Old Houses, Phung Hung Ancient House Or\nTan Ky Ancient House That Have Withstood 200 Years Of Weather And War.\nLearn About The Prosperous Merchants Who Used To Live In These Homes, Trading\nWith Buyers From All Around The World. Visit Museum Of Folk Culture In Hoi An A\nDisplay Of Artifacts Depicts Ancient Local Daily Life. You Will Enjoy Art Shows At Hoi\nAn Traditional Performing Arts House.\nMake A Stop At The Japanese Bridge. The Bridge Spans A Small Waterway\nAnd Was Constructed More Than 400 Years Ago To Connect The Japanese Community\nWith The Chinese Who Lived On The Other Side Of The Water. Admire The Carvings And Paintings Inside The Bridge, Learning About Their Symbolism And Cultural Significance.\nAdditionally, Visit Some Of Hoi An\u0019s Well-known Handicraft Shops And Artwork\nGalleries. Discover Smaller Laneways And Local Neighborhoods, Gaining A\nBetter Appreciation Of Hoi An\u0019s Endless Charm.\nDinner With Hoi An Specialty Food.\n6.00 Pm: Enjoy Your Time With The Boat Ride On Hoai River And Release The Flower\nLanterns To Pray For The Best Of Luck To You And Your Family. You Will\nImmerse Yourself In The Fanciful Space Of The Lantern Street. Free Your Time With The Night Market And Enjoy The Shimmering Space Of Hoi An.",
      "OtherActivityImages": [
        "https://d38jn0rpth8ttn.cloudfront.net/vietnam/coconut_basket_boat_ride1772222684670a8c504.jpg"
      ],
      "Title": "COCONUT VILLAGE \u0013 BOAT RIDE \u0013 HOI AN ANCIENT TOWN - RELEASE FLOWER LANTERN WITH DINNER (GROUP BASIS)",
      "Activity": "Coconut Basket Boat Ride",
      "ImageUrl": "https://d38jn0rpth8ttn.cloudfront.net/vietnam/coconut_basket_boat_ride1772222684670a8c504.jpg",
      "day": 4,
      "Date": "2026-07-20",
      "DateKey": 20260720
    },
    {
      "Description": "07:30 Am - 08:00 Am: Our Minivan And A Tour Guide Pick You Up At The\nHotel Lobby. Reach Ba Na Hills Via Cable Car Spend Your Time On The Most Modern Cable Car In Southeast Asia, Visit Dream Stream Cable Car Station And See The Panorama Of Quang Nam - Danang City On High.\nAfter Finishing The First Cable Car, You Will Visit The Golden Bridge - Which\nHas The Most Exotic Structure And Also The World’s Most Prominent\nPedestrian Bridges Highlighted By The British Guard Newspaper, Le Jardin\nD’amour(consists Of 9 Gardens), And Linh Ung Pagoda.\nContinue The 2nd Cable Car To Visit The French Village - Enjoy Street Music,\nWatch Art\u0019s Statue, Campanile, Nine Floor Goddess Shrine, Tombstone Temple,\nWatch Carnival Performance Show, Square Du Dome ...Challenge The Most\nPopular Adventure Ride - Slide Of Tube Car (free Ride)&\nLunch At A Restaurant (Buffet).\nTake The Lava Train From Sun Kingdom To Many New Attractions For CheckIn Such As Helios Waterfall, Time Gate, And The Moon Kingdom &Join In\nFantasy Park By Walking In Fairy Forest, Discovering Dinosaur Park, Playing\n5D Wild West, Enjoying 4D Death Race Ride, Watch 3D Mega 360 Degrees,\nRide On Journey Into The Underground, Enter Jurassic Park, Challenge Free\nFall Tower And Participate In An Adventure In Horror House And Over 90 Free\nGames.\n15:00: Return To The Cable Car For Leaving Ba Na Hills\n16:45 \u0013 17:45: Our Minivan Brings You Back To Your Hotel. Tour Ends.\nTRIP INCLUDES:\n- Transportation & English-speaking Tour Guide.\n- Cable Cars, Entrance Fees In The Fantasy Park.\n- Golden Bridge, Funicular, Le Jardin D\u0019amour.\n- Lunch With Buffet.\n- A Bottle Of Water\nTRIP EXCLUDES:\n- Wax Statue Museum\n- Debay Wine Cellar\n- Coins Games\n- Personal Expenses And Services Not Mentioned Above",
      "OtherActivityImages": [
        "https://d38jn0rpth8ttn.cloudfront.net/vietnam/bana_hills1772222677344d7cca8.jpg"
      ],
      "Title": "BA NA HILLS \u0013 GOLDEN BRIDGE FULL DAY TOUR WITH LUNCH (GROUP BASIS)",
      "Activity": "Bana Hills",
      "ImageUrl": "https://d38jn0rpth8ttn.cloudfront.net/vietnam/bana_hills1772222677344d7cca8.jpg",
      "day": 5,
      "Date": "2026-07-21",
      "DateKey": 20260721
    },
    {
      "Description": "As your Vietnamese journey concludes, savour the final, exquisite moments amidst jade waters and ancient whispers. Our meticulously curated departure ensures a seamless, luxurious transition, reflecting the country's profound elegance. Feel the warmth of saffron sunsets over historic landscapes, taste gourmet delights, and embrace the silk-clad serenity. This isn't merely a departure; it's a lingering memory, a promise of Vietnam's timeless beauty awaiting your return, leaving you with an unforgettable echo of paradise.",
      "OtherActivityImages": [
        "https://d38jn0rpth8ttn.cloudfront.net/vietnam/departure177222270065533488e.jpg"
      ],
      "Title": "Vietnam: Emerald Grandeur, A Luxuriant Farewell Beckons.",
      "Activity": "Departure",
      "ImageUrl": "https://d38jn0rpth8ttn.cloudfront.net/vietnam/departure177222270065533488e.jpg",
      "day": 6,
      "Date": "2026-07-22",
      "DateKey": 20260722
    }
  ],
  "CreatedAt": "2026-07-13T06:18:21.750Z",
  "LastUpdateStatus": {
    "UpdatedBy": "Draft",
    "UpdatedTime": "2026-07-13T06:18:21.750Z"
  },
  "TravelEndDate": "2026-07-22",
  "TravelEndDateKey": 20260722,
  "OutboundFlight": {},
  "AssignDateKey": 20260713,
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
  templateFile = path.join(__dirname, "template", "pdf.hbs");
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
