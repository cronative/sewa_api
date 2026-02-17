const db = require("../config/db");
const axios = require("axios");

/* =====================================================
   CREATE CUSTOM COURSE
===================================================== */
exports.createCustomCourse = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { title, description, modules, user_ids, exam_id } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Course title is required"
      });
    }

    await connection.beginTransaction();

    // 1️⃣ Insert custom course
    const [courseResult] = await connection.query(
      "INSERT INTO custom_courses (title, description, exam_id) VALUES (?, ?, ?)",
      [title, description || null, exam_id || null]
    );

    const customCourseId = courseResult.insertId;

    console.log("🟢 Custom course created:", customCourseId);

    // 2️⃣ Insert modules as comma separated string
    if (Array.isArray(modules) && modules.length > 0) {

      for (const item of modules) {

        if (!item.course_id || !Array.isArray(item.module_ids)) continue;

        const moduleIdsString = item.module_ids.join(",");

        await connection.query(
          `INSERT INTO custom_course_modules
           (custom_course_id, default_course_id, module_ids)
           VALUES (?, ?, ?)`,
          [customCourseId, item.course_id, moduleIdsString]
        );

        console.log("🟢 Modules inserted:",
          "Course:", item.course_id,
          "Modules:", moduleIdsString
        );
      }
    }

    // 3️⃣ Assign users (optional)
    if (Array.isArray(user_ids) && user_ids.length > 0) {
      for (const userId of user_ids) {
        await connection.query(
          "INSERT INTO custom_course_users (custom_course_id, user_id) VALUES (?, ?)",
          [customCourseId, userId]
        );
      }

      console.log("🟢 Users assigned:", user_ids);
    }

    await connection.commit();

    res.json({
      success: true,
      message: "Custom course created successfully",
      custom_course_id: customCourseId
    });

  } catch (err) {
    await connection.rollback();
    console.error("❌ CREATE CUSTOM COURSE ERROR:", err.message);

    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });

  } finally {
    connection.release();
  }
};

/**
 * GET CUSTOM COURSES WITH FILTERED DEFAULT COURSES
 */
