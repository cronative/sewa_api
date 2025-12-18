const db = require("../config/db");
const bcrypt = require("bcrypt");

exports.register = async (req, res) => {
  try {
    console.log("🔹 REGISTER API CALLED");

    console.log("📥 BODY:", req.body);
    console.log("📁 FILES:", req.files);

    const body = req.body;

    if (!body.email || !body.password) {
      console.log("❌ Missing email or password");
      return res.status(400).json({ message: "Email & password required" });
    }

    console.log("🔍 Checking if email exists:", body.email);
    const [exists] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [body.email]
    );

    console.log("🔍 Email exists result:", exists);

    if (exists.length) {
      console.log("⚠️ Email already registered");
      return res.status(409).json({ message: "Email already registered" });
    }

    console.log("🔐 Hashing password");
    const hashedPassword = await bcrypt.hash(body.password, 10);

    const photoUrl = req.files?.photo
      ? `/uploads/photos/${req.files.photo[0].filename}`
      : null;

    const birthProofUrl = req.files?.birth_proof
      ? `/uploads/documents/${req.files.birth_proof[0].filename}`
      : null;

    console.log("🖼 Photo URL:", photoUrl);
    console.log("📄 Birth Proof URL:", birthProofUrl);

    const sql = `
      INSERT INTO users (
        email, password,
        first_name, surname, father_or_husband_name, username, mobile,
        gender, knows_age, dob,
        district, village, address, pincode,
        education, occupation, occupation_sector,
        hindi_knowledge, english_knowledge, computer_knowledge, language_course,
        module, aadhar_number, photo_url, birth_proof_url,
        seva_member, seva_member_since
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `;

    const values = [
      body.email,
      hashedPassword,
      body.first_name,
      body.surname,
      body.father_or_husband_name,
      body.username,
      body.mobile,
      body.gender,
      body.knows_age,
      body.dob,
      body.district,
      body.village,
      body.address,
      body.pincode,
      body.education,
      body.occupation,
      body.occupation_sector,
      body.hindi_knowledge,
      body.english_knowledge,
      body.computer_knowledge,
      body.language_course,
      body.module,
      body.aadhar_number,
      photoUrl,
      birthProofUrl,
      body.seva_member,
      body.seva_member_since,
    ];

    console.log("🧾 SQL QUERY:", sql);
    console.log("📊 VALUES:", values);

    const [result] = await db.query(sql, values);

    console.log("✅ INSERT RESULT:", result);

    res.json({
      success: true,
      message: "Registration successful",
      user_id: result.insertId,
    });
  } catch (err) {
    console.error("🔥 REGISTER ERROR:", err);
    res.status(500).json({
      message: err.sqlMessage || err.message || "Server error",
    });
  }
};

exports.login = async (req, res) => {
  try {
    console.log("🔹 LOGIN API CALLED");
    console.log("📥 BODY:", req.body);

    const { email, password } = req.body;

    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ? AND is_active = 1",
      [email]
    );

    console.log("🔍 USER FOUND:", rows);

    if (!rows.length) {
      console.log("❌ User not found");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = rows[0];

    console.log("🔐 Comparing password");
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      console.log("❌ Password mismatch");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    delete user.password;

    console.log("✅ LOGIN SUCCESS");

    res.json({
      success: true,
      message: "Login successful",
      user,
    });
  } catch (err) {
    console.error("🔥 LOGIN ERROR:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};
