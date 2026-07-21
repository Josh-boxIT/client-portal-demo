import { describe, expect, it } from 'vitest';
import { getDashboardGreetingName } from './greeting';

describe('getDashboardGreetingName', () => {
  it('uses the authenticated user name', () => {
    expect(
      getDashboardGreetingName({
        name: 'Alex Morgan',
        email: 'alex.morgan@boxit.demo',
      }),
    ).toBe('Alex');
  });

  it('uses the authenticated email when the identity has no name', () => {
    expect(
      getDashboardGreetingName({
        name: '   ',
        email: 'alex.morgan@boxit.demo',
      }),
    ).toBe('alex.morgan@boxit.demo');
  });

  it('never invents a tenant persona when no identity is available', () => {
    expect(getDashboardGreetingName(null)).toBe('there');
  });
});
