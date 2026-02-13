const db = require("../config/db");

/* =====================================================
   CREATE CUSTOM COURSE
===================================================== */
exports.createCustomCourse = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { title, description, module_ids, user_ids, exam_id } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Course title is required"
      });
    }

    await connection.beginTransaction();

    // Insert course
    const [courseResult] = await connection.query(
      "INSERT INTO custom_courses (title, description, exam_id) VALUES (?, ?, ?)",
      [title, description || null, exam_id || null]
    );

    const customCourseId = courseResult.insertId;

    // Insert modules (optional)
    if (Array.isArray(module_ids) && module_ids.length > 0) {
      for (const moduleId of module_ids) {
        await connection.query(
          "INSERT INTO custom_course_modules (custom_course_id, module_id) VALUES (?, ?)",
          [customCourseId, moduleId]
        );
      }
    }

    // Assign users (optional)
    if (Array.isArray(user_ids) && user_ids.length > 0) {
      for (const userId of user_ids) {
        await connection.query(
          "INSERT INTO custom_course_users (custom_course_id, user_id) VALUES (?, ?)",
          [customCourseId, userId]
        );
      }
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
    const [rows] = await db.query(`
      SELECT
        cc.id,
        cc.title,
        cc.description,
        cc.exam_id,
        e.title AS exam_title,

        /* MODULES */
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
        ) AS modules,

        /* USERS */
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', u.id,
              'first_name', u.first_name,
              'surname', u.surname,
              'full_name', CONCAT(u.first_name, ' ', IFNULL(u.surname,'')),
              'email', u.email
            )
          )
          FROM custom_course_users ccu
          JOIN users u ON ccu.user_id = u.id
          WHERE ccu.custom_course_id = cc.id
        ) AS users

      FROM custom_courses cc
      LEFT JOIN exams e ON cc.exam_id = e.id
      ORDER BY cc.id DESC
    `);

    res.json({
      success: true,
      data: rows
    });

  } catch (err) {
    console.error("❌ GET ALL CUSTOM COURSES ERROR:", err);
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