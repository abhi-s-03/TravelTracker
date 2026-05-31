// Groq free API client integration (client-side execution)
// Supports live REST calls to console.groq.com with local storage credentials, 
// and features a premium simulated local writer as fallback.

import type { AIMemory, CountryIntelligence, PlaceLog } from '../types';

interface GenerationOptions {
  apiKey?: string;
  mood?: string; // 'adventurous' | 'nostalgic' | 'poetic' | 'whimsical' | 'humorous'
  customContext?: string; // User's personal notes/instructions to guide the AI
}

// System prompts for different memory types
const SYSTEM_PROMPTS = {
  postcard: "You are a warm, poetic travel companion writing a short, evocative postcard from a specific place. Write in the first person, keeping it under 150 words. Focus on sensory details: sights, sounds, smells, and emotional resonance.",
  diary: "You are a vivid, detailed travel diarist. Write a narrative travel diary entry in the first person (approx 350-400 words). Make it engaging, descriptive, and emotionally rich. Incorporate the traveler's raw notes and rating naturally.",
  year_review: "You are a creative editor for a high-end travel magazine. Write an editorial, reflective review summarizing a traveler's full year of explorations (approx 300 words). Group achievements and reflect on their growth as a traveler.",
  country_story: "You are a classic travel memoirist. Write a rich narrative summarizing everything visited in a specific country. Paint a picture of the culture, landscape, and personal transformation experienced there (approx 350 words).",
  life_memoir: "You are a legendary biographer writing the opening prologue of a traveler's grand life memoir. Weave together all their travels into an inspiring, sweeping narrative about curiosity, wandering, and the human spirit (approx 450 words).",
  missed_spots_letter: "You are the spirits of the cities and monuments the traveler has NOT visited yet. Write a playful, slightly sassy, yet incredibly inviting joint letter from these missed spots, coaxing the traveler to come explore them next (approx 200 words).",
  trip_diary: "You are a vivid travel journalist. Write a captivating, narrative diary covering an entire multi-stop trip in the first person (approx 400-500 words). Weave all the destinations into one flowing story, highlighting the transitions, discoveries, and emotional arc of the whole journey."
};

// Generates an AI travel memory (live or simulated)
export const generateTravelMemory = async (
  type: AIMemory['memoryType'],
  _entityId: string,
  entityName: string,
  contextData: {
    placeNames?: string[];
    notes?: string;
    rating?: number;
    tags?: string[];
    year?: string;
    dateRange?: string;
  },
  options: GenerationOptions
): Promise<{ text: string; model: string }> => {
  const { apiKey, mood = 'nostalgic', customContext } = options;
  const model = apiKey ? 'Groq/Llama-3.3-70b-versatile' : 'WorldTracker/Local-Simulated-Llama3';

  // Build the user prompt based on the task
  let prompt = `Write a travel memory of type "${type}" in a "${mood}" mood for: ${entityName}.\n`;
  if (contextData.notes) prompt += `Traveler's personal notes: "${contextData.notes}"\n`;
  if (contextData.rating) prompt += `Traveler's rating: ${contextData.rating} out of 5 stars\n`;
  if (contextData.tags && contextData.tags.length > 0) prompt += `Tags: ${contextData.tags.join(', ')}\n`;
  if (contextData.placeNames && contextData.placeNames.length > 0) {
    prompt += `Places visited during this scope: ${contextData.placeNames.join(', ')}\n`;
  }
  if (contextData.year) prompt += `Year in review: ${contextData.year}\n`;
  if (contextData.dateRange) prompt += `Travel dates: ${contextData.dateRange}\n`;
  if (customContext && customContext.trim()) {
    prompt += `\nIMPORTANT — Traveler's personal context to incorporate: "${customContext.trim()}"\n`;
  }

  prompt += `\nGuidelines: Reflect the "${mood}" tone perfectly. Incorporate any personal context the traveler provided. Do not hallucinate external specific facts about the traveler's personal life that are not provided. Direct writing only, start the narrative immediately without introductory conversational fluff.`;

  if (apiKey) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS[type] },
          { role: 'user', content: prompt }
        ],
        temperature: 0.75,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API Error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    const generatedText = json.choices[0]?.message?.content || '';
    if (!generatedText.trim()) {
      throw new Error('Groq returned an empty response. Please try again.');
    }
    return { text: generatedText.trim(), model };
  }

  // High-fidelity local mock simulator
  await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate thinking latency
  const text = simulateMemory(type, entityName, contextData, mood, customContext);
  return { text, model };
};

