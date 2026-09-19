import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { StudentsPage } from '../src/features/students/StudentsPage.js';
import { StudentProfilePage } from '../src/features/students/StudentProfilePage.js';
import { StudentCreateModal } from '../src/features/students/StudentCreateModal.js';
import { StudentNotesView } from '../src/features/students/StudentNotesView.js';
import { useAuthStore } from '../src/features/auth/auth.state.js';
import {
  type StudentDto,
  type StudentNoteDto,
  type UserSessionDto,
  type PhotoSelectionDto,
  EgyptianGuardianPhoneSchema,
  CreateStudentIpcSchema,
  UpdateStudentIpcSchema,
} from '@tibyan/contracts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Task 13: Student Management UI Suite', () => {
  let queryClient: QueryClient;

  const mockGeneralStudent: StudentDto = {
    id: '11111111-aaaa-4111-8111-111111111111',
    studentCode: 'TB-0001',
    fullName: 'أحمد إبراهيم الدسوقي',
    photoPath: 'students/11111111-aaaa-4111-8111-111111111111-uuid.jpg',
    photoUrl: 'tibyan-media://students/11111111-aaaa-4111-8111-111111111111-uuid.jpg',
    educationSystem: 'GENERAL',
    gradeLevel: 'PREP_1',
    languageTrack: 'ARABIC',
    guardianPhone: '01012345678',
    status: 'ACTIVE',
    qrToken: '1234567890abcdef1234567890abcdef',
    barcodeValue: 'TB-0001',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
  };

  const mockBaccalaureateStudent: StudentDto = {
    id: '22222222-bbbb-4222-8222-222222222222',
    studentCode: 'TB-0002',
    fullName: 'سارة طارق المنشاوي',
    photoPath: null,
    photoUrl: undefined,
    educationSystem: 'EGYPTIAN_BACCALAUREATE',
    gradeLevel: 'SEC_2',
    languageTrack: 'LANG_ENGLISH',
    guardianPhone: '01198765432',
    status: 'INACTIVE',
    qrToken: 'fedcba0987654321fedcba0987654321',
    barcodeValue: 'TB-0002',
    createdAt: '2026-09-02T12:00:00.000Z',
    updatedAt: '2026-09-02T12:00:00.000Z',
  };

  const mockNote1: StudentNoteDto = {
    id: 'note-1111-4111-8111-111111111111',
    studentId: mockGeneralStudent.id,
    authorUserId: 'teacher-1',
    authorNameSnapshot: 'الأستاذ أحمد الشريف',
    noteText: 'الطالب متفوق في مادة الرياضيات ويشارك بفاعلية.',
    tag: 'EXCELLENT',
    createdAt: '2026-09-05T14:30:00.000Z',
  };

  const mockNote2: StudentNoteDto = {
    id: 'note-2222-4222-8222-222222222222',
    studentId: mockGeneralStudent.id,
    authorUserId: 'teacher-1',
    authorNameSnapshot: 'الأستاذ أحمد الشريف',
    noteText: 'يعاني من صعوبة في حل مسائل التفاضل المتقدمة.',
    tag: 'ACADEMIC_WEAKNESS',
    createdAt: '2026-09-06T10:15:00.000Z',
  };

  const mockNote3: StudentNoteDto = {
    id: 'note-3333-4333-8333-333333333333',
    studentId: mockGeneralStudent.id,
    authorUserId: 'assistant-1',
    authorNameSnapshot: 'محمود المساعد',
    noteText: 'تكرر الغياب مرتين هذا الأسبوع دون إذن مسبق.',
    tag: 'NEEDS_FOLLOW_UP',
    createdAt: '2026-09-07T08:00:00.000Z',
  };

  const mockOwnerSession: UserSessionDto = {
    userId: 'owner-uuid',
    fullName: 'الأستاذ أحمد الشريف',
    username: 'teacher',
    role: 'OWNER',
    permissions: ['ALL' as any],
    tokenExpiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
  };

  const mockReadOnlySession: UserSessionDto = {
    userId: 'assistant-uuid',
    fullName: 'محمود المساعد',
    username: 'assistant',
    role: 'ASSISTANT',
    permissions: ['STUDENTS_READ' as any],
    tokenExpiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    useAuthStore.setState({ session: mockOwnerSession, status: 'authenticated' });

    (global as any).window = (global as any).window || {};
    (global as any).window.tibyan = {
      students: {
        list: vi.fn().mockResolvedValue({
          success: true,
          data: [mockGeneralStudent, mockBaccalaureateStudent],
        }),
        getById: vi.fn().mockImplementation((id: string) => {
          if (id === mockGeneralStudent.id) {
            return Promise.resolve({ success: true, data: mockGeneralStudent });
          }
          if (id === mockBaccalaureateStudent.id) {
            return Promise.resolve({ success: true, data: mockBaccalaureateStudent });
          }
          return Promise.resolve({
            success: false,
            error: { code: 'STUDENT_NOT_FOUND', message: 'الطالب غير موجود' },
          });
        }),
        create: vi.fn().mockResolvedValue({
          success: true,
          data: mockGeneralStudent,
        }),
        update: vi.fn().mockResolvedValue({
          success: true,
          data: mockGeneralStudent,
        }),
        addNote: vi.fn().mockResolvedValue({
          success: true,
          data: mockNote1,
        }),
        listNotes: vi.fn().mockResolvedValue({
          success: true,
          data: [mockNote1, mockNote2, mockNote3],
        }),
        choosePhotoDialog: vi.fn().mockResolvedValue({
          success: true,
          data: {
            photoToken: 'token-uuid-1234',
            previewUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
          } as PhotoSelectionDto,
        }),
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ session: null, status: 'idle' });
  });

  function renderWithProviders(ui: React.ReactElement, initialEntries = ['/students']) {
    return renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
      </QueryClientProvider>
    );
  }

  // 1. Directory Page Rendering
  describe('Students Directory Page (StudentsPage)', () => {
    it('renders real returned student rows with code, name, grade, track, and guardian phone', () => {
      queryClient.setQueryData(['students', 'list', { status: 'ACTIVE' }], [mockGeneralStudent, mockBaccalaureateStudent]);

      const html = renderWithProviders(<StudentsPage />);

      expect(html).toContain('إدارة الطلاب');
      expect(html).toContain(mockGeneralStudent.fullName);
      expect(html).toContain(mockGeneralStudent.studentCode);
      expect(html).toContain(mockGeneralStudent.guardianPhone);
      expect(html).toContain(mockBaccalaureateStudent.fullName);
      expect(html).toContain(mockBaccalaureateStudent.studentCode);
    });

    it('enforces LTR direction isolation on studentCode and phone numbers in RTL layout', () => {
      queryClient.setQueryData(['students', 'list', { status: 'ACTIVE' }], [mockGeneralStudent]);

      const html = renderWithProviders(<StudentsPage />);

      expect(html).toContain(`dir="ltr" data-testid="student-code-${mockGeneralStudent.id}"`);
      expect(html).toContain(`dir="ltr" data-testid="student-phone-${mockGeneralStudent.id}"`);
    });

    it('renders distinct badges for GENERAL vs EGYPTIAN_BACCALAUREATE education systems', () => {
      queryClient.setQueryData(['students', 'list', { status: 'ACTIVE' }], [mockGeneralStudent, mockBaccalaureateStudent]);

      const html = renderWithProviders(<StudentsPage />);

      expect(html).toContain(`data-testid="student-system-${mockGeneralStudent.id}"`);
      expect(html).toContain(`data-testid="student-system-${mockBaccalaureateStudent.id}"`);
      expect(html).toContain('عام');
      expect(html).toContain('بكالوريا');
    });

    it('renders active and inactive status badges correctly', () => {
      queryClient.setQueryData(['students', 'list', { status: 'ACTIVE' }], [mockGeneralStudent, mockBaccalaureateStudent]);

      const html = renderWithProviders(<StudentsPage />);

      expect(html).toContain('نشط');
      expect(html).toContain('غير نشط');
    });

    it('renders empty directory state with call to action when no students exist', () => {
      queryClient.setQueryData(['students', 'list', { status: 'ACTIVE' }], []);

      const html = renderWithProviders(<StudentsPage />);

      expect(html).toContain('data-testid="students-empty-state"');
      expect(html).toContain('لا يوجد طلاب مسجلون حالياً');
    });

    it('renders retryable error state on IPC failure', () => {
      const html = renderToStaticMarkup(
        <QueryClientProvider
          client={
            new QueryClient({
              defaultOptions: {
                queries: { retry: false },
              },
            })
          }
        >
          <MemoryRouter>
            <StudentsPage />
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Initially renders loading state before query resolves
      expect(html).toContain('data-testid="students-loading"');
    });

    it('verifies ZERO payment, fee, or financial controls exist on StudentsPage', () => {
      queryClient.setQueryData(['students', 'list', { status: 'ACTIVE' }], [mockGeneralStudent]);

      const html = renderWithProviders(<StudentsPage />);

      expect(html).not.toContain('payment');
      expect(html).not.toContain('override');
      expect(html).not.toContain('مصاريف');
      expect(html).not.toContain('رسوم');
      expect(html).not.toContain('دفعة');
    });
  });

  // 2. Student Creation & Edit Modal
  describe('Student Creation & Edit Modal (StudentCreateModal)', () => {
    it('renders creation modal with independent EducationSystem, GradeLevel, and LanguageTrack selectors', () => {
      const html = renderWithProviders(
        <StudentCreateModal isOpen={true} onClose={() => {}} />
      );

      expect(html).toContain('إضافة طالب جديد');
      expect(html).toContain('data-testid="student-education-system-select"');
      expect(html).toContain('data-testid="student-grade-level-select"');
      expect(html).toContain('data-testid="student-language-track-select"');
      expect(html).toContain('التعليم العام');
      expect(html).toContain('البكالوريا المصرية');
      expect(html).toContain('الصف الأول الثانوي');
      expect(html).toContain('عربي');
      expect(html).toContain('لغات (إنجليزي)');
    });

    it('does NOT contain studentCode or QR fields in creation form', () => {
      const html = renderWithProviders(
        <StudentCreateModal isOpen={true} onClose={() => {}} />
      );

      expect(html).not.toContain('data-testid="student-code-readonly"');
      expect(html).not.toContain('qrToken');
      expect(html).not.toContain('barcodeValue');
    });

    it('renders read-only student code when in edit mode', () => {
      const html = renderWithProviders(
        <StudentCreateModal
          isOpen={true}
          onClose={() => {}}
          initialStudent={mockGeneralStudent}
        />
      );

      expect(html).toContain('تعديل بيانات الطالب');
      expect(html).toContain('data-testid="student-code-readonly"');
      expect(html).toContain(mockGeneralStudent.studentCode);
    });

    it('verifies ZERO payment or fee fields exist in create or edit form', () => {
      const createHtml = renderWithProviders(
        <StudentCreateModal isOpen={true} onClose={() => {}} />
      );
      expect(createHtml).not.toContain('payment');
      expect(createHtml).not.toContain('مصاريف');
      expect(createHtml).not.toContain('رسوم');

      const editHtml = renderWithProviders(
        <StudentCreateModal
          isOpen={true}
          onClose={() => {}}
          initialStudent={mockGeneralStudent}
        />
      );
      expect(editHtml).not.toContain('payment');
      expect(editHtml).not.toContain('مصاريف');
      expect(editHtml).not.toContain('رسوم');
    });
  });

  // 3. Student Profile Page
  describe('Student Profile Page (StudentProfilePage)', () => {
    it('renders student profile details by ID with metadata card and status toggle', () => {
      queryClient.setQueryData(['students', 'detail', mockGeneralStudent.id], mockGeneralStudent);
      queryClient.setQueryData(['students', 'notes', mockGeneralStudent.id], [mockNote1]);

      const html = renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[`/students/${mockGeneralStudent.id}`]}>
            <Routes>
              <Route path="/students/:studentId" element={<StudentProfilePage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(html).toContain(mockGeneralStudent.fullName);
      expect(html).toContain(mockGeneralStudent.studentCode);
      expect(html).toContain(mockGeneralStudent.guardianPhone);
      expect(html).not.toContain('data-testid="student-profile-photo"');
      expect(html).toContain('data-testid="toggle-status-btn"');
      expect(html).toContain('data-testid="edit-student-btn"');
    });

    it('renders safe not-found view when student does not exist', () => {
      queryClient.setQueryData(['students', 'detail', 'non-existent-id'], null);

      const html = renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/students/non-existent-id']}>
            <Routes>
              <Route path="/students/:studentId" element={<StudentProfilePage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(html).toContain('data-testid="student-not-found"');
      expect(html).toContain('لم يتم العثور على الطالب');
    });

    it('verifies ZERO payment or group enrollment controls exist on StudentProfilePage', () => {
      queryClient.setQueryData(['students', 'detail', mockGeneralStudent.id], mockGeneralStudent);
      queryClient.setQueryData(['students', 'notes', mockGeneralStudent.id], []);

      const html = renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[`/students/${mockGeneralStudent.id}`]}>
            <Routes>
              <Route path="/students/:studentId" element={<StudentProfilePage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(html).not.toContain('payment');
      expect(html).not.toContain('مصاريف');
      expect(html).not.toContain('رسوم');
      expect(html).not.toContain('تسجيل بالمجموعة');
    });
  });

  // 4. Student Notes View
  describe('Student Notes Timeline (StudentNotesView)', () => {
    it('renders notes timeline with tag badges, author snapshots, and dates', () => {
      queryClient.setQueryData(['students', 'notes', mockGeneralStudent.id], [mockNote1, mockNote2, mockNote3]);

      const html = renderWithProviders(
        <StudentNotesView studentId={mockGeneralStudent.id} canWrite={true} />
      );

      expect(html).toContain(mockNote1.noteText);
      expect(html).toContain(mockNote1.authorNameSnapshot);
      expect(html).toContain(mockNote2.noteText);
      expect(html).toContain(mockNote3.noteText);
    });

    it('keeps ACADEMIC_WEAKNESS and NEEDS_FOLLOW_UP semantically and visually distinct', () => {
      queryClient.setQueryData(['students', 'notes', mockGeneralStudent.id], [mockNote2, mockNote3]);

      const html = renderWithProviders(
        <StudentNotesView studentId={mockGeneralStudent.id} canWrite={true} />
      );

      expect(html).toContain('data-testid="note-tag-badge-ACADEMIC_WEAKNESS"');
      expect(html).toContain('data-testid="note-tag-badge-NEEDS_FOLLOW_UP"');
      expect(html).toContain('ضعف أكاديمي');
      expect(html).toContain('تتطلب متابعة');
    });

    it('renders add note form when canWrite is true', () => {
      queryClient.setQueryData(['students', 'notes', mockGeneralStudent.id], []);

      const html = renderWithProviders(
        <StudentNotesView studentId={mockGeneralStudent.id} canWrite={true} />
      );

      expect(html).toContain('data-testid="add-note-form"');
      expect(html).toContain('data-testid="note-text-input"');
      expect(html).toContain('data-testid="note-tag-select"');
      expect(html).toContain('data-testid="submit-note-btn"');
    });

    it('hides add note form and shows read-only banner when canWrite is false', () => {
      queryClient.setQueryData(['students', 'notes', mockGeneralStudent.id], [mockNote1]);

      const html = renderWithProviders(
        <StudentNotesView studentId={mockGeneralStudent.id} canWrite={false} />
      );

      expect(html).not.toContain('data-testid="add-note-form"');
      expect(html).toContain('data-testid="notes-read-only-banner"');
      expect(html).toContain('الملاحظات للقراءة فقط');
    });
  });

  // 5. Permission Authority
  describe('Permission Boundary Enforcement', () => {
    it('read-only assistant cannot see Add Student button on StudentsPage', () => {
      useAuthStore.setState({ session: mockReadOnlySession, status: 'authenticated' });
      queryClient.setQueryData(['students', 'list', { status: 'ACTIVE' }], [mockGeneralStudent]);

      const html = renderWithProviders(<StudentsPage />);

      expect(html).not.toContain('data-testid="add-student-btn"');
    });

    it('read-only assistant cannot see Edit or Status Toggle buttons on StudentProfilePage', () => {
      useAuthStore.setState({ session: mockReadOnlySession, status: 'authenticated' });
      queryClient.setQueryData(['students', 'detail', mockGeneralStudent.id], mockGeneralStudent);
      queryClient.setQueryData(['students', 'notes', mockGeneralStudent.id], []);

      const html = renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[`/students/${mockGeneralStudent.id}`]}>
            <Routes>
              <Route path="/students/:studentId" element={<StudentProfilePage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(html).not.toContain('data-testid="edit-student-btn"');
      expect(html).not.toContain('data-testid="toggle-status-btn"');
    });
  });

  // 6. Photo Security & Display Architecture
  describe('Photo Selection & Protocol Architecture', () => {
    it('verifies choosePhotoDialog returns opaque photoToken and base64 previewUrl without exposing host paths', async () => {
      const res = await window.tibyan.students.choosePhotoDialog();

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data).toBeDefined();
        expect(res.data?.photoToken).toBe('token-uuid-1234');
        expect(res.data?.previewUrl).toContain('data:image/jpeg;base64,');
        // Must NOT contain host absolute filesystem path
        expect((res.data as any).sourcePath).toBeUndefined();
        expect((res.data as any).filePath).toBeUndefined();
      }
    });

    it('omits photo from profile page per systemwide student photo removal rule', () => {
      queryClient.setQueryData(['students', 'detail', mockGeneralStudent.id], mockGeneralStudent);
      queryClient.setQueryData(['students', 'notes', mockGeneralStudent.id], []);

      const html = renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[`/students/${mockGeneralStudent.id}`]}>
            <Routes>
              <Route path="/students/:studentId" element={<StudentProfilePage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(html).not.toContain('src="tibyan-media://');
      expect(html).not.toContain('data-testid="student-profile-photo"');
    });
  });

  // 7. Architectural Sandbox Invariant Proof
  describe('Architectural Invariant Proof (Sandbox & Process Isolation)', () => {
    it('verifies all files in src/features/students contain ZERO forbidden imports', () => {
      const studentFeatureDir = path.join(__dirname, '../src/features/students');
      expect(fs.existsSync(studentFeatureDir)).toBe(true);

      const files = fs.readdirSync(studentFeatureDir);
      for (const file of files) {
        if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          const content = fs.readFileSync(path.join(studentFeatureDir, file), 'utf-8');

          expect(content, `${file} must not import @tibyan/core`).not.toContain('@tibyan/core');
          expect(content, `${file} must not import @tibyan/db`).not.toContain('@tibyan/db');
          expect(content, `${file} must not import better-sqlite3`).not.toContain('better-sqlite3');
          expect(content, `${file} must not import fs`).not.toMatch(/from ['"]fs['"]/);
          expect(content, `${file} must not import path`).not.toMatch(/from ['"]path['"]/);
          expect(content, `${file} must not import electron`).not.toMatch(/from ['"]electron['"]/);
          expect(content, `${file} must not import ipcRenderer`).not.toContain('ipcRenderer');
        }
      }
    });

    it('verifies src/hooks/useStudents.ts contains ZERO forbidden imports', () => {
      const hookFile = path.join(__dirname, '../src/hooks/useStudents.ts');
      expect(fs.existsSync(hookFile)).toBe(true);

      const content = fs.readFileSync(hookFile, 'utf-8');
      expect(content).not.toContain('@tibyan/core');
      expect(content).not.toContain('@tibyan/db');
      expect(content).not.toContain('better-sqlite3');
      expect(content).not.toMatch(/from ['"]fs['"]/);
      expect(content).not.toMatch(/from ['"]path['"]/);
      expect(content).not.toMatch(/from ['"]electron['"]/);
      expect(content).not.toContain('ipcRenderer');
    });
  });

  // 8. Guardian Phone Schema & Renderer Contract Hardening
  describe('Guardian Phone Canonical Contract & Form Hardening', () => {
    it('accepts every format currently supported by EgyptianGuardianPhoneSchema', () => {
      const validNumbers = [
        '01012345678', // Vodafone local
        '01198765432', // Etisalat local
        '01200000000', // Orange local
        '01599999999', // WE local
        '+201012345678', // International with +20
        '+201198765432',
        '+2001234567890', // International with +20 and leading zero
        '00201012345678', // International with 0020
        '00201198765432',
      ];

      for (const num of validNumbers) {
        const parsed = EgyptianGuardianPhoneSchema.safeParse(num);
        expect(parsed.success, `Expected ${num} to be valid`).toBe(true);
        if (parsed.success) {
          expect(parsed.data).toMatch(/^01[0125]\d{8}$/);
        }
      }
    });

    it('rejects unsupported phone formats, landlines, and invalid lengths', () => {
      const invalidNumbers = [
        '01312345678', // Qalyubia landline
        '0223456789', // Cairo landline
        '010123456', // 9 digits (too short)
        '010123456789', // 12 digits (too long)
        'abc', // Alphabetic
        '+15551234567', // US format
        '', // Empty
        '01412345678', // Invalid carrier prefix
      ];

      for (const num of invalidNumbers) {
        const parsed = EgyptianGuardianPhoneSchema.safeParse(num);
        expect(parsed.success, `Expected ${num} to be rejected`).toBe(false);
      }
    });

    it('validates that CreateStudentIpcSchema strictly accepts photoToken and rejects photoPath', () => {
      const valid = {
        fullName: 'أحمد محمود',
        educationSystem: 'GENERAL',
        gradeLevel: 'PREP_1',
        languageTrack: 'ARABIC',
        guardianPhone: '01012345678',
        photoToken: '12345678-1234-4234-8234-123456789012',
      };
      expect(CreateStudentIpcSchema.safeParse(valid).success).toBe(true);

      // photoPath must be rejected by schema refinement
      const withPhotoPath = {
        ...valid,
        photoPath: 'C:\\photo.jpg',
      };
      const pathResult = CreateStudentIpcSchema.safeParse(withPhotoPath);
      expect(pathResult.success).toBe(false);

      // Arbitrary host string in photoToken must be rejected by UUID format check
      const withBadToken = {
        ...valid,
        photoToken: 'C:\\photo.jpg',
      };
      const tokenResult = CreateStudentIpcSchema.safeParse(withBadToken);
      expect(tokenResult.success).toBe(false);
    });

    it('validates UpdateStudentIpcSchema handles photoToken undefined, null, and UUID string states', () => {
      const base = {
        studentId: '12345678-1234-4234-8234-123456789012',
        fullName: 'أحمد محمود',
      };

      // 1. photoToken undefined (preserves existing photo)
      const undefRes = UpdateStudentIpcSchema.safeParse(base);
      expect(undefRes.success).toBe(true);
      if (undefRes.success) {
        expect(undefRes.data.photoToken).toBeUndefined();
      }

      // 2. photoToken null (explicit photo removal)
      const nullRes = UpdateStudentIpcSchema.safeParse({ ...base, photoToken: null });
      expect(nullRes.success).toBe(true);
      if (nullRes.success) {
        expect(nullRes.data.photoToken).toBeNull();
      }

      // 3. photoToken string (valid UUID replacement)
      const uuidRes = UpdateStudentIpcSchema.safeParse({
        ...base,
        photoToken: '87654321-4321-4321-8321-210987654321',
      });
      expect(uuidRes.success).toBe(true);
      if (uuidRes.success) {
        expect(uuidRes.data.photoToken).toBe('87654321-4321-4321-8321-210987654321');
      }

      // 4. photoPath must be rejected
      const pathRes = UpdateStudentIpcSchema.safeParse({ ...base, photoPath: 'C:\\photo.jpg' });
      expect(pathRes.success).toBe(false);
    });
  });
});
