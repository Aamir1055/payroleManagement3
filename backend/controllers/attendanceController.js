const db = require('../db');
const XLSX = require('xlsx');

// Helper: Convert Excel serial date to YYYY-MM-DD
function excelDateToJSDate(serial) {
  // Excel dates are 1-based, JavaScript dates are 0-based, and Excel's epoch is 1900-01-01
  const utcDays = Math.floor(serial - 1);
  const utcValue = utcDays * 86400 * 1000;
  const date = new Date(utcValue);
  // Handle Excel's leap year bug (1900 is not a leap year, but Excel thinks it is)
  if (serial >= 60) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return date;
}

function formatDateForDB(date) {
  if (!date) return null;
  // If date is already in YYYY-MM-DD format, return as-is
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  // If date is a number (Excel serial), convert to Date object then to YYYY-MM-DD
  if (typeof date === 'number') {
    const jsDate = excelDateToJSDate(date);
    return jsDate.toISOString().split('T')[0];
  }
  // If date is a Date object, format as YYYY-MM-DD
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  // Unsupported format
  return null;
}

exports.upload = async (req, res) => {
  console.log('[Attendance] Upload endpoint hit. File:', req.file?.originalname);
  if (!req.file) {
    console.error('[Attendance] No file uploaded');
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  try {
    console.log('[Attendance] Reading Excel file:', req.file.path);
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    console.log('[Attendance] Sheet name:', sheetName);

    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    console.log('[Attendance] First row of data:', data[0]);

    const requiredColumns = ['Employee ID', 'Date', 'Punch In', 'Punch Out'];
    if (data[0]) {
      console.log('[Attendance] Checking for required columns:', requiredColumns);
      for (const col of requiredColumns) {
        if (!(col in data[0])) {
          console.error(`[Attendance] Missing required column: ${col}`);
          throw new Error(`Required column "${col}" not found in Excel file`);
        }
      }
    } else {
      console.error('[Attendance] Excel file has no data rows');
      throw new Error('Excel file has no data');
    }

    const validRecords = [];
    data.forEach((row, index) => {
      const dateStr = formatDateForDB(row.Date);
      if (!dateStr || dateStr === '1970-01-01' || dateStr === '0000-00-00') {
        console.log(`[Attendance] Skipping row ${index + 1}: Invalid date for employee ${row['Employee ID']}`);
        return;
      }
      validRecords.push({
        employee_id: row['Employee ID'],
        date: dateStr,
        punch_in: row['Punch In'] || null,
        punch_out: row['Punch Out'] || null,
      });
    });

    console.log('[Attendance] Valid records count:', validRecords.length);
    if (validRecords.length === 0) {
      throw new Error('No valid records found after date validation');
    }
    console.log('[Attendance] Sample valid record:', validRecords[0]);

    await db.query(
      'INSERT INTO attendance (employee_id, date, punch_in, punch_out) VALUES ?',
      [validRecords.map(r => [r.employee_id, r.date, r.punch_in, r.punch_out])]
    );

    console.log('[Attendance] Insert successful. Records processed:', validRecords.length);
    res.json({ success: true, message: 'Attendance data uploaded successfully', recordsProcessed: validRecords.length });
  } catch (err) {
    console.error('[Attendance] Upload failed:', err.message, err.stack);
    res.status(500).json({ success: false, message: 'Upload failed: ' + err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM attendance');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getByEmployee = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM attendance WHERE employee_id = ?', [req.params.employeeId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.filterByDate = async (req, res) => {
  const { start, end } = req.query;
  try {
    const [rows] = await db.query('SELECT * FROM attendance WHERE date BETWEEN ? AND ?', [start, end]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
