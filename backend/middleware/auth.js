const jwt = require('jsonwebtoken');
const { query } = require('../utils/dbPromise');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// ✅ Verify JWT Token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(403).json({ error: 'Invalid token' });
    }

    // Add user info to request (skip DB check for performance)
    req.user = {
      userId: user.userId,
      username: user.username,
      role: user.role
    };
    next();
  });
};

// ✅ Role-based Access Control
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role;
    
    // Convert single role to array for consistency
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions', 
        required: roles,
        current: userRole 
      });
    }

    next();
  };
};

// ✅ Admin only access
const requireAdmin = requireRole(['admin']);

// ✅ Admin or HR access
const requireHR = requireRole(['admin', 'hr']);

// ✅ Admin, HR, or Floor Manager access
const requireManager = requireRole(['admin', 'hr', 'floor_manager']);

// ✅ All authenticated users
const requireAuth = verifyToken;

// ✅ Optional authentication (for public endpoints that can benefit from user context)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(); // Continue without user context
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) {
      req.user = user;
    }
    next();
  });
};

// ✅ Add user's office assignments to request context
const addUserOffices = async (req, res, next) => {
  if (!req.user) {
    return next(); // Skip if no user context
  }

  try {
    // Admin users have access to all offices
    if (req.user.role === 'admin') {
      const allOffices = await query('SELECT id FROM offices');
      req.userOffices = allOffices.map(office => office.id);
      return next();
    }

    // Get user's assigned offices for HR and floor_manager roles
    const userOffices = await query(
      'SELECT office_id FROM user_offices WHERE user_id = ?',
      [req.user.userId]
    );
    
    req.userOffices = userOffices.map(uo => uo.office_id);
    
    // If user has no office assignments, they can't access any data
    if (req.userOffices.length === 0) {
      return res.status(403).json({ 
        error: 'Access denied: No office assignments found for your account' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Error fetching user offices:', error);
    res.status(500).json({ error: 'Failed to verify office access' });
  }
};

// ✅ Helper function to build office filter SQL
const buildOfficeFilter = (req, tableAlias = 'e') => {
  if (!req.userOffices || req.userOffices.length === 0) {
    return { whereClause: '', params: [] };
  }
  
  // Admin has access to all offices, so no filter needed
  if (req.user && req.user.role === 'admin') {
    return { whereClause: '', params: [] };
  }
  
  const placeholders = req.userOffices.map(() => '?').join(',');
  // Use correct column name based on table alias
  const columnName = tableAlias === 'o' ? `${tableAlias}.id` : `${tableAlias}.office_id`;
  return {
    whereClause: `${columnName} IN (${placeholders})`,
    params: req.userOffices
  };
};

module.exports = {
  verifyToken,
  requireRole,
  requireAdmin,
  requireHR,
  requireManager,
  requireAuth,
  optionalAuth,
  addUserOffices,
  buildOfficeFilter
};
