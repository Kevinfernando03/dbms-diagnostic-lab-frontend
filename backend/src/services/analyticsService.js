const { pool } = require('../config/db');

/**
 * Fetch lab-wide operational KPI counts powering the role workspaces.
 * Computes strictly from live database records.
 */
async function getWorkspaceSummary() {
  // 1. Patient count
  const [[{ patientCount }]] = await pool.query('SELECT COUNT(*) AS patientCount FROM Patient');

  // 2. Orders by status
  const [orderStatusRows] = await pool.query(
    'SELECT Status, COUNT(*) AS count FROM TestOrder GROUP BY Status'
  );
  const ordersByStatus = { Pending: 0, Processing: 0, Completed: 0, Cancelled: 0 };
  for (const row of orderStatusRows) {
    if (ordersByStatus[row.Status] !== undefined) {
      ordersByStatus[row.Status] = Number(row.count);
    }
  }

  // 3. Orders in the last 7 days
  const [[{ ordersLast7Days }]] = await pool.query(
    'SELECT COUNT(*) AS ordersLast7Days FROM TestOrder WHERE Order_Date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)'
  );

  // 4. Booked revenue (sum of non-cancelled orders)
  const [[{ revenueBooked }]] = await pool.query(
    `SELECT COALESCE(SUM(Total_Price), 0) AS revenueBooked FROM TestOrder WHERE Status != 'Cancelled'`
  );

  // 5. Samples by status
  const [sampleStatusRows] = await pool.query(
    'SELECT Status, COUNT(*) AS count FROM Sample GROUP BY Status'
  );
  const samplesByStatus = { Collected: 0, 'In Transit': 0, Received: 0, Rejected: 0 };
  for (const row of sampleStatusRows) {
    if (samplesByStatus[row.Status] !== undefined) {
      samplesByStatus[row.Status] = Number(row.count);
    }
  }

  // 6. Samples in the last 7 days
  const [[{ samplesLast7Days }]] = await pool.query(
    'SELECT COUNT(*) AS samplesLast7Days FROM Sample WHERE Collection_DateTime >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
  );

  // 7. Pending results (draft reports whose order has samples)
  const [[{ pendingResults }]] = await pool.query(
    `SELECT COUNT(*) AS pendingResults
     FROM Report r
     WHERE r.Report_Date IS NULL
       AND EXISTS (SELECT 1 FROM Sample s WHERE s.Order_ID = r.Order_ID)`
  );

  // 8. Reports issued
  const [[{ reportsIssued }]] = await pool.query(
    'SELECT COUNT(*) AS reportsIssued FROM Report WHERE Report_Date IS NOT NULL'
  );

  // 9. Findings by remark
  const [remarkRows] = await pool.query(
    'SELECT Remark, COUNT(*) AS count FROM HasResult GROUP BY Remark'
  );
  const findingsByRemark = { Normal: 0, Elevated: 0, Critical: 0 };
  for (const row of remarkRows) {
    if (findingsByRemark[row.Remark] !== undefined) {
      findingsByRemark[row.Remark] = Number(row.count);
    }
  }

  // 10. Catalogue, staff, and facility totals
  const [[{ testCount }]] = await pool.query('SELECT COUNT(*) AS testCount FROM Test');
  const [[{ staffCount }]] = await pool.query('SELECT COUNT(*) AS staffCount FROM LabStaff');
  const [[{ labCount }]] = await pool.query('SELECT COUNT(*) AS labCount FROM Laboratory');

  return {
    Patient_Count: Number(patientCount) || 0,
    Orders_By_Status: ordersByStatus,
    Orders_Last_7_Days: Number(ordersLast7Days) || 0,
    Revenue_Booked: Number(revenueBooked) || 0,
    Samples_By_Status: samplesByStatus,
    Samples_Last_7_Days: Number(samplesLast7Days) || 0,
    Pending_Results: Number(pendingResults) || 0,
    Reports_Issued: Number(reportsIssued) || 0,
    Findings_By_Remark: findingsByRemark,
    Test_Count: Number(testCount) || 0,
    Staff_Count: Number(staffCount) || 0,
    Laboratory_Count: Number(labCount) || 0,
  };
}

module.exports = {
  getWorkspaceSummary,
};

