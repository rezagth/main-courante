import { prismaAdmin } from '@/lib/prisma';

let cachedAvailability: { value: boolean; checkedAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

export async function hasLocationAssignmentTables(): Promise<boolean> {
  const now = Date.now();
  if (cachedAvailability && now - cachedAvailability.checkedAt < CACHE_TTL_MS) {
    return cachedAvailability.value;
  }

  try {
    const rows = await prismaAdmin.$queryRawUnsafe<Array<{
      locations: string | null;
      user_location_assignments: string | null;
      site_manager_assignments: string | null;
    }>>(`
      SELECT
        to_regclass('public.locations') AS locations,
        to_regclass('public.user_location_assignments') AS user_location_assignments,
        to_regclass('public.site_manager_assignments') AS site_manager_assignments
    `);

    const row = rows[0];
    const value = Boolean(
      row?.locations &&
      row?.user_location_assignments &&
      row?.site_manager_assignments,
    );

    cachedAvailability = { value, checkedAt: now };
    return value;
  } catch {
    cachedAvailability = { value: false, checkedAt: now };
    return false;
  }
}

export function isMissingTableError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2021'
  );
}
