import type { GeoType, ResolvedLocation } from "./types";
import { normalizeName, targetBounds } from "./geo";
import { SHAPES } from "./shapes";

export interface GazetteerEntry {
  name: string;
  aliases: string[];
  type: GeoType;
  lat: number;
  lng: number;
  radiusKm: number;
  region: string;
  description: string;
  why: string;
}

function E(
  name: string,
  aliases: string[],
  type: GeoType,
  lat: number,
  lng: number,
  radiusKm: number,
  region: string,
  description: string,
  why: string
): GazetteerEntry {
  return { name, aliases, type, lat, lng, radiusKm, region, description, why };
}

const AREA_TYPES: GeoType[] = [
  "Continent", "Region", "River", "Desert", "Sea", "Ocean", "Mountain Range",
  "Peninsula", "Island Group", "Historical Region", "Civilization", "Empire",
];

export const GAZETTEER: GazetteerEntry[] = [
  // Modern European study-list additions.
  E("Albania", [], "Country", 41, 20, 136, "Europe", "Balkan country on the Adriatic and Ionian seas.", "Connects the western Balkans to Mediterranean sea routes."),
  E("Andorra", [], "Country", 42.55, 1.58, 17, "Europe", "Small landlocked country in the Pyrenees between France and Spain.", "Its mountain passes link the Iberian Peninsula with France."),
  E("Belarus", [], "Country", 53.7, 28, 432, "Europe", "Landlocked country east of Poland and north of Ukraine.", "Lies on the lowland corridor between central Europe and Russia."),
  E("Bosnia and Herzegovina", ["Bosnia & Herzegovina", "Bosnia Herzegovina", "Bosnia"], "Country", 44.2, 17.7, 176, "Europe", "Mountainous Balkan country with a short Adriatic coastline.", "Sarajevo is a historic meeting point of cultures in the Balkans."),
  E("Bulgaria", [], "Country", 42.7, 25.5, 281, "Europe", "Southeastern European country south of the Danube and west of the Black Sea.", "Links the Danube basin, the Balkans, and the Black Sea."),
  E("Croatia", [], "Country", 45.1, 16, 268, "Europe", "Balkan country with a long Adriatic coast.", "Its ports and islands connect central Europe with the Mediterranean."),
  E("Czech Republic", ["Czechia"], "Country", 49.8, 15.5, 305, "Europe", "Landlocked central European country between Germany, Poland, Austria, and Slovakia.", "Bohemia and Moravia form a historic crossroads of central Europe."),
  E("Estonia", [], "Country", 58.7, 25.5, 290, "Europe", "Northernmost Baltic country, south of the Gulf of Finland.", "Its position links the Baltic region with Finland and northern Europe."),
  E("Kosovo", ["Republic of Kosovo"], "Country", 42.6, 20.9, 80, "Europe", "Landlocked territory in the central Balkans that declared independence in 2008; recognition is not universal.", "Located between Serbia, Albania, Montenegro, and North Macedonia."),
  E("Latvia", [], "Country", 56.9, 24.6, 327, "Europe", "Baltic country between Estonia and Lithuania.", "Riga and the Daugava connect the Baltic coast with the interior."),
  E("Liechtenstein", [], "Country", 47.16, 9.55, 10, "Europe", "Small Alpine country between Switzerland and Austria.", "One of only two doubly landlocked countries in the world."),
  E("Lithuania", [], "Country", 55.2, 23.9, 266, "Europe", "Southernmost Baltic country, north of Poland and Belarus.", "Once part of a large commonwealth with Poland."),
  E("Luxembourg", [], "Country", 49.8, 6.1, 36, "Europe", "Small landlocked country between Belgium, France, and Germany.", "A founding member and institutional center of European integration."),
  E("North Macedonia", ["Republic of North Macedonia", "FYROM"], "Country", 41.6, 21.7, 117, "Europe", "Landlocked Balkan country north of Greece, officially North Macedonia since 2019.", "The Vardar valley provides a route through the central Balkans."),
  E("Moldova", ["Republic of Moldova"], "Country", 47.2, 28.5, 158, "Europe", "Landlocked country between Romania and Ukraine.", "Lies between the Prut and Dniester river systems."),
  E("Monaco", [], "Country", 43.738, 7.425, 1, "Europe", "Tiny Mediterranean country on the French Riviera.", "A sovereign city-state bordered by France and the sea."),
  E("Montenegro", [], "Country", 42.8, 19.2, 87, "Europe", "Mountainous Balkan country on the Adriatic Sea.", "Its rugged coast includes the sheltered Bay of Kotor."),
  E("Romania", [], "Country", 45.9, 24.9, 425, "Europe", "Southeastern European country on the lower Danube and Black Sea.", "The Carpathians and the Danube shape its landscape."),
  E("San Marino", [], "Country", 43.94, 12.46, 5, "Europe", "Small landlocked republic surrounded by Italy.", "One of the oldest surviving republics in the world."),
  E("Serbia", [], "Country", 44.2, 20.8, 189, "Europe", "Landlocked Balkan country centered on the Danube and Morava valleys.", "Belgrade stands at the meeting of the Danube and Sava."),
  E("Slovakia", ["Slovak Republic"], "Country", 48.7, 19.5, 258, "Europe", "Landlocked central European country south of Poland.", "The Carpathians dominate the north and the Danube borders the southwest."),
  E("Slovenia", [], "Country", 46.1, 14.8, 145, "Europe", "Country where the Alps meet the Balkans and the Adriatic.", "Connects Alpine, Mediterranean, and central European routes."),
  E("Vatican City", ["Holy See", "Vatican", "Vatican City State"], "Country", 41.9029, 12.4534, 1, "Europe", "Independent city-state enclosed by Rome, Italy.", "The smallest country by area and the seat of the Roman Catholic Church."),
  E("Bay of Biscay", [], "Sea", 45.5, -4, 600, "Northern Atlantic / Europe", "Atlantic bay west of France and north of Spain.", "Its coasts link the Iberian Peninsula and western France."),
  E("Norwegian Sea", [], "Sea", 68, 0, 600, "Northern Atlantic / Europe", "North Atlantic sea between Norway, Iceland, and the Greenland Sea.", "Connects the North Atlantic to Arctic waters."),

  // ===== CONTINENTS =====
  E("North America", [], "Continent", 48, -100, 3200, "Western Hemisphere", "The third-largest continent, stretching from the Arctic to Central America.", "Home to diverse indigenous civilizations and later major world powers."),
  E("South America", [], "Continent", -14, -60, 2800, "Western Hemisphere", "Continent dominated by the Andes and the Amazon Basin.", "Cradle of Andean civilizations such as the Inca."),
  E("Europe", [], "Continent", 50, 15, 1800, "Eurasia", "A peninsula-rich continent west of Asia.", "Center of classical civilizations, and later global exploration and industrialization."),
  E("Africa", [], "Continent", 2, 20, 3300, "Africa", "The second-largest continent, birthplace of humanity.", "Site of ancient Egypt, powerful trading empires, and immense cultural diversity."),
  E("Asia", [], "Continent", 40, 90, 4000, "Eurasia", "The largest continent, home to most of the world's population.", "Birthplace of many of the earliest and most influential civilizations."),
  E("Australia", ["australia continent"], "Continent", -25.3, 133.8, 1800, "Oceania", "Both a continent and a country in the Southern Hemisphere.", "Isolated landmass with unique ecosystems and ancient Aboriginal cultures."),
  E("Antarctica", [], "Continent", -80, 0, 2500, "Southern Hemisphere", "Ice-covered continent surrounding the South Pole.", "The coldest, driest continent — governed by international treaty."),
  E("Oceania", [], "Region", -18, 155, 3500, "Pacific", "The region of Australia and the Pacific islands.", "Settled by remarkable Polynesian seafaring migrations."),

  // ===== OCEANS =====
  E("Pacific Ocean", ["pacific"], "Ocean", 0, -160, 6000, "Global", "The largest and deepest ocean, covering a third of Earth's surface.", "Crossed by Polynesian navigators and central to modern trade."),
  E("Atlantic Ocean", ["atlantic"], "Ocean", 10, -35, 5000, "Global", "Ocean separating the Americas from Europe and Africa.", "Highway of the Columbian Exchange and the Atlantic slave trade."),
  E("Indian Ocean", [], "Ocean", -20, 80, 4000, "Global", "Ocean bounded by Africa, Asia, and Australia.", "Center of the medieval world's richest maritime trade network."),
  E("Arctic Ocean", [], "Ocean", 85, 0, 2500, "Global", "The smallest, coldest ocean around the North Pole.", "Increasingly important as polar ice recedes."),
  E("Southern Ocean", ["antarctic ocean"], "Ocean", -65, 0, 4000, "Global", "The ocean encircling Antarctica.", "Drives global ocean circulation."),

  // ===== SEAS & GULFS =====
  E("Mediterranean Sea", ["mediterranean"], "Sea", 35, 18, 1300, "Between Europe, Africa & Asia", "Nearly enclosed sea linking three continents.", "The highway of Phoenician, Greek, and Roman civilization."),
  E("Red Sea", [], "Sea", 20, 38, 550, "Between Africa & Arabia", "Narrow sea between Egypt/Sudan and the Arabian Peninsula.", "Key corridor of trade between the Mediterranean and Indian Ocean."),
  E("Black Sea", [], "Sea", 43.5, 34.5, 500, "Southeastern Europe / Anatolia", "Inland sea north of Turkey.", "Linked Greek colonies and later Russian trade to the Mediterranean."),
  E("Caspian Sea", [], "Sea", 41.5, 50.5, 550, "Central Asia / Caucasus", "The world's largest inland body of water.", "Bordered Silk Road routes and Persian empires."),
  E("Caribbean Sea", ["caribbean"], "Sea", 15, -75, 1200, "Americas", "Tropical sea east of Central America.", "First region of sustained European colonization in the Americas."),
  E("South China Sea", [], "Sea", 13, 114, 1200, "Southeast Asia", "Sea between China and Southeast Asia.", "One of the busiest trade waterways in history."),
  E("Arabian Sea", [], "Sea", 14, 65, 1300, "Indian Ocean", "Northwestern arm of the Indian Ocean.", "Monsoon winds carried traders between Arabia, Africa, and India."),
  E("Bay of Bengal", [], "Sea", 13, 88, 1000, "Indian Ocean", "Large bay east of India.", "Connected India with Southeast Asian trade and culture."),
  E("Persian Gulf", ["arabian gulf"], "Sea", 26.5, 51.5, 450, "Middle East", "Gulf between Arabia and Iran.", "Gateway of Mesopotamian trade; today a major oil route."),
  E("Aegean Sea", ["aegean"], "Sea", 38.5, 25, 320, "Between Greece & Turkey", "Island-filled sea between Greece and Anatolia.", "Heart of Minoan, Mycenaean, and classical Greek civilization."),
  E("Baltic Sea", [], "Sea", 58, 20, 600, "Northern Europe", "Sea of northern Europe.", "Center of Viking and Hanseatic trade."),
  E("North Sea", [], "Sea", 56, 3, 500, "Northern Europe", "Sea between Britain and Scandinavia.", "Viking sea lanes and modern energy resources."),
  E("Sea of Japan", ["east sea"], "Sea", 40, 135, 700, "East Asia", "Sea between Japan and the Asian mainland.", "Buffer that shaped Japan's selective cultural borrowing."),
  E("East China Sea", [], "Sea", 29, 125, 600, "East Asia", "Sea between China, Korea, and Japan.", "Conduit for the spread of Chinese culture eastward."),
  E("Yellow Sea", [], "Sea", 36, 123, 450, "East Asia", "Shallow sea between China and Korea.", "Named for silt carried by the Yellow River."),
  E("Adriatic Sea", ["adriatic"], "Sea", 43, 15, 350, "Southern Europe", "Sea between Italy and the Balkans.", "Made Venice a maritime superpower."),
  E("Gulf of Mexico", [], "Sea", 25, -90, 800, "North America", "Gulf south of the United States.", "Hub of Mesoamerican coastal trade and modern shipping."),

  // ===== RIVERS =====
  E("Nile River", ["nile"], "River", 23, 32.9, 700, "Northeast Africa", "The world's longest river, flowing north through Sudan and Egypt to the Mediterranean.", "Its predictable floods made Egyptian civilization possible."),
  E("Tigris River", ["tigris"], "River", 34.5, 43.8, 400, "Middle East (Iraq/Turkey)", "River flowing from Turkey through Iraq, east of the Euphrates.", "One of the two rivers that cradled Mesopotamia."),
  E("Euphrates River", ["euphrates"], "River", 34, 41, 500, "Middle East (Syria/Iraq)", "The longer, western river of Mesopotamia.", "Sumer, Babylon, and other early cities rose on its banks."),
  E("Amazon River", ["amazon"], "River", -2.5, -60, 1200, "South America", "The world's largest river by volume, crossing Brazil.", "Lifeline of the world's biggest rainforest."),
  E("Mississippi River", ["mississippi"], "River", 35, -90.2, 800, "United States", "Great river draining the center of North America.", "Supported Cahokia and later became America's trade artery."),
  E("Yangtze River", ["yangtze", "chang jiang", "yangzi", "yangzi river", "chang jiang river", "yangtse"], "River", 30.5, 111, 900, "China", "Asia's longest river, flowing through central China.", "Rice-growing heartland of southern China."),
  E("Yellow River", ["huang he", "hwang ho", "huanghe", "huang he river", "hwang ho river"], "River", 36.5, 107, 800, "China", "Northern China's great silt-laden river.", "Cradle of Chinese civilization — and 'China's Sorrow' for its floods."),
  E("Indus River", ["indus"], "River", 27.5, 68.3, 600, "Pakistan", "River flowing from the Himalayas through Pakistan to the Arabian Sea.", "Supported the Harappan (Indus Valley) civilization."),
  E("Ganges River", ["ganges", "ganga"], "River", 25.5, 83, 600, "India", "Sacred river of northern India.", "Heart of classical Indian civilization and Hindu religious life."),
  E("Congo River", ["congo river"], "River", -1, 20, 800, "Central Africa", "Africa's deepest river, arcing through the Congo Basin.", "Central artery of equatorial Africa."),
  E("Niger River", ["niger river"], "River", 14, 0, 800, "West Africa", "Great river of West Africa, bending through the Sahel.", "Sustained the empires of Ghana, Mali, and Songhai."),
  E("Danube River", ["danube"], "River", 45.5, 21, 700, "Europe", "Europe's second-longest river, flowing east to the Black Sea.", "Roman frontier and highway of Central Europe."),
  E("Rhine River", ["rhine"], "River", 50, 7.5, 400, "Western Europe", "Major river of western Germany and the Netherlands.", "Rome's northern frontier and an industrial artery."),
  E("Volga River", ["volga"], "River", 50, 45.5, 700, "Russia", "Europe's longest river, flowing to the Caspian Sea.", "Core trade route of medieval and modern Russia."),
  E("Mekong River", ["mekong"], "River", 16, 105.5, 800, "Southeast Asia", "River flowing from Tibet through mainland Southeast Asia.", "Sustained the Khmer Empire and feeds millions today."),
  E("Zambezi River", ["zambezi"], "River", -16, 28, 700, "Southern Africa", "Southern African river famous for Victoria Falls.", "Trade corridor linking the interior to the Indian Ocean."),
  E("Rio Grande", [], "River", 29, -103, 600, "North America", "River forming much of the U.S.–Mexico border.", "A defining boundary of North American geography."),
  E("Colorado River", [], "River", 36.5, -112.5, 500, "Southwestern United States", "River that carved the Grand Canyon.", "Water source for the arid American Southwest."),
  E("Jordan River", ["jordan river"], "River", 32.2, 35.57, 150, "Levant", "River flowing into the Dead Sea.", "Sacred in Judaism and Christianity."),
  E("Tiber River", ["tiber"], "River", 42.2, 12.4, 150, "Italy", "River of central Italy.", "Rome was founded on its banks."),
  E("Amur River", ["amur"], "River", 51.5, 128, 800, "Northeast Asia", "River forming the Russia–China border.", "Frontier between Russian and Chinese spheres."),
  E("Ob River", ["ob"], "River", 61, 72, 900, "Siberia, Russia", "Major western Siberian river.", "One of the great Arctic-flowing rivers of Siberia."),
  E("Yenisei River", ["yenisei", "yenisey"], "River", 60, 90, 900, "Siberia, Russia", "Great central Siberian river.", "Divides western and eastern Siberia."),
  E("Orinoco River", ["orinoco"], "River", 7.5, -66, 500, "Venezuela", "Major river of northern South America.", "Explored early by Europeans searching for El Dorado."),
  E("Brahmaputra River", ["brahmaputra"], "River", 26.5, 92, 500, "South Asia", "River flowing from Tibet through northeast India to Bangladesh.", "Joins the Ganges to form the world's largest delta."),
  E("Murray River", ["murray darling", "murray"], "River", -34.5, 142, 500, "Australia", "Australia's longest river system.", "Water lifeline of southeastern Australia."),

  // ===== DESERTS =====
  E("Sahara Desert", ["sahara"], "Desert", 23, 10, 1800, "North Africa", "The world's largest hot desert, spanning North Africa.", "Crossed by camel caravans carrying gold and salt."),
  E("Gobi Desert", ["gobi"], "Desert", 43, 105, 900, "Mongolia / China", "Cold desert of Mongolia and northern China.", "Barrier and corridor along the Silk Road."),
  E("Kalahari Desert", ["kalahari"], "Desert", -23, 21.5, 600, "Southern Africa", "Semi-arid sandy savanna of southern Africa.", "Homeland of the San people."),
  E("Arabian Desert", [], "Desert", 21, 46, 900, "Arabian Peninsula", "Vast desert covering most of Arabia.", "Shaped Bedouin culture and early Islamic history."),
  E("Rub' al Khali", ["rub al khali", "empty quarter"], "Desert", 20, 50, 500, "Arabian Peninsula", "The 'Empty Quarter' — the largest continuous sand desert.", "One of Earth's most forbidding landscapes."),
  E("Atacama Desert", ["atacama"], "Desert", -24, -69.3, 400, "Chile", "The driest non-polar desert on Earth.", "Rich in minerals that shaped South American economies."),
  E("Thar Desert", ["thar", "great indian desert"], "Desert", 27, 71, 350, "India / Pakistan", "Desert of northwestern India and eastern Pakistan.", "Natural barrier on the subcontinent's western edge."),
  E("Namib Desert", ["namib"], "Desert", -24, 15, 400, "Namibia", "Coastal desert of southwestern Africa.", "One of the world's oldest deserts."),
  E("Mojave Desert", ["mojave"], "Desert", 35, -116, 300, "United States", "Desert of the American Southwest.", "Contains Death Valley, North America's hottest place."),
  E("Sonoran Desert", ["sonoran"], "Desert", 32, -112.5, 350, "U.S. / Mexico", "Desert spanning Arizona and northwestern Mexico.", "Home of the saguaro cactus and Hohokam irrigation."),
  E("Taklamakan Desert", ["taklamakan", "taklimakan"], "Desert", 38.9, 82, 500, "Xinjiang, China", "Fearsome desert of western China.", "Silk Road caravans skirted its deadly sands."),
  E("Syrian Desert", [], "Desert", 33, 39, 450, "Middle East", "Desert steppe between the Levant and Mesopotamia.", "Crossed by caravan cities like Palmyra."),
  E("Great Victoria Desert", [], "Desert", -29, 129, 500, "Australia", "Australia's largest desert.", "Part of the vast arid Outback."),
  E("Patagonian Desert", ["patagonia desert"], "Desert", -44, -69, 500, "Argentina", "Cold desert of southern Argentina.", "The largest desert in the Americas' far south."),

  // ===== MOUNTAINS & RANGES =====
  E("Himalayas", ["himalaya", "himalayan mountains", "himalaya mountains", "himalayan range"], "Mountain Range", 28.6, 84, 900, "South / Central Asia", "The world's highest mountain range, north of India.", "Wall between South Asia and China; source of Asia's great rivers."),
  E("Alps", ["the alps"], "Mountain Range", 46.5, 10, 500, "Europe", "Europe's principal mountain range.", "Shaped European travel, trade, and warfare (Hannibal crossed them)."),
  E("Andes Mountains", ["andes"], "Mountain Range", -20, -67, 2200, "South America", "The world's longest mountain range, along South America's west coast.", "Heartland of the Inca Empire."),
  E("Rocky Mountains", ["rockies"], "Mountain Range", 44, -110, 1500, "North America", "Great range of western North America.", "Continental divide of North America."),
  E("Appalachian Mountains", ["appalachians"], "Mountain Range", 38, -80.5, 900, "Eastern United States", "Old, worn mountains of eastern North America.", "First great barrier to American westward expansion."),
  E("Ural Mountains", ["urals"], "Mountain Range", 60, 59, 1000, "Russia", "Range dividing Europe from Asia.", "The traditional Europe–Asia boundary."),
  E("Atlas Mountains", ["atlas"], "Mountain Range", 31.5, -6, 600, "Northwest Africa", "Range across Morocco and Algeria.", "Separates the Mediterranean coast from the Sahara."),
  E("Caucasus Mountains", ["caucasus"], "Mountain Range", 42.8, 44.5, 500, "Between Black & Caspian Seas", "High range between the Black and Caspian Seas.", "Crossroads and barrier between Europe and the Middle East."),
  E("Zagros Mountains", ["zagros"], "Mountain Range", 32.5, 49, 600, "Iran", "Range along western Iran.", "Eastern wall of Mesopotamia; early farming began in its foothills."),
  E("Hindu Kush", [], "Mountain Range", 35.5, 70, 450, "Afghanistan / Pakistan", "Range northwest of the Indian subcontinent.", "Invaders entered India through its Khyber Pass."),
  E("Tian Shan", ["tien shan"], "Mountain Range", 42, 78, 700, "Central Asia", "The 'Celestial Mountains' of Central Asia.", "Silk Road routes threaded its valleys."),
  E("Kunlun Mountains", ["kunlun"], "Mountain Range", 36, 84, 800, "Western China", "Range along the northern edge of Tibet.", "One of Asia's longest mountain systems."),
  E("Mount Everest", ["everest"], "Mountain", 27.99, 86.93, 120, "Nepal / China border", "Earth's highest mountain (8,849 m) in the Himalayas.", "The ultimate symbol of high places."),
  E("Mount Kilimanjaro", ["kilimanjaro"], "Mountain", -3.07, 37.35, 120, "Tanzania", "Africa's highest peak, a snow-capped volcano.", "Iconic free-standing mountain near the equator."),
  E("Mount Fuji", ["fuji", "fujiyama"], "Mountain", 35.36, 138.73, 100, "Japan", "Japan's sacred, symmetrical volcano.", "Cultural symbol of Japan."),
  E("Mount Vesuvius", ["vesuvius"], "Mountain", 40.82, 14.43, 80, "Italy", "Volcano near Naples.", "Its 79 CE eruption buried Pompeii."),
  E("Mount Olympus", ["olympus"], "Mountain", 40.09, 22.36, 80, "Greece", "Greece's highest mountain.", "Mythical home of the Greek gods."),

  // ===== PENINSULAS =====
  E("Arabian Peninsula", ["arabia"], "Peninsula", 23, 45, 1200, "Southwest Asia", "Huge desert peninsula between the Red Sea and Persian Gulf.", "Birthplace of Islam and hub of caravan trade."),
  E("Iberian Peninsula", ["iberia"], "Peninsula", 40, -4, 600, "Southwestern Europe", "Peninsula containing Spain and Portugal.", "Launchpad of the Age of Exploration; centuries of Muslim–Christian interaction."),
  E("Italian Peninsula", ["italian"], "Peninsula", 42.5, 13.5, 500, "Southern Europe", "Boot-shaped peninsula in the Mediterranean.", "Core of the Roman world and the Renaissance."),
  E("Balkan Peninsula", ["balkans", "balkan"], "Peninsula", 42, 22, 600, "Southeastern Europe", "Mountainous peninsula of southeastern Europe.", "Crossroads of empires — Byzantine, Ottoman, Austro-Hungarian."),
  E("Korean Peninsula", ["korea"], "Peninsula", 37.5, 127.3, 450, "East Asia", "Peninsula between China and Japan.", "Cultural bridge that transmitted Buddhism and writing to Japan."),
  E("Scandinavian Peninsula", ["scandinavia"], "Peninsula", 63, 14, 900, "Northern Europe", "Peninsula of Norway and Sweden.", "Homeland of the Vikings."),
  E("Yucatan Peninsula", ["yucatan"], "Peninsula", 19.8, -89, 350, "Mexico / Central America", "Limestone peninsula in southeastern Mexico.", "Heartland of Maya civilization."),
  E("Sinai Peninsula", ["sinai"], "Peninsula", 29.5, 33.8, 250, "Egypt", "Triangular peninsula between Africa and Asia.", "Land bridge between two continents."),
  E("Horn of Africa", [], "Peninsula", 8, 46, 700, "East Africa", "Easternmost projection of Africa (Somalia, Ethiopia region).", "Ancient trade hub for incense and Indian Ocean commerce."),
  E("Malay Peninsula", ["malaya"], "Peninsula", 5, 101.5, 500, "Southeast Asia", "Narrow peninsula ending at Singapore.", "Controls the Strait of Malacca choke point."),
  E("Baja California", [], "Peninsula", 27, -113, 400, "Mexico", "Long peninsula of northwestern Mexico.", "Separates the Pacific from the Gulf of California."),
  E("Anatolia", ["asia minor", "anatolian peninsula"], "Peninsula", 39, 33, 600, "Turkey", "The peninsula of modern Turkey, also called Asia Minor.", "Bridge between Europe and Asia; home to Hittites, Greeks, Byzantines, and Ottomans."),

  // ===== HISTORICAL REGIONS & CIVILIZATIONS =====
  E("Mesopotamia", [], "Historical Region", 33.5, 43.5, 500, "Between the Tigris and Euphrates Rivers (modern Iraq)", "The 'land between the rivers' — Tigris and Euphrates.", "One of the world's earliest major centers of civilization: writing, cities, and law began here."),
  E("Fertile Crescent", [], "Historical Region", 34, 40, 800, "Middle East", "Arc of fertile land from the Persian Gulf to the Nile.", "Where farming and the first cities emerged."),
  E("Indus River Valley", ["indus valley", "indus valley civilization", "harappan civilization"], "Civilization", 27.8, 68.8, 500, "Pakistan / Northwest India", "Bronze Age civilization along the Indus River (Harappa, Mohenjo-daro).", "One of the three earliest urban civilizations, famous for planned cities."),
  E("Ancient Egypt", ["egypt civilization"], "Civilization", 26, 31.5, 600, "Nile Valley, Northeast Africa", "Civilization of the Nile Valley, ruled by pharaohs.", "Built the pyramids and endured for 3,000 years."),
  E("Sumer", ["sumeria"], "Civilization", 31, 46, 300, "Southern Mesopotamia (Iraq)", "The world's first known civilization, in southern Mesopotamia.", "Invented cuneiform writing and the first cities like Ur and Uruk."),
  E("Babylon", ["babylonia"], "City", 32.54, 44.42, 150, "Mesopotamia (Iraq)", "Great city of ancient Mesopotamia on the Euphrates.", "Home of Hammurabi's law code and the Hanging Gardens."),
  E("Assyria", ["assyrian empire"], "Empire", 36.3, 43.2, 400, "Northern Mesopotamia", "Warlike empire of northern Mesopotamia.", "Built one of the first true empires through military innovation."),
  E("Phoenicia", ["phoenicians"], "Civilization", 34, 35.7, 250, "Eastern Mediterranean coast (Lebanon)", "Seafaring trade civilization of the Levant coast.", "Spread the alphabet across the Mediterranean."),
  E("Canaan", [], "Historical Region", 31.8, 35.2, 250, "Levant", "Ancient region of the eastern Mediterranean coast.", "Crossroads of Egypt and Mesopotamia; biblical homeland."),
  E("Levant", [], "Historical Region", 33.8, 36, 450, "Eastern Mediterranean", "The eastern Mediterranean coastlands.", "Land bridge connecting Africa, Asia, and Europe."),
  E("Nubia", [], "Historical Region", 21, 31, 450, "Southern Egypt / Northern Sudan", "Nile region south of Egypt.", "Gold-rich kingdom that traded with — and once ruled — Egypt."),
  E("Kush", ["kingdom of kush"], "Civilization", 18.5, 31.8, 400, "Sudan (Nile Valley)", "African kingdom south of Egypt with its capital at Meroë.", "Powerful Nile civilization famous for iron and pyramids."),
  E("Axum", ["aksum", "kingdom of axum"], "Civilization", 14.13, 38.72, 350, "Ethiopia / Eritrea", "Trading empire of the Ethiopian highlands.", "Early Christian kingdom controlling Red Sea trade."),
  E("Carthage", [], "City", 36.85, 10.32, 150, "Tunisia, North Africa", "Phoenician city-state in North Africa.", "Rome's great rival in the Punic Wars."),
  E("Persia", ["persian empire", "achaemenid empire"], "Empire", 32, 53, 900, "Iran / Middle East", "Empire centered on the Iranian plateau.", "The Achaemenids built the ancient world's largest empire, with royal roads and tolerant rule."),
  E("Persepolis", [], "City", 29.93, 52.89, 120, "Iran", "Ceremonial capital of the Persian Empire.", "Showcase of Achaemenid imperial grandeur."),
  E("Silk Road", ["silk roads"], "Historical Region", 40, 75, 1600, "Central Asia", "Network of trade routes linking China to the Mediterranean.", "Carried silk, ideas, religions — and plagues — across Eurasia."),
  E("Mesoamerica", [], "Historical Region", 17.5, -92, 800, "Mexico / Central America", "Cultural region of Mexico and Central America.", "Cradle of Olmec, Maya, and Aztec civilizations."),
  E("Maya", ["maya civilization", "mayan civilization", "the maya"], "Civilization", 17, -90, 500, "Yucatan / Guatemala", "Civilization of city-states in the Yucatan and Guatemala.", "Masters of astronomy, mathematics, and glyphic writing."),
  E("Aztec Empire", ["aztec", "aztecs", "mexica"], "Empire", 19.4, -99.1, 400, "Central Mexico", "Empire centered at Tenochtitlan in the Valley of Mexico.", "Dominated Mesoamerica until the Spanish conquest of 1521."),
  E("Inca Empire", ["inca", "incas", "tawantinsuyu"], "Empire", -13.5, -72, 1200, "Andes, South America", "Empire stretching along the Andes from Ecuador to Chile.", "The Americas' largest empire, bound by roads and terraces."),
  E("Mali Empire", ["mali empire"], "Empire", 14, -6, 800, "West Africa", "Wealthy West African empire on the Niger River.", "Mansa Musa's gold made it legendary; Timbuktu was its scholarly jewel."),
  E("Songhai Empire", ["songhai", "songhay"], "Empire", 16, 0, 800, "West Africa", "Successor empire to Mali in the West African Sahel.", "The largest empire in West African history."),
  E("Ghana Empire", ["ghana empire"], "Empire", 15.5, -8, 500, "West Africa (Mauritania/Mali)", "First great West African trading empire.", "Grew rich taxing the gold-salt trade."),
  E("Great Zimbabwe", [], "Civilization", -20.27, 30.93, 250, "Zimbabwe", "Stone-walled city of southern Africa.", "Center of a gold-trading kingdom linked to the Swahili Coast."),
  E("Swahili Coast", [], "Historical Region", -6.8, 39.3, 800, "East African coast", "East African coast of trading city-states (Kilwa, Mombasa).", "Where African, Arab, and Indian Ocean cultures blended."),
  E("Byzantine Empire", ["byzantium empire", "eastern roman empire"], "Empire", 41, 29, 900, "Eastern Mediterranean", "The Eastern Roman Empire, centered at Constantinople.", "Preserved Roman law and Greek learning for a thousand years."),
  E("Roman Empire", [], "Empire", 41.9, 12.5, 1800, "Mediterranean world", "Empire ruling the entire Mediterranean from Rome.", "Its law, language, and engineering shaped Western civilization."),
  E("Ottoman Empire", ["ottomans"], "Empire", 39, 32, 1200, "Anatolia / Eastern Mediterranean", "Turkish empire ruling from Constantinople after 1453.", "Dominated the Middle East and southeastern Europe for centuries."),
  E("Mongol Empire", ["mongols"], "Empire", 46, 100, 2500, "Central Asia / Eurasia", "The largest contiguous land empire in history.", "United Eurasia under the Pax Mongolica, reviving Silk Road trade."),
  E("Abbasid Caliphate", ["abbasids"], "Empire", 33.3, 44.4, 1000, "Middle East (capital: Baghdad)", "Islamic caliphate centered at Baghdad.", "Presided over the Islamic Golden Age of science and learning."),
  E("Umayyad Caliphate", ["umayyads"], "Empire", 33.5, 36.3, 1200, "Middle East (capital: Damascus)", "First hereditary Islamic caliphate, ruled from Damascus.", "Expanded Islam from Spain to Central Asia."),
  E("Gupta Empire", ["gupta"], "Empire", 25, 81, 800, "Northern India", "Classical empire of northern India (c. 320–550 CE).", "India's 'Golden Age' — zero, decimal numerals, great literature."),
  E("Mauryan Empire", ["maurya", "mauryan"], "Empire", 25, 80, 1000, "Indian subcontinent", "First empire to unite most of India (c. 321–185 BCE).", "Ashoka spread Buddhism across Asia."),
  E("Han Dynasty", ["han china", "han empire"], "Empire", 34.3, 108.9, 1000, "China", "Chinese dynasty (206 BCE–220 CE) contemporary with Rome.", "Defined Chinese identity; opened the Silk Road."),
  E("Qin Dynasty", ["qin"], "Empire", 34.3, 108.9, 800, "China", "Short-lived dynasty that first unified China (221 BCE).", "Standardized writing and began the Great Wall."),
  E("Mohenjo-daro", ["mohenjo daro"], "City", 27.33, 68.14, 100, "Sindh, Pakistan", "Major city of the Indus Valley civilization.", "Remarkably planned Bronze Age city with advanced drainage."),
  E("Harappa", [], "City", 30.63, 72.87, 100, "Punjab, Pakistan", "Type-site city of the Indus Valley civilization.", "Gave the Harappan civilization its name."),
  E("Tenochtitlan", ["tenochtitlán"], "City", 19.43, -99.13, 100, "Valley of Mexico", "Island capital of the Aztec Empire (modern Mexico City).", "One of the largest cities on Earth when Cortés arrived."),
  E("Teotihuacan", ["teotihuacán"], "City", 19.69, -98.84, 100, "Central Mexico", "Enormous ancient city with the Pyramid of the Sun.", "Mesoamerica's first great metropolis."),
  E("Chichen Itza", ["chichén itzá"], "City", 20.68, -88.57, 100, "Yucatan, Mexico", "Great Maya city of the northern Yucatan.", "Famous for the El Castillo pyramid."),
  E("Machu Picchu", [], "City", -13.16, -72.55, 100, "Peru", "Inca mountain citadel in the Andes.", "Best-preserved masterpiece of Inca engineering."),
  E("Cuzco", ["cusco"], "City", -13.53, -71.97, 100, "Peru", "Capital of the Inca Empire.", "The 'navel of the world' in Inca cosmology."),
  E("Cahokia", [], "City", 38.66, -90.06, 120, "Illinois, United States", "Mississippian mound city near modern St. Louis.", "Largest pre-Columbian city north of Mexico."),
  E("Sparta", [], "City", 37.08, 22.43, 100, "Peloponnese, Greece", "Militaristic Greek city-state.", "Athens' great rival in the Peloponnesian War."),
  E("Athens", ["athenai", "athina"], "City", 37.98, 23.73, 100, "Attica, Greece", "Leading city-state of classical Greece, and Greece's modern capital.", "Birthplace of democracy, philosophy, and drama."),
  E("Troy", [], "City", 39.96, 26.24, 100, "Northwest Anatolia, Turkey", "Legendary city of the Trojan War.", "Guarded the entrance to the Dardanelles."),
  E("Constantinople", ["byzantium"], "City", 41.01, 28.98, 120, "Bosporus Strait (modern Istanbul)", "Capital of the Byzantine and Ottoman Empires.", "Fortress city controlling trade between Europe and Asia; fell to the Ottomans in 1453."),
  E("Alexandria", [], "City", 31.2, 29.92, 100, "Egypt (Mediterranean coast)", "City founded by Alexander the Great in Egypt.", "Home of the ancient world's greatest library."),
  E("Jerusalem", [], "City", 31.77, 35.23, 100, "Israel / Levant", "Ancient city sacred to Judaism, Christianity, and Islam.", "Spiritual center of three world religions."),
  E("Mecca", ["makkah"], "City", 21.39, 39.86, 120, "Saudi Arabia (Hejaz)", "Birthplace of Muhammad and site of the Kaaba.", "Islam's holiest city and destination of the hajj."),
  E("Medina", ["madinah"], "City", 24.52, 39.57, 120, "Saudi Arabia (Hejaz)", "City of Muhammad's hijra in 622 CE.", "Islam's second-holiest city and first Muslim community."),
  E("Baghdad", [], "City", 33.31, 44.37, 120, "Iraq", "Abbasid capital on the Tigris.", "Medieval center of world learning at the House of Wisdom."),
  E("Damascus", [], "City", 33.51, 36.29, 100, "Syria", "One of the world's oldest continuously inhabited cities.", "Umayyad capital and caravan hub."),
  E("Timbuktu", ["tombouctou"], "City", 16.77, -3.01, 150, "Mali (Niger bend)", "Saharan trading and scholarly city of the Mali Empire.", "Legendary center of gold trade and Islamic learning."),
  E("Samarkand", [], "City", 39.65, 66.96, 150, "Uzbekistan (Central Asia)", "Great Silk Road oasis city.", "Jewel of Central Asian trade and Timur's capital."),
  E("Xi'an", ["xian", "chang'an", "changan"], "City", 34.34, 108.94, 120, "Shaanxi, China", "Ancient Chinese capital (Chang'an), eastern end of the Silk Road.", "Capital of Qin, Han, and Tang dynasties; Terracotta Army site."),
  E("Kyoto", [], "City", 35.01, 135.77, 100, "Japan", "Imperial capital of Japan for a thousand years.", "Heart of classical Japanese culture."),
  E("Venice", [], "City", 45.44, 12.34, 100, "Northern Italy", "Lagoon city-state of the Adriatic.", "Dominated medieval Mediterranean trade with Asia."),
  E("Calicut", ["kozhikode"], "City", 11.26, 75.78, 100, "Kerala, India", "Indian Ocean spice port on the Malabar Coast.", "Where Vasco da Gama landed in 1498."),
  E("Malacca", ["melaka"], "City", 2.19, 102.25, 120, "Malaysia", "Port city controlling the strait between the Indian Ocean and South China Sea.", "The richest entrepôt of the 15th-century spice trade."),
  E("Guangzhou", ["canton"], "City", 23.13, 113.26, 100, "Southern China", "Southern Chinese port city (Canton).", "China's historic window for foreign maritime trade."),
  E("Hangzhou", [], "City", 30.27, 120.16, 100, "Eastern China", "Song dynasty capital at the end of the Grand Canal.", "Marco Polo called it the world's most splendid city."),

  // ===== COUNTRIES =====
  E("Egypt", [], "Country", 26.8, 30.8, 500, "North Africa", "Country of the Nile Valley in northeastern Africa.", "Gift of the Nile — one of history's first great civilizations."),
  E("China", ["peoples republic of china", "prc"], "Country", 35, 103, 1800, "East Asia", "The world's most enduring civilization-state, in East Asia.", "Source of paper, printing, gunpowder, and the compass."),
  E("India", [], "Country", 22.5, 79, 1300, "South Asia", "Subcontinental country in South Asia.", "Birthplace of Hinduism and Buddhism; center of Indian Ocean trade."),
  E("Greece", ["hellas"], "Country", 39, 22, 350, "Southeastern Europe", "Mountainous, sea-facing country of city-states.", "Foundation of Western philosophy, democracy, and science."),
  E("Italy", [], "Country", 42.8, 12.8, 500, "Southern Europe", "Boot-shaped Mediterranean country.", "Heart of the Roman Empire and the Renaissance."),
  E("Rome", [], "City", 41.9, 12.5, 120, "Central Italy", "Capital of Italy and of the ancient Roman Empire.", "The 'Eternal City' — center of an empire that shaped the West."),
  E("Japan", ["nippon"], "Country", 36.5, 138.5, 700, "East Asia", "Island nation off the coast of East Asia.", "Adapted continental culture into a distinct civilization; first non-Western industrial power."),
  E("France", [], "Country", 46.6, 2.5, 500, "Western Europe", "Largest country of Western Europe.", "Center of medieval culture, absolutism, and revolution."),
  E("Spain", [], "Country", 40.2, -3.6, 500, "Iberian Peninsula, Europe", "Country of the Iberian Peninsula.", "Built the first global empire after 1492."),
  E("Portugal", [], "Country", 39.6, -8, 250, "Iberian Peninsula, Europe", "Atlantic-facing country west of Spain.", "Pioneered the sea route around Africa to Asia."),
  E("United Kingdom", ["uk", "britain", "great britain"], "Country", 54, -2.5, 500, "Northwestern Europe", "Island country of England, Scotland, Wales, and Northern Ireland.", "Launched the Industrial Revolution and history's largest empire."),
  E("England", [], "Country", 52.5, -1.5, 300, "Great Britain", "The largest nation of the United Kingdom.", "Its language and institutions spread worldwide."),
  E("Germany", [], "Country", 51.1, 10.4, 400, "Central Europe", "Central European country.", "Industrial powerhouse at the center of 20th-century world wars."),
  E("Russia", ["russian federation"], "Country", 60, 90, 3000, "Eastern Europe / North Asia", "The world's largest country, spanning Eurasia.", "Bridge — and buffer — between Europe and Asia."),
  E("Turkey", ["turkiye", "türkiye"], "Country", 39, 35.2, 600, "Anatolia / Southeastern Europe", "Country spanning Anatolia and a corner of Europe.", "Successor to Byzantine and Ottoman empires astride two continents."),
  E("Iran", [], "Country", 32.5, 54, 800, "Middle East", "Country of the Iranian plateau (historic Persia).", "Heir to the Persian empires."),
  E("Iraq", [], "Country", 33.2, 43.7, 450, "Middle East", "Country containing ancient Mesopotamia.", "The land between the Tigris and Euphrates."),
  E("Saudi Arabia", [], "Country", 24, 45, 900, "Arabian Peninsula", "Kingdom covering most of the Arabian Peninsula.", "Guardian of Mecca and Medina; oil superpower."),
  E("Israel", [], "Country", 31.4, 35, 200, "Eastern Mediterranean", "Country on the eastern Mediterranean coast.", "Modern state in the ancient Levant crossroads."),
  E("Jordan", [], "Country", 31.3, 36.5, 250, "Middle East", "Kingdom east of the Jordan River.", "Contains the rock-cut city of Petra."),
  E("Syria", [], "Country", 35, 38.5, 350, "Middle East", "Country at the heart of the Levant.", "Home to Damascus and Aleppo, ancient caravan cities."),
  E("Lebanon", [], "Country", 33.9, 35.9, 130, "Eastern Mediterranean", "Small mountainous coastal country.", "Homeland of the ancient Phoenicians."),
  E("Afghanistan", [], "Country", 33.9, 66, 500, "Central / South Asia", "Landlocked, mountainous crossroads country.", "The 'graveyard of empires' on the route to India."),
  E("Pakistan", [], "Country", 29.5, 69, 700, "South Asia", "Country of the Indus River basin.", "Contains the heartland of the Indus Valley civilization."),
  E("Bangladesh", [], "Country", 23.7, 90.3, 300, "South Asia", "Densely populated delta country.", "Sits on the world's largest river delta."),
  E("Nepal", [], "Country", 28.2, 84, 350, "South Asia (Himalayas)", "Himalayan country between India and China.", "Contains most of the world's highest peaks."),
  E("Mongolia", [], "Country", 46.9, 103.5, 900, "East / Central Asia", "Vast steppe country between Russia and China.", "Homeland of Genghis Khan and the Mongol Empire."),
  E("North Korea", ["dprk"], "Country", 40.3, 127, 300, "Korean Peninsula", "Country of the northern Korean Peninsula.", "One of the world's most isolated states."),
  E("South Korea", ["republic of korea"], "Country", 36.5, 127.8, 250, "Korean Peninsula", "Country of the southern Korean Peninsula.", "Rapid industrializer and cultural exporter."),
  E("Vietnam", [], "Country", 16.5, 106.3, 600, "Southeast Asia", "Long coastal country of mainland Southeast Asia.", "Blended Chinese and Southeast Asian influences; resisted many empires."),
  E("Thailand", ["siam"], "Country", 15.3, 101, 500, "Southeast Asia", "Country at the heart of mainland Southeast Asia.", "The only Southeast Asian state never colonized."),
  E("Cambodia", [], "Country", 12.5, 105, 300, "Southeast Asia", "Country of the lower Mekong.", "Heir to the Khmer Empire and Angkor Wat."),
  E("Laos", [], "Country", 18.5, 103.8, 400, "Southeast Asia", "Landlocked country along the Mekong.", "Mountainous crossroads of mainland Southeast Asia."),
  E("Myanmar", ["burma"], "Country", 21, 96.5, 550, "Southeast Asia", "Country between India and Thailand (formerly Burma).", "Bridge between South and Southeast Asia."),
  E("Indonesia", [], "Country", -2.5, 118, 1700, "Southeast Asia", "The world's largest archipelago nation.", "The original Spice Islands that drew European explorers."),
  E("Philippines", [], "Country", 12.9, 122.9, 800, "Southeast Asia", "Archipelago of over 7,000 islands.", "Linchpin of the Spanish Manila galleon trade."),
  E("Malaysia", [], "Country", 3.8, 109.5, 700, "Southeast Asia", "Country on the Malay Peninsula and Borneo.", "Controls the Strait of Malacca trade route."),
  E("New Zealand", ["aotearoa"], "Country", -41.8, 172.8, 600, "Oceania", "Island country southeast of Australia.", "Last major landmass settled by humans (the Māori)."),
  E("Ethiopia", [], "Country", 9.1, 40.5, 600, "Horn of Africa", "Highland country of the Horn of Africa.", "Ancient Christian kingdom never fully colonized."),
  E("Kenya", [], "Country", 0.4, 37.9, 450, "East Africa", "Equatorial country of East Africa.", "Cradle of early human ancestors in the Rift Valley."),
  E("Nigeria", [], "Country", 9.1, 8.1, 500, "West Africa", "Africa's most populous country.", "Home to Nok, Benin, and Hausa civilizations."),
  E("Ghana", [], "Country", 7.9, -1.2, 300, "West Africa", "Coastal West African country.", "Named for the ancient Ghana Empire; center of the gold trade."),
  E("Mali", [], "Country", 17.5, -3.5, 700, "West Africa", "Saharan-Sahelian country on the Niger River.", "Heartland of the medieval Mali Empire and Timbuktu."),
  E("Morocco", [], "Country", 31.8, -7.1, 400, "Northwest Africa", "Kingdom of northwestern Africa.", "Gateway between Africa and Europe across Gibraltar."),
  E("Algeria", [], "Country", 28, 2.6, 900, "North Africa", "Africa's largest country, mostly Saharan.", "Key of the Maghreb and trans-Saharan routes."),
  E("Libya", [], "Country", 27, 17.5, 800, "North Africa", "Desert country of the central North African coast.", "Roman granary and caravan gateway."),
  E("Sudan", [], "Country", 15.6, 30.2, 800, "Northeast Africa", "Nile country south of Egypt.", "Ancient Nubia and Kush lay within its borders."),
  E("South Africa", [], "Country", -29, 24.7, 700, "Southern Africa", "Country at Africa's southern tip.", "Mineral wealth and the struggle against apartheid shaped its history."),
  E("Democratic Republic of the Congo", ["drc", "congo", "dr congo", "zaire"], "Country", -2.9, 23.6, 900, "Central Africa", "Vast equatorial country of the Congo Basin.", "Its resources have shaped — and scarred — its history."),
  E("Tanzania", [], "Country", -6.4, 34.9, 500, "East Africa", "East African country with Kilimanjaro and Zanzibar.", "Swahili Coast trade met the African interior here."),
  E("Mexico", [], "Country", 23.9, -102.5, 900, "North America", "Country south of the United States.", "Heir to Aztec and Maya civilizations and New Spain."),
  E("United States", ["usa", "us", "u s", "u s a", "america", "united states america"], "Country", 39.8, -98.6, 2000, "North America", "Continental country spanning North America.", "The world's leading power since the 20th century."),
  E("Canada", [], "Country", 58, -103, 2200, "North America", "The world's second-largest country by area.", "Vast northern land shaped by fur trade and two colonial empires."),
  E("Brazil", [], "Country", -10.8, -52.9, 1800, "South America", "South America's largest country.", "Portuguese America — plantation colony turned regional giant."),
  E("Argentina", [], "Country", -35, -65, 1300, "South America", "Country of the Pampas and Patagonia.", "Breadbasket of the Southern Cone."),
  E("Peru", [], "Country", -9.2, -75, 700, "South America", "Andean country on the Pacific coast.", "Core of the Inca Empire and Spanish silver wealth."),
  E("Chile", [], "Country", -33, -71, 1000, "South America", "Long, narrow country along the Andes and Pacific.", "Stretches from the driest desert to Patagonia."),
  E("Colombia", [], "Country", 4.1, -73.1, 600, "South America", "Country at South America's northwest gateway.", "Only South American country on two oceans."),
  E("Venezuela", [], "Country", 7.1, -66.2, 550, "South America", "Caribbean-facing country of northern South America.", "Bolívar's homeland; vast oil reserves."),
  E("Bolivia", [], "Country", -16.7, -64.7, 550, "South America", "Landlocked Andean country.", "Potosí's silver mountain funded the Spanish Empire."),
  E("Ecuador", [], "Country", -1.4, -78.4, 300, "South America", "Country on the equator with the Galápagos Islands.", "Where Darwin found evidence for evolution."),
  E("Cuba", [], "Country", 21.5, -79.6, 400, "Caribbean", "The largest Caribbean island nation.", "Sugar colony turned Cold War flashpoint."),
  E("Haiti", [], "Country", 19, -72.7, 150, "Caribbean (Hispaniola)", "Country on western Hispaniola.", "Site of the only successful slave revolution (1804)."),
  E("Poland", [], "Country", 52.1, 19.4, 350, "Central Europe", "Country on the North European Plain.", "Repeatedly partitioned crossroads of Europe."),
  E("Ukraine", [], "Country", 49, 31.4, 550, "Eastern Europe", "Large country north of the Black Sea.", "Breadbasket of Europe and cradle of Kyivan Rus."),
  E("Netherlands", ["holland"], "Country", 52.2, 5.3, 150, "Western Europe", "Low-lying country on the North Sea.", "17th-century maritime and financial superpower."),
  E("Belgium", [], "Country", 50.6, 4.7, 130, "Western Europe", "Small country between France and Germany.", "The 'crossroads of Europe' and frequent battleground."),
  E("Switzerland", [], "Country", 46.8, 8.2, 160, "Central Europe (Alps)", "Alpine confederation.", "Neutral banking hub in Europe's mountains."),
  E("Austria", [], "Country", 47.6, 14.1, 250, "Central Europe", "Alpine country on the Danube.", "Core of the Habsburg Empire."),
  E("Hungary", [], "Country", 47.2, 19.4, 250, "Central Europe", "Country of the Danube plain.", "Magyar kingdom at Europe's eastern gate."),
  E("Sweden", [], "Country", 62, 15, 700, "Scandinavia", "Largest Nordic country.", "Viking homeland and one-time Baltic empire."),
  E("Norway", [], "Country", 64.6, 12.7, 800, "Scandinavia", "Fjord-lined country of the Scandinavian Peninsula.", "Viking seafarers set out from its coasts."),
  E("Finland", [], "Country", 64.5, 26, 600, "Northern Europe", "Nordic country of lakes and forests.", "Borderland between Scandinavia and Russia."),
  E("Denmark", [], "Country", 56, 9.5, 200, "Northern Europe", "Peninsular and island country at the Baltic's mouth.", "Viking kingdom controlling northern sea lanes."),
  E("Ireland", [], "Country", 53.2, -8, 250, "Northwestern Europe", "Island country west of Britain.", "Monastic scholars preserved learning in the early Middle Ages."),
  E("Iceland", [], "Country", 64.9, -18.6, 300, "North Atlantic", "Volcanic island nation in the North Atlantic.", "Viking settlement with the world's oldest parliament."),

  // ===== AMBIGUOUS: GEORGIA =====
  E("Georgia (Country)", ["sakartvelo"], "Country", 42.2, 43.4, 250, "Caucasus, between Europe & Asia", "Country in the Caucasus on the Black Sea.", "Ancient Silk Road kingdom between empires."),
  E("Georgia (U.S. State)", ["georgia state"], "Region", 32.7, -83.4, 300, "Southeastern United States", "State in the southeastern United States.", "One of the original thirteen colonies."),

  // ===== LAKES =====
  E("Lake Victoria", [], "Lake", -1.1, 33, 280, "East Africa", "Africa's largest lake, source of the White Nile.", "Heart of the African Great Lakes region."),
  E("Lake Tanganyika", [], "Lake", -6.3, 29.5, 300, "East Africa", "The world's longest freshwater lake.", "Part of the Great Rift Valley."),
  E("Lake Baikal", ["baikal"], "Lake", 53.5, 108, 400, "Siberia, Russia", "The world's deepest and oldest lake.", "Holds a fifth of Earth's fresh surface water."),
  E("Aral Sea", [], "Lake", 45, 60, 300, "Central Asia", "Once-vast inland sea between Kazakhstan and Uzbekistan.", "Its shrinking is a landmark environmental disaster."),
  E("Lake Titicaca", ["titicaca"], "Lake", -15.8, -69.3, 180, "Peru / Bolivia (Andes)", "The highest navigable lake in the world.", "Sacred origin place in Inca mythology."),
  E("Lake Chad", [], "Lake", 13.1, 14.1, 250, "Central Africa (Sahel)", "Shallow lake of the central Sahel.", "Supported the Kanem-Bornu trading empire."),
  E("Great Lakes", [], "Lake", 45.5, -84, 700, "North America", "Five vast freshwater lakes between the U.S. and Canada.", "The world's largest freshwater system, key to North American trade."),
  E("Lake Superior", [], "Lake", 47.7, -87.5, 300, "North America", "The largest of the Great Lakes.", "Largest freshwater lake on Earth by area."),
  E("Dead Sea", [], "Lake", 31.5, 35.5, 120, "Israel / Jordan", "Hypersaline lake at Earth's lowest land elevation.", "So salty nothing lives in it; famous since antiquity."),

  // ===== ISLANDS =====
  E("Madagascar", [], "Island", -19, 46.7, 600, "Indian Ocean, off East Africa", "The world's fourth-largest island.", "Settled by Austronesian voyagers from Southeast Asia."),
  E("Sri Lanka", ["ceylon"], "Island", 7.6, 80.7, 250, "Indian Ocean, off India", "Island nation south of India.", "Cinnamon island at the center of Indian Ocean routes."),
  E("Sicily", [], "Island", 37.6, 14.2, 200, "Mediterranean, Italy", "The Mediterranean's largest island.", "Contested by Greeks, Carthaginians, Romans, Arabs, and Normans."),
  E("Crete", [], "Island", 35.2, 24.9, 180, "Mediterranean, Greece", "Large Greek island south of the Aegean.", "Home of Minoan civilization, Europe's first."),
  E("Cyprus", [], "Country", 35, 33.2, 160, "Eastern Mediterranean", "Island south of Turkey.", "Copper island contested by every regional empire."),
  E("Taiwan", ["formosa"], "Island", 23.7, 121, 250, "East Asia", "Island off southeastern China.", "Focal point of East Asian geopolitics."),
  E("Greenland", [], "Island", 72, -40, 1300, "North Atlantic / Arctic", "The world's largest island, mostly ice-capped.", "Norse settlers reached it centuries before Columbus."),
  E("Java", [], "Island", -7.5, 110, 500, "Indonesia", "Indonesia's political and population core.", "One of the most densely populated places on Earth."),
  E("Sumatra", [], "Island", -0.5, 101.5, 700, "Indonesia", "Large island on the Strait of Malacca.", "Home of the Srivijaya maritime empire."),
  E("Borneo", ["kalimantan"], "Island", 0.5, 114, 700, "Southeast Asia", "The world's third-largest island.", "Shared today by three nations; ancient rainforest."),
  E("New Guinea", [], "Island", -5.5, 141, 900, "Oceania / Southeast Asia", "The world's second-largest island.", "One of the earliest sites of independent agriculture."),
  E("Hispaniola", [], "Island", 19, -71, 300, "Caribbean", "Island shared by Haiti and the Dominican Republic.", "Site of the first permanent European colony in the Americas."),
  E("Hawaii", ["hawaiian islands"], "Island Group", 20.6, -157, 400, "Central Pacific", "Volcanic island chain in the mid-Pacific.", "Pinnacle of Polynesian navigation; 50th U.S. state."),
  E("Galapagos Islands", ["galapagos"], "Island Group", -0.6, -90.4, 250, "Pacific, Ecuador", "Volcanic islands west of Ecuador.", "Darwin's living laboratory of evolution."),
  E("West Indies", ["caribbean islands", "antilles"], "Island Group", 18, -70, 1200, "Caribbean", "The island arc of the Caribbean.", "First landfall of Columbus in 1492."),
  E("Polynesia", [], "Island Group", -15, -150, 2500, "Central Pacific", "Vast triangle of Pacific islands from Hawaii to New Zealand.", "Settled by the greatest open-ocean navigators in history."),
  E("Micronesia", [], "Island Group", 7, 150, 1500, "Western Pacific", "Small islands of the western Pacific.", "Stepping stones of Pacific migration."),
  E("Melanesia", [], "Island Group", -9, 160, 1500, "Southwestern Pacific", "Islands northeast of Australia including Fiji and New Guinea.", "First-settled island region of the remote Pacific."),
  E("Philippines Islands", ["philippine islands"], "Island Group", 12.9, 122.9, 800, "Southeast Asia", "Archipelago between the South China Sea and Pacific.", "Hub of the galleon trade linking Asia and the Americas."),
  E("Japan Archipelago", ["japanese islands", "japanese archipelago"], "Island Group", 36.5, 138.5, 700, "East Asia", "Island chain of Honshu, Hokkaido, Kyushu, Shikoku.", "Island geography shaped Japan's distinct path."),

  // ===== STRAITS, CANALS, CAPES =====
  E("Strait of Gibraltar", ["gibraltar"], "Strait", 35.95, -5.6, 120, "Between Spain & Morocco", "Narrow passage between the Atlantic and Mediterranean.", "The 'Pillars of Hercules' — gateway of the Mediterranean."),
  E("Strait of Malacca", [], "Strait", 2.5, 101.3, 400, "Between Malaysia & Sumatra", "Channel linking the Indian Ocean and South China Sea.", "The most important trade choke point in Asian history."),
  E("Bosporus", ["bosphorus", "bosporus strait"], "Strait", 41.1, 29.05, 90, "Istanbul, Turkey", "Strait dividing Europe and Asia at Istanbul.", "Whoever holds it controls Black Sea trade."),
  E("Dardanelles", ["hellespont"], "Strait", 40.2, 26.4, 110, "Northwestern Turkey", "Strait linking the Aegean to the Sea of Marmara.", "Ancient Hellespont, crossed by Xerxes and Alexander."),
  E("Strait of Hormuz", ["hormuz"], "Strait", 26.6, 56.5, 160, "Persian Gulf entrance", "Choke point at the mouth of the Persian Gulf.", "A fifth of the world's oil passes through it."),
  E("Bering Strait", [], "Strait", 65.8, -169, 350, "Between Russia & Alaska", "Narrow sea gap between Asia and North America.", "Land bridge here brought the first humans to the Americas."),
  E("English Channel", [], "Strait", 50.2, -1.5, 300, "Between Britain & France", "Sea channel separating Britain from Europe.", "Moat that protected England from invasion."),
  E("Suez Canal", ["suez"], "Canal", 30.5, 32.35, 160, "Egypt", "Canal linking the Mediterranean and Red Seas (1869).", "Cut the Europe–Asia sea route by weeks."),
  E("Panama Canal", ["panama canal zone"], "Canal", 9.1, -79.7, 120, "Panama", "Canal across the isthmus of Panama (1914).", "Joined the Atlantic and Pacific Oceans."),
  E("Cape of Good Hope", [], "Other", -34.36, 18.47, 150, "South Africa", "Rocky cape near Africa's southern tip.", "Rounding it opened the sea route to Asia."),
  E("Cape Horn", [], "Other", -55.98, -67.27, 180, "Southern Chile", "Southernmost headland of South America.", "The sailor's most feared passage before the Panama Canal."),
  E("Khyber Pass", [], "Other", 34.08, 71.1, 100, "Afghanistan–Pakistan border", "Mountain pass through the Hindu Kush.", "Historic invasion route into the Indian subcontinent."),

  // ===== REGIONS =====
  E("Middle East", ["near east"], "Region", 29, 45, 1500, "Southwest Asia / North Africa", "Region where Africa, Asia, and Europe meet.", "Cradle of the earliest civilizations and three world religions."),
  E("Southeast Asia", [], "Region", 7, 110, 2000, "Asia", "Region of peninsulas and archipelagos south of China.", "Crossroads of Indian and Chinese cultural influence."),
  E("Central Asia", [], "Region", 43, 65, 1500, "Asia", "Steppe-and-desert interior of Eurasia.", "Homeland of nomadic empires and the Silk Road."),
  E("South Asia", ["indian subcontinent"], "Region", 22, 78, 1500, "Asia", "The Indian subcontinent and surrounding lands.", "One of the most populous and historic world regions."),
  E("East Asia", [], "Region", 35, 110, 2000, "Asia", "China, Korea, and Japan region.", "Sphere of Chinese cultural influence."),
  E("Sub-Saharan Africa", ["subsaharan africa"], "Region", 0, 20, 3000, "Africa", "Africa south of the Sahara Desert.", "Vast, diverse region of kingdoms, trade, and migration."),
  E("North Africa", [], "Region", 28, 10, 1800, "Africa", "Mediterranean coast of Africa plus the Sahara.", "Historically tied to the Mediterranean and Islamic worlds."),
  E("West Africa", [], "Region", 12, -4, 1200, "Africa", "Region from the Sahel to the Atlantic coast.", "Home of the gold-trading empires of Ghana, Mali, and Songhai."),
  E("East Africa", [], "Region", 0, 37, 1200, "Africa", "Region including the Horn, Rift Valley, and Swahili Coast.", "Where humanity began and Indian Ocean trade flourished."),
  E("Western Europe", [], "Region", 48, 4, 900, "Europe", "Atlantic-facing region of Europe.", "Launchpad of exploration and industrialization."),
  E("Eastern Europe", [], "Region", 52, 25, 1200, "Europe", "European lands east of Germany.", "Borderland between Western Europe and Russia."),
  E("Latin America", [], "Region", -10, -65, 3500, "Americas", "The Americas south of the United States.", "Region shaped by Iberian colonization and indigenous heritage."),
  E("Central America", [], "Region", 13, -86, 700, "Americas", "Isthmus linking North and South America.", "Land bridge that shaped hemispheric migration and trade."),
  E("Amazon Rainforest", ["amazon basin", "amazonia"], "Region", -3.5, -62, 1200, "South America", "The world's largest tropical rainforest.", "Earth's most biodiverse region — the planet's lungs."),
  E("Great Plains", [], "Region", 41, -100, 800, "North America", "Grassland interior of North America.", "Home of Plains nations and America's breadbasket."),
  E("Siberia", [], "Region", 62, 105, 2500, "Russia", "Vast cold expanse of northern Asia.", "Russia's resource frontier, larger than any country."),
  E("Tibetan Plateau", ["tibet", "roof of the world"], "Region", 32, 88, 800, "Central Asia / China", "The world's highest plateau.", "Source of Asia's great rivers; heart of Tibetan Buddhism."),
  E("Deccan Plateau", ["deccan"], "Region", 17, 77, 500, "Southern India", "Plateau of peninsular India.", "Core of southern Indian kingdoms."),
  E("Sahel", [], "Region", 14.5, 8, 1500, "Africa", "Semi-arid belt south of the Sahara.", "Shore of the desert — meeting ground of African trade."),
  E("Manchuria", [], "Region", 46, 125, 700, "Northeast China", "Northeastern region of China.", "Homeland of the Qing dynasty's founders."),
  E("Punjab", [], "Region", 31, 74, 300, "India / Pakistan", "The 'land of five rivers' in the northwest subcontinent.", "Fertile invasion corridor and breadbasket."),
  E("Bengal", [], "Region", 24, 88, 400, "India / Bangladesh", "Delta region of the Ganges and Brahmaputra.", "One of the richest and most populous regions in history."),
  E("Indochina", [], "Region", 16, 103, 900, "Southeast Asia", "Mainland Southeast Asia between India and China.", "Named for the two great cultures that shaped it."),
  E("Beringia", ["bering land bridge"], "Historical Region", 65.5, -169, 500, "Bering Strait region", "Ice Age land bridge between Siberia and Alaska.", "Route of the first peoples into the Americas."),
  E("Great Rift Valley", ["rift valley"], "Region", 0, 36, 1200, "East Africa", "Giant trench running down eastern Africa.", "Where the oldest human ancestor fossils were found."),
  E("Patagonia", [], "Region", -44, -70, 900, "Argentina / Chile", "Windswept southern tip of South America.", "One of Earth's last great wildernesses."),
  E("Balkans", ["balkan region"], "Region", 42.5, 21.5, 600, "Southeastern Europe", "Mountainous region of southeastern Europe.", "The 'powder keg of Europe' where WWI ignited."),
  E("Crimea", ["crimean peninsula"], "Peninsula", 45.3, 34.1, 200, "Black Sea", "Peninsula jutting into the Black Sea.", "Contested prize of Black Sea powers for centuries."),

  // ===== MODERN CITIES =====
  E("Cairo", [], "City", 30.04, 31.24, 100, "Egypt", "Capital of Egypt on the Nile.", "The Islamic world's greatest medieval metropolis."),
  E("Beijing", ["peking"], "City", 39.9, 116.4, 100, "China", "Capital of China.", "Imperial capital of the Yuan, Ming, and Qing dynasties."),
  E("Tokyo", ["edo"], "City", 35.68, 139.69, 100, "Japan", "Capital of Japan (formerly Edo).", "The world's largest metropolitan area."),
  E("London", [], "City", 51.51, -0.13, 100, "United Kingdom", "Capital of the United Kingdom on the Thames.", "Nerve center of the British Empire and global finance."),
  E("Paris", [], "City", 48.86, 2.35, 100, "France", "Capital of France on the Seine.", "Center of the Enlightenment and revolution."),
  E("Moscow", [], "City", 55.76, 37.62, 100, "Russia", "Capital of Russia.", "Seat of tsars and the Soviet Union."),
  E("Istanbul", [], "City", 41.01, 28.98, 100, "Turkey", "Turkish city on the Bosporus (formerly Constantinople).", "The only city spanning two continents."),
  E("Delhi", ["new delhi"], "City", 28.61, 77.21, 100, "India", "Capital region of India.", "Seat of sultanates, the Mughals, and modern India."),
  E("Mumbai", ["bombay"], "City", 19.08, 72.88, 100, "India", "India's largest city, on the Arabian Sea.", "Gateway of India's ocean trade."),
  E("Shanghai", [], "City", 31.23, 121.47, 100, "China", "China's largest city, at the Yangtze's mouth.", "Symbol of China's opening to global trade."),
  E("New York City", ["new york", "nyc"], "City", 40.71, -74.01, 100, "United States", "Largest city of the United States.", "Immigrant gateway and global financial capital."),
  E("Los Angeles", ["la"], "City", 34.05, -118.24, 100, "United States", "Major Pacific coast city of the U.S.", "America's window on the Pacific."),
  E("Mexico City", ["ciudad de mexico", "cdmx"], "City", 19.43, -99.13, 100, "Mexico", "Capital of Mexico, built on Tenochtitlan.", "The largest city of the Spanish-speaking world."),
  E("Rio de Janeiro", ["rio"], "City", -22.91, -43.17, 100, "Brazil", "Coastal Brazilian city, former capital.", "Onetime seat of the Portuguese Empire itself."),
  E("Buenos Aires", [], "City", -34.6, -58.38, 100, "Argentina", "Capital of Argentina on the Río de la Plata.", "Great Atlantic port of South America."),
  E("Sydney", [], "City", -33.87, 151.21, 100, "Australia", "Australia's largest city.", "First British settlement in Australia (1788)."),
  E("Singapore", [], "City", 1.35, 103.82, 100, "Southeast Asia", "City-state at the tip of the Malay Peninsula.", "Modern master of the Malacca choke point."),
  E("Hong Kong", [], "City", 22.32, 114.17, 100, "Southern China", "Port city on China's southern coast.", "British trade colony turned global financial hub."),
  E("Seoul", [], "City", 37.57, 126.98, 100, "South Korea", "Capital of South Korea.", "Ancient Joseon capital, modern tech metropolis."),
  E("Tehran", [], "City", 35.69, 51.39, 100, "Iran", "Capital of Iran.", "Modern center of the Persian world."),
  E("Lagos", [], "City", 6.52, 3.38, 100, "Nigeria", "Africa's largest city.", "Booming commercial capital of West Africa."),
  E("Nairobi", [], "City", -1.29, 36.82, 100, "Kenya", "Capital of Kenya.", "Hub of East Africa."),
  E("Johannesburg", [], "City", -26.2, 28.05, 100, "South Africa", "Largest city of South Africa.", "Built on the world's richest goldfield."),
  E("Jakarta", ["batavia"], "City", -6.21, 106.85, 100, "Indonesia", "Capital of Indonesia (colonial Batavia).", "Hub of the Dutch spice empire."),
  E("Washington, D.C.", ["washington dc", "washington"], "City", 38.9, -77.04, 100, "United States", "Capital of the United States.", "Purpose-built seat of American government."),

  // ===== ADDITIONAL CLASSICAL / AP WORLD PLACES =====
  E("Ionian Sea", [], "Sea", 38, 18.5, 260, "Between Italy & Greece", "Arm of the Mediterranean between southern Italy, Sicily, and western Greece.", "Sea route linking Greece to Italy; site of the Battle of Actium."),
  E("Sea of Marmara", ["marmara"], "Sea", 40.7, 28.2, 140, "Northwestern Turkey", "Small inland sea joining the Bosporus to the Dardanelles.", "The maritime heart of Constantinople, linking the Black and Aegean Seas."),
  E("Rhodes", ["rhodos", "rodos"], "Island", 36.21, 28.03, 60, "Southeastern Aegean, Greece", "Greek island off southwestern Anatolia.", "Major Hellenistic trading power, famed for its Colossus."),
  E("Malta", ["maltese islands"], "Country", 35.92, 14.4, 40, "Central Mediterranean", "Small island group between Sicily and North Africa.", "Strategic naval stepping stone at the Mediterranean's narrowest crossing."),
  E("Macedonia", ["macedon", "ancient macedonia", "kingdom macedon"], "Historical Region", 40.8, 22.4, 200, "Northern Greece / Balkans", "Ancient kingdom north of Greece, centered at Pella.", "Homeland of Philip II and Alexander the Great, who spread Hellenism to India."),
  E("Taygetus Mountains", ["taygetus", "taygetos", "teygetus mountains", "teygetus", "mount taygetus"], "Mountain Range", 37.0, 22.34, 90, "Laconia, Peloponnese, Greece", "Steep range running down the Peloponnese west of Sparta.", "Natural fortress wall that helped make Sparta defensible."),
  E("Eastern Ghats", ["eastern ghat"], "Mountain Range", 17.0, 81.5, 700, "Eastern India", "Broken range along India's eastern coast.", "Separates the Deccan Plateau from the Coromandel Coast."),
  E("Western Ghats", ["western ghat", "sahyadri"], "Mountain Range", 14.5, 74.8, 750, "Western India", "Continuous range along India's western coast.", "Traps monsoon rains and funneled the spice trade of the Malabar Coast."),
  E("Kashmir", ["vale kashmir", "kashmir valley"], "Region", 34.1, 76.0, 300, "Northern South Asia (Himalayas)", "Mountain region where India, Pakistan, and China meet.", "Silk Road crossroads and a center of Buddhist and Hindu learning."),
  E("North China Plain", [], "Region", 36.0, 116.5, 450, "Eastern China", "Vast alluvial plain built by the Yellow River.", "Agricultural and political heartland of Chinese dynasties."),
  E("Manchurian Plain", ["manchurian plains", "northeast china plain"], "Region", 44.5, 124.0, 400, "Northeast China", "Fertile lowland plain of Manchuria.", "Homeland of the Qing founders and a prize contested by Russia and Japan."),
  E("Mongolian Steppe", ["mongolian plateau", "eurasian steppe mongolia"], "Region", 46.0, 107.0, 900, "Mongolia / Inner Mongolia", "Vast grassland plateau north of China.", "Cradle of horse nomads — Xiongnu, Turks, and Genghis Khan's Mongols."),
  E("Annam", ["annam vietnam", "annamese"], "Historical Region", 16.0, 107.5, 450, "Central Vietnam", "Historical name for central Vietnam, ruled from Hue.", "Chinese-influenced kingdom that resisted, then absorbed, northern rule."),
];

