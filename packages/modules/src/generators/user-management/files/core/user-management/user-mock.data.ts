import type { ManagedUser } from './models';

/** Seed data — written to storage on first run only, never re-read after that. */
export const MOCK_MANAGED_USERS: ManagedUser[] = [
  {
    id: 'um_1',
    username: 'jordan.blake',
    email: 'jordan.blake@example.com',
    profileImage: null,
    accountRole: 'Admin',
    status: 'active',
  },
  {
    id: 'um_2',
    username: 'priya.nair',
    email: 'priya.nair@example.com',
    profileImage: null,
    accountRole: 'Manager',
    status: 'active',
  },
  {
    id: 'um_3',
    username: 'sam.ortiz',
    email: 'sam.ortiz@example.com',
    profileImage: null,
    accountRole: 'Staff',
    status: 'active',
  },
  {
    id: 'um_4',
    username: 'lena.wu',
    email: 'lena.wu@example.com',
    profileImage: null,
    accountRole: 'Staff',
    status: 'inactive',
  },
  {
    id: 'um_5',
    username: 'marcus.reid',
    email: 'marcus.reid@example.com',
    profileImage: null,
    accountRole: 'Viewer',
    status: 'active',
  },
];
