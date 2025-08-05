const bcrypt = require('bcrypt');

// =================== USERNAME VALIDATION ===================

const validateUsername = (username) => {
  // Username regex: alphanumeric, underscores, hyphens, 3-20 characters, no spaces
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  
  if (!usernameRegex.test(username)) {
    return {
      isValid: false,
      message: 'Username must be 3-20 characters long and contain only letters, numbers, underscores, and hyphens. No spaces allowed.'
    };
  }
  
  // Additional checks
  if (username.startsWith('_') || username.startsWith('-')) {
    return {
      isValid: false,
      message: 'Username cannot start with underscore or hyphen'
    };
  }
  
  if (username.endsWith('_') || username.endsWith('-')) {
    return {
      isValid: false,
      message: 'Username cannot end with underscore or hyphen'
    };
  }
  
  return { isValid: true };
};

// =================== PASSWORD VALIDATION ===================

const validatePassword = (password) => {
  if (!password || password.length < 6) {
    return {
      isValid: false,
      message: 'Password must be at least 6 characters long'
    };
  }
  
  return { isValid: true };
};

// =================== USER CRUD OPERATIONS ===================

// Get all users with their assigned offices
const getUsers = async (req, res) => {
  try {
    const [users] = await req.db.query(`
      SELECT 
        u.id,
        u.username,
        u.role,
        u.two_factor_enabled,
        u.created_at,
        u.updated_at,
        GROUP_CONCAT(
          CONCAT(o.id, ':', o.name, ':', COALESCE(o.location, ''))
          SEPARATOR '|'
        ) as assigned_offices
      FROM users u
      LEFT JOIN user_offices uo ON u.id = uo.user_id
      LEFT JOIN offices o ON uo.office_id = o.id
      GROUP BY u.id, u.username, u.role, u.two_factor_enabled, u.created_at, u.updated_at
      ORDER BY u.created_at DESC
    `);

    // Process the results to format assigned offices
    const processedUsers = users.map(user => {
      let offices = [];
      if (user.assigned_offices) {
        offices = user.assigned_offices.split('|').map(officeStr => {
          const [id, name, location] = officeStr.split(':');
          return {
            id: parseInt(id),
            name: name || '',
            location: location || ''
          };
        });
      }
      
      return {
        ...user,
        assigned_offices: offices
      };
    });

    res.json(processedUsers);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ 
      error: 'Failed to fetch users',
      details: 'An error occurred while retrieving user data. Please try again.' 
    });
  }
};

// Get single user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        error: 'Invalid user ID',
        details: 'Please provide a valid user ID.' 
      });
    }
    
    const [users] = await req.db.query(`
      SELECT 
        u.id,
        u.username,
        u.role,
        u.two_factor_enabled,
        u.created_at,
        u.updated_at
      FROM users u
      WHERE u.id = ?
    `, [id]);

    if (users.length === 0) {
      return res.status(404).json({ 
        error: 'User not found',
        details: 'No user exists with the provided ID.' 
      });
    }

    // Get assigned offices for this user
    const [offices] = await req.db.query(`
      SELECT o.id, o.name, o.location
      FROM offices o
      INNER JOIN user_offices uo ON o.id = uo.office_id
      WHERE uo.user_id = ?
      ORDER BY o.name
    `, [id]);

    const user = {
      ...users[0],
      assigned_offices: offices
    };

    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ 
      error: 'Failed to fetch user',
      details: 'An error occurred while retrieving user data. Please try again.' 
    });
  }
};

