const pool = require('../config/database');

// Monthly summary with category breakdown
const getMonthlySummary = async (req, res) => {
  const { month, year } = req.query;
  const userId = req.user.id;
  const m = parseInt(month) || new Date().getMonth() + 1;
  const y = parseInt(year) || new Date().getFullYear();

  try {
    const [totals, byCategory, dailyTrend, budgets] = await Promise.all([
      // Total for month
      pool.query(
        `SELECT 
          SUM(amount) as total,
          COUNT(*) as count,
          AVG(amount) as average
         FROM expenses
         WHERE user_id = $1 AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3`,
        [userId, m, y]
      ),
      // By category
      pool.query(
        `SELECT c.id, c.name, c.icon, c.color,
          SUM(e.amount) as total,
          COUNT(*) as count
         FROM expenses e
         JOIN categories c ON e.category_id = c.id
         WHERE e.user_id = $1 AND EXTRACT(MONTH FROM e.date) = $2 AND EXTRACT(YEAR FROM e.date) = $3
         GROUP BY c.id, c.name, c.icon, c.color
         ORDER BY total DESC`,
        [userId, m, y]
      ),
      // Daily spending trend
      pool.query(
        `SELECT 
          EXTRACT(DAY FROM date) as day,
          SUM(amount) as total
         FROM expenses
         WHERE user_id = $1 AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3
         GROUP BY day ORDER BY day`,
        [userId, m, y]
      ),
      // Budgets for month
      pool.query(
        `SELECT b.*, c.name as category_name, c.icon, c.color,
          COALESCE(SUM(e.amount), 0) as spent
         FROM budgets b
         JOIN categories c ON b.category_id = c.id
         LEFT JOIN expenses e ON e.category_id = b.category_id 
           AND e.user_id = b.user_id
           AND EXTRACT(MONTH FROM e.date) = b.month
           AND EXTRACT(YEAR FROM e.date) = b.year
         WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3
         GROUP BY b.id, c.name, c.icon, c.color`,
        [userId, m, y]
      ),
    ]);

    // Previous month for comparison
    const prevMonth = m === 1 ? 12 : m - 1;
    const prevYear = m === 1 ? y - 1 : y;
    const prevTotal = await pool.query(
      `SELECT SUM(amount) as total FROM expenses
       WHERE user_id = $1 AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3`,
      [userId, prevMonth, prevYear]
    );

    const currentTotal = parseFloat(totals.rows[0].total) || 0;
    const previousTotal = parseFloat(prevTotal.rows[0].total) || 0;
    const changePercent = previousTotal > 0
      ? ((currentTotal - previousTotal) / previousTotal) * 100
      : 0;

    res.json({
      summary: {
        total: currentTotal,
        count: parseInt(totals.rows[0].count),
        average: parseFloat(totals.rows[0].average) || 0,
        previousTotal,
        changePercent: Math.round(changePercent * 10) / 10,
      },
      byCategory: byCategory.rows,
      dailyTrend: dailyTrend.rows,
      budgets: budgets.rows,
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

// Yearly overview
const getYearlySummary = async (req, res) => {
  const { year } = req.query;
  const userId = req.user.id;
  const y = parseInt(year) || new Date().getFullYear();

  try {
    const [monthly, byCategory] = await Promise.all([
      pool.query(
        `SELECT 
          EXTRACT(MONTH FROM date) as month,
          SUM(amount) as total,
          COUNT(*) as count
         FROM expenses
         WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2
         GROUP BY month ORDER BY month`,
        [userId, y]
      ),
      pool.query(
        `SELECT c.id, c.name, c.icon, c.color, SUM(e.amount) as total
         FROM expenses e
         JOIN categories c ON e.category_id = c.id
         WHERE e.user_id = $1 AND EXTRACT(YEAR FROM e.date) = $2
         GROUP BY c.id, c.name, c.icon, c.color
         ORDER BY total DESC`,
        [userId, y]
      ),
    ]);

    const yearTotal = monthly.rows.reduce((sum, r) => sum + parseFloat(r.total), 0);

    res.json({
      year: y,
      total: yearTotal,
      monthly: monthly.rows,
      byCategory: byCategory.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch yearly summary' });
  }
};

// AI-powered smart insights
const getInsights = async (req, res) => {
  const userId = req.user.id;
  const now = new Date();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  const prevMonth = m === 1 ? 12 : m - 1;
  const prevYear = m === 1 ? y - 1 : y;

  try {
    const [current, previous, topCategories] = await Promise.all([
      pool.query(
        `SELECT c.name, SUM(e.amount) as total
         FROM expenses e JOIN categories c ON e.category_id = c.id
         WHERE e.user_id = $1 AND EXTRACT(MONTH FROM e.date) = $2 AND EXTRACT(YEAR FROM e.date) = $3
         GROUP BY c.name ORDER BY total DESC`,
        [userId, m, y]
      ),
      pool.query(
        `SELECT c.name, SUM(e.amount) as total
         FROM expenses e JOIN categories c ON e.category_id = c.id
         WHERE e.user_id = $1 AND EXTRACT(MONTH FROM e.date) = $2 AND EXTRACT(YEAR FROM e.date) = $3
         GROUP BY c.name`,
        [userId, prevMonth, prevYear]
      ),
      pool.query(
        `SELECT c.name, SUM(e.amount) as total, COUNT(*) as count
         FROM expenses e JOIN categories c ON e.category_id = c.id
         WHERE e.user_id = $1 AND e.date >= NOW() - INTERVAL '90 days'
         GROUP BY c.name ORDER BY total DESC LIMIT 3`,
        [userId]
      ),
    ]);

    const insights = [];
    const currentMap = {};
    const previousMap = {};

    current.rows.forEach((r) => (currentMap[r.name] = parseFloat(r.total)));
    previous.rows.forEach((r) => (previousMap[r.name] = parseFloat(r.total)));

    // Generate insights by comparing months
    Object.entries(currentMap).forEach(([category, amount]) => {
      const prev = previousMap[category] || 0;
      if (prev > 0) {
        const change = ((amount - prev) / prev) * 100;
        if (change > 20) {
          insights.push({
            type: 'warning',
            icon: '📈',
            message: `You spent ${Math.round(change)}% more on ${category} this month`,
            category,
            change: Math.round(change),
          });
        } else if (change < -20) {
          insights.push({
            type: 'success',
            icon: '📉',
            message: `Great job! You reduced ${category} spending by ${Math.abs(Math.round(change))}%`,
            category,
            change: Math.round(change),
          });
        }
      }
    });

    // Top spending category insight
    if (topCategories.rows.length > 0) {
      const top = topCategories.rows[0];
      insights.push({
        type: 'info',
        icon: '💡',
        message: `${top.name} is your highest spending category over the last 3 months`,
        category: top.name,
      });
    }

    // Budget adherence check
    const budgetCheck = await pool.query(
      `SELECT b.amount as budget, COALESCE(SUM(e.amount), 0) as spent, c.name
       FROM budgets b
       JOIN categories c ON b.category_id = c.id
       LEFT JOIN expenses e ON e.category_id = b.category_id
         AND e.user_id = b.user_id
         AND EXTRACT(MONTH FROM e.date) = b.month
         AND EXTRACT(YEAR FROM e.date) = b.year
       WHERE b.user_id = $1 AND b.month = $2 AND b.year = $3
       GROUP BY b.amount, c.name
       HAVING COALESCE(SUM(e.amount), 0) > b.amount * 0.8`,
      [userId, m, y]
    );

    budgetCheck.rows.forEach((r) => {
      const pct = Math.round((r.spent / r.budget) * 100);
      insights.push({
        type: 'alert',
        icon: '⚠️',
        message: `You've used ${pct}% of your ${r.name} budget this month`,
        category: r.name,
      });
    });

    res.json({ insights });
  } catch (err) {
    console.error('Insights error:', err);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
};

module.exports = { getMonthlySummary, getYearlySummary, getInsights };
