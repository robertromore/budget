import {
  Apple,
  Archive,
  Banknote,
  Bike,
  Book,
  Briefcase,
  // Business & Work
  Building,
  Bus,
  Calendar,
  Camera,
  // Transportation
  Car,
  // Food & Dining
  Coffee,
  // Finance & Banking
  CreditCard,
  Cross,
  DollarSign,
  Dumbbell,
  Euro,
  FileText,
  Film,
  Folder,
  Fuel,
  // Entertainment & Lifestyle
  Gamepad2,
  Gift,
  Globe,
  // Health & Medical
  Heart,
  // Home & Utilities
  Home,
  Landmark,
  Laptop,
  Lightbulb,
  MapPin,
  Music,
  Package,
  PenTool,
  Phone,
  PiggyBank,
  Pill,
  Pizza,
  Plane,
  PoundSterling,
  Receipt,
  Settings,
  Shirt,
  ShoppingCart,
  // General & Misc
  Star,
  Stethoscope,
  Tag,
  Train,
  TrendingDown,
  TrendingUp,
  Tv,
  Users,
  UtensilsCrossed,
  Wallet,
  Wifi,
  Wrench,
} from "@lucide/svelte";

export interface IconOption {
  name: string;
  icon: any;
  keywords: string[];
}

export interface IconCategory {
  label: string;
  description: string;
  icons: IconOption[];
}

