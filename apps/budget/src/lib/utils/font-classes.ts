/**
 * Font Class Utilities
 *
 * Helper functions to convert font properties to Tailwind classes
 * for overriding LayerChart's hardcoded font styles.
 */

/**
 * Converts font size to Tailwind class
 */
export function getFontSizeClass(fontSize?: string): string {
  if (!fontSize) return "text-[10px]"; // Default from LayerChart

  // Map common font sizes to Tailwind classes
  const sizeMap: Record<string, string> = {
    "10px": "text-[10px]",
    "11px": "text-[11px]",
    "12px": "text-[12px]",
    "14px": "text-[14px]",
    "16px": "text-[16px]",
    "18px": "text-[18px]",
    "20px": "text-[20px]",
  };

  return sizeMap[fontSize] || `text-[${fontSize}]`;
}

/**
 * Converts font weight to Tailwind class
 */
export function getFontWeightClass(fontWeight?: string): string {
  if (!fontWeight) return "font-light"; // Default from LayerChart

  const weightMap: Record<string, string> = {
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
    light: "font-light",
  };

  return weightMap[fontWeight] || "font-normal";
}

/**
 * Converts font family to Tailwind class
 */
export function getFontFamilyClass(fontFamily?: string): string {
  if (!fontFamily) return "font-sans"; // Default assumption

  // Handle simple built-in font families first
  const familyMap: Record<string, string> = {
    "system-ui": "font-sans",
    "sans-serif": "font-sans",
    serif: "font-serif",
    monospace: "font-mono",
    mono: "font-mono",
  };

  // Check if it's a simple built-in font family
  if (familyMap[fontFamily]) {
    return familyMap[fontFamily];
  }

  // For complex font stacks, detect the primary family type
  const lowerFamily = fontFamily.toLowerCase();

  if (lowerFamily.includes("serif") && !lowerFamily.includes("sans-serif")) {
    return "font-serif";
  } else if (lowerFamily.includes("mono")) {
    return "font-mono";
  } else {
    // Default to sans-serif for complex stacks like "Inter, system-ui, sans-serif"
    return "font-sans";
  }
}

/**
 * Builds complete tickLabel classes for LayerChart Axis override
 */
export function buildAxisTickLabelClasses(
  fontSize?: string,
  fontWeight?: string,
  fontFamily?: string
): string {
  const classes = [
    "stroke-surface-100",
    "[stroke-width:2px]",
    getFontSizeClass(fontSize),
    getFontWeightClass(fontWeight),
    getFontFamilyClass(fontFamily),
  ];

  return classes.join(" ");
}
