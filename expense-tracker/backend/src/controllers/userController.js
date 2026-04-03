const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const getProfile = async (req, res) => {
  res.json(req.user);
};

const updateProfile = async (req, res) => {
  const { name, currency, monthly_budget, notifications_enabled, dark_mode } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET
        name = COALESCE($1, name),
        currency = COALESCE($2, currency),
        monthly_budget = COALESCE($3, monthly_budget),
        notifications_enabled = COALESCE($4, notifications_enabled),
        dark_mode = COALESCE($5, dark_mode),
        updated_at = NOW()
       WHERE id = $6
       RETURNING id, name, email, currency, monthly_budget, notifications_enabled, dark_mode`,
      [name, currency, monthly_budget, notifications_enabled, dark_mode, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password' });
  }
};

const getCategories = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

const exportCSV = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        e.date,
        c.name as category,
        e.amount,
        e.currency,
        e.description,
        e.merchant,
        e.notes,
        e.source,
        e.created_at
       FROM expenses e
       JOIN categories c ON e.category_id = c.id
       WHERE e.user_id = $1
       ORDER BY e.date DESC`,
      [req.user.id]
    );

    // Create CSV header
    const header = 'Date,Category,Amount,Currency,Description,Merchant,Notes,Source,Created At\n';
    
    // Create CSV rows
    const rows = result.rows.map(row => {
      return [
        row.date,
        row.category,
        row.amount,
        row.currency,
        `"${(row.description || '').replace(/"/g, '""')}"`,
        `"${(row.merchant || '').replace(/"/g, '""')}"`,
        `"${(row.notes || '').replace(/"/g, '""')}"`,
        row.source,
        row.created_at
      ].join(',');
    }).join('\n');

    const csv = header + rows;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=expenses.csv');
    res.send(csv);
  } catch (err) {
    console.error('CSV export error:', err);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
};

module.exports = { getProfile, updateProfile, changePassword, getCategories, exportCSV };
