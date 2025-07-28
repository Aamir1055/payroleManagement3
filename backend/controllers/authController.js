const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { query } = require('../utils/dbPromise');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRY = '24h';

// ✅ Login with optional 2FA
exports.login = async (req, res) => {
  const { username, password, twoFactorCode } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const users = await query('SELECT * FROM Users WHERE username = ?', [username]);

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    
    // Check if user has a valid password
    if (!user.password) {
      return res.status(401).json({ error: 'Account not properly configured. Please contact administrator.' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.two_factor_enabled) {
      if (!twoFactorCode) {
        return res.status(200).json({ requiresTwoFactor: true, message: '2FA code required' });
      }

      const verified = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token: twoFactorCode,
        window: 6
      });

      if (!verified) {
        return res.status(401).json({ error: 'Invalid 2FA code' });
      }
    }

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        employeeId: user.employee_id
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        employeeId: user.employee_id,
        twoFactorEnabled: user.two_factor_enabled
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// ✅ Generate 2FA setup QR code
exports.generate2FASetup = async (req, res) => {
  try {
    const { userId } = req.user;
    const users = await query('SELECT username FROM Users WHERE id = ?', [userId]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    const secret = speakeasy.generateSecret({
      name: `Payroll System (${user.username})`,
      issuer: 'Payroll System',
      length: 32
    });

    await query('UPDATE Users SET two_factor_secret = ? WHERE id = ?', [
      secret.base32,
      userId
    ]);

    const qrCodeUrl = speakeasy.otpauthURL({
      secret: secret.base32,
      label: user.username,
      issuer: 'Payroll System',
      encoding: 'base32'
    });

    const qrCodeImage = await QRCode.toDataURL(qrCodeUrl);

    res.json({
      qrCode: qrCodeImage,
      secret: secret.base32,
      backupCodes: Array.from({ length: 3 }, () =>
        Math.random().toString(36).substr(2, 8).toUpperCase()
      )
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
};

// ✅ Verify and enable 2FA
exports.verify2FASetup = async (req, res) => {
  const { token } = req.body;
  const { userId } = req.user;

  if (!token) {
    return res.status(400).json({ error: 'Verification token is required' });
  }

  try {
    const users = await query('SELECT two_factor_secret FROM Users WHERE id = ?', [userId]);

    if (users.length === 0 || !users[0].two_factor_secret) {
      return res.status(400).json({ error: '2FA setup not found. Generate setup first.' });
    }

    const verified = speakeasy.totp.verify({
      secret: users[0].two_factor_secret,
      encoding: 'base32',
      token,
      window: 6
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    await query('UPDATE Users SET two_factor_enabled = TRUE WHERE id = ?', [userId]);

    res.json({ message: '2FA enabled successfully', enabled: true });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ error: '2FA verification failed' });
  }
};

// ✅ Disable 2FA
exports.disable2FA = async (req, res) => {
  const { password, token } = req.body;
  const { userId } = req.user;

  if (!password || !token) {
    return res.status(400).json({ error: 'Password and 2FA token required' });
  }

  try {
    const users = await query('SELECT password, two_factor_secret FROM Users WHERE id = ?', [userId]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid password' });

    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token,
      window: 6
    });

    if (!verified) return res.status(400).json({ error: 'Invalid 2FA token' });

    await query(
      'UPDATE Users SET two_factor_enabled = FALSE, two_factor_secret = NULL WHERE id = ?',
      [userId]
    );

    res.json({ message: '2FA disabled successfully', enabled: false });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
};

// ✅ Register user (Admin only)
exports.register = async (req, res) => {
  const { username, password, role, employeeId } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password, and role are required' });
  }

  if (!['admin', 'hr', 'floor_manager', 'employee'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(
      'INSERT INTO Users (username, password, role, employee_id) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, role, employeeId || null]
    );

    res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// ✅ Get current user's profile
exports.getProfile = async (req, res) => {
  const { userId } = req.user;

  try {
    const users = await query(
      'SELECT id, username, role,two_factor_enabled, created_at FROM Users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};
