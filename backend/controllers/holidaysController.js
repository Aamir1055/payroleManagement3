const { query } = require('../utils/dbPromise');

// Helper function to format date as local YYYY-MM-DD string (avoid timezone issues)
function formatDateAsLocalYYYYMMDD(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Get all holidays
exports.getAllHolidays = async (req, res) => {
  try {
    const results = await query('SELECT * FROM holidays ORDER BY date ASC');
    res.json(results);
  } catch (err) {
    console.error('Error fetching holidays:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get holidays for a specific month/year
exports.getHolidaysByMonth = async (req, res) => {
  const { month, year } = req.query;

  if (!month || !year) {
    return res.status(400).json({ error: 'Month and year are required' });
  }

  try {
    const paddedMonth = String(month).padStart(2, '0');
    const startDate = `${year}-${paddedMonth}-01`;
    const endDate = `${year}-${paddedMonth}-31`;

    const results = await query(
      'SELECT * FROM holidays WHERE date BETWEEN ? AND ? ORDER BY date ASC',
      [startDate, endDate]
    );
    res.json(results);
  } catch (err) {
    console.error('Error fetching holidays by month:', err);
    res.status(500).json({ error: err.message });
  }
};

// Calculate working days for a month (excluding Sundays and holidays)
exports.getWorkingDays = async (req, res) => {
  const { month, year } = req.query;

  if (!month || !year) {
    return res.status(400).json({ error: 'Month and year are required' });
  }

  try {
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (isNaN(monthNum) || isNaN(yearNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: 'Invalid month or year' });
    }

    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

    // Count Sundays
    let sundays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(yearNum, monthNum - 1, day);
      if (date.getDay() === 0) sundays++;
    }

    const startDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    const endDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-${daysInMonth}`;

    const results = await query(
      'SELECT COUNT(*) as holidayCount FROM holidays WHERE date BETWEEN ? AND ?',
      [startDate, endDate]
    );

    const holidays = results[0].holidayCount || 0;
    const workingDays = Math.max(daysInMonth - sundays - holidays, 0);

    res.json({
      month: monthNum,
      year: yearNum,
      totalDays: daysInMonth,
      sundays,
      holidays,
      workingDays
    });
  } catch (err) {
    console.error('Error calculating working days:', err);
    res.status(500).json({ error: err.message });
  }
};

// Add new holiday
exports.addHoliday = async (req, res) => {
  const { name, date, reason } = req.body;

  if (!name || !date || !reason) {
    return res.status(400).json({ error: 'Name, date, and reason are required' });
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
  }

  try {
    const result = await query(
      'INSERT INTO holidays (name, date, reason) VALUES (?, ?, ?)',
      [name, date, reason]
    );

    res.status(201).json({
      id: result.insertId,
      name,
      date,
      reason,
      message: 'Holiday added successfully'
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Holiday already exists for this date' });
    }
    console.error('Error adding holiday:', err);
    res.status(500).json({ error: err.message });
  }
};

// Update holiday
exports.updateHoliday = async (req, res) => {
  const { id } = req.params;
  const { name, date, reason } = req.body;

  if (!name && !date && !reason) {
    return res.status(400).json({ error: 'At least one field is required to update' });
  }

  try {
    const updates = [];
    const values = [];

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }

    if (date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
      }
      updates.push('date = ?');
      values.push(date);
    }

    if (reason) {
      updates.push('reason = ?');
      values.push(reason);
    }

    values.push(id);

    const result = await query(
      `UPDATE holidays SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Holiday not found' });
    }

    res.json({ message: 'Holiday updated successfully' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Holiday already exists for this date' });
    }
    console.error('Error updating holiday:', err);
    res.status(500).json({ error: err.message });
  }
};

// Delete holiday
exports.deleteHoliday = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query('DELETE FROM holidays WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Holiday not found' });
    }

    res.json({ message: 'Holiday deleted successfully' });
  } catch (err) {
    console.error('Error deleting holiday:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get upcoming holidays
exports.getUpcomingHolidays = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const results = await query(
      'SELECT * FROM holidays WHERE date >= ? ORDER BY date ASC LIMIT 10',
      [today]
    );

    res.json(results);
  } catch (err) {
    console.error('Error fetching upcoming holidays:', err);
    res.status(500).json({ error: err.message });
  }
};
