const pool = require('../config/database');

const getExpenses = async (req, res) => {
  const { page = 1, limit = 20, category, startDate, endDate, search } = req.query;
  const offset = (page - 1) * limit;
  const userId = req.user.id;

  try {
    let conditions = ['e.user_id = $1'];
    let params = [userId];
    let idx = 2;

    if (category) {
      conditions.push(`e.category_id = $${idx++}`);
      params.push(category);
    }
    if (startDate) {
      conditions.push(`e.date >= $${idx++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`e.date <= $${idx++}`);
      params.push(endDate);
    }
    if (search) {
      conditions.push(`(e.description ILIKE $${idx} OR e.merchant ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.join(' AND ');

    const [expenses, countResult] = await Promise.all([
      pool.query(
        `SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color
         FROM expenses e
         LEFT JOIN categories c ON e.category_id = c.id
         WHERE ${where}
         ORDER BY e.date DESC, e.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM expenses e WHERE ${where}`, params),
    ]);

    res.json({
      expenses: expenses.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(countResult.rows[0].count / limit),
    });
  } catch (err) {
    console.error('Get expenses error:', err);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
};

const getExpense = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM expenses e
       LEFT JOIN categories c ON e.category_id = c.id
       WHERE e.id = $1 AND e.user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expense' });
  }
};

const createExpense = async (req, res) => {
  const { category_id, amount, currency, description, merchant, notes, tags, date, source } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO expenses (user_id, category_id, amount, currency, description, merchant, notes, tags, date, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [req.user.id, category_id, amount, currency || req.user.currency, description, merchant, notes, tags, date || new Date(), source || 'manual']
    );

    // Fetch with category info
    const expense = await pool.query(
      `SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM expenses e LEFT JOIN categories c ON e.category_id = c.id WHERE e.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(expense.rows[0]);
  } catch (err) {
    console.error('Create expense error:', err);
    res.status(500).json({ error: 'Failed to create expense' });
  }
};

const updateExpense = async (req, res) => {
  const { category_id, amount, currency, description, merchant, notes, tags, date } = req.body;
  try {
    const result = await pool.query(
      `UPDATE expenses SET
        category_id = COALESCE($1, category_id),
        amount = COALESCE($2, amount),
        currency = COALESCE($3, currency),
        description = COALESCE($4, description),
        merchant = COALESCE($5, merchant),
        notes = COALESCE($6, notes),
        tags = COALESCE($7, tags),
        date = COALESCE($8, date),
        updated_at = NOW()
       WHERE id = $9 AND user_id = $10
       RETURNING *`,
      [category_id, amount, currency, description, merchant, notes, tags, date, req.params.id, req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const expense = await pool.query(
      `SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM expenses e LEFT JOIN categories c ON e.category_id = c.id WHERE e.id = $1`,
      [result.rows[0].id]
    );

    res.json(expense.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update expense' });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM expenses WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
};

module.exports = { getExpenses, getExpense, createExpense, updateExpense, deleteExpense };
