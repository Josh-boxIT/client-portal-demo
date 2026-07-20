import type { ActionDef } from '@/services/types';

export const ACTION_DEFS: ActionDef[] = [
  {
    id: 'action-onboard',
    key: 'onboard-employee',
    title: 'Onboard employee',
    description: 'Provision accounts, devices, and licenses for a new team member.',
    icon: 'UserPlus',
    category: 'People',
    enabled: true,
    ticket: {
      summaryTemplate: 'Onboard employee: {{firstName}} {{lastName}}',
      descriptionTemplate: 'New hire onboarding requested via the client portal.\n\nName: {{firstName}} {{lastName}}\nEmail: {{email}}\nTitle: {{title}}\nDepartment: {{department}}\nStart date: {{startDate}}\n\nLicense: {{m365License}}\nAdditional apps: {{additionalApps}}\nSecurity groups: {{securityGroups}}\n\nDevice type: {{deviceType}}\nShipping address: {{shippingAddress}}\nNotes: {{notes}}',
      priority: 'medium',
      category: 'People',
    },
    steps: [
      {
        id: 'step-info',
        label: 'Employee information',
        fields: [
          { id: 'firstName', label: 'First name', type: 'text', required: true, placeholder: 'Jane' },
          { id: 'lastName', label: 'Last name', type: 'text', required: true, placeholder: 'Smith' },
          { id: 'email', label: 'Work email', type: 'email', required: true, placeholder: 'jane.smith@company.com' },
          { id: 'title', label: 'Job title', type: 'text', required: true, placeholder: 'Operations Analyst' },
          { id: 'department', label: 'Department', type: 'select', required: true, options: ['Operations', 'Finance', 'HR', 'Sales', 'IT', 'Marketing', 'Legal', 'Executive'] },
          { id: 'startDate', label: 'Start date', type: 'date', required: true },
        ],
      },
      {
        id: 'step-access',
        label: 'Access & licensing',
        fields: [
          { id: 'm365License', label: 'Microsoft 365 license', type: 'select', required: true, options: ['Microsoft 365 Business Basic', 'Microsoft 365 Business Standard', 'Microsoft 365 Business Premium'] },
          { id: 'additionalApps', label: 'Additional applications', type: 'textarea', required: false, placeholder: 'List any additional apps needed...' },
          { id: 'securityGroups', label: 'Security groups', type: 'textarea', required: false, placeholder: 'e.g. VPN-Users, Finance-Read' },
        ],
      },
      {
        id: 'step-device',
        label: 'Device setup',
        fields: [
          { id: 'deviceType', label: 'Device type', type: 'select', required: true, options: ['Laptop (Windows)', 'Laptop (Mac)', 'Desktop', 'Remote only (no device)'] },
          { id: 'shippingAddress', label: 'Shipping address', type: 'textarea', required: false, placeholder: 'Only if shipping device to employee' },
          { id: 'notes', label: 'Additional notes', type: 'textarea', required: false },
        ],
      },
    ],
  },
  {
    id: 'action-offboard',
    key: 'offboard-employee',
    title: 'Offboard employee',
    description: 'Revoke access and recover assets for a departing team member.',
    icon: 'UserMinus',
    category: 'People',
    enabled: true,
    ticket: {
      summaryTemplate: 'Offboard employee: {{employeeName}}',
      descriptionTemplate: 'Offboarding requested via the client portal.\n\nEmployee: {{employeeName}} ({{employeeEmail}})\nLast day: {{lastDay}}\nTransfer data/email to: {{dataOwner}}\nKeep mailbox 30 days: {{keepMailbox}}\nNotes: {{notes}}',
      priority: 'high',
      category: 'People',
    },
    steps: [
      {
        id: 'step-identify',
        label: 'Identify employee',
        fields: [
          { id: 'employeeName', label: 'Employee name', type: 'text', required: true, placeholder: 'Full name' },
          { id: 'employeeEmail', label: 'Work email', type: 'email', required: true },
          { id: 'lastDay', label: 'Last day', type: 'date', required: true },
        ],
      },
      {
        id: 'step-transfer',
        label: 'Data & access',
        fields: [
          { id: 'dataOwner', label: 'Transfer files/email to', type: 'email', required: false, placeholder: 'manager@company.com' },
          { id: 'keepMailbox', label: 'Keep mailbox for 30 days', type: 'checkbox', required: false },
          { id: 'notes', label: 'Notes', type: 'textarea', required: false },
        ],
      },
    ],
  },
  {
    id: 'action-reset-pw',
    key: 'reset-password',
    title: 'Reset a password',
    description: 'Trigger a self-service password reset for a user.',
    icon: 'KeyRound',
    category: 'Security',
    enabled: true,
    ticket: {
      summaryTemplate: 'Password reset requested for {{userEmail}}',
      descriptionTemplate: 'A password reset was requested via the client portal.\n\nUser email: {{userEmail}}\nReset method: {{method}}\nReason: {{reason}}',
      priority: 'medium',
      category: 'Security',
    },
    steps: [
      {
        id: 'step-user',
        label: 'User details',
        fields: [
          { id: 'userEmail', label: 'User email', type: 'email', required: true, placeholder: 'user@company.com' },
          { id: 'method', label: 'Reset method', type: 'select', required: true, options: ['Email link', 'Temporary password', 'Microsoft SSPR'] },
          { id: 'reason', label: 'Reason', type: 'select', required: false, options: ['Forgot password', 'Locked out', 'Routine reset', 'Security precaution'] },
        ],
      },
    ],
  },
  {
    id: 'action-unlock',
    key: 'unlock-account',
    title: 'Unlock account',
    description: 'Unlock a user account locked due to too many failed sign-in attempts.',
    icon: 'Unlock',
    category: 'Security',
    enabled: true,
    ticket: {
      summaryTemplate: 'Unlock account for {{userEmail}}',
      descriptionTemplate: 'An account unlock was requested via the client portal.\n\nUser email: {{userEmail}}\nIdentity verified: {{confirm}}',
      priority: 'high',
      category: 'Security',
    },
    steps: [
      {
        id: 'step-user',
        label: 'Account details',
        fields: [
          { id: 'userEmail', label: 'User email', type: 'email', required: true, placeholder: 'user@company.com' },
          { id: 'confirm', label: 'I confirm this user has been verified', type: 'checkbox', required: true },
        ],
      },
    ],
  },
  {
    id: 'action-reset-mfa',
    key: 'reset-mfa',
    title: 'Reset MFA',
    description: 'Clear and re-register multi-factor authentication for a user.',
    icon: 'ShieldOff',
    category: 'Security',
    enabled: true,
    ticket: {
      summaryTemplate: 'Reset MFA for {{userEmail}}',
      descriptionTemplate: 'An MFA reset was requested via the client portal.\n\nUser email: {{userEmail}}\nReason: {{reason}}\nIdentity verified: {{confirm}}',
      priority: 'high',
      category: 'Security',
    },
    steps: [
      {
        id: 'step-user',
        label: 'User details',
        fields: [
          { id: 'userEmail', label: 'User email', type: 'email', required: true },
          { id: 'reason', label: 'Reason for reset', type: 'select', required: true, options: ['Lost phone', 'New device', 'App not working', 'Other'] },
          { id: 'confirm', label: 'I confirm the identity of this user has been verified', type: 'checkbox', required: true },
        ],
      },
    ],
  },
  {
    id: 'action-req-software',
    key: 'request-software',
    title: 'Request software or license',
    description: 'Request a new application or license seat for yourself or a team member.',
    icon: 'Package',
    category: 'Software',
    enabled: true,
    ticket: {
      summaryTemplate: 'Software request: {{softwareName}}',
      descriptionTemplate: 'A software/license request was submitted via the client portal.\n\nSoftware: {{softwareName}}\nJustification: {{purpose}}\nUsers: {{users}}\nUrgency: {{urgency}}',
      priority: 'low',
      category: 'Software',
    },
    steps: [
      {
        id: 'step-details',
        label: 'Software details',
        fields: [
          { id: 'softwareName', label: 'Software / application name', type: 'text', required: true, placeholder: 'e.g. Adobe Acrobat Pro' },
          { id: 'purpose', label: 'Business justification', type: 'textarea', required: true, placeholder: 'Why is this software needed?' },
          { id: 'users', label: 'Who needs access?', type: 'textarea', required: false, placeholder: 'Just me, or list others...' },
          { id: 'urgency', label: 'Urgency', type: 'select', required: true, options: ['Low — within 2 weeks', 'Normal — within a week', 'High — within 2 days', 'Critical — ASAP'] },
        ],
      },
    ],
  },
  {
    id: 'action-shared-mailbox',
    key: 'create-shared-mailbox',
    title: 'Create shared mailbox',
    description: 'Set up a shared mailbox for a team, department, or function.',
    icon: 'MailPlus',
    category: 'Email',
    enabled: true,
    ticket: {
      summaryTemplate: 'Create shared mailbox: {{displayName}}',
      descriptionTemplate: 'A shared mailbox was requested via the client portal.\n\nDisplay name: {{displayName}}\nEmail address: {{emailAddress}}\nMembers: {{members}}\nAllow send-as: {{sendAs}}',
      priority: 'low',
      category: 'Email',
    },
    steps: [
      {
        id: 'step-details',
        label: 'Mailbox details',
        fields: [
          { id: 'displayName', label: 'Display name', type: 'text', required: true, placeholder: 'e.g. Support Team' },
          { id: 'emailAddress', label: 'Email address', type: 'email', required: true, placeholder: 'support@company.com' },
          { id: 'members', label: 'Members to grant access', type: 'textarea', required: true, placeholder: 'One email per line' },
          { id: 'sendAs', label: 'Allow members to send as mailbox', type: 'checkbox', required: false },
        ],
      },
    ],
  },
  {
    id: 'action-security-concern',
    key: 'report-security-concern',
    title: 'Report security concern',
    description: 'Flag a potential security issue, suspicious email, or breach indicator.',
    icon: 'ShieldAlert',
    category: 'Security',
    enabled: true,
    ticket: {
      summaryTemplate: 'Security concern: {{type}}',
      descriptionTemplate: 'A security concern was reported via the client portal.\n\nType: {{type}}\nDescription: {{description}}\nAffected systems/users: {{affectedSystems}}\nActive/ongoing: {{urgent}}',
      priority: 'urgent',
      category: 'Security',
    },
    steps: [
      {
        id: 'step-report',
        label: 'Describe the concern',
        fields: [
          { id: 'type', label: 'Type of concern', type: 'select', required: true, options: ['Suspicious email / phishing', 'Malware / virus', 'Unauthorized access', 'Data leak', 'Lost / stolen device', 'Other'] },
          { id: 'description', label: 'Description', type: 'textarea', required: true, placeholder: 'Please describe what you observed...' },
          { id: 'affectedSystems', label: 'Affected systems or users', type: 'text', required: false, placeholder: 'e.g. my laptop, shared drive' },
          { id: 'urgent', label: 'This is an active / ongoing incident', type: 'checkbox', required: false },
        ],
      },
    ],
  },
];
