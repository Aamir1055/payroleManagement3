const { query } = require('../utils/dbPromise');

// ✅ Get all holidays
exports.getAllHolidays = async (req, res) => {
  try {
    const results = await query('SELECT * FROM Holidays ORDER BY date ASC');
    res.json(results);
  } catch (err) {
    console.error('Error fetching holidays:', err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Get holidays for a specific month/year
exports.getHolidaysByMonth = (req, res) => {
  const { month, year } = req.query;

  if (!month || !year) {
    return res.status(400).json({ error: 'Month and year are required' });
  }

  const paddedMonth = String(month).padStart(2, '0');
  const startDate = `${year}-${paddedMonth}-01`;
  const endDate = `${year}-${paddedMonth}-31`;

  db.query(
    'SELECT * FROM Holidays WHERE date BETWEEN ? AND ? ORDER BY date ASC',
    [startDate, endDate],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
};

// ✅ Calculate working days for a month (excluding Sundays and holidays)
exports.getWorkingDays = (req, res) => {
  const { month, year } = req.query;

  if (!month || !year) {
    return res.status(400).json({ error: 'Month and year are required' });
  }

  const monthNum = parseInt(month);
  const yearNum = parseInt(year);

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

  db.query(
    'SELECT COUNT(*) as holidayCount FROM Holidays WHERE date BETWEEN ? AND ?',
    [startDate, endDate],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

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
    }
  );
};

// ✅ Add new holiday
exports.addHoliday = (req, res) => {
  const { name, date, reason } = req.body;

  if (!name || !date || !reason) {
    return res.status(400).json({ error: 'Name, date, and reason are required' });
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
  }

  db.query(
    'INSERT INTO Holidays (name, date, reason) VALUES (?, ?, ?)',
    [name, date, reason],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: 'Holiday already exists for this date' });
        }
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({
        id: result.insertId,
        name,
        date,
        reason,
        message: 'Holiday added successfully'
      });
    }
  );
};

// ✅ Update holiday
exports.updateHoliday = (req, res) => {
  const { id } = req.params;
  const { name, date, reason } = req.body;

  if (!name && !date && !reason) {
    return res.status(400).json({ error: 'At least one field is required to update' });
  }

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

  updates.push('updated_at = NOW()');
  values.push(id);

  db.query(
    `UPDATE Holidays SET ${updates.join(', ')} WHERE id = ?`,
    values,
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: 'Holiday already exists for this date' });
        }
        return res.status(500).json({ error: err.message });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Holiday not found' });
      }

      res.json({ message: 'Holiday updated successfully' });
    }
  );
};

// ✅ Delete holiday
exports.deleteHoliday = (req, res) => {
  const { id } = req.params;

  db.query('DELETE FROM Holidays WHERE id = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Holiday not found' });
    }

    res.json({ message: 'Holiday deleted successfully' });
  });
};

// ✅ Get upcoming holidays
exports.getUpcomingHolidays = (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  db.query(
    'SELECT * FROM Holidays WHERE date >= ? ORDER BY date ASC LIMIT 10',
    [today],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
};
