const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');
const { sendPasswordResetEmail } = require('../utils/mailer');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
  return { accessToken, refreshToken };
};

const register = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, currency',
      [name, email, passwordHash]
    );

    const user = result.rows[0];
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Store refresh token
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'30 days\')',
      [user.id, refreshToken]
    );

    res.status(201).json({ user, accessToken, refreshToken });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT id, name, email, password_hash, currency, monthly_budget, dark_mode FROM users WHERE email = $1',
      [email]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'30 days\')',
      [user.id, refreshToken]
    );

    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, accessToken, refreshToken });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

const refreshToken = async (req, res) => {
  const { refreshToken: token } = req.body;
  if (!token) return res.status(400).json({ error: 'Refresh token required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const stored = await pool.query(
      'SELECT id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
      [token]
    );

    if (!stored.rows.length) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const { accessToken, refreshToken: newRefresh } = generateTokens(decoded.userId);

    // Rotate refresh token
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'30 days\')',
      [decoded.userId, newRefresh]
    );

    res.json({ accessToken, refreshToken: newRefresh });
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const result = await pool.query('SELECT id, name FROM users WHERE email = $1', [email]);
    // Always return success to prevent email enumeration
    if (!result.rows.length) {
      return res.json({ message: 'If that email exists, a reset link was sent' });
    }

    const user = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex');

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'1 hour\')',
      [user.id, token]
    );

    await sendPasswordResetEmail(email, user.name, token);
    res.json({ message: 'If that email exists, a reset link was sent' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
};

const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT user_id FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW() AND used = false',
      [token]
    );

    if (!result.rows.length) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const { user_id } = result.rows[0];
    const passwordHash = await bcrypt.hash(password, 12);

    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
      passwordHash,
      user_id,
    ]);
    await pool.query('UPDATE password_reset_tokens SET used = true WHERE token = $1', [token]);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

const logout = async (req, res) => {
  const { refreshToken: token } = req.body;
  if (token) {
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
  }
  res.json({ message: 'Logged out successfully' });
};

module.exports = { register, login, refreshToken, forgotPassword, resetPassword, logout };
