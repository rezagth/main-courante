import { describe, expect, it } from 'vitest';
import { resolveEntryReadScope } from '@/lib/authorization';

describe('Entry access scope', () => {
  it('limits agents to their own entries', () => {
    expect(resolveEntryReadScope(['AGENT'], 'user-1', [])).toEqual({
      kind: 'own',
      userId: 'user-1',
    });
  });

  it('limits chefs to managed sites', () => {
    expect(resolveEntryReadScope(['CHEF_EQUIPE'], 'chef-1', ['site-1', 'site-2'])).toEqual({
      kind: 'managed-sites',
      siteIds: ['site-1', 'site-2'],
    });
  });

  it('gives tenant-wide visibility to global roles', () => {
    expect(resolveEntryReadScope(['CLIENT'], 'client-1', ['site-1'])).toEqual({
      kind: 'tenant',
    });
    expect(resolveEntryReadScope(['PATRON'], 'patron-1', ['site-1'])).toEqual({
      kind: 'tenant',
    });
    expect(resolveEntryReadScope(['SUPER_ADMIN'], 'admin-1', ['site-1'])).toEqual({
      kind: 'tenant',
    });
  });
});