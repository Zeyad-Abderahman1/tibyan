import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StudentsPage } from '../src/features/students/StudentsPage.js';
import { StudentProfilePage } from '../src/features/students/StudentProfilePage.js';
import { studentKeys } from '../src/hooks/useStudents.js';
import { useAuthStore } from '../src/features/auth/auth.state.js';
import type { StudentDto, UserSessionDto } from '@tibyan/contracts';

const mockStudents: StudentDto[] = [
  {
    id: 'student-1',
    studentCode: 'TB-0001',
    fullName: 'أحمد إبراهيم الدسوقي',
    photoPath: null,
    educationSystem: 'GENERAL',
    gradeLevel: 'PREP_1',
    languageTrack: 'ARABIC',
    guardianPhone: '01012345678',
    status: 'ACTIVE',
    qrToken: 'TB-0001',
    barcodeValue: 'TB-0001',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
  },
  {
    id: 'student-2',
    studentCode: 'TB-0002',
    fullName: 'سارة طارق المنشاوي',
    photoPath: null,
    educationSystem: 'EGYPTIAN_BACCALAUREATE',
    gradeLevel: 'SEC_2',
    languageTrack: 'LANG_ENGLISH',
    guardianPhone: '01198765432',
    status: 'ACTIVE',
    qrToken: 'TB-0002',
    barcodeValue: 'TB-0002',
    createdAt: '2026-09-02T12:00:00.000Z',
    updatedAt: '2026-09-02T12:00:00.000Z',
  },
];

const mockSession: UserSessionDto = {
  userId: 'owner-uuid',
  fullName: 'الأستاذ أحمد الشريف',
  username: 'teacher',
  role: 'OWNER',
  permissions: ['ALL' as any],
  tokenExpiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
};

describe('Students Workspace Card Printing & Selection Suite (TDD)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    useAuthStore.setState({ session: mockSession, status: 'authenticated' });

    (global as any).window = {
      location: { href: 'http://localhost/' },
      tibyan: {
        students: {
          list: vi.fn(async () => ({ success: true, data: mockStudents })),
          getById: vi.fn(async () => ({ success: true, data: mockStudents[0] })),
          listNotes: vi.fn(async () => ({ success: true, data: [] })),
        },
      },
    };
  });

  it('renders select-all checkbox and row checkboxes in students table', () => {
    queryClient.setQueryData(studentKeys.list({ status: 'ACTIVE' }), mockStudents);

    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <StudentsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(html).toContain('data-testid="select-all-students-checkbox"');
    expect(html).toContain('data-testid="select-student-checkbox-student-1"');
    expect(html).toContain('data-testid="select-student-checkbox-student-2"');
    expect(html).not.toContain('data-testid="student-avatar"');
  });

  it('renders print card action button on each student table row', () => {
    queryClient.setQueryData(studentKeys.list({ status: 'ACTIVE' }), mockStudents);

    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <StudentsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(html).toContain('data-testid="print-card-btn-student-1"');
    expect(html).toContain('data-testid="print-card-btn-student-2"');
  });

  it('renders print student card button in StudentProfilePage without avatar/photo', () => {
    queryClient.setQueryData(studentKeys.detail('student-1'), mockStudents[0]);
    queryClient.setQueryData(studentKeys.notes('student-1'), []);

    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/students/student-1']}>
          <Routes>
            <Route path="/students/:studentId" element={<StudentProfilePage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(html).toContain('data-testid="print-student-card-btn"');
    expect(html).toContain('طباعة البطاقة');
    expect(html).not.toContain('data-testid="student-profile-photo"');
  });
});