exports.getCustomCoursesWithFilteredData = async (req, res) => {
  try {
    console.log("📦 Fetching filtered custom courses...");

    // 1️⃣ Get mapping table
   const [rows] = await db.query(`
       SELECT
           cc.id,
           cc.title,
           cc.description,
           cc.created_at,

           ccm.default_course_id,
           ccm.module_ids,

           e.id AS exam_id,
           e.title AS exam_title,
           e.description AS exam_description,
           e.questions_json,
           e.created_at AS exam_created_at

       FROM custom_courses cc

       LEFT JOIN custom_course_modules ccm
           ON cc.id = ccm.custom_course_id

       LEFT JOIN exams e
           ON cc.exam_id = e.id

       ORDER BY cc.id DESC
   `);

    console.log("🟢 Mapping Rows:", rows.length);

    if (!rows.length) {
      return res.json({ success: true, data: [] });
    }

    // 2️⃣ Fetch JSON
    console.log("🌐 Fetching external JSON...");
    const response = await fetch(
      "https://sewa.sewamanagernischoolelearning.com/jsons/data_new.json"
    );

    const jsonData = await response.json();
    const myCourses = jsonData.my_courses || [];

    console.log("🟢 JSON Courses Found:", myCourses.length);

    const result = rows.map(row => {

      console.log("🔎 Processing Row ID:", row.id);

      const moduleIds = row.module_ids
        ? row.module_ids.split(",")
        : [];

      console.log("➡ Parsed Module IDs:", moduleIds);

      // 3️⃣ Match default course
      const matchedCourse = myCourses.find(
        c => c.id === `${row.default_course_id}`
      );

      if (!matchedCourse) {
        console.log("❌ No default course matched");
        return {
          id: row.custom_course_id,
          ...row,
          default_courses: []
        };
      }

      console.log("🟢 Matched Course:", matchedCourse.title);

      // 4️⃣ Filter sessions
    const filteredSessions = (matchedCourse.sessions || []).filter(session => {
      console.log("🟢 Checking session.id:", session.id);
      console.log("🟡 Module IDs:", moduleIds);

      return moduleIds.includes(session.id);
    });

      console.log("🟢 Filtered Sessions:", filteredSessions.length);

      return {
        id: row.custom_course_id,
        ...row,
        default_courses: [
          {
            title: matchedCourse.title,
            id: matchedCourse.id,
            img_src: matchedCourse.img_src,
            description: matchedCourse.description,
            sessions: filteredSessions
          }
        ]
      };
    });

    res.json({
      success: true,
      data: result
    });

  } catch (err) {
    console.error("❌ FILTER ERROR:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};


/* =====================================================
   UPDATE CUSTOM COURSE
===================================================== */
exports.updateCustomCourse = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;
    const { title, description, module_ids, user_ids, exam_id } = req.body;

    await connection.beginTransaction();

    const [existing] = await connection.query(
      "SELECT id FROM custom_courses WHERE id = ?",
      [id]
    );

    if (!existing.length) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Custom course not found"
      });
    }

    // Update main details
    await connection.query(
      "UPDATE custom_courses SET title=?, description=?, exam_id=? WHERE id=?",
      [title, description || null, exam_id || null, id]
    );

    // Replace modules
    if (Array.isArray(module_ids)) {
      await connection.query(
        "DELETE FROM custom_course_modules WHERE custom_course_id=?",
        [id]
      );

      for (const moduleId of module_ids) {
        await connection.query(
          "INSERT INTO custom_course_modules (custom_course_id, module_id) VALUES (?, ?)",
          [id, moduleId]
        );
      }
    }

    // Replace users
    if (Array.isArray(user_ids)) {
      await connection.query(
        "DELETE FROM custom_course_users WHERE custom_course_id=?",
        [id]
      );

      for (const userId of user_ids) {
        await connection.query(
          "INSERT INTO custom_course_users (custom_course_id, user_id) VALUES (?, ?)",
          [id, userId]
        );
      }
    }

    await connection.commit();

    res.json({
      success: true,
      message: "Custom course updated successfully"
    });

  } catch (err) {
    await connection.rollback();
    console.error("❌ UPDATE CUSTOM COURSE ERROR:", err.message);

    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });

  } finally {
    connection.release();
  }
};


