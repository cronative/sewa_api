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


/**
 * ===================================
 * APPROVE USER (POST)
 * ===================================
 */
exports.approveUser = async (req, res) => {
  console.log("➡️ APPROVE USER API HIT");
  console.log("📥 Body:", req.body);

  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID required"
      });
    }

    const [result] = await db.query(
      "UPDATE users SET is_approved = 1, is_active = 1 WHERE id = ?",
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    console.log("✅ User approved:", id);

    res.json({
      success: true,
      message: "User approved successfully"
    });

  } catch (err) {
    console.error("❌ APPROVE ERROR:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to approve user"
    });
  }
};


/**
 * ===================================
 * DECLINE USER (POST)
 * ===================================
 */
exports.declineUser = async (req, res) => {
  console.log("➡️ DECLINE USER API HIT");
  console.log("📥 Body:", req.body);

  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID required"
      });
    }

    const [result] = await db.query(
      "UPDATE users SET is_approved = 0, is_active = 0 WHERE id = ?",
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    console.log("✅ User declined:", id);

    res.json({
      success: true,
      message: "User declined successfully"
    });

  } catch (err) {
    console.error("❌ DECLINE ERROR:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to decline user"
    });
  }
};

/**
 * ===================================
 * DELETE USER (POST)
 * ===================================
 */
exports.deleteUser = async (req, res) => {
  console.log("➡️ DELETE USER API HIT");
  console.log("📥 Body:", req.body);

  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID required"
      });
    }

    const [result] = await db.query(
      "DELETE FROM users WHERE id = ?",
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    console.log("✅ User deleted:", id);

    res.json({
      success: true,
      message: "User deleted permanently"
    });

  } catch (err) {
    console.error("❌ DELETE ERROR:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete user"
    });
  }
};

