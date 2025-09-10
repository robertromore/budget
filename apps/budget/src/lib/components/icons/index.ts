// Centralized icon management for better tree-shaking and performance
// Import only used icons to reduce bundle size

import {
  // Navigation icons
  Plus,
  Import,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  ChevronUp,

  // Actions icons
  MoreHorizontal,
  CirclePlus,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Crosshair,

  // Sorting icons
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ArrowDownLeft,
  ArrowUpRight,

  // Data icons
  CalendarDays,
  HandCoins,
  SquareMousePointer,
  SquareCheck,
  DollarSign,
  Calendar,
  CalendarClock,

  // Chart icons
  ChartBar,
  ChartLine,
  ChartPie,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Zap,
  BarChart3,
  CircleDot,
  Network,
  Globe,
  TreePine,
  Package,

  // Widget icons
  Clock,
  Heart,
  Tag,
  Users,

  // Status icons
  Square,
  SquarePen,
  CircleUserRound,
  UsersRound,

  // UI icons
  X,
  Check,
  AlertCircle,
  Info,
  Search,
  Settings,
  Settings2,
  Trash2,
  Edit,
  Save,
  XCircle,
  Minus,
  MoveLeft,
  Pencil,
  PencilLine,
  Asterisk,
  Layers,
  RotateCcw,
  Repeat,
  Delete,
  ListFilterPlus,
  Ellipsis,
  Minimize2,
  Expand,
  PanelLeft,
  Circle,
} from "@lucide/svelte";

// Re-export for compatibility
export {
  // Navigation icons
  Plus,
  Import,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  ChevronUp,

  // Actions icons
  MoreHorizontal,
  CirclePlus,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Crosshair,

  // Sorting icons
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ArrowDownLeft,
  ArrowUpRight,

  // Data icons
  CalendarDays,
  HandCoins,
  SquareMousePointer,
  SquareCheck,
  DollarSign,
  Calendar,
  CalendarClock,

  // Chart icons
  ChartBar,
  ChartLine,
  ChartPie,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Zap,
  BarChart3,
  CircleDot,
  Network,
  Globe,
  TreePine,
  Package,
  Calendar as CalendarIcon,

  // Widget icons
  Clock,
  Heart,
  Tag,
  Users,

  // Status icons
  Square,
  SquarePen,
  CircleUserRound,
  UsersRound,

  // UI icons
  X,
  Check,
  AlertCircle,
  Info,
  Search,
  Settings,
  Settings2,
  Trash2,
  Edit,
  Save,
  XCircle as Cancel,
  Minus,
  MoveLeft,
  Pencil,
  PencilLine,
  Asterisk,
  Layers,
  RotateCcw,
  Repeat,
  Delete,
  ListFilterPlus,
  Ellipsis,
  Minimize2,
  Expand,
  PanelLeft,
  Circle,
};

// Type exports for better TypeScript support
export type IconComponent = typeof Plus;
