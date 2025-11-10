import type { NewPayeeCategory } from "$lib/schema/payee-categories";

/**
 * Default payee categories that users can optionally seed
 * These help organize payees in the UI (different from transaction categories)
 */
export const defaultPayeeCategories: Omit<NewPayeeCategory, 'id' | 'workspaceId' | 'dateCreated' | 'createdAt' | 'updatedAt' | 'deletedAt'>[] = [
  // ============ UTILITIES & SERVICES ============
  {
    name: "Utilities",
    slug: "utilities",
    description: "Electric, gas, water, trash services",
    icon: "lightbulb",
    color: "#f59e0b",
    displayOrder: 0,
    isActive: true,
  },
  {
    name: "Internet & Phone",
    slug: "internet-phone",
    description: "Internet, mobile, landline providers",
    icon: "phone",
    color: "#3b82f6",
    displayOrder: 1,
    isActive: true,
  },
  {
    name: "Insurance",
    slug: "insurance",
    description: "Health, auto, home, life insurance providers",
    icon: "heart",
    color: "#8b5cf6",
    displayOrder: 2,
    isActive: true,
  },

  // ============ SUBSCRIPTIONS ============
  {
    name: "Streaming Services",
    slug: "streaming-services",
    description: "Netflix, Spotify, Disney+, etc.",
    icon: "tv",
    color: "#ec4899",
    displayOrder: 10,
    isActive: true,
  },
  {
    name: "Software & Apps",
    slug: "software-apps",
    description: "SaaS subscriptions, app subscriptions",
    icon: "laptop",
    color: "#06b6d4",
    displayOrder: 11,
    isActive: true,
  },
  {
    name: "Memberships",
    slug: "memberships",
    description: "Gym, clubs, professional organizations",
    icon: "gift",
    color: "#10b981",
    displayOrder: 12,
    isActive: true,
  },

  // ============ SHOPPING & RETAIL ============
  {
    name: "Grocery Stores",
    slug: "grocery-stores",
    description: "Supermarkets and grocery chains",
    icon: "shopping-cart",
    color: "#84cc16",
    displayOrder: 20,
    isActive: true,
  },
  {
    name: "Restaurants",
    slug: "restaurants",
    description: "Dining out, cafes, fast food",
    icon: "utensils-crossed",
    color: "#f97316",
    displayOrder: 21,
    isActive: true,
  },
  {
    name: "Retail Stores",
    slug: "retail-stores",
    description: "Department stores, clothing, electronics",
    icon: "building",
    color: "#a855f7",
    displayOrder: 22,
    isActive: true,
  },
  {
    name: "Online Retailers",
    slug: "online-retailers",
    description: "Amazon, eBay, online shopping sites",
    icon: "package",
    color: "#eab308",
    displayOrder: 23,
    isActive: true,
  },

  // ============ FINANCIAL ============
  {
    name: "Banks",
    slug: "banks",
    description: "Banking institutions",
    icon: "landmark",
    color: "#0ea5e9",
    displayOrder: 30,
    isActive: true,
  },
  {
    name: "Credit Cards",
    slug: "credit-cards",
    description: "Credit card companies",
    icon: "credit-card",
    color: "#6366f1",
    displayOrder: 31,
    isActive: true,
  },
  {
    name: "Loan Providers",
    slug: "loan-providers",
    description: "Mortgage, auto loans, student loans",
    icon: "piggy-bank",
    color: "#ef4444",
    displayOrder: 32,
    isActive: true,
  },

  // ============ HEALTHCARE ============
  {
    name: "Healthcare Providers",
    slug: "healthcare-providers",
    description: "Doctors, dentists, hospitals",
    icon: "cross",
    color: "#14b8a6",
    displayOrder: 40,
    isActive: true,
  },
  {
    name: "Pharmacies",
    slug: "pharmacies",
    description: "Drug stores and pharmacies",
    icon: "pill",
    color: "#22c55e",
    displayOrder: 41,
    isActive: true,
  },

  // ============ TRANSPORTATION ============
  {
    name: "Gas Stations",
    slug: "gas-stations",
    description: "Fuel providers",
    icon: "fuel",
    color: "#dc2626",
    displayOrder: 50,
    isActive: true,
  },
  {
    name: "Auto Services",
    slug: "auto-services",
    description: "Repairs, maintenance, car washes",
    icon: "car",
    color: "#64748b",
    displayOrder: 51,
    isActive: true,
  },
  {
    name: "Rideshare & Transit",
    slug: "rideshare-transit",
    description: "Uber, Lyft, public transportation",
    icon: "bus",
    color: "#f59e0b",
    displayOrder: 52,
    isActive: true,
  },

  // ============ HOME & PROPERTY ============
  {
    name: "Home Services",
    slug: "home-services",
    description: "Plumbing, electrical, HVAC, cleaning",
    icon: "home",
    color: "#fb923c",
    displayOrder: 60,
    isActive: true,
  },
  {
    name: "Property Management",
    slug: "property-management",
    description: "Landlords, HOA, property managers",
    icon: "building",
    color: "#94a3b8",
    displayOrder: 61,
    isActive: true,
  },

  // ============ PERSONAL & FAMILY ============
  {
    name: "Childcare & Education",
    slug: "childcare-education",
    description: "Daycare, schools, tutors",
    icon: "book",
    color: "#38bdf8",
    displayOrder: 70,
    isActive: true,
  },
  {
    name: "Pet Services",
    slug: "pet-services",
    description: "Veterinarians, groomers, pet stores",
    icon: "heart",
    color: "#a78bfa",
    displayOrder: 71,
    isActive: true,
  },

  // ============ ENTERTAINMENT ============
  {
    name: "Entertainment Venues",
    slug: "entertainment-venues",
    description: "Theaters, concerts, events",
    icon: "film",
    color: "#f472b6",
    displayOrder: 80,
    isActive: true,
  },
  {
    name: "Travel & Lodging",
    slug: "travel-lodging",
    description: "Hotels, airlines, booking services",
    icon: "plane",
    color: "#0891b2",
    displayOrder: 81,
    isActive: true,
  },

  // ============ PROFESSIONAL ============
  {
    name: "Professional Services",
    slug: "professional-services",
    description: "Lawyers, accountants, consultants",
    icon: "briefcase",
    color: "#475569",
    displayOrder: 90,
    isActive: true,
  },
  {
    name: "Government & Taxes",
    slug: "government-taxes",
    description: "IRS, DMV, government agencies",
    icon: "landmark",
    color: "#71717a",
    displayOrder: 91,
    isActive: true,
  },

  // ============ OTHER ============
  {
    name: "Local Businesses",
    slug: "local-businesses",
    description: "Small local shops and services",
    icon: "shopping-cart",
    color: "#78716c",
    displayOrder: 100,
    isActive: true,
  },
  {
    name: "Charitable Organizations",
    slug: "charitable-organizations",
    description: "Non-profits, churches, donations",
    icon: "heart",
    color: "#dc2626",
    displayOrder: 101,
    isActive: true,
  },
];
