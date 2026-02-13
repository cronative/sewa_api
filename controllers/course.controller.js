const db = require("../config/db");

/* =====================================================
   1️⃣ FULL MODULE STRUCTURE (Nested JSON Version)
===================================================== */

exports.getAllModules = async (req, res) => {
  console.log("➡️ GET /api/courses hit");

  try {
    const sql = `
      SELECT
        m.module_code AS id,
        m.title,
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', s.session_code,
              'title', s.title,
              'sub_sessions', (
                SELECT JSON_ARRAYAGG(
                  JSON_OBJECT(
                    'id', ss.session_code,
                    'title', ss.title
                  )
                )
                FROM sessions ss
                WHERE ss.parent_session_code = s.session_code
              )
            )
          )
          FROM sessions s
          WHERE s.module_id = m.id
          AND s.parent_session_code IS NULL
        ) AS sessions
      FROM modules m
    `;

    const [rows] = await db.query(sql);

    const formatted = rows.map(row => ({
      id: row.id,
      title: row.title,
      sessions: row.sessions || []
    }));

    return res.json({
      success: true,
      data: formatted
    });

  } catch (err) {
    console.error("❌ GET ALL MODULES ERROR:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};


/* =====================================================
   2️⃣ COURSE → MODULE → SESSION STRUCTURE (JOIN VERSION)
===================================================== */

exports.getCourseModulesSessions = async (req, res) => {
  try {
    console.log("📦 Fetching course → modules → sessions...");

    const [rows] = await db.query(`
      SELECT
        c.id AS course_id,
        c.title AS course_title,

        m.id AS module_id,
        m.module_code,
        m.title AS module_title,

        s.id AS session_id,
        s.session_code,
        s.title AS session_title

      FROM courses c
      JOIN modules m ON m.course_id = c.id
      LEFT JOIN sessions s
        ON s.module_id = m.id
        AND s.parent_session_code IS NULL

      ORDER BY c.id, m.id, s.id
    `);

    const grouped = {};

    rows.forEach(row => {

      // COURSE
      if (!grouped[row.course_id]) {
        grouped[row.course_id] = {
          id: row.course_id,
          title: row.course_title,
          modules: {}
        };
      }

      const course = grouped[row.course_id];

      // MODULE
      if (!course.modules[row.module_id]) {
        course.modules[row.module_id] = {
          id: row.module_code,
          title: row.module_title,
          sessions: []
        };
      }

      // SESSION
      if (row.session_id) {
        course.modules[row.module_id].sessions.push({
          id: row.session_code,
          title: row.session_title
        });
      }
    });

    const result = Object.values(grouped).map(course => ({
      id: course.id,
      title: course.title,
      modules: Object.values(course.modules)
    }));

    res.json({
      success: true,
      data: result
    });

  } catch (err) {
    console.error("❌ COURSE MODULE SESSION ERROR:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};