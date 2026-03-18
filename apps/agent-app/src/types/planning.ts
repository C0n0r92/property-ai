// Planning Permission Types (ArcGIS FeatureServer integration)

export interface PlanningApplication {
  OBJECTID: number;
  PlanningAuthority: string;
  ApplicationNumber: string;
  DevelopmentDescription: string;      // Truncated at ~70 chars by API
  DevelopmentAddress: string;
  DevelopmentPostcode: string | null;  // Often null in API
  ITMEasting: number | null;           // Often null in API
  ITMNorthing: number | null;          // Often null in API
  ApplicationStatus: string;
  ApplicationType: string;
  Decision: string;                    // Truncated at ~25 chars by API
  AreaofSite: number | null;
  FloorArea: number | null;
  NumResidentialUnits: number | null;
  ReceivedDate: number;                // Unix timestamp (ms)
  DecisionDate: number | null;
  DecisionDueDate: number | null;
  GrantDate: number | null;
  ExpiryDate: number | null;
  AppealRefNumber: string | null;
  AppealStatus: string | null;
  LinkAppDetails: string | null;      // URL to council planning portal
  ETL_DATE: number;
}

export interface PlanningApplicationWithScore {
  application: PlanningApplication;
  confidence: 'high' | 'medium' | 'low';
  score: number;
  matchReasons: string[];
  distance?: number; // Distance in meters from search property
}

export interface PlanningResponse {
  highConfidence: PlanningApplicationWithScore[];
  mediumConfidence: PlanningApplicationWithScore[];
  lowConfidence: PlanningApplicationWithScore[];
  totalCount: number;
  searchRadius: 50 | 100 | 150 | null;
  cached: boolean;
}

export interface PlanningInsight {
  recentApprovals: number;           // Count within 150m, last 2 years
  pendingApplications: number;       // Pending nearby
  largeDevNearby: boolean;           // 10+ residential units nearby
  developmentTrend: 'increasing' | 'stable' | 'decreasing';
  propertyHistory: PlanningApplicationWithScore[]; // Applications matching this address
}

// Work type categories for property planning history
export type PlanningWorkType =
  | 'extension'
  | 'attic_conversion'
  | 'garage_conversion'
  | 'conservatory'
  | 'renovation'
  | 'new_build'
  | 'garden_room'
  | 'change_of_use'
  | 'other';

export interface PropertyPlanningHistory {
  hasApprovedWork: boolean;
  workTypes: PlanningWorkType[];
  mostRecentApproval: PlanningApplication | null;
  totalApprovals: number;
}
