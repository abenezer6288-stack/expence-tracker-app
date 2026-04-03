const pool = require('../config/database');

const getBudgets = async (req, res) => {
  const { month, year } = req.query;
  const m = parseInt(month) || new Date().getMonth() + 1;
  const y = parseInt(year) || new Date().getFullYear();

  try {
    const result = await pool.query(
      `SELECT b.*, c.name as category_name, c.icon, c.color,
        COALESCE(SUM(e.amount), 0) as spent,
        b.amount - COALESCE(SUM(e.amount), 0) as remaining,
        CASE WHEN b.amount > 0 
          THEN ROUND((COALESCE(SUM(e.amount), 0) / b.amount) * 100, 1)
          ELSE 0 END as percentage_used
       FROM budgets b
       JOIN categories c ON b.category_id = c.id
       LEFT JOIN expenses e ON e.category_id = b.category_id
         AND e.user_id = b.user_id
         AND EXTRACT(MONTH FROM e.date) = b.month
         AND EXTRACT(YEAR FROM e.date) = b.year
       WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3
       GROUP BY b.id, c.name, c.icon, c.color
       ORDER BY c.name`,
      [req.user.id, m, y]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
};

const upsertBudget = async (req, res) => {
  const { category_id, amount, month, year } = req.body;
  const m = parseInt(month) || new Date().getMonth() + 1;
  const y = parseInt(year) || new Date().getFullYear();

  try {
    const result = await pool.query(
      `INSERT INTO budgets (user_id, category_id, amount, month, year)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, category_id, month, year)
       DO UPDATE SET amount = EXCLUDED.amount
       RETURNING *`,
      [req.user.id, category_id, amount, m, y]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Budget upsert error:', err);
    res.status(500).json({ error: 'Failed to save budget' });
  }
};

const deleteBudget = async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    res.json({ message: 'Budget deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete budget' });
  }
};

module.exports = { getBudgets, upsertBudget, deleteBudget };
