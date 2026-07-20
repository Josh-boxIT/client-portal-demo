import { describe, it, expect } from 'vitest';
import { isBoxItStaff } from './is-staff';
import type { AdminIdentity } from '../admin/auth/provider';

function identity(role: AdminIdentity['role']): AdminIdentity {
  return { id: 'u1', email: 'u@boxit.net', name: 'U', role };
}

describe('isBoxItStaff', () => {
  it('admin → true', () => {
    expect(isBoxItStaff(identity('admin'))).toBe(true);
  });

  it('editor → true', () => {
    expect(isBoxItStaff(identity('editor'))).toBe(true);
  });

  it('viewer → false', () => {
    expect(isBoxItStaff(identity('viewer'))).toBe(false);
  });

  it('undefined → false (default-deny)', () => {
    expect(isBoxItStaff(undefined)).toBe(false);
  });

  it('null → false (default-deny)', () => {
    expect(isBoxItStaff(null)).toBe(false);
  });
});