/* =====================================================
   GET ALL CUSTOM COURSES (FULL DETAILS)
===================================================== */
exports.getAllCustomCourses = async (req, res) => {
  try {
    console.log("📦 Fetching custom courses...");

    // 1️⃣ Get custom course + module mapping
    const [rows] = await db.query(`
         SELECT
             cc.id,
             cc.title,
             cc.description,
             cc.created_at,

             e.id AS exam_id,
             e.title AS exam_title,
             e.description AS exam_description,
             e.questions_json,
             e.created_at AS exam_created_at

           FROM custom_courses cc
           LEFT JOIN exams e
             ON cc.exam_id = e.id
           ORDER BY cc.id DESC
    `);

    if (!rows.length) {
      return res.json({ success: true, data: [] });
    }

    // 2️⃣ Load JSON once
    const response = await axios.get(
      "https://sewa.sewamanagernischoolelearning.com/jsons/data_new.json"
    );

    const jsonData = response.data;

    const finalResult = [];

    for (const row of rows) {

      const selectedModules = row.module_ids
        ? row.module_ids.split(",").map(s => s.trim())
        : [];

      console.log("📌 Custom Course:", row.custom_title);
      console.log("📌 Default Course ID:", row.default_course_id);
      console.log("📌 Selected Modules:", selectedModules);

      // 3️⃣ Find course in JSON
      const matchedCourse = jsonData.my_courses.find(course => {
        const numericId = parseInt(course.id.replace("module_", ""));
        return numericId === row.default_course_id;
      });

      if (!matchedCourse) continue;

      // 4️⃣ Filter sessions
      const filteredSessions = matchedCourse.sessions
        ? matchedCourse.sessions.filter(session =>
            selectedModules.includes(session.id)
          )
        : [];

      finalResult.push({
        custom_course_id: row.custom_course_id,
        title: row.custom_title,
        default_course: matchedCourse.title,
        sessions: filteredSessions
      });
    }

    res.json({
      success: true,
      data: finalResult
    });

  } catch (err) {
    console.error("❌ GET CUSTOM COURSES ERROR:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};


/* =====================================================
   GET CUSTOM COURSES BY USER
===================================================== */
exports.getCustomCoursesByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const [rows] = await db.query(`
      SELECT
        cc.id,
        cc.title,
        cc.description,
        cc.exam_id,
        e.title AS exam_title,

        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', m.id,
              'module_code', m.module_code,
              'title', m.title
            )
          )
          FROM custom_course_modules ccm
          JOIN modules m ON ccm.module_id = m.id
          WHERE ccm.custom_course_id = cc.id
        ) AS modules

      FROM custom_courses cc
      JOIN custom_course_users ccu
        ON cc.id = ccu.custom_course_id
      LEFT JOIN exams e
        ON cc.exam_id = e.id
      WHERE ccu.user_id = ?
      ORDER BY cc.id DESC
    `, [userId]);

    res.json({
      success: true,
      data: rows
    });

  } catch (err) {
    console.error("❌ USER CUSTOM COURSE ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};


/* =====================================================
   GET USER COURSE DETAIL (SHOW EXAM AFTER COMPLETE)
===================================================== */
exports.getUserCourseDetail = async (req, res) => {
  try {
    const { user_id, course_id } = req.params;

    const [rows] = await db.query(`
      SELECT
        cc.id,
        cc.title,
        cc.description,
        cc.exam_id,
        ucp.is_completed
      FROM custom_courses cc
      JOIN custom_course_users ccu
        ON cc.id = ccu.custom_course_id
      LEFT JOIN user_course_progress ucp
        ON cc.id = ucp.custom_course_id
        AND ucp.user_id = ?
      WHERE cc.id = ?
        AND ccu.user_id = ?
    `, [user_id, course_id, user_id]);

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Course not assigned"
      });
    }

    const course = rows[0];

    res.json({
      success: true,
      data: {
        id: course.id,
        title: course.title,
        description: course.description,
        show_exam: course.is_completed === 1,
        exam_id: course.is_completed === 1 ? course.exam_id : null
      }
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


/**
 * ==========================================
 * GET ALL CUSTOM COURSES (LIGHT VERSION)
 * GET /api/custom-courses/list
 * ==========================================
 */

/**
 * ==========================================
 * GET ALL CUSTOM COURSES (WITH FULL EXAM)
 * GET /api/custom-courses/list
 * ==========================================
 */
exports.getAllCustomCoursesLight = async (req, res) => {
  try {
    console.log("📦 Fetching all custom courses with exam details");

    const [rows] = await db.query(`
      SELECT
        cc.id,
        cc.title,
        cc.description,
        cc.created_at,

        e.id AS exam_id,
        e.title AS exam_title,
        e.description AS exam_description,
        e.questions_json,
        e.created_at AS exam_created_at

      FROM custom_courses cc
      LEFT JOIN exams e
        ON cc.exam_id = e.id
      ORDER BY cc.id DESC
    `);

    const result = rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      created_at: row.created_at,

      exam: row.exam_id
        ? {
            id: row.exam_id,
            title: row.exam_title,
            description: row.exam_description,
            questions: row.questions_json
              ? JSON.parse(row.questions_json)
              : [],
            created_at: row.exam_created_at
          }
        : null
    }));

    res.json({
      success: true,
      total: result.length,
      data: result
    });

  } catch (err) {
    console.error("❌ GET CUSTOM COURSES WITH EXAM ERROR:", err.message);

    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};