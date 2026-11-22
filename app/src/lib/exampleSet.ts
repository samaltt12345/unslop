import { lookupGazetteer } from "./gazetteer";

/** Built-in European geography set, in the supplied study-list order. */
export const EXAMPLE_SET = {
  name: "European Geography (Example)",
  description: "57 European countries and surrounding seas, ocean, bay, and strait.",
  locations: [
    "Atlantic Ocean",
    "Adriatic Sea",
    "Aegean Sea",
    "Albania",
    "Andorra",
    "Austria",
    "Bay of Biscay",
    "Baltic Sea",
    "Belarus",
    "Belgium",
    "Black Sea",
    "Bosnia & Herzegovina",
    "Bulgaria",
    "Croatia",
    "Cyprus",
    "Czech Republic",
    "Denmark",
    "Estonia",
    "Finland",
    "France",
    "Germany",
    "Greece",
    "Hungary",
    "Iceland",
    "Ireland",
    "Italy",
    "Kosovo",
    "Latvia",
    "Liechtenstein",
    "Lithuania",
    "Luxembourg",
    "Macedonia",
    "Malta",
    "Mediterranean Sea",
    "Moldova",
    "Monaco",
    "Montenegro",
    "The Netherlands",
    "North Sea",
    "Norway",
    "Norwegian Sea",
    "Poland",
    "Portugal",
    "Romania",
    "Russia",
    "San Marino",
    "Serbia",
    "Slovakia",
    "Slovenia",
    "Spain",
    "Strait of Gibraltar",
    "Sweden",
    "Switzerland",
    "Turkey",
    "Ukraine",
    "United Kingdom",
    "Vatican City (Holy See)"
],
} as const;

/** Shared by static and server modes so every study mode gets the same set. */
export function resolveExampleLocations() {
  return EXAMPLE_SET.locations.map((label) => {
    // For this AP World study list, Macedonia means the ancient kingdom.
    const result = lookupGazetteer(label);
    if (result.status !== "resolved" || !result.resolved) {
      throw new Error(`Example location could not be resolved: ${label}`);
    }
    const canonical = result.resolved;
    const aliases = Array.from(
      new Set([...canonical.aliases, canonical.name, label])
    ).filter((alias) => alias.toLowerCase() !== label.toLowerCase());
    return { ...canonical, name: label, aliases };
  });
}
