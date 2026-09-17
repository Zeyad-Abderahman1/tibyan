import {
  EducationSystem,
  GradeLevel,
  LanguageTrack,
} from '../enums/academic.js';
import { SessionStatus } from '../enums/session.js';
import { StudentNoteTag } from '../enums/student.js';

export interface TodayClassSlotDto {
  sessionId: string;
  groupId: string;
  groupName: string;
  educationSystem: EducationSystem;
  gradeLevel: GradeLevel;
  languageTrack: LanguageTrack;
  effectiveStartTime: string; // HH:mm
  durationMinutes: number;
  status: SessionStatus;
  isRescheduled: boolean;
  originalScheduledDate: string; // YYYY-MM-DD
  originalScheduledTime: string; // HH:mm
  enrolledCount: number;
}

export interface NeedsAttentionItemDto {
  studentId: string;
  studentName: string;
  studentCode: string;
  gradeLevel: GradeLevel;
  groupName: string;
  tag: StudentNoteTag;
  latestNote: string;
  createdAt: string;
}

export interface TodayDashboardDto {
  currentDate: string; // YYYY-MM-DD
  weekdayArabic: string; // e.g. "الخميس"
  classes: TodayClassSlotDto[];
  totalStudentsExpectedToday: number;
  activeGroupsCount: number;
  totalEnrolledStudents: number;
  needsAttention: NeedsAttentionItemDto[];
}
