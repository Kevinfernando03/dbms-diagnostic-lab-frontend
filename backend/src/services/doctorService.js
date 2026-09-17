const { pool } = require('../config/db');
const { generateNextId } = require('../utils/validation');

/**
 * Fetch all referring doctors.
 */
async function getDoctors() {
  const [rows] = await pool.query(
    `SELECT Doctor_ID, Doctor_Name, Specialization FROM Doctor ORDER BY Doctor_Name ASC`
  );
  return rows;
}

/**
 * Fetch single doctor by ID.
 */
async function getDoctorById(doctorId) {
  const [rows] = await pool.query(
    `SELECT Doctor_ID, Doctor_Name, Specialization FROM Doctor WHERE Doctor_ID = ?`,
    [doctorId]
  );
  return rows[0] || null;
}

/**
 * Create a new doctor.
 */
async function createDoctor(data) {
  let doctorId = data.Doctor_ID;
  if (!doctorId) {
    const [existing] = await pool.query('SELECT Doctor_ID FROM Doctor');
    const existingIds = existing.map((r) => r.Doctor_ID);
    doctorId = generateNextId(existingIds, 'D', 3);
  }

  await pool.query(
    `INSERT INTO Doctor (Doctor_ID, Doctor_Name, Specialization) VALUES (?, ?, ?)`,
    [doctorId, data.Doctor_Name.trim(), data.Specialization.trim()]
  );

  return {
    Doctor_ID: doctorId,
    Doctor_Name: data.Doctor_Name.trim(),
    Specialization: data.Specialization.trim(),
  };
}

/**
 * Update doctor details.
 */
async function updateDoctor(doctorId, data) {
  const updates = [];
  const params = [];

  if (data.Doctor_Name) {
    updates.push('Doctor_Name = ?');
    params.push(data.Doctor_Name.trim());
  }
  if (data.Specialization) {
    updates.push('Specialization = ?');
    params.push(data.Specialization.trim());
  }

  if (updates.length === 0) {
    return getDoctorById(doctorId);
  }

  params.push(doctorId);
  const [result] = await pool.query(
    `UPDATE Doctor SET ${updates.join(', ')} WHERE Doctor_ID = ?`,
    params
  );

  if (result.affectedRows === 0) return null;
  return getDoctorById(doctorId);
}

/**
 * Delete doctor if not referenced in any TestOrder.
 */
async function deleteDoctor(doctorId) {
  const [orders] = await pool.query(
    `SELECT COUNT(*) AS count FROM TestOrder WHERE Doctor_ID = ?`,
    [doctorId]
  );

  if (orders[0] && orders[0].count > 0) {
    const error = new Error('Doctor cannot be deleted because they are referenced by existing orders');
    error.statusCode = 409;
    error.code = 'CONFLICT';
    throw error;
  }

  const [result] = await pool.query(`DELETE FROM Doctor WHERE Doctor_ID = ?`, [doctorId]);
  return result.affectedRows > 0;
}

module.exports = {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
};

