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

function normalizeRegistrationInput(data = {}) {
  return {
    name: String(data.name || '').trim(),
    email: String(data.email || '').trim().toLowerCase(),
    password: String(data.password || ''),
  };
}

function createRegistrationError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function registerUser(data, repo = defaultUserRepo) {
  const registrationInput = normalizeRegistrationInput(data);

  if (!registrationInput.name || !registrationInput.email || !registrationInput.password) {
    throw new Error('All fields are required');
  }

  const existing = await repo.findByEmail(registrationInput.email);
  if (existing) {
    throw createRegistrationError('User already exists', 409);
  }

  const passwordHash = bcrypt.hashSync(registrationInput.password, 10);
  const user = await repo.create({
    name: registrationInput.name,
    email: registrationInput.email,
    passwordHash,
    role: 'user',
  });

  return sanitizeUser(user);
}

function normalizeLoginInput(data = {}) {
  return {
    email: String(data.email || '').trim().toLowerCase(),
    password: String(data.password || ''),
  };
}

async function loginUser(data, repo = defaultUserRepo) {
  const loginInput = normalizeLoginInput(data);

  if (!loginInput.email || !loginInput.password) {
    throw createRegistrationError('Invalid credentials', 401);
  }

  const user = await repo.findByEmail(loginInput.email);
  if (!user) {
    throw createRegistrationError('Invalid credentials', 401);
  }

  const isValid = bcrypt.compareSync(loginInput.password, user.passwordHash);
  if (!isValid) {
    throw createRegistrationError('Invalid credentials', 401);
  }

  const safeUser = sanitizeUser(user);
  return {
    ...safeUser,
    token: generateToken(user),
  };
}

export { registerUser, loginUser, generateToken };
