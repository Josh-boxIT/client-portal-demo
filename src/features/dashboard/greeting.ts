interface GreetingIdentity {
  name: string;
  email: string;
}

/** Return the signed-in user's first name for the dashboard greeting. */
export function getDashboardGreetingName(identity: GreetingIdentity | null): string {
  const authenticatedName = identity?.name.trim() || identity?.email.trim();
  return authenticatedName?.split(/\s+/)[0] || 'there';
}
