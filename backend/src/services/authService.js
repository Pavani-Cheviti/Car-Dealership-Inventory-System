import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { defaultUserRepo } from '../repositories/userRepository.js';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'dev-secret-key',
    { expiresIn: '7d' }
  );
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const { passwordHash, password_hash, ...safeUser } = user;
  return safeUser;
}

async function registerUser(data, repo = defaultUserRepo) {
  const email = String(data.email || '').trim().toLowerCase();
  const name = String(data.name || '').trim();
  const password = String(data.password || '');

  if (!name || !email || !password) {
    throw new Error('All fields are required');
  }

  const existing = await repo.findByEmail(email);
  if (existing) {
    const error = new Error('User already exists');
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  const user = await repo.create({
    name,
    email,
    passwordHash,
    role: 'user',
  });

  return sanitizeUser(user);
}

async function loginUser(data, repo = defaultUserRepo) {
  const user = await repo.findByEmail(data.email);
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isValid = bcrypt.compareSync(data.password, user.passwordHash);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  const { passwordHash, ...safeUser } = user;
  return {
    ...safeUser,
    token: generateToken(user),
  };
}

export { registerUser, loginUser, generateToken };
