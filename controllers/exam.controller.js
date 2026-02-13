const db = require("../config/db");

/**
 * ===================================
 * CREATE EXAM
 * ===================================
 */
exports.createExam = async (req, res) => {
  console.log("➡️ CREATE EXAM API HIT");
  console.log("📥 Request Body:", req.body);

  try {
    const { title, description, questions } = req.body;

    if (!title || !questions || !Array.isArray(questions)) {
      console.log("❌ Validation failed");
      return res.status(400).json({
        success: false,
        message: "Title and questions array required"
      });
    }

    console.log("🟡 Inserting exam into DB...");

    const [result] = await db.query(
      "INSERT INTO exams (title, description, questions_json) VALUES (?, ?, ?)",
      [title, description || null, JSON.stringify(questions)]
    );

    console.log("✅ Exam inserted with ID:", result.insertId);

    res.json({
      success: true,
      message: "Exam created successfully",
      exam_id: result.insertId
    });

  } catch (err) {
    console.error("❌ CREATE EXAM ERROR:", err.message);
    console.error("❌ Error Stack:", err.stack);

    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};


/**
 * ===================================
 * GET ALL EXAMS
 * ===================================
 */
exports.getAllExams = async (req, res) => {
  console.log("➡️ GET ALL EXAMS API HIT");

  try {
    console.log("🟡 Fetching exams from DB...");

    const [rows] = await db.query(
      "SELECT id, title, description, questions_json, created_at FROM exams ORDER BY id DESC"
    );

    console.log("✅ Exams fetched. Count:", rows.length);

    res.json({
      success: true,
      data: rows
    });

  } catch (err) {
    console.error("❌ GET EXAMS ERROR:", err.message);
    console.error("❌ Error Stack:", err.stack);

    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};


/**
 * ===================================
 * GET SINGLE EXAM
 * ===================================
 */
exports.getExamById = async (req, res) => {
  console.log("➡️ GET EXAM BY ID API HIT");
  console.log("📌 Exam ID:", req.params.id);

  try {
    const { id } = req.params;

    const [rows] = await db.query(
      "SELECT * FROM exams WHERE id = ?",
      [id]
    );

    if (!rows.length) {
      console.log("❌ Exam not found");
      return res.status(404).json({
        success: false,
        message: "Exam not found"
      });
    }

    console.log("✅ Exam found");

    const exam = rows[0];

    res.json({
      success: true,
      data: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        questions: JSON.parse(exam.questions_json)
      }
    });

  } catch (err) {
    console.error("❌ GET EXAM ERROR:", err.message);
    console.error("❌ Error Stack:", err.stack);

    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};


/**
 * ===================================
 * UPDATE EXAM
 * ===================================
 */
exports.updateExam = async (req, res) => {
  console.log("➡️ UPDATE EXAM API HIT");
  console.log("📌 Exam ID:", req.params.id);
  console.log("📥 Request Body:", req.body);

  try {
    const { id } = req.params;
    const { title, description, questions } = req.body;

    const [existing] = await db.query(
      "SELECT id FROM exams WHERE id = ?",
      [id]
    );

    if (!existing.length) {
      console.log("❌ Exam not found for update");
      return res.status(404).json({
        success: false,
        message: "Exam not found"
      });
    }

    console.log("🟡 Updating exam...");

    await db.query(
      "UPDATE exams SET title = ?, description = ?, questions_json = ? WHERE id = ?",
      [title, description || null, JSON.stringify(questions), id]
    );

    console.log("✅ Exam updated successfully");

    res.json({
      success: true,
      message: "Exam updated successfully"
    });

  } catch (err) {
    console.error("❌ UPDATE EXAM ERROR:", err.message);
    console.error("❌ Error Stack:", err.stack);

    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};


/**
 * ===================================
 * DELETE EXAM
 * ===================================
 */
exports.deleteExam = async (req, res) => {
  console.log("➡️ DELETE EXAM API HIT");
  console.log("📌 Exam ID:", req.params.id);

  try {
    const { id } = req.params;

    const [existing] = await db.query(
      "SELECT id FROM exams WHERE id = ?",
      [id]
    );

    if (!existing.length) {
      console.log("❌ Exam not found for deletion");
      return res.status(404).json({
        success: false,
        message: "Exam not found"
      });
    }

    console.log("🟡 Deleting exam...");

    await db.query("DELETE FROM exams WHERE id = ?", [id]);

    console.log("✅ Exam deleted successfully");

    res.json({
      success: true,
      message: "Exam deleted successfully"
    });

  } catch (err) {
    console.error("❌ DELETE EXAM ERROR:", err.message);
    console.error("❌ Error Stack:", err.stack);

    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};