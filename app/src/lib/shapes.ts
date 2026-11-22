/**
 * Real geographic extents for study locations.
 *
 * bboxes: one or more [south, west, north, east] boxes describing the actual
 *         land/water area a place covers. Used for map display AND for grading
 *         "click the location" answers (a click inside the box is correct).
 * path:   an ordered [lat, lng] course for linear features (rivers, mountain
 *         ranges). Grading measures distance to the nearest point on the line,
 *         which is far more accurate than a giant circle.
 *
 * Keys are normalized names (see normalizeName).
 */

export type BBox = [number, number, number, number]; // south, west, north, east
export type LatLng = [number, number];

export interface GeoShape {
  bboxes?: BBox[];
  path?: LatLng[];
}

export const SHAPES: Record<string, GeoShape> = {
  // Bounding extents for the European example set (not border polygons).
  "albania": { bboxes: [[39.64, 19.26, 42.66, 21.06]] },
  "andorra": { bboxes: [[42.43, 1.41, 42.66, 1.79]] },
  "belarus": { bboxes: [[51.26, 23.18, 56.17, 32.78]] },
  "bosnia and herzegovina": { bboxes: [[42.55, 15.72, 45.28, 19.63]] },
  "bulgaria": { bboxes: [[41.24, 22.36, 44.22, 28.61]] },
  "croatia": { bboxes: [[42.39, 13.49, 46.56, 19.45]] },
  "czech republic": { bboxes: [[48.55, 12.09, 51.06, 18.86]] },
  "estonia": { bboxes: [[57.5, 21.76, 59.68, 28.21]] },
  "kosovo": { bboxes: [[41.85, 20.01, 43.27, 21.79]] },
  "latvia": { bboxes: [[55.67, 20.97, 58.09, 28.24]] },
  "liechtenstein": { bboxes: [[47.05, 9.47, 47.28, 9.64]] },
  "lithuania": { bboxes: [[53.9, 20.93, 56.45, 26.84]] },
  "luxembourg": { bboxes: [[49.45, 5.73, 50.18, 6.53]] },
  "north macedonia": { bboxes: [[40.85, 20.45, 42.37, 23.04]] },
  "moldova": { bboxes: [[45.47, 26.62, 48.49, 30.14]] },
  "monaco": { bboxes: [[43.724, 7.409, 43.752, 7.44]] },
  "montenegro": { bboxes: [[41.85, 18.43, 43.56, 20.36]] },
  "romania": { bboxes: [[43.62, 20.26, 48.27, 29.71]] },
  "san marino": { bboxes: [[43.893, 12.403, 43.992, 12.517]] },
  "serbia": { bboxes: [[42.23, 18.82, 46.19, 23.01]] },
  "slovakia": { bboxes: [[47.73, 16.83, 49.61, 22.57]] },
  "slovenia": { bboxes: [[45.42, 13.38, 46.88, 16.61]] },
  "vatican city": { bboxes: [[41.9002, 12.4457, 41.9074, 12.4584]] },
  "bay biscay": { bboxes: [[43.3, -9, 48.5, -1.1]] },
  "norwegian sea": { bboxes: [[61, -12, 75, 16]] },

  // ---------- CONTINENTS ----------
  "north america": { bboxes: [[7, -168, 72, -52]] },
  "south america": { bboxes: [[-56, -82, 13, -34]] },
  europe: { bboxes: [[36, -10, 71, 40]] },
  africa: { bboxes: [[-35, -18, 37, 51]] },
  asia: { bboxes: [[1, 26, 78, 180]] },
  australia: { bboxes: [[-43.6, 113.1, -10.7, 153.6]] },
  antarctica: { bboxes: [[-90, -180, -63, 180]] },
  oceania: { bboxes: [[-47, 130, 20, 180], [-30, -180, 25, -130]] },

  // ---------- OCEANS ----------
  "pacific ocean": { bboxes: [[-58, 120, 62, 180], [-58, -180, 62, -70]] },
  "atlantic ocean": { bboxes: [[-58, -70, 68, 15]] },
  "indian ocean": { bboxes: [[-45, 20, 25, 120]] },
  "arctic ocean": { bboxes: [[68, -180, 90, 180]] },
  "southern ocean": { bboxes: [[-90, -180, -58, 180]] },

  // ---------- SEAS & GULFS ----------
  "mediterranean sea": { bboxes: [[30, -6, 46, 36]] },
  "red sea": { bboxes: [[12.5, 32, 30, 43.5]] },
  "black sea": { bboxes: [[40.9, 27.4, 47.3, 41.8]] },
  "caspian sea": { bboxes: [[36.5, 46.5, 47.2, 54.8]] },
  "caribbean sea": { bboxes: [[9, -88, 22, -60]] },
  "south china sea": { bboxes: [[3, 105, 23, 121]] },
  "arabian sea": { bboxes: [[5, 52, 25, 76]] },
  "bay bengal": { bboxes: [[5, 80, 22, 95]] },
  "persian gulf": { bboxes: [[24, 48, 30.4, 56.5]] },
  "aegean sea": { bboxes: [[35.5, 22.8, 40.8, 27]] },
  "baltic sea": { bboxes: [[53.5, 10, 66, 30]] },
  "north sea": { bboxes: [[51, -4, 61, 9]] },
  "sea japan": { bboxes: [[34, 128, 51, 142]] },
  "east china sea": { bboxes: [[24, 118, 33, 131]] },
  "yellow sea": { bboxes: [[32, 118, 41, 126.5]] },
  "adriatic sea": { bboxes: [[39.7, 12, 45.8, 19.5]] },
  "gulf mexico": { bboxes: [[18, -97.5, 30.5, -81]] },

  // ---------- RIVERS ----------
  "nile river": {
    path: [
      [31.4, 30.5], [30.0, 31.2], [27.2, 31.1], [25.7, 32.6], [24.1, 32.9],
      [22.3, 31.3], [19.6, 30.4], [18.4, 31.8], [16.9, 33.4], [15.6, 32.5],
      [13.5, 32.7], [12.1, 32.7], [9.5, 31.6],
    ],
  },
  "tigris river": {
    path: [
      [37.5, 41.0], [37.2, 41.5], [36.3, 42.9], [35.5, 43.3], [34.6, 43.8],
      [33.3, 44.4], [32.5, 45.8], [31.3, 47.4], [30.5, 47.8],
    ],
  },
  "euphrates river": {
    path: [
      [39.0, 38.7], [37.1, 38.8], [36.0, 38.3], [35.4, 40.1], [34.8, 41.0],
      [34.0, 42.4], [33.4, 43.8], [32.5, 44.4], [31.8, 45.3], [31.0, 46.3],
      [30.9, 47.5], [30.4, 48.2],
    ],
  },
  "amazon river": {
    path: [
      [-0.1, -49.5], [-2.2, -54.7], [-3.1, -58.4], [-3.3, -60.0],
      [-3.9, -63.0], [-4.3, -70.0], [-4.5, -73.5], [-6.0, -76.0],
    ],
  },
  "mississippi river": {
    path: [
      [29.2, -89.3], [30.0, -91.2], [32.3, -90.9], [35.1, -90.1], [37.0, -89.2],
      [38.8, -90.1], [41.5, -91.0], [43.8, -91.2], [45.5, -92.8], [47.2, -95.2],
    ],
  },
  "yangtze river": {
    path: [
      [31.4, 121.5], [30.4, 117.0], [30.3, 114.3], [30.7, 111.3], [30.9, 108.4],
      [29.6, 106.5], [28.8, 104.6], [26.6, 101.8], [31.0, 97.0], [33.0, 92.0],
    ],
  },
  "yellow river": {
    path: [
      [37.8, 119.1], [36.8, 116.5], [35.0, 113.0], [34.9, 110.4], [37.5, 110.4],
      [40.3, 107.5], [39.8, 106.5], [38.0, 103.0], [36.0, 103.8], [35.0, 100.0],
      [34.5, 96.5],
    ],
  },
  "indus river": {
    path: [
      [24.0, 67.4], [25.4, 68.4], [27.7, 68.3], [29.4, 70.6], [31.4, 71.9],
      [33.9, 72.2], [35.4, 74.6], [35.0, 76.5], [32.5, 79.7],
    ],
  },
  "ganges river": {
    path: [
      [22.5, 89.5], [23.7, 89.0], [24.5, 87.9], [25.4, 85.1], [25.6, 83.0],
      [26.5, 80.3], [27.4, 78.0], [29.9, 78.2], [30.9, 79.0],
    ],
  },
  "congo river": {
    path: [
      [-6.0, 12.4], [-4.3, 15.3], [-1.6, 16.2], [0.5, 17.7], [2.0, 20.9],
      [0.5, 25.2], [-2.5, 26.0], [-6.1, 23.6], [-11.0, 27.0],
    ],
  },
  "niger river": {
    path: [
      [4.3, 6.4], [7.8, 6.7], [9.1, 5.5], [11.9, 3.4], [13.5, 2.1], [15.9, 0.0],
      [16.8, -3.0], [15.0, -4.2], [13.5, -6.3], [11.3, -9.3], [9.5, -10.9],
    ],
  },
  "danube river": {
    path: [
      [45.2, 29.7], [44.1, 27.3], [44.0, 22.6], [44.8, 20.5], [45.8, 18.9],
      [47.5, 19.05], [48.1, 17.1], [48.2, 16.4], [48.6, 13.5], [48.9, 10.9],
      [48.1, 8.15],
    ],
  },
  "rhine river": {
    path: [
      [51.9, 4.1], [51.8, 6.1], [50.7, 7.1], [50.0, 7.6], [49.5, 8.4],
      [48.6, 8.0], [47.6, 7.6], [47.5, 9.6], [46.5, 8.7],
    ],
  },
  "volga river": {
    path: [
      [45.7, 47.9], [48.7, 44.5], [51.5, 46.0], [53.4, 50.1], [55.7, 49.1],
      [56.3, 44.0], [57.6, 39.9], [57.8, 38.9], [57.2, 32.5],
    ],
  },
  "mekong river": {
    path: [
      [9.8, 106.3], [11.5, 105.0], [13.1, 105.8], [15.1, 105.8], [17.9, 102.6],
      [20.3, 100.5], [22.5, 100.5], [25.0, 99.0], [29.0, 96.5], [32.5, 94.0],
    ],
  },
  "zambezi river": {
    path: [
      [-18.6, 36.4], [-17.8, 35.3], [-16.5, 31.0], [-17.9, 25.85],
      [-17.5, 24.3], [-15.0, 22.7], [-13.5, 23.3], [-11.5, 24.3],
    ],
  },
  "rio grande": {
    path: [
      [25.95, -97.15], [26.4, -98.8], [28.0, -100.5], [29.3, -100.9],
      [29.2, -103.2], [31.7, -106.5], [33.0, -107.0], [35.1, -106.6],
      [36.5, -106.0], [37.8, -106.5],
    ],
  },
  "colorado river": {
    path: [
      [31.8, -114.8], [33.0, -114.5], [34.8, -114.6], [36.0, -114.4],
      [36.2, -112.5], [37.0, -110.2], [38.5, -109.5], [39.5, -108.0],
      [40.3, -106.7],
    ],
  },
  "jordan river": {
    path: [[31.5, 35.5], [32.2, 35.57], [32.7, 35.58], [33.0, 35.62]],
  },
  "tiber river": {
    path: [[41.75, 12.25], [42.0, 12.5], [42.4, 12.4], [43.0, 12.2], [43.6, 12.1]],
  },
  "amur river": {
    path: [[52.9, 141.2], [51.5, 140.7], [48.5, 135.1], [49.5, 129.4], [50.3, 127.5], [53.3, 121.5]],
  },
  "ob river": {
    path: [[66.6, 69.0], [64.0, 65.5], [61.0, 68.9], [58.0, 68.5], [56.5, 74.0], [54.9, 73.4], [52.5, 81.0]],
  },
  "yenisei river": {
    path: [[71.5, 82.5], [69.4, 86.2], [67.4, 86.6], [64.3, 91.7], [61.6, 90.2], [58.4, 92.4], [56.0, 93.0], [52.3, 96.0]],
  },
  "orinoco river": {
    path: [[8.6, -62.0], [8.1, -63.6], [7.6, -66.3], [6.5, -67.5], [4.5, -67.8], [3.0, -66.5], [2.8, -65.5], [3.5, -64.0]],
  },
  "brahmaputra river": {
    path: [[23.8, 89.7], [25.2, 89.7], [26.2, 91.7], [26.6, 93.9], [27.5, 95.4], [29.0, 94.5], [29.3, 91.8], [29.8, 88.0], [30.3, 82.5]],
  },
  "murray river": {
    path: [[-35.55, 138.9], [-34.4, 140.6], [-34.1, 142.2], [-35.1, 144.0], [-35.9, 146.0], [-36.1, 147.5], [-36.4, 148.2]],
  },

  // ---------- MOUNTAIN RANGES ----------
  himalayas: {
    path: [[35.2, 74.5], [34.0, 77.5], [31.5, 78.5], [30.0, 81.0], [28.6, 84.0], [27.9, 86.9], [27.5, 89.5], [27.8, 92.0], [29.0, 95.0]],
  },
  alps: {
    path: [[43.9, 7.0], [45.2, 6.5], [46.0, 7.7], [46.5, 9.5], [47.0, 11.4], [47.3, 13.5], [47.4, 15.5]],
  },
  "andes mountains": {
    path: [[10.5, -73.0], [4.0, -76.0], [-2.0, -78.5], [-10.0, -76.0], [-16.0, -68.5], [-22.0, -67.0], [-30.0, -70.3], [-38.0, -71.2], [-46.0, -72.5], [-53.0, -72.0]],
  },
  "rocky mountains": {
    path: [[32.5, -108.5], [36.5, -106.0], [39.5, -106.0], [43.0, -110.0], [45.5, -111.5], [49.0, -114.5], [52.0, -117.5], [56.0, -122.5], [60.0, -127.0]],
  },
  "appalachian mountains": {
    path: [[33.5, -84.5], [35.6, -83.5], [37.5, -81.0], [39.5, -79.0], [41.5, -76.5], [43.5, -73.0], [45.0, -71.0], [46.5, -68.0]],
  },
  "ural mountains": {
    path: [[51.0, 58.5], [54.0, 59.0], [57.0, 59.5], [60.0, 59.5], [63.0, 59.5], [66.0, 62.0], [68.0, 66.0]],
  },
  "atlas mountains": {
    path: [[30.5, -9.0], [31.0, -7.5], [32.0, -5.0], [33.5, -3.0], [34.5, 0.0], [35.5, 3.0], [36.5, 7.0]],
  },
  "caucasus mountains": {
    path: [[41.2, 40.5], [42.5, 43.0], [43.0, 44.5], [43.3, 46.5], [41.5, 48.5]],
  },
  "zagros mountains": {
    path: [[27.5, 55.0], [29.5, 52.0], [31.5, 50.0], [33.5, 47.5], [35.5, 45.8], [37.0, 44.5]],
  },
  "hindu kush": {
    path: [[34.5, 69.5], [35.0, 70.5], [35.5, 71.5], [36.0, 70.0], [36.5, 71.5], [36.8, 72.5]],
  },
  "tian shan": {
    path: [[41.0, 69.5], [42.0, 73.0], [42.5, 76.0], [42.5, 80.0], [43.0, 84.0], [43.5, 88.0]],
  },
  "kunlun mountains": {
    path: [[36.5, 76.0], [36.0, 80.0], [36.0, 84.0], [35.5, 88.0], [36.0, 92.0], [36.5, 96.0]],
  },

  // ---------- DESERTS ----------
  "sahara desert": { bboxes: [[15, -17, 31, 37]] },
  "gobi desert": { bboxes: [[39, 96, 48, 118]] },
  "kalahari desert": { bboxes: [[-28, 18, -18, 26]] },
  "arabian desert": { bboxes: [[16, 40, 30, 55]] },
  "rub al khali": { bboxes: [[16.5, 45, 23, 57]] },
  "atacama desert": { bboxes: [[-30, -71, -18, -67]] },
  "thar desert": { bboxes: [[24, 68, 30, 76]] },
  "namib desert": { bboxes: [[-29, 12, -17, 16]] },
  "mojave desert": { bboxes: [[33.5, -118, 37.5, -113.5]] },
  "sonoran desert": { bboxes: [[28, -116, 34.5, -109]] },
  "taklamakan desert": { bboxes: [[36.5, 77, 41.5, 88]] },
  "syrian desert": { bboxes: [[30.5, 36, 35.5, 43]] },
  "great victoria desert": { bboxes: [[-31, 122, -26, 135]] },
  "patagonian desert": { bboxes: [[-52, -73, -38, -64]] },

  // ---------- PENINSULAS ----------
  "arabian peninsula": { bboxes: [[12, 34.5, 32, 60]] },
  "iberian peninsula": { bboxes: [[36, -9.5, 43.8, 3.3]] },
  "italian peninsula": { bboxes: [[37.9, 8.5, 46, 18.5]] },
  "balkan peninsula": { bboxes: [[39, 15, 46.5, 29.5]] },
  "korean peninsula": { bboxes: [[34, 125, 43, 130.7]] },
  "scandinavian peninsula": { bboxes: [[55, 4.5, 71.2, 31]] },
  "yucatan peninsula": { bboxes: [[17.5, -92, 21.6, -86.7]] },
  "sinai peninsula": { bboxes: [[27.7, 32.4, 31.2, 34.9]] },
  "horn africa": { bboxes: [[2, 38, 13, 51.5]] },
  "malay peninsula": { bboxes: [[1.2, 99, 13.5, 105]] },
  "baja california": { bboxes: [[22.8, -117.2, 32.7, -109.4]] },
  anatolia: { bboxes: [[36, 26, 42, 45]] },
  crimea: { bboxes: [[44.3, 32.4, 46.3, 36.7]] },

  // ---------- HISTORICAL REGIONS / CIVILIZATIONS / EMPIRES ----------
  mesopotamia: { bboxes: [[30, 39.5, 37.5, 48.5]] },
  "fertile crescent": { bboxes: [[29, 31, 38, 49]] },
  "indus river valley": { bboxes: [[23, 66, 33, 76]] },
  "ancient egypt": { bboxes: [[22, 25, 32, 34]] },
  sumer: { bboxes: [[30, 44.5, 33, 47.5]] },
  assyria: { bboxes: [[33, 39, 38, 47]] },
  phoenicia: { bboxes: [[32.5, 34.8, 35.7, 36.5]] },
  canaan: { bboxes: [[29.5, 34, 34, 36.5]] },
  levant: { bboxes: [[29.5, 34, 37.5, 42]] },
  nubia: { bboxes: [[17, 29, 24, 35]] },
  kush: { bboxes: [[15, 29, 22, 35]] },
  axum: { bboxes: [[12, 36, 17, 40]] },
  persia: { bboxes: [[24, 25, 45, 75]] },
  "silk road": { bboxes: [[30, 30, 48, 120]] },
  mesoamerica: { bboxes: [[13, -102, 22, -86]] },
  maya: { bboxes: [[14, -92.5, 21.5, -86.5]] },
  "aztec empire": { bboxes: [[16, -102, 21, -94]] },
  "inca empire": { bboxes: [[-35, -80, 2, -62]] },
  "mali empire": { bboxes: [[10, -14, 20, 3]] },
  "songhai empire": { bboxes: [[11, -8, 20, 6]] },
  "ghana empire": { bboxes: [[12, -12, 19, -3]] },
  "swahili coast": { bboxes: [[-26, 32, 3, 45]] },
  "byzantine empire": { bboxes: [[30, 15, 46, 42]] },
  "roman empire": { bboxes: [[30, -10, 56, 42]] },
  "ottoman empire": { bboxes: [[25, 18, 48, 50]] },
  "mongol empire": { bboxes: [[30, 25, 58, 135]] },
  "abbasid caliphate": { bboxes: [[22, 33, 42, 66]] },
  "umayyad caliphate": { bboxes: [[22, -10, 45, 72]] },
  "gupta empire": { bboxes: [[18, 68, 32, 90]] },
  "mauryan empire": { bboxes: [[12, 66, 35, 92]] },
  "han dynasty": { bboxes: [[22, 95, 43, 122]] },
  "qin dynasty": { bboxes: [[25, 103, 41, 122]] },
  beringia: { bboxes: [[58, -175, 70, -155]] },

  // ---------- REGIONS ----------
  "middle east": { bboxes: [[12, 25, 42, 63]] },
  "southeast asia": { bboxes: [[-11, 92, 23, 141]] },
  "central asia": { bboxes: [[35, 46, 55, 87]] },
  "south asia": { bboxes: [[6, 60, 37, 97]] },
  "east asia": { bboxes: [[18, 73, 54, 146]] },
  "sub saharan africa": { bboxes: [[-35, -18, 17, 51]] },
  "north africa": { bboxes: [[19, -17, 37, 37]] },
  "west africa": { bboxes: [[4, -17.5, 20, 16]] },
  "east africa": { bboxes: [[-12, 29, 18, 52]] },
  "western europe": { bboxes: [[36, -10, 60, 17]] },
  "eastern europe": { bboxes: [[44, 14, 60, 45]] },
  "latin america": { bboxes: [[-56, -118, 33, -34]] },
  "central america": { bboxes: [[7, -93, 18.5, -77]] },
  "amazon rainforest": { bboxes: [[-12, -78, 5, -50]] },
  "great plains": { bboxes: [[31, -105, 52, -95]] },
  siberia: { bboxes: [[50, 60, 73, 180]] },
  "tibetan plateau": { bboxes: [[27, 78, 37, 100]] },
  "deccan plateau": { bboxes: [[11, 73, 22, 82]] },
  sahel: { bboxes: [[11, -17, 18, 38]] },
  manchuria: { bboxes: [[39, 118, 53, 135]] },
  punjab: { bboxes: [[28, 70, 34, 77]] },
  bengal: { bboxes: [[21, 85, 27, 93]] },
  indochina: { bboxes: [[8, 92, 24, 110]] },
  "great rift valley": { bboxes: [[-15, 28, 12, 42]] },
  patagonia: { bboxes: [[-55, -75, -37, -62]] },
  balkans: { bboxes: [[39, 15, 46.5, 29.5]] },

  // ---------- COUNTRIES ----------
  egypt: { bboxes: [[22, 25, 31.7, 36.9]] },
  china: { bboxes: [[18, 73.5, 53.6, 135]] },
  india: { bboxes: [[6.7, 68.1, 35.5, 97.4]] },
  greece: { bboxes: [[34.8, 19.3, 41.8, 28.3]] },
  italy: { bboxes: [[36.6, 6.6, 47.1, 18.5]] },
  japan: { bboxes: [[24, 123, 45.6, 146]] },
  france: { bboxes: [[41.3, -5.2, 51.1, 9.6]] },
  spain: { bboxes: [[36, -9.3, 43.8, 4.3]] },
  portugal: { bboxes: [[36.9, -9.5, 42.2, -6.2]] },
  "united kingdom": { bboxes: [[49.9, -8.6, 58.7, 1.8]] },
  england: { bboxes: [[49.9, -6.4, 55.8, 1.8]] },
  germany: { bboxes: [[47.3, 5.9, 55.1, 15.0]] },
  russia: { bboxes: [[41.2, 19.6, 77.7, 180]] },
  turkey: { bboxes: [[35.8, 26, 42.1, 44.8]] },
  iran: { bboxes: [[25, 44, 39.8, 63.3]] },
  iraq: { bboxes: [[29, 38.8, 37.4, 48.6]] },
  "saudi arabia": { bboxes: [[16.3, 34.5, 32.2, 55.7]] },
  israel: { bboxes: [[29.5, 34.2, 33.3, 35.9]] },
  jordan: { bboxes: [[29.2, 34.9, 33.4, 39.3]] },
  syria: { bboxes: [[32.3, 35.7, 37.3, 42.4]] },
  lebanon: { bboxes: [[33.05, 35.1, 34.7, 36.6]] },
  afghanistan: { bboxes: [[29.4, 60.5, 38.5, 74.9]] },
  pakistan: { bboxes: [[23.7, 60.9, 37.1, 77.8]] },
  bangladesh: { bboxes: [[20.7, 88, 26.6, 92.7]] },
  nepal: { bboxes: [[26.3, 80, 30.4, 88.2]] },
  mongolia: { bboxes: [[41.6, 87.7, 52.1, 119.9]] },
  "north korea": { bboxes: [[37.7, 124.2, 43, 130.7]] },
  "south korea": { bboxes: [[33.1, 126, 38.6, 129.6]] },
  vietnam: { bboxes: [[8.2, 102.1, 23.4, 109.5]] },
  thailand: { bboxes: [[5.6, 97.3, 20.5, 105.6]] },
  cambodia: { bboxes: [[10, 102.3, 14.7, 107.6]] },
  laos: { bboxes: [[13.9, 100.1, 22.5, 107.7]] },
  myanmar: { bboxes: [[9.8, 92.2, 28.5, 101.2]] },
  indonesia: { bboxes: [[-11, 95, 6, 141]] },
  philippines: { bboxes: [[4.6, 116.9, 21.1, 126.6]] },
  malaysia: { bboxes: [[0.8, 99.6, 7.4, 119.3]] },
  "new zealand": { bboxes: [[-47.3, 166.4, -34.4, 178.6]] },
  ethiopia: { bboxes: [[3.4, 33, 14.9, 48]] },
  kenya: { bboxes: [[-4.7, 33.9, 5.5, 41.9]] },
  nigeria: { bboxes: [[4.3, 2.7, 13.9, 14.7]] },
  ghana: { bboxes: [[4.7, -3.3, 11.2, 1.2]] },
  mali: { bboxes: [[10.1, -12.2, 25, 4.3]] },
  morocco: { bboxes: [[27.6, -13.2, 35.9, -1]] },
  algeria: { bboxes: [[19, -8.7, 37.1, 12]] },
  libya: { bboxes: [[19.5, 9.3, 33.2, 25.2]] },
  sudan: { bboxes: [[8.7, 21.8, 22.2, 38.6]] },
  "south africa": { bboxes: [[-34.8, 16.5, -22.1, 32.9]] },
  "democratic republic congo": { bboxes: [[-13.5, 12.2, 5.4, 31.3]] },
  tanzania: { bboxes: [[-11.7, 29.3, -0.99, 40.4]] },
  mexico: { bboxes: [[14.5, -118.4, 32.7, -86.7]] },
  "united states": { bboxes: [[24.5, -125, 49.4, -66.9]] },
  canada: { bboxes: [[41.7, -141, 83.1, -52.6]] },
  brazil: { bboxes: [[-33.8, -74, 5.3, -34.8]] },
  argentina: { bboxes: [[-55.1, -73.6, -21.8, -53.6]] },
  peru: { bboxes: [[-18.4, -81.3, -0.03, -68.7]] },
  chile: { bboxes: [[-56, -75.7, -17.5, -66.4]] },
  colombia: { bboxes: [[-4.2, -79, 12.5, -66.9]] },
  venezuela: { bboxes: [[0.6, -73.4, 12.2, -59.8]] },
  bolivia: { bboxes: [[-22.9, -69.6, -9.7, -57.5]] },
  ecuador: { bboxes: [[-5, -81, 1.5, -75.2]] },
  cuba: { bboxes: [[19.8, -85, 23.3, -74.1]] },
  haiti: { bboxes: [[18, -74.5, 20.1, -71.6]] },
  poland: { bboxes: [[49, 14.1, 54.9, 24.2]] },
  ukraine: { bboxes: [[44.4, 22.1, 52.4, 40.2]] },
  netherlands: { bboxes: [[50.8, 3.3, 53.6, 7.2]] },
  belgium: { bboxes: [[49.5, 2.5, 51.5, 6.4]] },
  switzerland: { bboxes: [[45.8, 5.9, 47.8, 10.5]] },
  austria: { bboxes: [[46.4, 9.5, 49, 17.2]] },
  hungary: { bboxes: [[45.7, 16.1, 48.6, 22.9]] },
  sweden: { bboxes: [[55.3, 11, 69.1, 24.2]] },
  norway: { bboxes: [[58, 4.6, 71.2, 31.1]] },
  finland: { bboxes: [[59.8, 20.6, 70.1, 31.6]] },
  denmark: { bboxes: [[54.6, 8.1, 57.8, 12.7]] },
  ireland: { bboxes: [[51.4, -10.5, 55.4, -6]] },
  iceland: { bboxes: [[63.3, -24.5, 66.6, -13.5]] },
  "georgia country": { bboxes: [[41, 40, 43.6, 46.7]] },
  "georgia u s state": { bboxes: [[30.4, -85.6, 35, -80.8]] },

  // ---------- LAKES ----------
  "lake victoria": { bboxes: [[-3, 31.6, 0.6, 34.9]] },
  "lake tanganyika": { bboxes: [[-8.8, 29, -3.3, 31.2]] },
  "lake baikal": { bboxes: [[51.4, 103.6, 55.8, 110]] },
  "aral sea": { bboxes: [[43.5, 58, 46.9, 61.9]] },
  "lake titicaca": { bboxes: [[-16.6, -70.1, -15.2, -68.6]] },
  "lake chad": { bboxes: [[12.5, 13, 14.5, 15.2]] },
  "great lakes": { bboxes: [[41.3, -92.1, 49.1, -76.1]] },
  "lake superior": { bboxes: [[46.4, -92.2, 49.1, -84.3]] },
  "dead sea": { bboxes: [[31.1, 35.3, 31.8, 35.6]] },

  // ---------- ISLANDS ----------
  madagascar: { bboxes: [[-25.6, 43.2, -11.9, 50.5]] },
  "sri lanka": { bboxes: [[5.9, 79.6, 9.8, 81.9]] },
  sicily: { bboxes: [[36.6, 12.4, 38.3, 15.7]] },
  crete: { bboxes: [[34.8, 23.5, 35.7, 26.3]] },
  cyprus: { bboxes: [[34.5, 32.2, 35.7, 34.6]] },
  taiwan: { bboxes: [[21.9, 120, 25.3, 122]] },
  greenland: { bboxes: [[59.8, -73, 83.6, -11]] },
  java: { bboxes: [[-8.8, 105, -5.8, 114.6]] },
  sumatra: { bboxes: [[-6, 95, 6, 107]] },
  borneo: { bboxes: [[-4.2, 108.8, 7.4, 119.3]] },
  "new guinea": { bboxes: [[-10.7, 130.9, -0.8, 150.9]] },
  hispaniola: { bboxes: [[17.5, -74.5, 20.1, -68.3]] },
  hawaii: { bboxes: [[18.9, -160.3, 22.3, -154.8]] },
  "galapagos islands": { bboxes: [[-1.4, -91.7, 0.7, -89.2]] },
  "west indies": { bboxes: [[10, -85, 27, -59]] },
  polynesia: { bboxes: [[-50, -180, 25, -130], [-25, 175, 0, 180]] },
  micronesia: { bboxes: [[0, 130, 20, 175]] },
  melanesia: { bboxes: [[-23, 140, 0, 180]] },
  "japan archipelago": { bboxes: [[24, 123, 45.6, 146]] },
  "philippines islands": { bboxes: [[4.6, 116.9, 21.1, 126.6]] },

  // ---------- STRAITS / CANALS ----------
  "strait gibraltar": { bboxes: [[35.75, -6.1, 36.2, -5.2]] },
  "strait malacca": { bboxes: [[1, 98, 6.5, 104]] },
  bosporus: { bboxes: [[40.95, 28.9, 41.25, 29.2]] },
  dardanelles: { bboxes: [[40.0, 26.1, 40.5, 26.8]] },
  "strait hormuz": { bboxes: [[25.8, 55.5, 27.2, 57.3]] },
  "bering strait": { bboxes: [[64.5, -172, 67, -166]] },
  "english channel": { bboxes: [[49.5, -5.5, 51.2, 2]] },
  "suez canal": { bboxes: [[29.9, 32.2, 31.3, 32.6]] },
  "panama canal": { bboxes: [[8.9, -80.0, 9.4, -79.5]] },

  // ---------- ADDITIONAL CLASSICAL / AP WORLD PLACES ----------
  "ionian sea": { bboxes: [[36.0, 15.2, 40.5, 21.3]] },
  "sea marmara": { bboxes: [[40.35, 26.7, 41.05, 29.95]] },
  rhodes: { bboxes: [[35.87, 27.7, 36.46, 28.25]] },
  malta: { bboxes: [[35.78, 14.18, 36.09, 14.58]] },
  // Ancient Macedon: Aegean coast north of Thessaly into the southern Balkans.
  macedonia: { bboxes: [[39.9, 20.9, 42.1, 24.2]] },
  // Taygetus ridge, running south from Arcadia to Cape Matapan.
  "taygetus mountains": {
    path: [
      [37.28, 22.26], [37.15, 22.3], [37.03, 22.34], [36.9, 22.37],
      [36.74, 22.42], [36.55, 22.47], [36.39, 22.48],
    ],
  },
  // Eastern Ghats: Odisha south-west to the Nilgiri junction.
  "eastern ghats": {
    path: [
      [21.6, 86.3], [20.3, 84.6], [18.8, 83.2], [17.4, 81.8], [16.0, 80.4],
      [14.5, 79.3], [13.2, 78.7], [12.0, 78.2], [11.4, 77.4],
    ],
  },
  // Western Ghats: Tapti valley south to Kanyakumari.
  "western ghats": {
    path: [
      [20.9, 73.3], [19.3, 73.5], [17.6, 73.7], [15.8, 74.1], [14.0, 74.7],
      [12.6, 75.4], [11.4, 76.2], [10.0, 76.9], [8.6, 77.3],
    ],
  },
  kashmir: { bboxes: [[32.3, 73.5, 36.1, 80.0]] },
  "north china plain": { bboxes: [[32.0, 112.8, 40.2, 121.0]] },
  "manchurian plain": { bboxes: [[41.0, 120.8, 48.2, 127.5]] },
  "mongolian steppe": { bboxes: [[41.0, 95.5, 50.5, 120.0]] },
  // Annam: the long central Vietnamese coast governed from Hue.
  annam: { bboxes: [[11.2, 105.3, 20.0, 109.6]] },
};