// Generates the country intelligence panel data (live or simulated)
export const generateCountryIntel = async (
  countryCode: string,
  countryName: string,
  visitedPlaces: PlaceLog[],
  apiKey?: string
): Promise<Omit<CountryIntelligence, 'id' | 'generatedAt'>> => {
  const visitedNames = visitedPlaces.map(p => p.placeName).join(', ');
  
  if (apiKey) {
    const prompt = `
    You are an expert global geographer and highly knowledgeable travel concierge.
    The traveler has visited the following places in ${countryName}: [${visitedNames}].
    
    Provide your intelligence strictly as a JSON object with this exact format:
    {
      "coverageScore": <number between 0 and 100 representing their exploration level of ${countryName}>,
      "missedSpots": [
        {
          "name": "<name of landmark/city they did NOT visit>",
          "description": "<one-line description of the place>",
          "whyVisit": "<brief, compelling reason why it is a must-see in ${countryName}>"
        },
        ... (generate exactly 5 highly popular and geographically diverse missed spots)
      ],
      "suggestedRoute": "<markdown formatted 3-day travel itinerary linking some of these missed spots. Keep it brief, beautiful, and active.>"
    }
    
    Ensure the JSON is perfectly valid and contains no external markdown code blocks around it (just return pure parseable string).
    `;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: "You are a precise geocaching AI. Always respond in pure JSON. No talk, just JSON." },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API Error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    const content = json.choices[0]?.message?.content || '';
    const parsed = JSON.parse(content);
    
    return {
      countryCode,
      coverageScore: parsed.coverageScore || 20,
      missedSpots: parsed.missedSpots || [],
      suggestedRoute: parsed.suggestedRoute || '',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  // High-fidelity country intelligence simulation
  await new Promise(resolve => setTimeout(resolve, 1800));
  return simulateCountryIntelligence(countryCode, countryName, visitedPlaces);
};

// --- SIMULATION DATABASE LAYERS ---

const simulateMemory = (
  type: AIMemory['memoryType'],
  name: string,
  data: any,
  mood: string,
  customContext?: string
): string => {
  const notesString = data.notes ? ` You wrote: "${data.notes}".` : '';
  const starStr = data.rating ? ` ⭐`.repeat(Math.floor(data.rating)) : ' ⭐⭐⭐⭐⭐';
  const contextNote = customContext ? ` ${customContext}.` : '';

  const introByMood = {
    adventurous: "A surge of wild curiosity hit as we arrived.",
    nostalgic: "Sometimes, the softest whispers of the past are the loudest.",
    poetic: "The sky folded over the horizon like wet parchment.",
    whimsical: "If places had secret handshakes, this one greeted us with a wink.",
    humorous: "Our map was upside down, our coffee was lukewarm, but our spirits were dangerously high."
  }[mood] || "The journey was under way.";

  if (type === 'postcard') {
    return `Greetings from ${name}!\n\n${introByMood} Standing here, feeling the heartbeat of this place, is something I will tuck away in my thoughts forever.${notesString}${contextNote} It rates a solid ${starStr} in my travel ledger. The world is far too beautiful to stay in one place, but this spot makes a strong case for lingering.\n\nCatching the next train,\nMe`;
  }

  if (type === 'diary') {
    return `### 📔 Travel Log: ${name}\n\n${introByMood} It was a day where everything felt slightly elevated, as if the landscape itself was trying to leave an impression. Walking through ${name}, you immediately feel a connection to the stories built here. \n\n${data.notes ? `I kept thinking back to my notes: "${data.notes}"` : "The atmosphere was thick with discovery, and the hours slipped by like water."}${contextNote} It was easily a ${starStr} experience. I remember the exact angle of the sunlight hitting the facades, the chatter of locals carrying on around us, and that rare, precious sensation of being exactly where you are supposed to be. These are the fragments of travel that linger long after the suitcase is unpacked.`;
  }

  if (type === 'year_review') {
    return `## 🌟 Your Travel Odyssey: ${name}\n\nWhat a year of wandering! ${introByMood} Looking back at the map of ${name}, your journey took you across diverse terrains, cultures, and memories. You logged magnificent places like ${data.placeNames?.slice(0, 3).join(', ') || 'gorgeous cities'} and accumulated scores of experiences.${contextNote}\n\nThis year was defined by a willing search for the unknown. Your ratings averaged a stellar ${starStr}, proving that you didn't just see the world—you savored it. Each pin represents a day you stepped out of your comfort zone. May the next year of paths be even more rewarding!`;
  }

  if (type === 'country_story') {
    return `## 🗺️ In the Heart of ${name}\n\n${introByMood} To explore ${name} is to learn its rhythms. From the bustling corners to the silent historic sanctuaries, the places you logged—like ${data.placeNames?.join(', ') || 'these highlights'}—weave a textured story of this country.${contextNote}\n\n${notesString || "You traversed its landscapes with an eye for detail, collecting stars along the way."} Every cobblestone and panoramic overlook left its mark. In ${name}, you didn't just transit; you became a tiny part of its ongoing narrative.`;
  }

  if (type === 'trip_diary') {
    return `## ✈️ Journey Chronicle: ${name}\n\n${introByMood} What a trip it was. From the very first stop to the last, every leg of this journey added a new layer to the story. The route took us through ${data.placeNames?.join(', ') || 'remarkable destinations'}, each place distinct, yet all woven together into one continuous adventure.${contextNote}\n\n${data.dateRange ? `Spanning ${data.dateRange}, ` : ''}this was more than a trip — it was a collection of moments that felt both fleeting and permanent. The transitions between places, the rituals of checking in and wandering out, the unexpected conversations — these are the threads that make a journey memorable. ${starStr}`;
  }

  if (type === 'life_memoir') {
    return `# 🌍 The Wandering Spirit: A Life Prologue\n\n${introByMood} Some lives are measured in calendar days, others in miles walked, routes discovered, and borders crossed. To look at the global map of logged memories is to look at a tapestry of sheer curiosity.${contextNote}\n\nFrom early pins to grand multi-day trips across countries like ${data.placeNames?.slice(0, 3).join(', ') || 'our world'}, this collection is a testament to a life lived in the active voice. Every logged place carries a rating of love, a notebook filled with fleeting thoughts, and a promise to never stop exploring. This is not just a ledger of coordinates; it is a monument to a life of wonder.`;
  }

  // missed_spots_letter
  return `### ✉️ A Letter from the Unvisited\n\nDear Traveler,\n\nWe see you. We saw you enjoying the sights over at ${name}. It looked lovely, really. But... we couldn't help but notice you skipped us! \n\nWe are the quiet ruins, the secret alleyways, the hidden cafes, and the towering mountain peaks that you bypassed. We are waiting right here with our own stories, ready to surprise you. Consider this your official, slightly impatient invitation: pack your bags, update your wishlist, and come see us next. We promise to be even more magical than you expect!\n\nYours, with suitcases packed,\nThe Missed Spots`;
};

const simulateCountryIntelligence = (
  countryCode: string,
  countryName: string,
  visited: PlaceLog[]
): Omit<CountryIntelligence, 'id' | 'generatedAt'> => {
  const visitedCount = visited.length;
  const coverageScore = Math.min(15 + (visitedCount * 8), 95);

  const missedSpotsDatabase: Record<string, {name: string, description: string, whyVisit: string}[]> = {
    IT: [
      { name: 'Amalfi Coast', description: 'Dramatic clifftops lined with pastel-colored fishing villages.', whyVisit: 'Stunning sea cliffs, aromatic lemon orchards, and exquisite coastal driving.' },
      { name: 'Cinque Terre', description: 'Five centuries-old seaside villages along the rugged Italian Riviera.', whyVisit: 'Idyllic coastal hiking paths and incredible locally-caught seafood with pesto.' },
      { name: 'Uffizi Gallery, Florence', description: 'One of the most famous art museums in the world.', whyVisit: 'Contains priceless Renaissance masterpieces by Botticelli, Michelangelo, and Da Vinci.' },
      { name: 'Pompeii Archaeological Park', description: 'Vast ruined city buried under volcanic ash by Mt. Vesuvius.', whyVisit: 'An unbelievably intact time capsule of ancient Roman daily life.' },
      { name: 'Dolomites', description: 'Dramatically jagged limestone peaks in northeastern Italy.', whyVisit: 'World-class hiking, high mountain meadows, and phenomenal alpine sunsets.' }
    ],
    FR: [
      { name: 'Mont Saint-Michel', description: 'A Gothic Benedictine abbey perched on a rocky tidal island.', whyVisit: 'Watch the dramatic Atlantic tides surround this fairytale medieval fortress.' },
      { name: 'Palace of Versailles', description: 'The opulent principal residence of French kings until the Revolution.', whyVisit: 'Marvel at the dazzling Hall of Mirrors and the vast, manicured geometric gardens.' },
      { name: 'Châteaux of the Loire Valley', description: 'Hundreds of magnificent Renaissance castles dotting the countryside.', whyVisit: 'Rent a bicycle to explore stunning royal estates like Château de Chambord.' },
      { name: 'Gorge du Verdon', description: 'A spectacular, deep river canyon with intense turquoise waters.', whyVisit: 'Kayak through dramatic limestone walls and hike pristine alpine ravines.' },
      { name: 'French Riviera (Cannes & Nice)', description: 'The glamorous Mediterranean coast of southeastern France.', whyVisit: 'Sunbathe on pebble beaches, watch yachts, and walk coastal artist promenades.' }
    ],
    GR: [
      { name: 'Meteora Monasteries', description: 'Eastern Orthodox monasteries suspended high on giant sandstone pillars.', whyVisit: 'An otherworldly landscape offering profound spiritual peace and jaw-dropping views.' },
      { name: 'Acropolis of Athens', description: 'The ancient citadel containing the remains of the Parthenon.', whyVisit: 'The undisputed cradle of Western civilization and classical architecture.' },
      { name: 'Delphi Archaeological Site', description: 'Sanctuary of Apollo, home to the famous ancient Oracle.', whyVisit: 'Hike through olive groves up Mount Parnassus to stand where empires asked for predictions.' },
      { name: 'Navagio Beach (Shipwreck Cove), Zakynthos', description: 'An isolated sandy cove home to a rusted smuggler shipwreck.', whyVisit: 'Accessible only by boat, framed by sheer white cliffs and impossibly blue waters.' },
      { name: 'Chania Harbour, Crete', description: 'A 14th-century Venetian harbor lined with colorful waterfront homes.', whyVisit: 'A beautiful collision of Venetian, Ottoman, and traditional Cretan cultures and food.' }
    ],
    IN: [
      { name: 'Hampi Ruins, Karnataka', description: 'Vast boulder-strewn landscape holding the ruins of the Vijayanagara Empire.', whyVisit: 'A surreal landscape with hundreds of ancient temples, stone chariots, and giant boulders.' },
      { name: 'Varanasi Ghats, Uttar Pradesh', description: 'The spiritual heart of India along the sacred River Ganges.', whyVisit: 'Experience the mystical evening Ganga Aarti lamps and timeless spiritual rituals.' },
      { name: 'Kerala Backwaters, Alleppey', description: 'A serene network of canals, rivers, and lakes lined with palms.', whyVisit: 'Rent a traditional thatched houseboat and glide past quiet spice villages.' },
      { name: 'Jaisalmer Golden Fort, Rajasthan', description: 'A massive yellow sandstone fort rising out of the Thar Desert.', whyVisit: 'A living fort where a quarter of the city still resides inside ancient sandstone walls.' },
      { name: 'Munnar Tea Gardens, Kerala', description: 'Lush, rolling green hills blanketed in neatly manicured tea shrubs.', whyVisit: 'Walk through refreshing misty mountain air and taste fresh estate-plucked tea.' }
    ],
    US: [
      { name: 'Grand Canyon National Park', description: 'An immense gorge carved by the Colorado River in Arizona.', whyVisit: 'One of the seven natural wonders — the scale is impossible to comprehend until you stand at the rim.' },
      { name: 'Yellowstone National Park', description: 'World\'s first national park, packed with geysers and hot springs.', whyVisit: 'Watch Old Faithful erupt and spot bison and wolves in their natural habitat.' },
      { name: 'New Orleans French Quarter', description: 'America\'s most culturally vibrant neighborhood full of jazz and Creole food.', whyVisit: 'Experience live jazz on Bourbon Street and eat the best gumbo and beignets on earth.' },
      { name: 'Antelope Canyon, Arizona', description: 'A breathtaking slot canyon with sculpted sandstone wave formations.', whyVisit: 'Watch beams of light pour through the narrow canyon openings in a photographer\'s paradise.' },
      { name: 'Glacier National Park, Montana', description: 'Remote wilderness with over 700 miles of hiking trails and pristine alpine lakes.', whyVisit: 'The "Crown of the Continent" offers glacier-carved peaks and emerald lakes in isolation.' }
    ],
    GB: [
      { name: 'Scottish Highlands', description: 'Dramatic rugged landscape of mountains, lochs, and ancient castles.', whyVisit: 'Drive the North Coast 500 — one of the world\'s most scenic road trips.' },
      { name: 'Stonehenge, Wiltshire', description: 'Mysterious prehistoric stone circle built around 3000 BC.', whyVisit: 'One of the world\'s most iconic archaeological mysteries, especially stunning at sunrise.' },
      { name: 'Lake District National Park', description: 'England\'s largest national park, famous for glacial lakes and fell walking.', whyVisit: 'Climb Scafell Pike and cruise across Windermere in this beloved Wordsworth landscape.' },
      { name: 'Giant\'s Causeway, Northern Ireland', description: 'Unique hexagonal basalt columns formed by ancient volcanic activity.', whyVisit: 'A UNESCO World Heritage Site with an otherworldly coastal landscape and Celtic legends.' },
      { name: 'York Medieval City, Yorkshire', description: 'The most complete medieval city in England, encircled by ancient walls.', whyVisit: 'Walk the iconic Shambles, explore Viking history, and see the magnificent Minster.' }
    ],
    JP: [
      { name: 'Fushimi Inari Shrine, Kyoto', description: 'Thousands of vermillion torii gates winding up Mount Inari.', whyVisit: 'The iconic tunnel of gates is most magical at dawn before the crowds arrive.' },
      { name: 'Arashiyama Bamboo Grove, Kyoto', description: 'A towering bamboo forest pathway just outside central Kyoto.', whyVisit: 'The rustling sound of bamboo stalks and filtered light create an almost surreal atmosphere.' },
      { name: 'Shirakawa-go, Gifu', description: 'A remote mountain village of traditional gassho-zukuri farmhouses.', whyVisit: 'A UNESCO World Heritage village that looks like a fairy tale in winter snowfall.' },
      { name: 'Naoshima Art Island', description: 'A small island in the Seto Inland Sea transformed into an outdoor art museum.', whyVisit: 'Home to Yayoi Kusama\'s iconic yellow pumpkin and world-class Tadao Ando architecture.' },
      { name: 'Okinawa Blue Caves', description: 'Stunning sea caves with crystal blue water on Japan\'s tropical island chain.', whyVisit: 'Snorkel through electric blue caves — a completely different Japan from the mainland.' }
    ],
    AU: [
      { name: 'Great Barrier Reef, Queensland', description: 'World\'s largest coral reef system stretching 2,300 km.', whyVisit: 'Snorkel or dive through the world\'s richest marine biodiversity before it disappears.' },
      { name: 'Uluru-Kata Tjuta National Park', description: 'Sacred red sandstone monolith in the heart of the Australian Outback.', whyVisit: 'Watch Uluru glow crimson at sunrise — a profound spiritual landmark of Aboriginal culture.' },
      { name: 'The Twelve Apostles, Victoria', description: 'Limestone sea stacks rising from the Southern Ocean along the Great Ocean Road.', whyVisit: 'Drive one of the world\'s most dramatic coastal routes at golden hour.' },
      { name: 'Daintree Rainforest, Queensland', description: 'World\'s oldest tropical rainforest, older than the Amazon.', whyVisit: 'Walk through 135 million years of evolution where rainforest meets the reef.' },
      { name: 'Kangaroo Island, South Australia', description: 'Australia\'s third largest island, a wildlife sanctuary with sea lions and penguins.', whyVisit: 'See wild koalas, kangaroos, and little penguins in an untouched natural environment.' }
    ],
    DE: [
      { name: 'Neuschwanstein Castle, Bavaria', description: 'The fairytale castle that inspired Disney\'s Sleeping Beauty Castle.', whyVisit: 'Perched above an Alpine gorge, it is one of the most photographed buildings on earth.' },
      { name: 'Rhine Valley', description: 'A dramatic stretch of the Rhine River lined with medieval castles and vineyards.', whyVisit: 'Take a river cruise past 40 hilltop castles and sample award-winning Riesling wines.' },
      { name: 'Black Forest, Baden-Württemberg', description: 'A dense evergreen forest famous for cuckoo clocks, thermal spas, and hiking.', whyVisit: 'Hike between traditional farmhouses and soak in thermal baths in this fairy-tale landscape.' },
      { name: 'Cologne Cathedral', description: 'A Gothic masterpiece and the largest cathedral in Germany.', whyVisit: 'Its twin spires dominate the skyline — climb to the top for panoramic views over the Rhine.' },
      { name: 'Berchtesgaden National Park', description: 'Remote Alpine park with electric blue Königssee lake and imposing peaks.', whyVisit: 'Take a boat across Germany\'s cleanest lake to the isolated St. Bartholomä chapel.' }
    ],
    ES: [
      { name: 'Sagrada Família, Barcelona', description: 'Gaudí\'s unfinished yet breathtaking Art Nouveau basilica.', whyVisit: 'The most visited monument in Spain — its organic stone towers defy architectural logic.' },
      { name: 'Alhambra Palace, Granada', description: 'A stunning Moorish fortress and palace complex overlooking Granada.', whyVisit: 'The pinnacle of Islamic architecture in Europe, with intricate tilework and serene water gardens.' },
      { name: 'Picos de Europa', description: 'A rugged mountain range in Northern Spain with dramatic gorges.', whyVisit: 'Hike the Cares Gorge — one of Europe\'s most spectacular canyon trails.' },
      { name: 'Toledo Old City', description: 'A UNESCO World Heritage city perched on a granite hill above the Tagus River.', whyVisit: 'Known as the "city of three cultures" for its Christian, Muslim, and Jewish heritage.' },
      { name: 'Teide National Park, Tenerife', description: 'Home to Spain\'s highest peak, a volcano rising from the Atlantic Ocean.', whyVisit: 'Take a cable car to 3,555m and watch the Milky Way from above the clouds.' }
    ],
    TH: [
      { name: 'Chiang Mai Old City', description: 'Ancient walled city surrounded by a moat, with 300+ Buddhist temples.', whyVisit: 'The best base for elephant sanctuary visits and lush northern Thai trekking.' },
      { name: 'Phi Phi Islands', description: 'Iconic limestone karst islands in the Andaman Sea.', whyVisit: 'The Maya Bay snorkeling and dramatic cliff viewpoints are among Asia\'s most beautiful.' },
      { name: 'Ayutthaya Historical Park', description: 'Ruins of the former Siamese capital, a UNESCO World Heritage Site.', whyVisit: 'Explore ancient royal temples and see the iconic Buddha head entwined in tree roots.' },
      { name: 'Khao Yai National Park', description: 'Thailand\'s oldest national park, a UNESCO World Heritage jungle.', whyVisit: 'Spot wild elephants, gibbons, and hornbills on guided night safaris through pristine forest.' },
      { name: 'Pai, Mae Hong Son', description: 'A small mountain town near the Myanmar border with hot springs.', whyVisit: 'A hippie haven of organic cafes, canyon viewpoints, and waterfall trekking in the hills.' }
    ],
    MX: [
      { name: 'Chichen Itza', description: 'Ancient Mayan city and one of the New Seven Wonders of the World.', whyVisit: 'The El Castillo pyramid aligns perfectly with the sun twice a year in a stunning light display.' },
      { name: 'Cenotes of the Yucatán', description: 'Natural limestone sinkholes filled with crystal-clear freshwater.', whyVisit: 'Swim in an underground cavern that the Maya believed were portals to the underworld.' },
      { name: 'Copper Canyon, Chihuahua', description: 'A series of canyons larger and deeper than the Grand Canyon.', whyVisit: 'Ride the El Chepe train through the dramatic Sierra Tarahumara mountains.' },
      { name: 'Oaxaca City', description: 'A colonial city famous for indigenous culture, mezcal, and mole cuisine.', whyVisit: 'The culinary capital of Mexico — eat the best tlayudas and tlacoyos from market stalls.' },
      { name: 'Teotihuacan', description: 'Ancient Mesoamerican city with the Pyramid of the Sun and Moon.', whyVisit: 'Climb the third-largest pyramid on earth and watch a hot air balloon drift over the ruins at dawn.' }
    ],
    TR: [
      { name: 'Cappadocia', description: 'Surreal volcanic landscape with fairy chimneys and cave hotels.', whyVisit: 'Float over the otherworldly rock formations in a hot air balloon at sunrise.' },
      { name: 'Hagia Sophia, Istanbul', description: 'A 1,500-year-old architectural marvel that has been cathedral, mosque, and museum.', whyVisit: 'One of the greatest architectural achievements of any civilization — the dome engineering is astonishing.' },
      { name: 'Pamukkale Thermal Terraces', description: 'White calcium carbonate terraces forming natural thermal pools.', whyVisit: 'Bathe in warm mineral water while looking out over the white travertine cliffs — a unique on earth.' },
      { name: 'Ephesus Ancient City', description: 'One of the best-preserved ancient Roman cities in the world.', whyVisit: 'Walk down the marble Curetes Street and into the 25,000-seat Great Theatre of Ephesus.' },
      { name: 'Sumela Monastery, Trabzon', description: 'A 4th-century Greek Orthodox monastery carved into a sheer cliff face.', whyVisit: 'One of the most dramatic monastery settings in the world — accessible only by mountain trail.' }
    ],
    SG: [
      { name: 'Gardens by the Bay', description: 'A futuristic nature park with iconic Supertree structures.', whyVisit: 'The Supertree light show after dark is one of the world\'s most spectacular free events.' },
      { name: 'Hawker Centre Culture', description: 'Open-air food courts serving the world\'s cheapest Michelin-starred food.', whyVisit: 'Eat chicken rice, laksa, and chilli crab at Maxwell Food Centre — a UNESCO-listed food culture.' },
      { name: 'Sentosa Island', description: 'A resort island with beaches, cable cars, and Universal Studios.', whyVisit: 'Ride the skyline luge and watch the Wings of Time light show on the beach at dusk.' },
      { name: 'Chinatown & Temple Street', description: 'A colorful historic district with preserved shophouses and temples.', whyVisit: 'Explore the Sri Mariamman Temple, Buddha Tooth Relic Temple, and antique bazaars.' },
      { name: 'MacRitchie Reservoir Park', description: 'A serene rainforest nature reserve in the heart of the city.', whyVisit: 'Walk the TreeTop Walk suspension bridge above the jungle canopy for views of the reservoir.' }
    ],
    AE: [
      { name: 'Dubai Desert Safari', description: 'Vast golden sand dunes just 45 minutes from Dubai\'s gleaming skyline.', whyVisit: 'Dune bash at sunset, ride camels, and dine under the stars in a traditional Bedouin camp.' },
      { name: 'Abu Dhabi Sheikh Zayed Grand Mosque', description: 'One of the world\'s largest mosques, with 82 domes and gleaming marble.', whyVisit: 'The largest hand-knotted carpet in the world lies inside this architectural masterpiece.' },
      { name: 'Louvre Abu Dhabi', description: 'An island museum with a stunning perforated dome by Jean Nouvel.', whyVisit: 'The "rain of light" effect through the dome onto the art below is architecturally hypnotic.' },
      { name: 'Al Ain Oasis', description: 'A UNESCO-listed date palm oasis with 3,000 years of continuous cultivation.', whyVisit: 'Walk through a 1,200-hectare forest of date palms fed by an ancient falaj water system.' },
      { name: 'Hatta Mountain Pools', description: 'A rugged mountain enclave near the Oman border with kayaking on teal pools.', whyVisit: 'Kayak through dramatic Hajar Mountain landscapes — the perfect escape from the desert heat.' }
    ],
    NL: [
      { name: 'Keukenhof Gardens, Lisse', description: 'The world\'s largest flower garden, with 7 million tulips in bloom.', whyVisit: 'Visit in April for an explosion of color — a must-see during the Dutch tulip season.' },
      { name: 'Kinderdijk Windmills', description: 'Nineteen UNESCO-listed historic windmills in a classic polder landscape.', whyVisit: 'Cycle along the dikes at golden hour when the mills cast long shadows over the canals.' },
      { name: 'Rijksmuseum, Amsterdam', description: 'The Netherlands\' national museum of art and history.', whyVisit: 'Home to Rembrandt\'s "Night Watch" and Vermeer\'s "The Milkmaid" — Dutch Golden Age at its peak.' },
      { name: 'Giethoorn Village', description: 'A car-free village connected entirely by canals — called the "Venice of the North".', whyVisit: 'Hire a whisperboat and glide silently past thatched-roof farmhouses in perfect silence.' },
      { name: 'Hoge Veluwe National Park', description: 'A vast wilderness of forests, heathlands, and sand dunes.', whyVisit: 'Home to the Kröller-Müller Museum — world\'s second largest Van Gogh collection in the middle of nature.' }
    ],
    PT: [
      { name: 'Sintra Palace & Pena National Palace', description: 'Colorful 19th-century Romantic palaces set in forested hills above Lisbon.', whyVisit: 'The most fairytale-looking royal palace in Europe, perched dramatically in misty hillside forests.' },
      { name: 'Douro Valley Wine Region', description: 'A UNESCO-listed terraced wine region along the Douro River.', whyVisit: 'Cruise the river between steep vineyard terraces and taste the finest Port wine at its source.' },
      { name: 'Alentejo Region', description: 'Portugal\'s largest region — cork oak plains, medieval walled villages, and stargazing.', whyVisit: 'Stay in a converted monastery, eat the best cataplana, and sleep under a sky of pure stars.' },
      { name: 'Monsanto Village', description: 'A granite boulder village where homes are built among house-sized rocks.', whyVisit: 'The most unique village in Portugal — literally carved into and around massive boulders.' },
      { name: 'Azores, São Miguel Island', description: 'A volcanic island in the mid-Atlantic with crater lakes and hot springs.', whyVisit: 'Soak in the Furnas thermal springs, hike to the twin lakes of Sete Cidades at the volcano\'s rim.' }
    ],
    MA: [
      { name: 'Chefchaouen', description: 'The iconic Blue City tucked into the Rif Mountains.', whyVisit: 'An entire medina painted in shades of blue — one of the most photographed places on earth.' },
      { name: 'Sahara Desert, Merzouga', description: 'The edge of the Sahara with towering golden dunes at Erg Chebbi.', whyVisit: 'Ride a camel at sunset into the dunes and sleep in a luxury desert camp under the Milky Way.' },
      { name: 'Fes el-Bali Medina', description: 'The world\'s largest car-free urban zone — a medieval Islamic city unchanged for centuries.', whyVisit: 'Get genuinely lost in 9,000 streets and watch leather being tanned in the ancient Chouara tanneries.' },
      { name: 'Aït Benhaddou Ksar', description: 'A UNESCO-listed fortified clay city used in dozens of Hollywood films.', whyVisit: 'This ancient earthen city (used in Game of Thrones and Gladiator) is a cinematic masterpiece.' },
      { name: 'Essaouira', description: 'A breezy blue-and-white Atlantic coastal town with Gnawa music culture.', whyVisit: 'Walk the Portuguese-built sea ramparts, fly a kite on the windy beach, and eat fresh-grilled sardines.' }
    ],
    ZA: [
      { name: 'Kruger National Park', description: 'Africa\'s most celebrated safari destination with all the Big Five.', whyVisit: 'Self-drive the world\'s best safari park at dawn for elephant, rhino, and lion sightings.' },
      { name: 'Cape Winelands, Stellenbosch', description: 'A valley of Cape Dutch architecture and world-class Pinotage wineries.', whyVisit: 'Cycle between mountain-framed wine estates and eat the finest South African cuisine.' },
      { name: 'Garden Route', description: 'A scenic coastal drive from Mossel Bay to Storms River through lush forest.', whyVisit: 'Bungee jump from Bloukrans Bridge — the world\'s highest commercial bungee jump.' },
      { name: 'Drakensberg Mountains', description: 'The Great Escarpment, home to San rock art and dramatic basalt cliff faces.', whyVisit: 'Hike to the Amphitheatre — a sheer 5km-wide basalt wall and one of Africa\'s great natural spectacles.' },
      { name: 'Robben Island, Cape Town', description: 'The island prison where Nelson Mandela was imprisoned for 18 years.', whyVisit: 'Tours led by former political prisoners make this the most moving historical experience in Africa.' }
    ],
    SE: [
      { name: 'ICEHOTEL, Jukkasjärvi', description: 'The world\'s first hotel built entirely from ice and snow each winter.', whyVisit: 'Sleep in an ice room, see the Northern Lights, and ride huskies across a frozen landscape.' },
      { name: 'Stockholm Old Town (Gamla Stan)', description: 'One of the best-preserved medieval city centers in Europe.', whyVisit: 'Wander cobblestoned alleys dating from the 13th century, golden cafes, and tiny bookshops.' },
      { name: 'Gothenburg Archipelago', description: '1,000 islands off the west coast accessible by ferry.', whyVisit: 'Hop between sleepy fishing villages, wild seal colonies, and kayak through fjord channels.' },
      { name: 'Abisko National Park', description: 'One of the best places on earth for Northern Lights viewing.', whyVisit: 'The microclimate creates unusually clear skies — the Aurora Sky Station is unmissable.' },
      { name: 'Visby, Gotland Island', description: 'A UNESCO medieval walled city in the Baltic Sea.', whyVisit: 'Sweden\'s best-preserved medieval city with 40 church ruins and a legendary midsummer festival.' }
    ],
    NO: [
      { name: 'Geirangerfjord', description: 'A UNESCO World Heritage fjord with multiple dramatic waterfalls.', whyVisit: 'The Seven Sisters waterfall and the Eagle Road switchbacks are among Norway\'s most iconic sights.' },
      { name: 'Lofoten Islands', description: 'Remote Arctic archipelago with dramatic peaks rising from the sea.', whyVisit: 'Fish from a traditional red rorbuer cabin at midnight sun, then kayak between Viking landmarks.' },
      { name: 'Trolltunga', description: 'A dramatic rock ledge jutting horizontally over Lake Ringedalsvatn.', whyVisit: 'A grueling 22km hike rewarded with Norway\'s most dramatic photo opportunity above the abyss.' },
      { name: 'Bergen Fish Market & Bryggen', description: 'Norway\'s second city with UNESCO Hanseatic wooden wharf buildings.', whyVisit: 'Eat freshly caught fish soup at the harbourside market, then ride the funicular to see the fjords.' },
      { name: 'North Cape (Nordkapp)', description: 'The northernmost point of mainland Europe, 71° north.', whyVisit: 'Stand at the edge of the world and watch the midnight sun never set on the Arctic Ocean.' }
    ],
    AR: [
      { name: 'Perito Moreno Glacier, Patagonia', description: 'One of the few advancing glaciers on earth in Los Glaciares National Park.', whyVisit: 'Watch the glacier calve massive icebergs with thunderous crashes into the lake — endlessly dramatic.' },
      { name: 'Iguazú Falls', description: 'The world\'s largest waterfall system — 275 individual falls on the Argentina-Brazil border.', whyVisit: 'Get drenched on the Devil\'s Throat walkway and spot toucans and coatis in the subtropical jungle.' },
      { name: 'Mendoza Wine Region', description: 'Argentina\'s wine capital at the foot of the Andes, famous for Malbec.', whyVisit: 'Cycle between bodegas with the snow-capped Aconcagua peak as backdrop — world-class wine country.' },
      { name: 'Quebrada de Humahuaca', description: 'A UNESCO mountain valley with polychromatic painted hills in Jujuy Province.', whyVisit: 'The Hill of Seven Colors at Purmamarca changes hue every hour through the day.' },
      { name: 'Tierra del Fuego National Park', description: 'The southernmost national park in the world, at the tip of South America.', whyVisit: 'Take the "Train at the End of the World" and hike to the edge of the continent at Lapataia Bay.' }
    ],
    CN: [
      { name: 'Zhangjiajie National Forest', description: 'Pillar mountains that inspired Avatar\'s Hallelujah Mountains.', whyVisit: 'Walk the world\'s longest glass-bottomed bridge and hike above the floating sandstone pillars.' },
      { name: 'Li River, Guilin', description: 'A slow emerald river winding through dramatic karst limestone peaks.', whyVisit: 'The classic boat trip from Guilin to Yangshuo reveals a landscape from Chinese watercolour paintings.' },
      { name: 'Jiuzhaigou Valley', description: 'A fairytale valley of multicolored lakes and waterfalls in Sichuan.', whyVisit: 'The surreal turquoise and cobalt pools change color through the day — unlike anywhere else on earth.' },
      { name: 'Dunhuang Mogao Caves', description: '492 Buddhist cave temples carved over 1,000 years on the Silk Road.', whyVisit: 'The world\'s finest collection of Buddhist art, preserved perfectly in the dry Gobi Desert air.' },
      { name: 'Tiger Leaping Gorge, Yunnan', description: 'One of the world\'s deepest gorges between Jade Dragon Snow Mountain and Haba Snow Mountain.', whyVisit: 'A 2-day high-trail hike along the gorge rim offers jaw-dropping vertical drops into the Jinsha River.' }
    ],
    CA: [
      { name: 'Banff National Park, Alberta', description: 'Canada\'s first national park with turquoise glacial lakes and Rocky Mountain peaks.', whyVisit: 'Kayak the impossibly blue Lake Louise and drive the Icefields Parkway — the world\'s most scenic highway.' },
      { name: 'Tofino, British Columbia', description: 'A remote rainforest village on Vancouver Island\'s wild Pacific coast.', whyVisit: 'Surf on wild storm beaches, watch grey whales, and soak in old-growth cedar hot springs.' },
      { name: 'Northern Quebec Aurora Borealis', description: 'Remote boreal wilderness offering unobstructed Northern Lights views.', whyVisit: 'Stay in a glass-roofed cabin in Chic-Choc Mountains for pure Aurora Borealis viewing perfection.' },
      { name: 'Hopewell Rocks, New Brunswick', description: 'The world\'s highest tides expose giant flower-pot shaped sea stacks twice daily.', whyVisit: 'Walk on the ocean floor at low tide, then watch it submerge 16m under the world\'s highest tides.' },
      { name: 'Churchill, Manitoba', description: 'The polar bear capital of the world on the shore of Hudson Bay.', whyVisit: 'Board a tundra buggy to photograph wild polar bears in their Arctic habitat — a bucket list encounter.' }
    ]
  };

  const missedSpots = missedSpotsDatabase[countryCode] || [
    { name: 'The Historic Capital City', description: 'The beating cultural and historic heart of the nation.', whyVisit: 'Incredible museums, local cuisines, and street life.' },
    { name: 'The Ancient Ruins', description: 'A window into the classical era of this region.', whyVisit: 'Explore majestic temples and learn structural archaeology.' },
    { name: 'The National Nature Reserve', description: 'Untouched mountain peaks, lakes, and local wildlife.', whyVisit: 'Breath-taking scenery, hiking trails, and panoramic view decks.' },
    { name: 'The Coastal Fishing Village', description: 'A slow-paced refuge where traditional lifestyles persist.', whyVisit: 'Superb local fresh food and slow, lazy sunset walks by the water.' },
    { name: 'The Local Craft Bazaar', description: 'A vibrant, crowded market full of local artisans.', whyVisit: 'Pick up unique hand-carved souvenirs and interact with passionate creators.' }
  ];

  const suggestedRoute = `
### 🗺️ The Highlights Explorer: 3-Day Custom Route

Explore the best of ${countryName}'s unvisited gems. Here is a curated 3-day itinerary:

*   **Day 1: The Cultural Ascent**
    Arrive early at **${missedSpots[0].name}**. Spend the morning wandering the sights, then head to **${missedSpots[2].name}** for a stunning late-afternoon panorama. Dine at a traditional tavern nearby.
    
*   **Day 2: Historical Immersion**
    Take a scenic transport route to **${missedSpots[1].name}**. Dedicate at least 4 hours to exploring the architecture and taking photos. Wrap up the evening with a local food tasting tour.
    
*   **Day 3: Nature and Farewell**
    Rise at dawn for a refreshing trip to **${missedSpots[3].name}**. Rent a local boat or bicycle to explore the pristine landscapes. Grab a memorable dinner and write your travel postcard!
  `.trim();

  return {
    countryCode,
    coverageScore,
    missedSpots,
    suggestedRoute,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  };
};
