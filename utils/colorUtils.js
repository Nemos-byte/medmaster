// Color utility functions for medication management

/**
 * Convert hex color to RGB values
 * @param {string} hex - Hex color code (e.g., "#FF0000")
 * @returns {object} RGB values {r, g, b}
 */
export const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

/**
 * Calculate the luminance of a color
 * @param {object} rgb - RGB values {r, g, b}
 * @returns {number} Luminance value (0-1)
 */
export const getLuminance = (rgb) => {
  const { r, g, b } = rgb;
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

/**
 * Determine if a color is light or dark
 * @param {string} hexColor - Hex color code
 * @returns {boolean} True if the color is light, false if dark
 */
export const isLightColor = (hexColor) => {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return true; // Default to light if invalid color
  
  const luminance = getLuminance(rgb);
  return luminance > 0.5;
};

/**
 * Get appropriate text color (black or white) for a given background color
 * @param {string} backgroundColor - Hex color code
 * @returns {string} Either "#000000" or "#FFFFFF"
 */
export const getContrastTextColor = (backgroundColor) => {
  return isLightColor(backgroundColor) ? '#000000' : '#FFFFFF';
};

/**
 * Make a color lighter or darker by a percentage
 * @param {string} hexColor - Hex color code
 * @param {number} percent - Percentage to lighten (positive) or darken (negative)
 * @returns {string} Modified hex color
 */
export const adjustColorBrightness = (hexColor, percent) => {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return hexColor;
  
  const adjust = (color) => {
    const adjusted = Math.round(color * (100 + percent) / 100);
    return Math.max(0, Math.min(255, adjusted));
  };
  
  const r = adjust(rgb.r).toString(16).padStart(2, '0');
  const g = adjust(rgb.g).toString(16).padStart(2, '0');
  const b = adjust(rgb.b).toString(16).padStart(2, '0');
  
  return `#${r}${g}${b}`;
};

/**
 * Generate a softer/lighter version of a color for card backgrounds
 * @param {string} hexColor - Original hex color
 * @returns {string} Lighter version of the color
 */
export const getSoftCardColor = (hexColor) => {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return '#FFFFFF';
  
  // Create a very light tint by mixing with white
  const mixWithWhite = (color) => Math.round(color + (255 - color) * 0.85);
  
  const r = mixWithWhite(rgb.r).toString(16).padStart(2, '0');
  const g = mixWithWhite(rgb.g).toString(16).padStart(2, '0');
  const b = mixWithWhite(rgb.b).toString(16).padStart(2, '0');
  
  return `#${r}${g}${b}`;
};

/**
 * Common medication colors mapped to their typical packaging colors
 */
export const MEDICATION_COLORS = {
  // Antibiotics - typically yellow/amber
  'amoxicillin': '#F59E0B',
  'augmentin': '#F59E0B',
  'azithromycin': '#F59E0B',
  
  // Pain relievers - typically red
  'ibuprofen': '#EF4444',
  'aspirin': '#EF4444',
  'naproxen': '#EF4444',
  
  // Antihistamines - typically purple/blue
  'piriteze': '#7C3AED',
  'zyrtec': '#3B82F6',
  'benadryl': '#7C3AED',
  
  // Steroids - typically orange/red
  'dexamethasone': '#F97316',
  'prednisolone': '#F97316',
  'hydrocortisone': '#F97316',
  
  // Heart medications - typically pink
  'lisinopril': '#EC4899',
  'amlodipine': '#EC4899',
  'metoprolol': '#EC4899',
  
  // Diabetes medications - typically green
  'metformin': '#10B981',
  'glipizide': '#10B981',
  'insulin': '#10B981',
  
  // Vitamins - typically yellow/orange
  'vitamin': '#F59E0B',
  'multivitamin': '#F59E0B',
  'vitamin d': '#F59E0B',
  'vitamin b12': '#F59E0B',
  'omega 3': '#F59E0B',
};

/**
 * Get a color for a medication based on its name
 * @param {string} medicationName - Name of the medication
 * @returns {string} Hex color code
 */
export const getMedicationColor = (medicationName) => {
  if (!medicationName) return '#7C3AED'; // Default purple
  
  const nameLower = medicationName.toLowerCase();
  
  // Check for exact matches first
  if (MEDICATION_COLORS[nameLower]) {
    return MEDICATION_COLORS[nameLower];
  }
  
  // Check for partial matches
  for (const [key, color] of Object.entries(MEDICATION_COLORS)) {
    if (nameLower.includes(key)) {
      return color;
    }
  }
  
  // Default color if no match found
  return '#7C3AED';
}; 