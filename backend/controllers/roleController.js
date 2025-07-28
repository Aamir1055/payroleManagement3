const bcrypt = require('bcrypt');

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
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Get single user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
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
      return res.status(404).json({ error: 'User not found' });
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
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// Create new user
const createUser = async (req, res) => {
  try {
    const { username, password, role, office_ids = [], two_factor_enabled = false } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Username, password, and role are required' });
    }

    // Validate role
    const validRoles = ['admin', 'hr', 'floor_manager'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, hr, or floor_manager' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Check if username already exists
    const [existingUser] = await req.db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Create user
    const [result] = await req.db.query(`
      INSERT INTO users (username, password, role, two_factor_enabled)
      VALUES (?, ?, ?, ?)
    `, [username, hashedPassword, role, two_factor_enabled ? 1 : 0]);

    const userId = result.insertId;

    // Assign offices if provided
    if (office_ids.length > 0) {
      const officeAssignments = office_ids.map(officeId => [userId, officeId]);
      await req.db.query(`
        INSERT INTO user_offices (user_id, office_id) VALUES ?
      `, [officeAssignments]);
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

    res.status(201).json(user);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, role, office_ids = [], two_factor_enabled } = req.body;

    if (!username || !role) {
      return res.status(400).json({ error: 'Username and role are required' });
    }

    // Validate role
    const validRoles = ['admin', 'hr', 'floor_manager'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, hr, or floor_manager' });
    }

    // Check if user exists
    const [existingUser] = await req.db.query('SELECT id FROM users WHERE id = ?', [id]);
    if (existingUser.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if username is taken by another user
    const [usernameCheck] = await req.db.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, id]);
    if (usernameCheck.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Prepare update query
    let updateQuery = 'UPDATE users SET username = ?, role = ?, two_factor_enabled = ?';
    let updateParams = [username, role, two_factor_enabled ? 1 : 0];

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
      const officeAssignments = office_ids.map(officeId => [id, officeId]);
      await req.db.query(`
        INSERT INTO user_offices (user_id, office_id) VALUES ?
      `, [officeAssignments]);
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

    res.json(user);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const [existingUser] = await req.db.query('SELECT id FROM users WHERE id = ?', [id]);
    if (existingUser.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user office assignments first (foreign key constraint)
    await req.db.query('DELETE FROM user_offices WHERE user_id = ?', [id]);

    // Delete user
    await req.db.query('DELETE FROM users WHERE id = ?', [id]);

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
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
    res.status(500).json({ error: 'Failed to fetch offices' });
  }
};

// Get user count
const getUserCount = async (req, res) => {
  try {
    const [result] = await req.db.query('SELECT COUNT(*) AS total FROM users');
    res.json({ total: result[0].total });
  } catch (err) {
    console.error('Error fetching user count:', err);
    res.status(500).json({ error: 'Failed to fetch user count' });
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
    res.status(500).json({ error: 'Failed to fetch role statistics' });
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
