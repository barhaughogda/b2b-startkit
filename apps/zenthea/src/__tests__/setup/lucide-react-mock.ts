// Comprehensive lucide-react mock for testing
import { vi } from 'vitest';
import React from 'react';

// Create a mock icon component
const MockIcon = ({ className, ...props }: { className?: string; [key: string]: any }) => React.createElement('svg', {
  className,
  'data-testid': 'lucide-icon',
  ...props
}, React.createElement('path', { d: 'M12 2L2 7l10 5 10-5-10-5z' }));

// List of all icons used in the codebase
const iconExports = {
  // Navigation and UI
  ArrowLeft: MockIcon,
  ArrowRight: MockIcon,
  ChevronLeft: MockIcon,
  ChevronRight: MockIcon,
  ChevronDown: MockIcon,
  ChevronUp: MockIcon,
  // Icon variants used by some components (e.g., Calendar UI)
  ChevronLeftIcon: MockIcon,
  ChevronRightIcon: MockIcon,
  ChevronDownIcon: MockIcon,
  X: MockIcon,
  Plus: MockIcon,
  Minus: MockIcon,
  Check: MockIcon,
  Circle: MockIcon,
  Square: MockIcon,
  CheckSquare: MockIcon,
  
  // User and Authentication
  User: MockIcon,
  UserX: MockIcon,
  UserCheck: MockIcon,
  UserPlus: MockIcon,
  LogIn: MockIcon,
  Eye: MockIcon,
  EyeOff: MockIcon,
  Lock: MockIcon,
  Shield: MockIcon,
  Key: MockIcon,
  Bell: MockIcon,
  Mail: MockIcon,
  Phone: MockIcon,
  Calendar: MockIcon,
  Clock: MockIcon,
  Globe: MockIcon,
  Languages: MockIcon,
  
  // Medical and Healthcare
  Stethoscope: MockIcon,
  Heart: MockIcon,
  Activity: MockIcon,
  Pill: MockIcon,
  TestTube: MockIcon,
  Scan: MockIcon,
  FileText: MockIcon,
  Hash: MockIcon,
  MapPin: MockIcon,
  AlertTriangle: MockIcon,
  AlertCircle: MockIcon,
  ClipboardList: MockIcon,
  ClipboardCheck: MockIcon,
  
  // Actions and Controls
  Save: MockIcon,
  Edit: MockIcon,
  Edit3: MockIcon,
  Trash2: MockIcon,
  Upload: MockIcon,
  Download: MockIcon,
  Copy: MockIcon,
  RefreshCw: MockIcon,
  RotateCcw: MockIcon,
  Move: MockIcon,
  Minimize2: MockIcon,
  Maximize2: MockIcon,
  
  // Search and Filter
  Search: MockIcon,
  Filter: MockIcon,
  
  // Communication
  MessageSquare: MockIcon,
  Bot: MockIcon,
  Mic: MockIcon,
  MicOff: MockIcon,
  Send: MockIcon,
  
  // Status and Feedback
  CheckCircle: MockIcon,
  CheckCircle2: MockIcon,
  CheckCheck: MockIcon,
  Info: MockIcon,
  Star: MockIcon,
  HelpCircle: MockIcon,
  BellRing: MockIcon,
  Pause: MockIcon,
  Hourglass: MockIcon,
  XCircle: MockIcon,
  
  // Loading and Progress
  Loader2: MockIcon,
  
  // File and Document
  Paperclip: MockIcon,
  Tag: MockIcon,
  Image: MockIcon,
  Inbox: MockIcon,
  
  // Layout and Navigation
  PanelLeft: MockIcon,
  Menu: MockIcon,
  Settings: MockIcon,
  CreditCard: MockIcon,
  LogOut: MockIcon,
  LayoutDashboard: MockIcon,
  Building2: MockIcon,
  UserCog: MockIcon,
  
  // Dashboard and Analytics
  BarChart3: MockIcon,
  TrendingUp: MockIcon,
  TrendingDown: MockIcon,
  Users: MockIcon,
  
  // Calendar and Time
  CalendarIcon: MockIcon,
  
  // Camera and Media
  Camera: MockIcon,
  Video: MockIcon,
  
  // Smartphone and MFA
  Smartphone: MockIcon,
  
  // Sparkles for AI
  Sparkles: MockIcon,
  
  // Bug and Debug
  Bug: MockIcon,
  
  // Additional commonly used icons
  Home: MockIcon,
  Folder: MockIcon,
  File: MockIcon,
  Archive: MockIcon,
  Share: MockIcon,
  ExternalLink: MockIcon,
  Link: MockIcon,
  Unlink: MockIcon,
  Bookmark: MockIcon,
  BookmarkCheck: MockIcon,
  Flag: MockIcon,
  FlagOff: MockIcon,
  ThumbsUp: MockIcon,
  ThumbsDown: MockIcon,
  Smile: MockIcon,
  Frown: MockIcon,
  Meh: MockIcon,
  Zap: MockIcon,
  Target: MockIcon,
  Crosshair: MockIcon,
  Focus: MockIcon,
  Layers: MockIcon,
  Grid: MockIcon,
  List: MockIcon,
  Layout: MockIcon,
  Sidebar: MockIcon,
  PanelTop: MockIcon,
  PanelBottom: MockIcon,
  Split: MockIcon,
  Columns: MockIcon,
  Rows: MockIcon,
  Table: MockIcon,
  Database: MockIcon,
  Cloud: MockIcon,
  
  // Star and Rating
  StarOff: MockIcon,
  StarHalf: MockIcon,
  
  // Website builder icons
  AlignLeft: MockIcon,
  AlignCenter: MockIcon,
  LayoutGrid: MockIcon,
  Files: MockIcon,
  Navigation: MockIcon,
  Palette: MockIcon,
  Monitor: MockIcon,
  Tablet: MockIcon,
  Type: MockIcon,
  ImageIcon: MockIcon,
  
  // Social media icons
  Facebook: MockIcon,
  Twitter: MockIcon,
  Instagram: MockIcon,
  Linkedin: MockIcon,
  Youtube: MockIcon,
  
  // Additional icons
  Briefcase: MockIcon,
  Megaphone: MockIcon,
  GripVertical: MockIcon,
  MoreHorizontal: MockIcon,
  Pencil: MockIcon,
  EyeIcon: MockIcon,
  EyeOffIcon: MockIcon,
  ToggleLeft: MockIcon,
  ToggleRight: MockIcon,
  ArrowUp: MockIcon,
  ArrowDown: MockIcon,
};

// Mock the entire lucide-react module
vi.mock('lucide-react', () => ({
  ...iconExports,
}));

export default iconExports;
