// Design System Constants

export const COLORS = {
  // Page Canvas
  pageBackground: '#F8FAFC',
  dotGrid: '#CBD5E1',
  
  // Card Surfaces
  cardBackground: '#FFFFFF',
  cardBorder: '#E2E8F0',
  
  // Typography
  primaryText: '#0F172A',
  secondaryText: '#64748B',
  
  // Brand Accent
  primary: '#4F46E5',
  primaryHover: '#4338CA',
  
  // Status Colors
  completed: {
    bg: '#ECFDF5',
    border: '#A7F3D0',
    text: '#065F46',
    badge: '#10B981'
  },
  inProgress: {
    bg: '#FFFBEB',
    border: '#FDE68A',
    text: '#92400E',
    badge: '#F59E0B'
  },
  pending: {
    bg: '#F8FAFC',
    border: '#E2E8F0',
    text: '#475569',
    badge: '#94A3B8'
  },
  stuck: {
    bg: '#FFF1F2',
    border: '#FECDD3',
    text: '#9F1239',
    badge: '#F43F5E'
  },
  aiBridge: {
    bg: '#F5F3FF',
    border: '#DDD6FE',
    text: '#5B21B6',
    badge: '#8B5CF6'
  }
} as const;

export const NODE_DIMENSIONS = {
  standard: {
    width: 240,
    height: 84
  },
  milestone: {
    width: 280,
    height: 100
  }
} as const;

export const DRAWER_WIDTH = 480;

export const DAGRE_CONFIG = {
  rankdir: 'TB', // Top to Bottom
  ranksep: 75,
  nodesep: 50
} as const;
