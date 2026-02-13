
export interface LocalizedContent {
  original: string;
  english: string;
}

export interface LocalizedList {
  original: string[];
  english: string[];
}

export interface Activity {
  title: LocalizedContent;
  topic: LocalizedContent;
  objective: LocalizedContent;
  materials: LocalizedList;
  instructions: LocalizedList;
  duration: LocalizedContent;
  ageAppropriateness: LocalizedContent;
  stepImagePrompts: string[];
  parentKnowledge: LocalizedContent;
}

export interface ActivityGenerationResponse {
  activities: Activity[];
  overallTopics: string[];
}

export interface StudyMaterial {
  title: string;
  url: string;
  type: 'video' | 'audio';
}

export interface StudySession {
  summary: string[];
  materials: StudyMaterial[];
}

export interface ImpactRecord {
  id: string;
  activityTitle: string;
  topic: string;
  photoUrl: string | null;
  timestamp: number;
  durationMinutes: number;
}

export enum LoadingState {
  IDLE = 'IDLE',
  READING_PDF = 'READING_PDF',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