export const ICON_CATEGORIES: IconCategory[] = [
  {
    label: "Finance & Banking",
    description: "Money, banking, and financial icons",
    icons: [
      { name: "credit-card", icon: CreditCard, keywords: ["credit", "card", "payment", "bank"] },
      { name: "piggy-bank", icon: PiggyBank, keywords: ["savings", "save", "money", "piggy"] },
      { name: "landmark", icon: Landmark, keywords: ["bank", "building", "institution", "finance"] },
      { name: "wallet", icon: Wallet, keywords: ["money", "cash", "pay", "wallet"] },
      { name: "banknote", icon: Banknote, keywords: ["cash", "money", "bill", "currency"] },
      { name: "receipt", icon: Receipt, keywords: ["receipt", "transaction", "purchase", "bill"] },
      { name: "trending-up", icon: TrendingUp, keywords: ["growth", "profit", "increase", "chart"] },
      { name: "trending-down", icon: TrendingDown, keywords: ["loss", "decrease", "decline", "chart"] },
      { name: "dollar-sign", icon: DollarSign, keywords: ["dollar", "money", "currency", "usd"] },
      { name: "euro", icon: Euro, keywords: ["euro", "money", "currency", "eur"] },
      { name: "pound-sterling", icon: PoundSterling, keywords: ["pound", "money", "currency", "gbp"] },
    ]
  },
  {
    label: "Transportation",
    description: "Vehicles and travel-related icons",
    icons: [
      { name: "car", icon: Car, keywords: ["car", "auto", "vehicle", "transport"] },
      { name: "plane", icon: Plane, keywords: ["plane", "flight", "travel", "airport"] },
      { name: "train", icon: Train, keywords: ["train", "railway", "transport", "commute"] },
      { name: "bus", icon: Bus, keywords: ["bus", "public", "transport", "commute"] },
      { name: "bike", icon: Bike, keywords: ["bike", "bicycle", "cycle", "exercise"] },
      { name: "fuel", icon: Fuel, keywords: ["gas", "fuel", "petrol", "station"] },
    ]
  },
  {
    label: "Food & Dining",
    description: "Food, drinks, and dining icons",
    icons: [
      { name: "coffee", icon: Coffee, keywords: ["coffee", "drink", "cafe", "beverage"] },
      { name: "utensils-crossed", icon: UtensilsCrossed, keywords: ["restaurant", "dining", "food", "eat"] },
      { name: "pizza", icon: Pizza, keywords: ["pizza", "food", "takeout", "fast food"] },
      { name: "shopping-cart", icon: ShoppingCart, keywords: ["groceries", "shopping", "store", "market"] },
      { name: "apple", icon: Apple, keywords: ["fruit", "healthy", "food", "grocery"] },
    ]
  },
  {
    label: "Entertainment & Lifestyle",
    description: "Fun, hobbies, and lifestyle icons",
    icons: [
      { name: "gamepad-2", icon: Gamepad2, keywords: ["gaming", "games", "entertainment", "hobby"] },
      { name: "music", icon: Music, keywords: ["music", "audio", "entertainment", "streaming"] },
      { name: "film", icon: Film, keywords: ["movies", "cinema", "entertainment", "streaming"] },
      { name: "camera", icon: Camera, keywords: ["photo", "photography", "camera", "hobby"] },
      { name: "book", icon: Book, keywords: ["book", "reading", "education", "hobby"] },
      { name: "dumbbell", icon: Dumbbell, keywords: ["gym", "fitness", "exercise", "health"] },
      { name: "shirt", icon: Shirt, keywords: ["clothes", "clothing", "fashion", "shopping"] },
    ]
  },
  {
    label: "Home & Utilities",
    description: "House, utilities, and home-related icons",
    icons: [
      { name: "home", icon: Home, keywords: ["home", "house", "residence", "property"] },
      { name: "lightbulb", icon: Lightbulb, keywords: ["electricity", "power", "utility", "idea"] },
      { name: "wifi", icon: Wifi, keywords: ["internet", "wifi", "connection", "utility"] },
      { name: "phone", icon: Phone, keywords: ["phone", "mobile", "communication", "utility"] },
      { name: "tv", icon: Tv, keywords: ["television", "entertainment", "media", "streaming"] },
      { name: "wrench", icon: Wrench, keywords: ["repair", "maintenance", "tools", "fix"] },
    ]
  },
  {
    label: "Business & Work",
    description: "Professional and business icons",
    icons: [
      { name: "building", icon: Building, keywords: ["office", "business", "work", "corporate"] },
      { name: "briefcase", icon: Briefcase, keywords: ["work", "business", "professional", "job"] },
      { name: "laptop", icon: Laptop, keywords: ["computer", "work", "technology", "office"] },
      { name: "pen-tool", icon: PenTool, keywords: ["writing", "design", "creative", "work"] },
      { name: "file-text", icon: FileText, keywords: ["document", "file", "paperwork", "office"] },
      { name: "users", icon: Users, keywords: ["team", "people", "group", "collaboration"] },
    ]
  },
  {
    label: "Health & Medical",
    description: "Health, medical, and wellness icons",
    icons: [
      { name: "heart", icon: Heart, keywords: ["health", "medical", "wellness", "care"] },
      { name: "pill", icon: Pill, keywords: ["medicine", "pharmacy", "health", "medication"] },
      { name: "stethoscope", icon: Stethoscope, keywords: ["doctor", "medical", "health", "checkup"] },
      { name: "cross", icon: Cross, keywords: ["hospital", "medical", "emergency", "health"] },
    ]
  },
  {
    label: "General",
    description: "General purpose and miscellaneous icons",
    icons: [
      { name: "star", icon: Star, keywords: ["favorite", "important", "rating", "special"] },
      { name: "gift", icon: Gift, keywords: ["gift", "present", "celebration", "surprise"] },
      { name: "calendar", icon: Calendar, keywords: ["date", "schedule", "time", "appointment"] },
      { name: "map-pin", icon: MapPin, keywords: ["location", "place", "address", "map"] },
      { name: "settings", icon: Settings, keywords: ["config", "preferences", "options", "gear"] },
      { name: "tag", icon: Tag, keywords: ["label", "category", "tag", "organize"] },
      { name: "archive", icon: Archive, keywords: ["storage", "save", "backup", "old"] },
      { name: "folder", icon: Folder, keywords: ["organize", "directory", "files", "storage"] },
      { name: "package", icon: Package, keywords: ["delivery", "shipping", "box", "order"] },
      { name: "globe", icon: Globe, keywords: ["world", "international", "global", "web"] },
    ]
  }
];

// Create a flat list of all icons for search
export const ALL_ICONS: IconOption[] = ICON_CATEGORIES.flatMap(category => category.icons);

// Helper function to search icons by keywords
export function searchIcons(query: string): IconOption[] {
  if (!query.trim()) return ALL_ICONS;

  const searchTerm = query.toLowerCase().trim();

  return ALL_ICONS.filter(icon => {
    const nameMatch = icon.name.toLowerCase().includes(searchTerm);
    const keywordMatch = icon.keywords.some(keyword =>
      keyword.toLowerCase().includes(searchTerm)
    );
    return nameMatch || keywordMatch;
  });
}

// Get icon by name
export function getIconByName(name: string): IconOption | undefined {
  if (!name || typeof name !== 'string') return undefined;
  const icon = ALL_ICONS.find(icon => icon && icon.name === name);
  // Ensure the found icon has a valid icon component
  return icon && icon.icon ? icon : undefined;
}
