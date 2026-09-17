const { pool } = require('../config/db');
const { generateNextId, parsePagination } = require('../utils/validation');

/**
 * Fetch paginated orders with patient, doctor, and test line items.
 */
async function getOrders(query = {}) {
  const { page, pageSize, offset } = parsePagination(query);
  const whereClauses = [];
  const params = [];

  if (query.status && query.status !== 'All') {
    whereClauses.push('o.Status = ?');
    params.push(query.status);
  }

  if (query.patientId) {
    whereClauses.push('o.Patient_ID = ?');
    params.push(query.patientId);
  }

  if (query.q) {
    whereClauses.push(`(
      o.Order_ID LIKE ? OR
      p.Patient_ID LIKE ? OR
      CONCAT(p.First_Name, ' ', p.Last_Name) LIKE ?
    )`);
    const like = `%${query.q.trim()}%`;
    params.push(like, like, like);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Count total matching orders
  const [countResult] = await pool.query(
    `SELECT COUNT(DISTINCT o.Order_ID) AS total
     FROM TestOrder o
     JOIN Patient p ON o.Patient_ID = p.Patient_ID
     ${whereSql}`,
    params
  );
  const total = countResult[0] ? countResult[0].total : 0;

  // Sorting
  const allowedSorts = {
    Order_ID: 'o.Order_ID',
    Order_Date: 'o.Order_Date',
    Status: 'o.Status',
    Total_Price: 'o.Total_Price',
  };
  const sortColumn = allowedSorts[query.sort] || 'o.Order_Date';
  const order = (query.order || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const sql = `
    SELECT 
      o.Order_ID,
      DATE_FORMAT(o.Order_Date, '%Y-%m-%d') AS Order_Date,
      o.Patient_ID,
      CONCAT(p.First_Name, ' ', p.Last_Name) AS Patient_Name,
      o.Doctor_ID,
      d.Doctor_Name,
      d.Specialization,
      o.Status,
      o.Total_Price
    FROM TestOrder o
    JOIN Patient p ON o.Patient_ID = p.Patient_ID
    LEFT JOIN Doctor d ON o.Doctor_ID = d.Doctor_ID
    ${whereSql}
    ORDER BY ${sortColumn} ${order}
    LIMIT ? OFFSET ?
  `;

  const [orders] = await pool.query(sql, [...params, pageSize, offset]);

  if (orders.length === 0) {
    return { data: [], total, page, pageSize };
  }

  // Fetch test lines for these orders
  const orderIds = orders.map((o) => o.Order_ID);
  const [testLines] = await pool.query(
    `SELECT 
      oit.Order_ID,
      t.Test_ID,
      t.Test_Name,
      t.Test_Category,
      t.Price
     FROM OrderIncludesTest oit
     JOIN Test t ON oit.Test_ID = t.Test_ID
     WHERE oit.Order_ID IN (?)`,
    [orderIds]
  );

  const testMap = new Map();
  for (const line of testLines) {
    if (!testMap.has(line.Order_ID)) {
      testMap.set(line.Order_ID, []);
    }
    testMap.get(line.Order_ID).push({
      Order_ID: line.Order_ID,
      Test_ID: line.Test_ID,
      Test_Name: line.Test_Name,
      Test_Category: line.Test_Category,
      Price: Number(line.Price),
    });
  }

  const enriched = orders.map((o) => ({
    ...o,
    Total_Price: Number(o.Total_Price),
    Tests: testMap.get(o.Order_ID) || [],
  }));

  return { data: enriched, total, page, pageSize };
}

/**
 * Fetch a single order by ID with its test lines.
 */
async function getOrderById(orderId) {
  const sql = `
    SELECT 
      o.Order_ID,
      DATE_FORMAT(o.Order_Date, '%Y-%m-%d') AS Order_Date,
      o.Patient_ID,
      CONCAT(p.First_Name, ' ', p.Last_Name) AS Patient_Name,
      o.Doctor_ID,
      d.Doctor_Name,
      d.Specialization,
      o.Status,
      o.Total_Price
    FROM TestOrder o
    JOIN Patient p ON o.Patient_ID = p.Patient_ID
    LEFT JOIN Doctor d ON o.Doctor_ID = d.Doctor_ID
    WHERE o.Order_ID = ?
  `;

  const [orders] = await pool.query(sql, [orderId]);
  if (orders.length === 0) return null;

  const order = orders[0];

  const [testLines] = await pool.query(
    `SELECT 
      oit.Order_ID,
      t.Test_ID,
      t.Test_Name,
      t.Test_Category,
      t.Price
     FROM OrderIncludesTest oit
     JOIN Test t ON oit.Test_ID = t.Test_ID
     WHERE oit.Order_ID = ?`,
    [orderId]
  );

  order.Total_Price = Number(order.Total_Price);
  order.Tests = testLines.map((l) => ({
    ...l,
    Price: Number(l.Price),
  }));

  return order;
}

/**
 * Create a new test order in a transaction.
 * Calculates total price strictly on the server from the Test table.
 */
async function createOrder(data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Verify patient exists
    const [patientRows] = await conn.query(
      'SELECT Patient_ID FROM Patient WHERE Patient_ID = ?',
      [data.Patient_ID]
    );
    if (patientRows.length === 0) {
      const error = new Error('Selected patient does not exist');
      error.statusCode = 400;
      error.code = 'VALIDATION_FAILED';
      throw error;
    }

    // 2. Verify doctor if provided
    if (data.Doctor_ID) {
      const [doctorRows] = await conn.query(
        'SELECT Doctor_ID FROM Doctor WHERE Doctor_ID = ?',
        [data.Doctor_ID]
      );
      if (doctorRows.length === 0) {
        const error = new Error('Selected doctor does not exist');
        error.statusCode = 400;
        error.code = 'VALIDATION_FAILED';
        throw error;
      }
    }

    // 3. Verify tests and compute total price on server
    const testIds = Array.isArray(data.Test_IDs) ? data.Test_IDs : [];
    if (testIds.length === 0) {
      const error = new Error('Select at least one test for the order');
      error.statusCode = 400;
      error.code = 'VALIDATION_FAILED';
      throw error;
    }

    const [tests] = await conn.query(
      'SELECT Test_ID, Price FROM Test WHERE Test_ID IN (?)',
      [testIds]
    );

    if (tests.length !== testIds.length) {
      const foundIds = new Set(tests.map((t) => t.Test_ID));
      const missing = testIds.filter((id) => !foundIds.has(id));
      const error = new Error(`One or more tests do not exist: ${missing.join(', ')}`);
      error.statusCode = 400;
      error.code = 'VALIDATION_FAILED';
      throw error;
    }

    // SERVER-SIDE TOTAL CALCULATION (Never trust frontend price)
    const serverTotalPrice = tests.reduce((sum, t) => sum + Number(t.Price), 0);

    // 4. Generate Order_ID
    const [existingOrders] = await conn.query('SELECT Order_ID FROM TestOrder');
    const existingIds = existingOrders.map((o) => o.Order_ID);
    const orderId = generateNextId(existingIds, 'ORD-', 4);

    const orderDate = data.Order_Date || new Date().toISOString().slice(0, 10);
    const doctorId = data.Doctor_ID || null;

    // 5. Insert TestOrder
    await conn.query(
      `INSERT INTO TestOrder (Order_ID, Order_Date, Patient_ID, Doctor_ID, Status, Total_Price)
       VALUES (?, ?, ?, ?, 'Pending', ?)`,
      [orderId, orderDate, data.Patient_ID, doctorId, serverTotalPrice]
    );

    // 6. Insert OrderIncludesTest lines
    for (const tid of testIds) {
      await conn.query(
        `INSERT INTO OrderIncludesTest (Order_ID, Test_ID) VALUES (?, ?)`,
        [orderId, tid]
      );
    }

    // 7. Prepare draft Report shell
    const [existingReports] = await conn.query('SELECT Report_ID FROM Report');
    const existingReportIds = existingReports.map((r) => r.Report_ID);
    const reportId = generateNextId(existingReportIds, 'R', 4);

    await conn.query(
      `INSERT INTO Report (Report_ID, Order_ID, Report_Date, Patient_ID, Doctor_ID, Pathologist_ID)
       VALUES (?, ?, NULL, ?, ?, NULL)`,
      [reportId, orderId, data.Patient_ID, doctorId]
    );

    await conn.commit();

    return getOrderById(orderId);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

/**
 * Cancel an order.
 */
async function cancelOrder(orderId) {
  const [result] = await pool.query(
    `UPDATE TestOrder SET Status = 'Cancelled' WHERE Order_ID = ?`,
    [orderId]
  );
  if (result.affectedRows === 0) return null;
  return getOrderById(orderId);
}

/**
 * Delete an order only if a report has not been issued yet.
 */
async function deleteOrder(orderId) {
  const [reports] = await pool.query(
    `SELECT Report_ID FROM Report WHERE Order_ID = ? AND Report_Date IS NOT NULL`,
    [orderId]
  );

  if (reports.length > 0) {
    const error = new Error('Cannot delete an order once a report has been issued; cancel instead');
    error.statusCode = 409;
    error.code = 'CONFLICT';
    throw error;
  }

  const [result] = await pool.query(`DELETE FROM TestOrder WHERE Order_ID = ?`, [orderId]);
  return result.affectedRows > 0;
}

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  cancelOrder,
  deleteOrder,
};

