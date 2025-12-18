const db = require("../config/db");

exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT
        id,
        email,
        first_name,
        surname,
        father_or_husband_name,
        username,
        mobile,
        gender,
        dob,
        district,
        village,
        address,
        pincode,
        education,
        occupation,
        occupation_sector,
        hindi_knowledge,
        english_knowledge,
        computer_knowledge,
        language_course,
        module,
        aadhar_number,
        photo_url,
        birth_proof_url,
        seva_member,
        seva_member_since,
        is_approved,
        role,
        is_active,
        created_at
      FROM users
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      total: users.length,
      users,
    });
  } catch (err) {
    console.error("GET USERS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};


exports.approveUser = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "UPDATE users SET is_approved = 1 WHERE id = ?",
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      message: "User approved successfully",
    });
  } catch (err) {
    console.error("APPROVE ERROR:", err);
    res.status(500).json({ message: "Failed to approve user" });
  }
};


exports.declineUser = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "UPDATE users SET is_approved = 0, is_active = 0 WHERE id = ?",
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      message: "User declined successfully",
    });
  } catch (err) {
    console.error("DECLINE ERROR:", err);
    res.status(500).json({ message: "Failed to decline user" });
  }
};


exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM users WHERE id = ?",
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      message: "User deleted permanently",
    });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
};

