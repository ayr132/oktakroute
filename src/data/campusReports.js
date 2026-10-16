// Seed / mock reports, used the first time the app runs (afterwards reports
// live in localStorage — see services/reportService.js).
//
// Report shape (a future backend table can mirror this 1:1):
//   id, pathId, type (key of REPORT_TYPES), description,
//   status        'active' | 'resolved' | 'expired'
//   reportedAt    ISO string
//   expiresAt     ISO string | null   (active reports past this count as expired)
//   resolvedAt    ISO string | null
//   --- reserved for later (unused in the prototype) ---
//   reportedBy    user id | null
//   verification  'unverified' | 'verified' | 'rejected'   (admin review)
//   confirmations number of users who confirmed it (upvotes)
//   photos        array of image URLs

export const campusReports = [
  {
    id: 'report-seed-001',
    pathId: 'path-u13',
    type: 'maintenance',
    description: 'Gravel resurfacing finished last week.',
    status: 'resolved',
    reportedAt: '2026-10-01T08:00:00.000Z',
    expiresAt: null,
    resolvedAt: '2026-10-08T08:00:00.000Z',
    reportedBy: null,
    verification: 'unverified',
    confirmations: 0,
    photos: [],
  },
];
