const { pool } = require('../config/db');
const { generateNextId } = require('../utils/validation');

/**
 * Fetch all lab staff members with their Technician or Pathologist specialization.
 */
async function getStaff(query = {}) {
  const whereClauses = [];
  const params = [];

  if (query.role) {
    whereClauses.push('s.Staff_Role = ?');
    params.push(query.role);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
    SELECT 
      s.Staff_ID,
      s.Staff_Name,
      s.Shift,
      s.Staff_Role,
      t.Tech_ID,
      t.Certification,
      p.Pathologist_ID,
      p.License_No,
      p.Qualification
    FROM LabStaff s
    LEFT JOIN LabTechnician t ON s.Staff_ID = t.Tech_ID
    LEFT JOIN Pathologist p ON s.Staff_ID = p.Pathologist_ID
    ${whereSql}
    ORDER BY s.Staff_Role ASC, s.Staff_Name ASC
  `;

  const [rows] = await pool.query(sql, params);
  return rows;
}

/**
 * Fetch single staff member by ID with subtype details.
 */
async function getStaffById(staffId) {
  const sql = `
    SELECT 
      s.Staff_ID,
      s.Staff_Name,
      s.Shift,
      s.Staff_Role,
      t.Tech_ID,
      t.Certification,
      p.Pathologist_ID,
      p.License_No,
      p.Qualification
    FROM LabStaff s
    LEFT JOIN LabTechnician t ON s.Staff_ID = t.Tech_ID
    LEFT JOIN Pathologist p ON s.Staff_ID = p.Pathologist_ID
    WHERE s.Staff_ID = ?
  `;

  const [rows] = await pool.query(sql, [staffId]);
  return rows[0] || null;
}

/**
 * Create a new staff member with Technician or Pathologist subtype in a transaction.
 */
async function createStaff(data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let staffId = data.Staff_ID;
    if (!staffId) {
      const [existing] = await conn.query('SELECT Staff_ID FROM LabStaff');
      const existingIds = existing.map((r) => r.Staff_ID);
      staffId = generateNextId(existingIds, 'ST', 3);
    }

    // 1. Insert LabStaff
    await conn.query(
      `INSERT INTO LabStaff (Staff_ID, Staff_Name, Shift, Staff_Role)
       VALUES (?, ?, ?, ?)`,
      [staffId, data.Staff_Name.trim(), data.Shift, data.Staff_Role]
    );

    // 2. Insert Subtype
    if (data.Staff_Role === 'Technician') {
      const certification = (data.Certification || 'Certified Medical Technician').trim();
      await conn.query(
        `INSERT INTO LabTechnician (Tech_ID, Certification) VALUES (?, ?)`,
        [staffId, certification]
      );
    } else if (data.Staff_Role === 'Pathologist') {
      const licenseNo = (data.License_No || 'KMC-00000').trim();
      const qualification = (data.Qualification || 'MD Pathology').trim();
      await conn.query(
        `INSERT INTO Pathologist (Pathologist_ID, License_No, Qualification) VALUES (?, ?, ?)`,
        [staffId, licenseNo, qualification]
      );
    }

    await conn.commit();

    return getStaffById(staffId);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

/**
 * Update an existing staff member and their specialization fields in a transaction.
 */
async function updateStaff(staffId, data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query('SELECT * FROM LabStaff WHERE Staff_ID = ?', [staffId]);
    if (existing.length === 0) {
      await conn.rollback();
      return null;
    }
    const current = existing[0];

    const updates = [];
    const params = [];

    if (data.Staff_Name !== undefined) {
      updates.push('Staff_Name = ?');
      params.push(data.Staff_Name.trim());
    }
    if (data.Shift !== undefined) {
      updates.push('Shift = ?');
      params.push(data.Shift);
    }

    if (updates.length > 0) {
      params.push(staffId);
      await conn.query(`UPDATE LabStaff SET ${updates.join(', ')} WHERE Staff_ID = ?`, params);
    }

    const role = data.Staff_Role || current.Staff_Role;

    if (role === 'Technician' && data.Certification) {
      await conn.query(
        `INSERT INTO LabTechnician (Tech_ID, Certification) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE Certification = VALUES(Certification)`,
        [staffId, data.Certification.trim()]
      );
    } else if (role === 'Pathologist') {
      if (data.License_No || data.Qualification) {
        await conn.query(
          `INSERT INTO Pathologist (Pathologist_ID, License_No, Qualification) VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE 
             License_No = COALESCE(VALUES(License_No), License_No),
             Qualification = COALESCE(VALUES(Qualification), Qualification)`,
          [staffId, data.License_No ? data.License_No.trim() : '', data.Qualification ? data.Qualification.trim() : '']
        );
      }
    }

    await conn.commit();
    return getStaffById(staffId);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

/**
 * Delete a staff member if not referenced on recorded samples or authorized reports.
 */
async function deleteStaff(staffId) {
  const [samples] = await pool.query(
    'SELECT COUNT(*) AS count FROM Sample WHERE Tech_ID = ?',
    [staffId]
  );
  if (samples[0] && samples[0].count > 0) {
    const error = new Error('Staff member cannot be deleted because they are recorded on samples');
    error.statusCode = 409;
    error.code = 'CONFLICT';
    throw error;
  }

  const [reports] = await pool.query(
    'SELECT COUNT(*) AS count FROM Report WHERE Pathologist_ID = ?',
    [staffId]
  );
  if (reports[0] && reports[0].count > 0) {
    const error = new Error('Staff member cannot be deleted because they are recorded on issued reports');
    error.statusCode = 409;
    error.code = 'CONFLICT';
    throw error;
  }

  const [result] = await pool.query('DELETE FROM LabStaff WHERE Staff_ID = ?', [staffId]);
  return result.affectedRows > 0;
}

module.exports = {
  getStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
};

