const { pool } = require('../config/db');
const { parsePagination } = require('../utils/validation');

/**
 * Fetch paginated samples with joined patient, lab, and technician names.
 */
async function getSamples(query = {}) {
  const { page, pageSize, offset } = parsePagination(query);
  const whereClauses = [];
  const params = [];

  if (query.orderId) {
    whereClauses.push('s.Order_ID = ?');
    params.push(query.orderId);
  }

  if (query.labId) {
    whereClauses.push('s.Lab_ID = ?');
    params.push(query.labId);
  }

  if (query.techId) {
    whereClauses.push('s.Tech_ID = ?');
    params.push(query.techId);
  }

  if (query.q) {
    whereClauses.push(`(
      s.Order_ID LIKE ? OR
      s.Sample_No LIKE ? OR
      p.Patient_ID LIKE ? OR
      CONCAT(p.First_Name, ' ', p.Last_Name) LIKE ?
    )`);
    const like = `%${query.q.trim()}%`;
    params.push(like, like, like, like);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Count total matching
  const [countResult] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM Sample s
     JOIN Patient p ON s.Patient_ID = p.Patient_ID
     ${whereSql}`,
    params
  );
  const total = countResult[0] ? countResult[0].total : 0;

  const sql = `
    SELECT 
      s.Sample_No,
      s.Order_ID,
      s.Patient_ID,
      CONCAT(p.First_Name, ' ', p.Last_Name) AS Patient_Name,
      s.Sample_Type,
      DATE_FORMAT(s.Collection_DateTime, '%Y-%m-%dT%H:%i:%s+05:30') AS Collection_DateTime,
      s.Lab_ID,
      l.Lab_Name,
      s.Tech_ID,
      st.Staff_Name AS Tech_Name,
      s.Status
    FROM Sample s
    JOIN Patient p ON s.Patient_ID = p.Patient_ID
    JOIN Laboratory l ON s.Lab_ID = l.Lab_ID
    JOIN LabStaff st ON s.Tech_ID = st.Staff_ID
    ${whereSql}
    ORDER BY s.Collection_DateTime DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await pool.query(sql, [...params, pageSize, offset]);
  return { data: rows, total, page, pageSize };
}

/**
 * Fetch a single sample by its compound key (Order_ID + Sample_No) or Sample_No.
 */
async function getSampleById(sampleNo, orderId = null) {
  let sql = `
    SELECT 
      s.Sample_No,
      s.Order_ID,
      s.Patient_ID,
      CONCAT(p.First_Name, ' ', p.Last_Name) AS Patient_Name,
      s.Sample_Type,
      DATE_FORMAT(s.Collection_DateTime, '%Y-%m-%dT%H:%i:%s+05:30') AS Collection_DateTime,
      s.Lab_ID,
      l.Lab_Name,
      s.Tech_ID,
      st.Staff_Name AS Tech_Name,
      s.Status
    FROM Sample s
    JOIN Patient p ON s.Patient_ID = p.Patient_ID
    JOIN Laboratory l ON s.Lab_ID = l.Lab_ID
    JOIN LabStaff st ON s.Tech_ID = st.Staff_ID
    WHERE s.Sample_No = ?
  `;
  const params = [sampleNo];

  if (orderId) {
    sql += ' AND s.Order_ID = ?';
    params.push(orderId);
  }

  const [rows] = await pool.query(sql, params);
  return rows[0] || null;
}

/**
 * Create a new sample, safely computing Sample_No (S1, S2...) per order,
 * and transitioning TestOrder from Pending to Processing in a transaction.
 */
async function createSample(data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Verify Order exists and get Patient_ID
    const [orderRows] = await conn.query(
      'SELECT Order_ID, Patient_ID, Status FROM TestOrder WHERE Order_ID = ?',
      [data.Order_ID]
    );
    if (orderRows.length === 0) {
      const error = new Error('Selected order does not exist');
      error.statusCode = 400;
      error.code = 'VALIDATION_FAILED';
      throw error;
    }
    const order = orderRows[0];
    const patientId = order.Patient_ID;

    // 2. Verify Laboratory exists
    const [labRows] = await conn.query(
      'SELECT Lab_ID FROM Laboratory WHERE Lab_ID = ?',
      [data.Lab_ID]
    );
    if (labRows.length === 0) {
      const error = new Error('Selected laboratory does not exist');
      error.statusCode = 400;
      error.code = 'VALIDATION_FAILED';
      throw error;
    }

    // 3. Verify Technician exists
    const [techRows] = await conn.query(
      'SELECT Staff_ID FROM LabStaff WHERE Staff_ID = ?',
      [data.Tech_ID]
    );
    if (techRows.length === 0) {
      const error = new Error('Selected collecting technician does not exist');
      error.statusCode = 400;
      error.code = 'VALIDATION_FAILED';
      throw error;
    }

    // 4. Determine sequential Sample_No (e.g. S1, S2...) for this order
    let sampleNo = data.Sample_No;
    if (!sampleNo) {
      const [existingSamples] = await conn.query(
        'SELECT Sample_No FROM Sample WHERE Order_ID = ?',
        [data.Order_ID]
      );
      let highestNum = 0;
      for (const row of existingSamples) {
        const match = row.Sample_No.match(/^S(\d+)$/i);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (num > highestNum) highestNum = num;
        }
      }
      sampleNo = `S${highestNum + 1}`;
    }

    const collectionTime = data.Collection_DateTime || new Date().toISOString().slice(0, 19).replace('T', ' ');
    const status = data.Status || 'Collected';

    // 5. Insert Sample
    await conn.query(
      `INSERT INTO Sample (Order_ID, Sample_No, Patient_ID, Sample_Type, Collection_DateTime, Lab_ID, Tech_ID, Status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.Order_ID, sampleNo, patientId, data.Sample_Type, collectionTime, data.Lab_ID, data.Tech_ID, status]
    );

    // 6. Automatically update TestOrder status: Pending -> Processing
    if (order.Status === 'Pending') {
      await conn.query(
        `UPDATE TestOrder SET Status = 'Processing' WHERE Order_ID = ?`,
        [data.Order_ID]
      );
    }

    await conn.commit();

    return getSampleById(sampleNo, data.Order_ID);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = {
  getSamples,
  getSampleById,
  createSample,
};

