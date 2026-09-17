const { pool } = require('../config/db');
const { parsePagination } = require('../utils/validation');

/**
 * Fetch paginated reports with patient, doctor, pathologist, and test findings.
 */
async function getReports(query = {}) {
  const { page, pageSize, offset } = parsePagination(query);
  const whereClauses = [];
  const params = [];

  if (query.patientId) {
    whereClauses.push('r.Patient_ID = ?');
    params.push(query.patientId);
  }

  if (query.pathologistId) {
    whereClauses.push('r.Pathologist_ID = ?');
    params.push(query.pathologistId);
  }

  if (query.q) {
    whereClauses.push(`(
      r.Report_ID LIKE ? OR
      r.Order_ID LIKE ? OR
      p.Patient_ID LIKE ? OR
      CONCAT(p.First_Name, ' ', p.Last_Name) LIKE ?
    )`);
    const like = `%${query.q.trim()}%`;
    params.push(like, like, like, like);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Count total matching
  const [countResult] = await pool.query(
    `SELECT COUNT(DISTINCT r.Report_ID) AS total
     FROM Report r
     JOIN Patient p ON r.Patient_ID = p.Patient_ID
     ${whereSql}`,
    params
  );
  const total = countResult[0] ? countResult[0].total : 0;

  const sql = `
    SELECT 
      r.Report_ID,
      r.Order_ID,
      DATE_FORMAT(r.Report_Date, '%Y-%m-%dT%H:%i:%s+05:30') AS Report_Date,
      r.Patient_ID,
      p.First_Name,
      p.Last_Name,
      DATE_FORMAT(p.DOB, '%Y-%m-%d') AS DOB,
      p.Gender,
      r.Doctor_ID,
      d.Doctor_Name,
      d.Specialization,
      r.Pathologist_ID,
      COALESCE(st.Staff_Name, 'Pending Authorisation') AS Pathologist_Name,
      COALESCE(path.Qualification, '') AS Qualification,
      COALESCE(path.License_No, '') AS License_No,
      DATE_FORMAT(o.Order_Date, '%Y-%m-%d') AS Order_Date
    FROM Report r
    JOIN Patient p ON r.Patient_ID = p.Patient_ID
    JOIN TestOrder o ON r.Order_ID = o.Order_ID
    LEFT JOIN Doctor d ON r.Doctor_ID = d.Doctor_ID
    LEFT JOIN LabStaff st ON r.Pathologist_ID = st.Staff_ID
    LEFT JOIN Pathologist path ON r.Pathologist_ID = path.Pathologist_ID
    ${whereSql}
    ORDER BY r.Report_Date DESC, r.CreatedAt DESC
    LIMIT ? OFFSET ?
  `;

  const [reports] = await pool.query(sql, [...params, pageSize, offset]);

  if (reports.length === 0) {
    return { data: [], total, page, pageSize };
  }

  // Fetch results for these reports
  const reportIds = reports.map((r) => r.Report_ID);
  const [results] = await pool.query(
    `SELECT 
      hr.Report_ID,
      hr.Test_ID,
      t.Test_Name,
      t.Test_Category,
      hr.Observed_Value,
      hr.Unit,
      hr.Remark
     FROM HasResult hr
     JOIN Test t ON hr.Test_ID = t.Test_ID
     WHERE hr.Report_ID IN (?)`,
    [reportIds]
  );

  const resultMap = new Map();
  for (const res of results) {
    if (!resultMap.has(res.Report_ID)) {
      resultMap.set(res.Report_ID, []);
    }
    resultMap.get(res.Report_ID).push(res);
  }

  const enriched = reports.map((r) => ({
    ...r,
    Results: resultMap.get(r.Report_ID) || [],
  }));

  return { data: enriched, total, page, pageSize };
}

/**
 * Fetch a single report by ID.
 */
async function getReportById(reportId) {
  const sql = `
    SELECT 
      r.Report_ID,
      r.Order_ID,
      DATE_FORMAT(r.Report_Date, '%Y-%m-%dT%H:%i:%s+05:30') AS Report_Date,
      r.Patient_ID,
      p.First_Name,
      p.Last_Name,
      DATE_FORMAT(p.DOB, '%Y-%m-%d') AS DOB,
      p.Gender,
      r.Doctor_ID,
      d.Doctor_Name,
      d.Specialization,
      r.Pathologist_ID,
      COALESCE(st.Staff_Name, 'Pending Authorisation') AS Pathologist_Name,
      COALESCE(path.Qualification, '') AS Qualification,
      COALESCE(path.License_No, '') AS License_No,
      DATE_FORMAT(o.Order_Date, '%Y-%m-%d') AS Order_Date
    FROM Report r
    JOIN Patient p ON r.Patient_ID = p.Patient_ID
    JOIN TestOrder o ON r.Order_ID = o.Order_ID
    LEFT JOIN Doctor d ON r.Doctor_ID = d.Doctor_ID
    LEFT JOIN LabStaff st ON r.Pathologist_ID = st.Staff_ID
    LEFT JOIN Pathologist path ON r.Pathologist_ID = path.Pathologist_ID
    WHERE r.Report_ID = ?
  `;

  const [reports] = await pool.query(sql, [reportId]);
  if (reports.length === 0) return null;

  const report = reports[0];

  const [results] = await pool.query(
    `SELECT 
      hr.Report_ID,
      hr.Test_ID,
      t.Test_Name,
      t.Test_Category,
      hr.Observed_Value,
      hr.Unit,
      hr.Remark
     FROM HasResult hr
     JOIN Test t ON hr.Test_ID = t.Test_ID
     WHERE hr.Report_ID = ?`,
    [reportId]
  );

  report.Results = results;
  return report;
}

/**
 * Fetch the pathologist's pending worklist:
 * Orders whose samples have been collected, awaiting observed values and authorization.
 * Sorted oldest collection first.
 */
async function getPendingResults() {
  const sql = `
    SELECT 
      r.Report_ID,
      r.Order_ID,
      DATE_FORMAT(o.Order_Date, '%Y-%m-%d') AS Order_Date,
      p.Patient_ID,
      CONCAT(p.First_Name, ' ', p.Last_Name) AS Patient_Name,
      (SELECT COUNT(*) FROM OrderIncludesTest oit WHERE oit.Order_ID = r.Order_ID) AS Test_Count,
      (SELECT COUNT(*) FROM Sample s WHERE s.Order_ID = r.Order_ID) AS Sample_Count,
      (
        SELECT DATE_FORMAT(MAX(s.Collection_DateTime), '%Y-%m-%dT%H:%i:%s+05:30')
        FROM Sample s WHERE s.Order_ID = r.Order_ID
      ) AS Last_Collection_DateTime
    FROM Report r
    JOIN TestOrder o ON r.Order_ID = o.Order_ID
    JOIN Patient p ON r.Patient_ID = p.Patient_ID
    WHERE r.Report_Date IS NULL
      AND EXISTS (SELECT 1 FROM Sample s WHERE s.Order_ID = r.Order_ID)
    ORDER BY Last_Collection_DateTime ASC
  `;

  const [rows] = await pool.query(sql);
  return rows.map((r) => ({
    ...r,
    Test_Count: Number(r.Test_Count) || 0,
    Sample_Count: Number(r.Sample_Count) || 0,
  }));
}

/**
 * Authorize and issue a report:
 * 1. Inserts or updates HasResult rows with observed values, units, and remarks.
 * 2. Sets Report_Date = NOW() and stamps the authorized Pathologist_ID.
 * 3. Transitions related TestOrder status to 'Completed'.
 * Performed within a single database transaction.
 */
async function saveReportResults(reportId, data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Verify Report exists
    const [reportRows] = await conn.query(
      'SELECT Report_ID, Order_ID FROM Report WHERE Report_ID = ?',
      [reportId]
    );
    if (reportRows.length === 0) {
      const error = new Error('Report not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }
    const orderId = reportRows[0].Order_ID;

    // 2. Identify Pathologist
    let pathologistId = data.Pathologist_ID;
    if (!pathologistId) {
      // Pick first registered pathologist as fallback
      const [pathRows] = await conn.query(
        `SELECT Staff_ID FROM LabStaff WHERE Staff_Role = 'Pathologist' LIMIT 1`
      );
      if (pathRows.length > 0) {
        pathologistId = pathRows[0].Staff_ID;
      }
    }

    const results = Array.isArray(data.Results) ? data.Results : [];
    if (results.length === 0) {
      const error = new Error('A report requires at least one test result');
      error.statusCode = 400;
      error.code = 'VALIDATION_FAILED';
      throw error;
    }

    // 3. Insert or update HasResult rows
    for (const res of results) {
      const unit = res.Unit ? String(res.Unit).trim() : null;
      await conn.query(
        `INSERT INTO HasResult (Report_ID, Test_ID, Observed_Value, Unit, Remark)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           Observed_Value = VALUES(Observed_Value),
           Unit = VALUES(Unit),
           Remark = VALUES(Remark)`,
        [reportId, res.Test_ID, String(res.Observed_Value).trim(), unit, res.Remark]
      );
    }

    // 4. Update Report: stamp Report_Date and Pathologist_ID
    await conn.query(
      `UPDATE Report SET Report_Date = NOW(), Pathologist_ID = ? WHERE Report_ID = ?`,
      [pathologistId, reportId]
    );

    // 5. Update TestOrder status to Completed
    await conn.query(
      `UPDATE TestOrder SET Status = 'Completed' WHERE Order_ID = ?`,
      [orderId]
    );

    await conn.commit();

    return getReportById(reportId);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = {
  getReports,
  getReportById,
  getPendingResults,
  saveReportResults,
};

