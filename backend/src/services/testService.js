const { pool } = require('../config/db');
const { generateNextId } = require('../utils/validation');

/**
 * Fetch all diagnostic tests with joined subtype attributes (Pathology / Radiology).
 */
async function getTests(query = {}) {
  const whereClauses = [];
  const params = [];

  if (query.category) {
    whereClauses.push('t.Test_Category = ?');
    params.push(query.category);
  }

  if (query.q) {
    whereClauses.push('(t.Test_Name LIKE ? OR t.Test_ID LIKE ?)');
    const like = `%${query.q.trim()}%`;
    params.push(like, like);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
    SELECT 
      t.Test_ID,
      t.Test_Name,
      t.Test_Category,
      t.Price,
      t.Unit,
      pt.Specimen_Type,
      rt.Imaging_Modality
    FROM Test t
    LEFT JOIN PathologyTest pt ON t.Test_ID = pt.Test_ID
    LEFT JOIN RadiologyTest rt ON t.Test_ID = rt.Test_ID
    ${whereSql}
    ORDER BY t.Test_Category ASC, t.Test_Name ASC
  `;

  const [rows] = await pool.query(sql, params);
  return rows.map((r) => ({
    ...r,
    Price: Number(r.Price),
  }));
}

/**
 * Fetch single test by ID with subtype details.
 */
async function getTestById(testId) {
  const sql = `
    SELECT 
      t.Test_ID,
      t.Test_Name,
      t.Test_Category,
      t.Price,
      t.Unit,
      pt.Specimen_Type,
      rt.Imaging_Modality
    FROM Test t
    LEFT JOIN PathologyTest pt ON t.Test_ID = pt.Test_ID
    LEFT JOIN RadiologyTest rt ON t.Test_ID = rt.Test_ID
    WHERE t.Test_ID = ?
  `;

  const [rows] = await pool.query(sql, [testId]);
  if (rows.length === 0) return null;

  return {
    ...rows[0],
    Price: Number(rows[0].Price),
  };
}

/**
 * Create a new test with its PathologyTest or RadiologyTest subtype in a transaction.
 */
async function createTest(data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let testId = data.Test_ID;
    if (!testId) {
      const [existing] = await conn.query('SELECT Test_ID FROM Test');
      const existingIds = existing.map((r) => r.Test_ID);
      testId = generateNextId(existingIds, 'T', 3);
    }

    const price = parseInt(data.Price, 10) || 0;
    const unit = data.Unit ? data.Unit.trim() : null;

    // 1. Insert Base Test
    await conn.query(
      `INSERT INTO Test (Test_ID, Test_Name, Test_Category, Price, Unit)
       VALUES (?, ?, ?, ?, ?)`,
      [testId, data.Test_Name.trim(), data.Test_Category, price, unit]
    );

    // 2. Insert Subtype
    if (data.Test_Category === 'Pathology') {
      const specimen = data.Specimen_Type || 'Blood';
      await conn.query(
        `INSERT INTO PathologyTest (Test_ID, Specimen_Type) VALUES (?, ?)`,
        [testId, specimen]
      );
    } else if (data.Test_Category === 'Radiology') {
      const modality = data.Imaging_Modality || 'X-Ray';
      await conn.query(
        `INSERT INTO RadiologyTest (Test_ID, Imaging_Modality) VALUES (?, ?)`,
        [testId, modality]
      );
    }

    await conn.commit();

    return getTestById(testId);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

/**
 * Update an existing test and its subtype attributes in a transaction.
 */
async function updateTest(testId, data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query('SELECT * FROM Test WHERE Test_ID = ?', [testId]);
    if (existing.length === 0) {
      await conn.rollback();
      return null;
    }

    const current = existing[0];
    const updates = [];
    const params = [];

    if (data.Test_Name !== undefined) {
      updates.push('Test_Name = ?');
      params.push(data.Test_Name.trim());
    }
    if (data.Price !== undefined) {
      updates.push('Price = ?');
      params.push(parseInt(data.Price, 10));
    }
    if (data.Unit !== undefined) {
      updates.push('Unit = ?');
      params.push(data.Unit ? data.Unit.trim() : null);
    }

    if (updates.length > 0) {
      params.push(testId);
      await conn.query(`UPDATE Test SET ${updates.join(', ')} WHERE Test_ID = ?`, params);
    }

    // Update Subtype tables
    const category = data.Test_Category || current.Test_Category;

    if (category === 'Pathology' && data.Specimen_Type) {
      await conn.query(
        `INSERT INTO PathologyTest (Test_ID, Specimen_Type) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE Specimen_Type = VALUES(Specimen_Type)`,
        [testId, data.Specimen_Type]
      );
    } else if (category === 'Radiology' && data.Imaging_Modality) {
      await conn.query(
        `INSERT INTO RadiologyTest (Test_ID, Imaging_Modality) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE Imaging_Modality = VALUES(Imaging_Modality)`,
        [testId, data.Imaging_Modality]
      );
    }

    await conn.commit();
    return getTestById(testId);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

/**
 * Delete a test if not referenced in any OrderIncludesTest.
 */
async function deleteTest(testId) {
  const [orders] = await pool.query(
    `SELECT COUNT(*) AS count FROM OrderIncludesTest WHERE Test_ID = ?`,
    [testId]
  );

  if (orders[0] && orders[0].count > 0) {
    const error = new Error('Test cannot be deleted because it is referenced by existing orders');
    error.statusCode = 409;
    error.code = 'CONFLICT';
    throw error;
  }

  const [result] = await pool.query(`DELETE FROM Test WHERE Test_ID = ?`, [testId]);
  return result.affectedRows > 0;
}

module.exports = {
  getTests,
  getTestById,
  createTest,
  updateTest,
  deleteTest,
};

