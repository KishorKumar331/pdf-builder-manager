const fs = require("fs");
const path = require("path");
const express = require("express");
const Handlebars = require("./helpers");

const app = express();
const PORT = 3000;

// Dummy data matching the template structure

const dummyData = {
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
      "Description": "8.15-8.50: Get Picked Up At The Hotel In Hanoi Old Quarter/ Opera House To Depart For Halong Bay. Our journey follows the Hanoi Haiphong - Tuan Chau Highway, a modern expressway stretching across the scenic Red River Delta. During this comfortable 3-hour drive, you will witness the transition from vibrant cityscapes to peaceful rural landscapes, complete with emerald green rice fields, traditional Vietnamese villages, and local farmers tending to their land. A brief comfort stop is scheduled halfway through the journey to allow you to stretch your legs, refresh, and perhaps sample some local Vietnamese delicacies or tea. The anticipation builds as we approach the coastal gateway of northern Vietnam, heading towards the legendary bay of descending dragons.\n\n12:00: Arrive At Tuan Chau Harbor, the starting point of your maritime adventure. As you step off the bus, you will be escorted to the luxury lounge before boarding our 5-STARS LUXURY CRUISE. The ship's professional crew will welcome you with warm smiles and a refreshing welcome drink infused with local lemongrass and mint. As the vessel gently glides away from the harbor, you will receive a comprehensive safety briefing from our cruise manager, followed by an introduction to the crew and the spectacular itinerary planned for the afternoon. Take this time to explore the cruise's elegant facilities, including the panoramic dining room, the spacious sundeck, and the cozy bar lounge, all designed to offer the ultimate comfort during your excursion.\n\n12:30: Enjoy a sumptuous international and seafood buffet lunch featuring more than 30 masterfully prepared dishes. Savor the freshest catch of the day, alongside traditional Vietnamese specialties like Pho and spring rolls, and a wide selection of international cuisines, salads, and fresh tropical fruits. While dining in our air-conditioned restaurant with floor-to-ceiling windows, the boat will navigate deeper into the heart of Halong Bay. You will pass by iconic limestone formations rising dramatically out of the emerald waters, such as the Fighting Chicken Islet (Hon Ga Choi) and the Incense Burner Islet (Hon Lư Hương), which are celebrated symbols of the bay’s timeless majesty.\n\n14:00: Arrive at Bo Hon Island and disembark to visit Sung Sot Cave (Surprise Cave), the largest and most spectacular grotto in Halong Bay. Ascend the stone steps through the forest canopy to enter the cave’s three massive chambers. Inside, you will be awed by the scale of the caverns, beautifully illuminated by subtle colored lights that highlight thousands of stalactites and stalagmites resembling various animals, plants, and mythological figures. Our experienced guide will share the geological history and folklore associated with this UNESCO World Heritage Site, explaining how the cave was formed over millions of years of water erosion.\n\n14:45: Embark on a thrilling outdoor activity at Luon Cave. You can choose to paddle a kayak independently or ride in a traditional bamboo boat rowed by local villagers. Pass through a natural archway carved into the limestone mountain to enter a serene, circular lagoon completely enclosed by sheer vertical cliffs. This secluded sanctuary is home to diverse flora and fauna, and if you are fortunate, you may spot families of wild golden-headed langur monkeys climbing amongst the high rocks or playing in the branches overhang near the peaceful, glassy water.\n\n15:15: Cruise to TiTop Island, famous for its crescent-shaped sandy beach and panoramic views. Spend your time swimming in the refreshing, cool waters of the bay, relaxing on the white sand under beach umbrellas, or embarking on a challenging trek up the 400 stone steps to the island’s summit peak. The hike is demanding but highly rewarding, offering a breathtaking 360-degree bird's-eye view of Halong Bay's signature maze of limestone towers and emerald channels—a perfect photo opportunity that captures the scale of this magnificent landscape.\n\n16:00: Return to the boat for an elegant Sunset Party on the open sundeck as the cruise begins its return journey back to the harbor. Enjoy complimentary local wine, premium teas, fresh seasonal fruits, and assorted sweet biscuits while socializing with fellow travelers. Watch the sun slowly descend below the horizon, casting warm golden, orange, and purple hues across the peaceful waters and silhouette mountains of the bay, creating a truly magical atmosphere to conclude your voyage.\n\n17:45: Arrive back at Tuan Chau Harbor. Bid farewell to the cruise crew who have taken care of you throughout the day. Board our comfortable luxury limousine bus once more for the return trip to Hanoi. You can take this time to rest, listen to music, or reflect on the unforgettable memories made during the day as the driver navigates back along the expressway.\n\n20:30: Get dropped off directly at your hotel in the Hanoi Old Quarter or near the Opera House. Your full-day exploration of Halong Bay concludes here, leaving you with a deep appreciation for Vietnam's natural wonders, warm hospitality, and rich cultural heritage. Tour ends.",
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
