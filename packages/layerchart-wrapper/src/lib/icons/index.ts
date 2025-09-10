import {
  Activity,
  AlertCircle,
  // Sorting icons
  ArrowDown,
  ArrowDownLeft,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Asterisk,
  BarChart3,
  Calendar,
  CalendarClock,
  // Data icons
  CalendarDays,
  // Chart icons
  ChartBar,
  ChartLine,
  ChartPie,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  Circle,
  CircleDot,
  CirclePlus,
  CircleUserRound,
  // Widget icons
  Clock,
  Crosshair,
  Delete,
  DollarSign,
  Edit,
  Ellipsis,
  Expand,
  Eye,
  EyeOff,
  Globe,
  HandCoins,
  Heart,
  Import,
  Info,
  Layers,
  ListFilterPlus,
  Minimize2,
  Minus,
  // Actions icons
  MoreHorizontal,
  MoveLeft,
  Network,
  Package,
  PanelLeft,
  Pencil,
  PencilLine,
  // Navigation icons
  Plus,
  Repeat,
  RotateCcw,
  Save,
  Search,
  Settings,
  Settings2,
  SlidersHorizontal,
  // Status icons
  Square,
  SquareCheck,
  SquareMousePointer,
  SquarePen,
  Tag,
  Target,
  Trash2,
  TreePine,
  TrendingDown,
  TrendingUp,
  Users,
  UsersRound,

  // UI icons
  X,
  XCircle,
  Zap
} from "@lucide/svelte";

// Re-export for compatibility
export {
  Activity, AlertCircle,
  // Sorting icons
  ArrowDown, ArrowDownLeft, ArrowUp,
  ArrowUpDown, ArrowUpRight, Asterisk, BarChart3, Calendar,
  CalendarClock,
  // Data icons
  CalendarDays, Calendar as CalendarIcon, XCircle as Cancel,
  // Chart icons
  ChartBar,
  ChartLine,
  ChartPie, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronUp, Circle, CircleDot, CirclePlus, CircleUserRound,
  // Widget icons
  Clock, Crosshair, Delete, DollarSign, Edit, Ellipsis, Expand, Eye,
  EyeOff, Globe, HandCoins, Heart, Import, Info, Layers, ListFilterPlus, Minimize2, Minus,
  // Actions icons
  MoreHorizontal, MoveLeft, Network, Package, PanelLeft, Pencil,
  PencilLine,
  // Navigation icons
  Plus, Repeat, RotateCcw, Save, Search,
  Settings,
  Settings2, SlidersHorizontal,
  // Status icons
  Square, SquareCheck, SquareMousePointer, SquarePen, Tag, Target, Trash2, TreePine, TrendingDown, TrendingUp, Users, UsersRound,

  // UI icons
  X, Zap
};

// Type exports for better TypeScript support
export type IconComponent = typeof Plus;
