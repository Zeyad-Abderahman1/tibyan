# Task 13 Execution Context — Student Management UI

> **Notice:** This document contains targeted execution context specifically for **Task 13**.  
> The canonical and authoritative source for architecture, database rules, security invariants, design tokens, and git ledger is **[TIBYAN_AI_HANDOFF.md](file:///F:/tebyan/TIBYAN_AI_HANDOFF.md)**. Always consult `TIBYAN_AI_HANDOFF.md` before making architectural decisions.
>
> **Task 13 Status:** **NOT STARTED** (Zero Task 13 code has been written).

---

## 1. Task Objective

Task 13 delivers the student management user interface for the desktop application:
1. **Student Directory & Table (`StudentsPage.tsx`):** High-density, RTL data table displaying active students with searchable names/phone numbers, student code (`TB-XXXX`), grade level badge, education system badge, and enrolled groups count.
2. **Student Creation / Enrollment Dialog (`StudentCreateModal.tsx`):** Modal dialog for onboarding a new student with photo upload/preview, academic system, grade level, language track, parent WhatsApp phone, and optional initial group enrollment.
3. **Student Profile View (`StudentProfilePage.tsx`):** Comprehensive student card showing personal data, academic track, enrolled groups, attendance rate, payment status, and notes timeline.
4. **Student Notes Timeline (`StudentNotesView.tsx`):** Chronological note stream supporting `NEEDS_FOLLOW_UP`, `ACADEMIC_WEAKNESS`, `BEHAVIOR`, and `GENERAL` notes with author snapshots.
5. **TanStack Query Hook (`useStudents.ts`):** React hook providing cached queries and mutations interfacing with `window.tibyan.student`.
6. **Unit & Component Tests (`StudentsPage.test.tsx`):** Vitest test suite covering student listing, filtering, search, note creation, and modal interactions.

---

## 2. Key Files to Create / Modify

```text
apps/desktop/
├─ src/
│  ├─ features/
│  │  └─ students/
│  │     ├─ StudentsPage.tsx         # Main student directory with filter bar and table
│  │     ├─ StudentCreateModal.tsx   # Modal for adding new student with photo upload
│  │     ├─ StudentProfilePage.tsx   # Profile card, details, and tabs
│  │     └─ StudentNotesView.tsx     # Notes stream and add-note form
│  ├─ hooks/
│  │  └─ useStudents.ts              # TanStack Query hooks for student IPC operations
│  └─ app/
│     └─ router.tsx                  # Connect /students and /students/:id routes
└─ tests/
   └─ StudentsPage.test.tsx          # Vitest suite covering student management UI
```

---

## 3. Actual Preload Surface & Contracts (`window.tibyan.student`)

The Electron Main process and `@tibyan/core` already provide complete, verified IPC handlers for student management:

### 3.1 Preload Interface (`packages/contracts/src/ipc/api.ts`)
```ts
export interface TibyanApi {
  student: {
    list(filter?: StudentFilterInput): Promise<IpcResult<StudentDto[]>>;
    getById(id: string): Promise<IpcResult<StudentDto>>;
    create(input: CreateStudentInput): Promise<IpcResult<StudentDto>>;
    update(input: UpdateStudentInput): Promise<IpcResult<StudentDto>>;
    delete(id: string): Promise<IpcResult<void>>;
    addNote(input: AddStudentNoteInput): Promise<IpcResult<StudentNoteDto>>;
    getNotes(studentId: string): Promise<IpcResult<StudentNoteDto[]>>;
    uploadPhoto(input: UploadPhotoInput): Promise<IpcResult<{ photoUrl: string }>>;
  };
  // ... other domains
}
```

### 3.2 Student DTOs & Enums (`packages/contracts/src/models/student.dto.ts`)
```ts
export interface StudentDto {
  id: string;
  studentCode: string;          // TB-XXXX format
  fullName: string;
  phone?: string | null;
  parentPhone?: string | null;
  parentRelationship?: 'FATHER' | 'MOTHER' | 'GUARDIAN' | null;
  educationSystem: 'GENERAL' | 'EGYPTIAN_BACCALAUREATE';
  gradeLevel: 'PREP_1' | 'PREP_2' | 'PREP_3' | 'SEC_1' | 'SEC_2' | 'SEC_3';
  languageTrack: 'ARABIC' | 'LANG_ENGLISH';
  schoolName?: string | null;
  photoUrl?: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface StudentNoteDto {
  id: string;
  studentId: string;
  authorId: string;
  authorNameSnapshot: string;
  noteType: 'ACADEMIC_WEAKNESS' | 'BEHAVIOR' | 'NEEDS_FOLLOW_UP' | 'GENERAL';
  content: string;
  createdAt: string;
}
```

---

## 4. Key Architectural & UX Invariants for Task 13

1. **Strict Layer Isolation:**
   - The renderer MUST interact exclusively via `window.tibyan.student`.
   - Never import `@tibyan/core`, `@tibyan/db`, `better-sqlite3`, `fs`, or `path` in renderer components.
2. **Brand Visuals & Density:**
   - Authentic Arabic RTL layout with Cairo typography.
   - Clean data density: linear/craftsmanship feel, not bulky cartoon cards.
   - Distinct badges for `EducationSystem` (General vs. Baccalaureate) and `GradeLevel`.
   - Flag `NEEDS_FOLLOW_UP` notes visually to align with Dashboard attention tracking.
3. **Photo Storage Safety:**
   - Photos uploaded via `window.tibyan.student.uploadPhoto` are stored on disk under UUID filenames in `%APPDATA%/Tibyan/data/media/photos`.
   - Never place raw image binary buffers in localStorage or Zustand.
4. **NO LOCAL AI MODEL:**
   - Do not add or reference local AI models. Future AI features in Phase 6+ use cloud API only.
5. **Do NOT Start Task 14:**
   - Complete Task 13, verify tests, update handoff documents, and halt for user review.

---

## 5. Verification Checklist for Task 13

- [ ] Run `pnpm --filter @tibyan/desktop test` — all existing and new student UI tests pass.
- [ ] Run `pnpm -r typecheck` — 0 TypeScript errors.
- [ ] Verify search, filter by grade/system, and note creation.
- [ ] Run full workspace tests `pnpm -r test` (baseline is 373 + new Task 13 tests).
- [ ] Verify zero schema drift (`pnpm --filter @tibyan/db db:generate`).
- [ ] Halt and await user review.