// Create new user
const createUser = async (req, res) => {
  try {
    const { username, password, role, office_ids = [], two_factor_enabled = false } = req.body;

    // Check for required fields
    if (!username || !password || !role) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'Username, password, and role are required fields.' 
      });
    }

    // Validate username format
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      return res.status(400).json({ 
        error: 'Invalid username format',
        details: usernameValidation.message 
      });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: 'Invalid password format',
        details: passwordValidation.message 
      });
    }

    // Validate role
    const validRoles = ['admin', 'hr', 'floor_manager'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        error: 'Invalid role',
        details: 'Role must be one of: admin, hr, or floor_manager.' 
      });
    }

    // Validate office_ids if provided
    if (office_ids.length > 0) {
      const invalidOfficeIds = office_ids.filter(id => !id || isNaN(parseInt(id)));
      if (invalidOfficeIds.length > 0) {
        return res.status(400).json({ 
          error: 'Invalid office IDs',
          details: 'All office IDs must be valid numbers.' 
        });
      }
    }

    // Check if username already exists (case-insensitive)
    const [existingUser] = await req.db.query('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [username]);
    if (existingUser.length > 0) {
      return res.status(409).json({ 
        error: 'Username already exists',
        details: 'This username is already taken. Please choose a different username.' 
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user (store username in lowercase for consistency)
    const [result] = await req.db.query(`
      INSERT INTO users (username, password, role, two_factor_enabled)
      VALUES (?, ?, ?, ?)
    `, [username.toLowerCase(), hashedPassword, role, two_factor_enabled ? 1 : 0]);

    const userId = result.insertId;

    // Assign offices if provided
    if (office_ids.length > 0) {
      try {
        const officeAssignments = office_ids.map(officeId => [userId, officeId]);
        await req.db.query(`
          INSERT INTO user_offices (user_id, office_id) VALUES ?
        `, [officeAssignments]);
      } catch (officeErr) {
        // If office assignment fails, we should clean up the created user
        await req.db.query('DELETE FROM users WHERE id = ?', [userId]);
        return res.status(400).json({ 
          error: 'Invalid office assignment',
          details: 'One or more office IDs are invalid. User creation failed.' 
        });
      }
    }

    // Fetch the created user with office assignments
    const [newUser] = await req.db.query(`
      SELECT 
        u.id,
        u.username,
        u.role,
        u.two_factor_enabled,
        u.created_at,
        u.updated_at
      FROM users u
      WHERE u.id = ?
    `, [userId]);

    // Get assigned offices
    const [offices] = await req.db.query(`
      SELECT o.id, o.name, o.location
      FROM offices o
      INNER JOIN user_offices uo ON o.id = uo.office_id
      WHERE uo.user_id = ?
      ORDER BY o.name
    `, [userId]);

    const user = {
      ...newUser[0],
      assigned_offices: offices
    };

    res.status(201).json({
      message: 'User created successfully',
      user: user
    });

  } catch (err) {
    console.error('Error creating user:', err);
    
    // Check for specific database errors
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ 
        error: 'Duplicate entry',
        details: 'This username already exists. Please choose a different username.' 
      });
    }
    
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ 
        error: 'Invalid office reference',
        details: 'One or more office IDs are invalid.' 
      });
    }

    res.status(500).json({ 
      error: 'Failed to create user',
      details: 'An unexpected error occurred. Please try again or contact support.' 
    });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, role, office_ids = [], two_factor_enabled } = req.body;

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        error: 'Invalid user ID',
        details: 'Please provide a valid user ID.' 
      });
    }

    // Check for required fields
    if (!username || !role) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'Username and role are required fields.' 
      });
    }

    // Validate username format
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      return res.status(400).json({ 
        error: 'Invalid username format',
        details: usernameValidation.message 
      });
    }

    // Validate password if provided
    if (password) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({ 
          error: 'Invalid password format',
          details: passwordValidation.message 
        });
      }
    }

    // Validate role
    const validRoles = ['admin', 'hr', 'floor_manager'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        error: 'Invalid role',
        details: 'Role must be one of: admin, hr, or floor_manager.' 
      });
    }

    // Check if user exists
    const [existingUser] = await req.db.query('SELECT id FROM users WHERE id = ?', [id]);
    if (existingUser.length === 0) {
      return res.status(404).json({ 
        error: 'User not found',
        details: 'No user exists with the provided ID.' 
      });
    }

    // Check if username is taken by another user (case-insensitive)
    const [usernameCheck] = await req.db.query('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?', [username, id]);
    if (usernameCheck.length > 0) {
      return res.status(409).json({ 
        error: 'Username already exists',
        details: 'This username is already taken by another user. Please choose a different username.' 
      });
    }

    // Prepare update query (store username in lowercase)
    let updateQuery = 'UPDATE users SET username = ?, role = ?, two_factor_enabled = ?';
    let updateParams = [username.toLowerCase(), role, two_factor_enabled ? 1 : 0];

    // Add password to update if provided
    if (password) {
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      updateQuery += ', password = ?';
      updateParams.push(hashedPassword);
    }

    updateQuery += ' WHERE id = ?';
    updateParams.push(id);

    // Update user
    await req.db.query(updateQuery, updateParams);

    // Update office assignments
    // First, remove existing assignments
    await req.db.query('DELETE FROM user_offices WHERE user_id = ?', [id]);

    // Then add new assignments
    if (office_ids.length > 0) {
      try {
        const officeAssignments = office_ids.map(officeId => [id, officeId]);
        await req.db.query(`
          INSERT INTO user_offices (user_id, office_id) VALUES ?
        `, [officeAssignments]);
      } catch (officeErr) {
        return res.status(400).json({ 
          error: 'Invalid office assignment',
          details: 'One or more office IDs are invalid.' 
        });
      }
    }

    // Fetch updated user with office assignments
    const [updatedUser] = await req.db.query(`
      SELECT 
        u.id,
        u.username,
        u.role,
        u.two_factor_enabled,
        u.created_at,
        u.updated_at
      FROM users u
      WHERE u.id = ?
    `, [id]);

    // Get assigned offices
    const [offices] = await req.db.query(`
      SELECT o.id, o.name, o.location
      FROM offices o
      INNER JOIN user_offices uo ON o.id = uo.office_id
      WHERE uo.user_id = ?
      ORDER BY o.name
    `, [id]);

    const user = {
      ...updatedUser[0],
      assigned_offices: offices
    };

    res.json({
      message: 'User updated successfully',
      user: user
    });

  } catch (err) {
    console.error('Error updating user:', err);
    
    // Check for specific database errors
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ 
        error: 'Duplicate entry',
        details: 'This username already exists. Please choose a different username.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to update user',
      details: 'An unexpected error occurred. Please try again or contact support.' 
    });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ 
        error: 'Invalid user ID',
        details: 'Please provide a valid user ID.' 
      });
    }

    // Check if user exists
    const [existingUser] = await req.db.query('SELECT id FROM users WHERE id = ?', [id]);
    if (existingUser.length === 0) {
      return res.status(404).json({ 
        error: 'User not found',
        details: 'No user exists with the provided ID.' 
      });
    }

    // Delete user office assignments first (foreign key constraint)
    await req.db.query('DELETE FROM user_offices WHERE user_id = ?', [id]);

    // Delete user
    await req.db.query('DELETE FROM users WHERE id = ?', [id]);

    res.json({ 
      message: 'User deleted successfully',
      details: 'User and all associated data have been removed.' 
    });

  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ 
      error: 'Failed to delete user',
      details: 'An unexpected error occurred. Please try again or contact support.' 
    });
  }
};

