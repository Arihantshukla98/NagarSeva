/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: 'pothole' | 'water' | 'streetlight' | 'garbage' | 'drainage' | 'other';
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'reported' | 'verified' | 'in_progress' | 'resolved';
  department: 'roads' | 'water' | 'electricity' | 'sanitation' | 'general';
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  imageUrl: string;
  reportedBy: string;
  votes: number;
  votedUsers?: string[]; // Array of user emails/IDs to check duplicate voting
  aiSummary: string;
  estimatedCost: string;
  suggestedAction: string;
  urgencyScore: number;
  potentialImpact?: string;
  createdAt: string;
  resolvedAt?: string | null;
  resolutionNotes?: string;
  resolvedImageUrl?: string;
  resolvedVerificationResult?: 'valid' | 'invalid' | 'unchecked';
  resolvedVerificationNotes?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  points: number;
  badges: string[];
  issuesReported: number;
  issuesVerified: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  issueId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface AISpecs {
  category: string;
  severity: string;
  department: string;
  confidence: number;
  aiSummary: string;
  estimatedCost: string;
  suggestedAction: string;
  urgencyScore: number;
  potentialImpact: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  similarIssueId?: string;
  confidence?: number;
}

export interface InsightsResult {
  topPriorityAreas: string[];
  patterns: string[];
  resourceSuggestion: string;
  predictedIssues: string[];
  weeklyHighlight: string;
}

export interface Notification {
  id: string;
  userId: string;
  issueId: string;
  issueTitle: string;
  message: string;
  type: 'status_change' | 'voted_resolved';
  oldStatus?: string;
  newStatus?: string;
  createdAt: string;
  read: boolean;
}

