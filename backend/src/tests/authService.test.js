import { describe, it, expect } from 'vitest';
import { registerUser, loginUser } from '../services/authService.js';

describe('authService', () => {
  it('registers a new user with a hashed password', async () => {
    const repo = {
      findByEmail: async () => null,
      create: async ({ email, passwordHash, name, role }) => ({
        id: 1,
        email,
        passwordHash,
        name,
        role,
      }),
    };

    const user = await registerUser({
      name: 'Alice Smith',
      email: 'alice@example.com',
      password: 'secret123',
      role: 'customer',
    }, repo);

    expect(user).toMatchObject({
      name: 'Alice Smith',
      email: 'alice@example.com',
      role: 'user',
    });
    expect(user.passwordHash).not.toBe('secret123');
  });

  it('throws when registering an existing email', async () => {
    const repo = {
      findByEmail: async () => ({ id: 99, email: 'alice@example.com' }),
      create: async () => null,
    };

    await expect(
      registerUser({
        name: 'Alice Smith',
        email: 'alice@example.com',
        password: 'secret123',
        role: 'customer',
      }, repo)
    ).rejects.toThrow('User already exists');
  });

  it('logs in an existing user with valid credentials', async () => {
    const repo = {
      findByEmail: async () => ({
        id: 1,
        name: 'Alice Smith',
        email: 'alice@example.com',
        passwordHash: '$2b$10$a18llgRUKgB0xCoeFF6Ques2Bq4Qksxb55wfhb.xJ5SkAU3qE/.1.',
        role: 'customer',
      }),
    };

    const result = await loginUser({
      email: 'alice@example.com',
      password: 'secret123',
    }, repo);

    expect(result).toMatchObject({
      email: 'alice@example.com',
      name: 'Alice Smith',
      role: 'customer',
    });
    expect(result.token).toBeTruthy();
  });
});
