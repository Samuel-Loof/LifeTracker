/**
 * Determines protein quality (PDCAAS) based on food name and category
 * Returns a value between 0 and 1, where 1.0 is perfect quality
 */

export interface ProteinQualityInput {
  name: string;
  category?: string;
  categories?: string[];
}

/**
 * Lookup protein quality based on name and category
 * Uses comprehensive PDCAAS data for accurate scoring
 */
export function lookupProteinQuality(
  input: string | ProteinQualityInput
): number {
  let name = "";
  let category = "";
  let categories: string[] = [];

  if (typeof input === "string") {
    name = input.toLowerCase();
  } else {
    name = (input.name || "").toLowerCase();
    category = (input.category || "").toLowerCase();
    categories = (input.categories || []).map((c) => c.toLowerCase());
  }

  // Combine all category strings for matching
  const allCategories = [category, ...categories].join(" ");

  // Perfect Scores (1.0 PDCAAS)
  if (
    /(egg|eggs|whey|casein|milk protein|beef|soy isolate|soy protein isolate)/.test(
      name
    ) ||
    /(meat|beef|pork|chicken|turkey|fish|seafood|eggs|dairy|milk)/.test(
      allCategories
    )
  ) {
    // Check for specific high-quality proteins
    if (/(whey|casein|milk protein|soy isolate|soy protein isolate)/.test(name))
      return 1.0;
    if (/(egg|eggs)/.test(name)) return 1.0;
    if (/(beef|steak)/.test(name)) return 1.0;
    if (/(fish|salmon|tuna|cod|mackerel|sardine)/.test(name)) return 1.0;
    if (/(chicken|turkey|poultry)/.test(name)) return 0.95; // Chicken is slightly lower
    if (/(milk|dairy)/.test(name) && !/(cheese|yogurt)/.test(name)) return 1.0;
    // Generic meat category
    if (/(meat|poultry|seafood)/.test(allCategories)) return 0.95;
  }

  // High Quality (0.75-0.99 PDCAAS)
  if (
    /(quinoa|pea protein|canola protein|potato protein|chickpea|edamame)/.test(
      name
    ) ||
    /(quinoa|legumes|beans|peas)/.test(allCategories)
  ) {
    if (/quinoa/.test(name)) return 0.8;
    if (/(pea protein|pea isolate)/.test(name)) return 0.89;
    if (/(potato protein|canola protein)/.test(name)) return 0.75;
    if (/(chickpea|edamame)/.test(name)) return 0.78;
  }

  // Legumes and Beans (0.6-0.75 PDCAAS)
  if (
    /(lentil|chickpea|bean|kidney bean|black bean|navy bean|pinto|split pea|green pea)/.test(
      name
    ) ||
    /(legumes|beans|lentils)/.test(allCategories)
  ) {
    if (/(split red lentil|red lentil)/.test(name)) return 0.65;
    if (/(split green|split yellow|green lentil|yellow lentil)/.test(name))
      return 0.65;
    if (/(whole green lentil)/.test(name)) return 0.65;
    if (/(kabuli chickpea|chickpea)/.test(name)) return 0.78;
    if (/(navy bean|pinto bean|light red kidney bean)/.test(name)) return 0.65;
    if (/(black bean)/.test(name)) return 0.75;
    if (/(green pea)/.test(name)) return 0.67;
    // Generic bean/lentil
    if (/(lentil|bean)/.test(name)) return 0.65;
  }

  // Grains and Cereals (0.4-0.5 PDCAAS)
  if (
    /(oat|wheat|rice|barley|grain|cereal|bread|pasta|flour)/.test(name) ||
    /(cereals|grains|bread|pasta)/.test(allCategories)
  ) {
    if (/(rolled oat|oatmeal|oats)/.test(name)) return 0.57;
    if (/(wheat gluten)/.test(name)) return 0.25;
    if (/(wheat|bread|pasta|flour)/.test(name)) return 0.42;
    if (/(rice|brown rice|white rice)/.test(name)) return 0.47;
    if (/(barley)/.test(name)) return 0.5;
    // Generic grain
    return 0.5;
  }

  // Nuts and Seeds (Variable, often lower)
  if (
    /(almond|peanut|nut|seed|walnut|cashew|pistachio|hazelnut|pecan|sunflower seed|pumpkin seed|chia seed|flax seed)/.test(
      name
    ) ||
    /(nuts|seeds)/.test(allCategories)
  ) {
    if (/(almond)/.test(name)) return 0.23;
    if (/(peanut)/.test(name)) return 0.52;
    // Generic nuts/seeds
    if (/(nut|seed)/.test(name)) return 0.4;
  }

  // Other Plant Sources
  if (/(amaranth)/.test(name)) return 0.72;
  if (/(vegetable|broccoli|spinach|kale)/.test(name)) return 0.73;
  if (/(fruit|apple|banana|orange)/.test(name)) return 0.64;

  // Cheese and processed dairy (slightly lower than milk)
  if (/(cheese|yogurt|cottage cheese)/.test(name)) return 0.9;

  // Default mid quality for unknown foods
  return 0.7;
}

/**
 * Extract categories from OpenFoodFacts product data
 */
export function extractCategoriesFromOpenFoodFacts(product: any): string[] {
  const categories: string[] = [];

  // Try multiple category fields from OpenFoodFacts
  if (product.categories) {
    categories.push(product.categories);
  }
  if (product.categories_en) {
    categories.push(product.categories_en);
  }
  if (product.categories_tags && Array.isArray(product.categories_tags)) {
    categories.push(...product.categories_tags);
  }
  if (product.categories_hierarchy && Array.isArray(product.categories_hierarchy)) {
    categories.push(...product.categories_hierarchy);
  }

  return categories.filter(Boolean);
}