// Build lookup index: normalized name/alias -> entries
const INDEX = new Map<string, GazetteerEntry[]>();
for (const entry of GAZETTEER) {
  const keys = new Set<string>([
    normalizeName(entry.name),
    // strip parenthetical qualifiers: "Georgia (Country)" -> "georgia"
    normalizeName(entry.name.replace(/\s*\(.*\)\s*/, " ")),
    ...entry.aliases.map(normalizeName),
  ]);
  for (const k of keys) {
    if (!k) continue;
    const list = INDEX.get(k) ?? [];
    list.push(entry);
    INDEX.set(k, list);
  }
}

/** Look up the true geographic extent (bboxes / river course) for an entry. */
function shapeFor(e: GazetteerEntry) {
  const keys = [
    normalizeName(e.name),
    normalizeName(e.name.replace(/\s*\(.*\)\s*/, " ")),
    ...e.aliases.map(normalizeName),
  ];
  for (const k of keys) {
    const s = SHAPES[k];
    if (s) return s;
  }
  return null;
}

export function toResolved(e: GazetteerEntry): ResolvedLocation {
  const shape = shapeFor(e);
  const bboxes = shape?.bboxes ?? null;
  const path = shape?.path ?? null;

  // With a real shape we can derive an honest center + extent instead of
  // relying on a hand-written radius.
  let lat = e.lat;
  let lng = e.lng;
  let radiusKm = e.radiusKm;

  if (path && path.length) {
    // Use the midpoint of the river/range course as the representative point.
    const mid = path[Math.floor(path.length / 2)];
    lat = mid[0];
    lng = mid[1];
  } else if (bboxes && bboxes.length === 1) {
    const b = bboxes[0];
    // Keep a curated center if it sits inside the box (e.g. Egypt's Nile
    // valley center); otherwise fall back to the box center.
    const inside = e.lat >= b[0] && e.lat <= b[2] && e.lng >= b[1] && e.lng <= b[3];
    if (!inside) {
      lat = (b[0] + b[2]) / 2;
      lng = (b[1] + b[3]) / 2;
    }
  }

  if (bboxes || path) {
    const bb = targetBounds({ lat, lng, radiusKm: e.radiusKm, bboxes, path });
    const heightKm = (bb[2] - bb[0]) * 110.57;
    const widthKm =
      (bb[3] - bb[1]) * 111.32 * Math.max(0.15, Math.cos((lat * Math.PI) / 180));
    radiusKm = Math.round(Math.max(heightKm, widthKm) / 2);
  }

  return {
    name: e.name,
    type: e.type,
    lat,
    lng,
    radiusKm,
    region: e.region,
    description: e.description,
    whyItMatters: e.why,
    aliases: e.aliases,
    approximate: AREA_TYPES.includes(e.type) && !bboxes && !path,
    needsConfirmation: false,
    source: "gazetteer",
    bboxes,
    path,
  };
}

export interface GazetteerLookup {
  status: "resolved" | "ambiguous" | "not_found";
  resolved?: ResolvedLocation;
  options?: ResolvedLocation[];
}

export function lookupGazetteer(query: string): GazetteerLookup {
  const norm = normalizeName(query);
  if (!norm) return { status: "not_found" };
  let matches = INDEX.get(norm);
  if (!matches || matches.length === 0) {
    // try singular/plural tweaks
    const alt = norm.endsWith("s") ? norm.slice(0, -1) : norm + "s";
    matches = INDEX.get(alt);
  }
  if (!matches || matches.length === 0) return { status: "not_found" };
  // de-dupe
  const unique = [...new Set(matches)];
  if (unique.length === 1) {
    return { status: "resolved", resolved: toResolved(unique[0]) };
  }
  // prefer exact canonical-name match if only one entry's canonical name matches
  const exact = unique.filter((e) => normalizeName(e.name) === norm);
  if (exact.length === 1) {
    return { status: "resolved", resolved: toResolved(exact[0]) };
  }
  return { status: "ambiguous", options: unique.map(toResolved) };
}