// Get all offices (for office selection in forms)
const getOfficeOptions = async (req, res) => {
  try {
    const [offices] = await req.db.query(`
      SELECT id, name, location
      FROM offices
      ORDER BY name
    `);
    res.json(offices);
  } catch (err) {
    console.error('Error fetching offices:', err);
    res.status(500).json({ 
      error: 'Failed to fetch offices',
      details: 'An error occurred while retrieving office data. Please try again.' 
    });
  }
};

// Get user count
const getUserCount = async (req, res) => {
  try {
    const [result] = await req.db.query('SELECT COUNT(*) AS total FROM users');
    res.json({ total: result[0].total });
  } catch (err) {
    console.error('Error fetching user count:', err);
    res.status(500).json({ 
      error: 'Failed to fetch user count',
      details: 'An error occurred while counting users. Please try again.' 
    });
  }
};

// Get role statistics
const getRoleStatistics = async (req, res) => {
  try {
    const [results] = await req.db.query(`
      SELECT 
        role,
        COUNT(*) as count
      FROM users
      GROUP BY role
      ORDER BY count DESC
    `);
    res.json(results);
  } catch (err) {
    console.error('Error fetching role statistics:', err);
    res.status(500).json({ 
      error: 'Failed to fetch role statistics',
      details: 'An error occurred while retrieving role data. Please try again.' 
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getOfficeOptions,
  getUserCount,
  getRoleStatistics
};
