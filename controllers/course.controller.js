const db = require("../config/db");

exports.getAllModules = async (req, res) => {
  console.log("➡️ GET /api/courses hit");

  try {
    console.log("🟡 Running getAllModules query...");

    const sql = `
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', m.module_code,
          'title', m.title,
          'sessions', (
            SELECT JSON_ARRAYAGG(
              JSON_OBJECT(
                'id', s.session_code,
                'title', s.title,

                /* -------- SUB SESSIONS -------- */
                'sub_sessions', (
                  SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                      'id', ss.session_code,
                      'title', ss.title,
                      'contents', (
                        SELECT JSON_ARRAYAGG(
                          JSON_OBJECT(
                            'id', sp.part_code,
                            'title', sp.title,
                            'contents', (
                              SELECT JSON_ARRAYAGG(content_json)
                              FROM (
                                SELECT
                                  CASE
                                    WHEN c.type = 'video' THEN
                                      JSON_OBJECT(
                                        'index', c.content_index,
                                        'type', 'video',
                                        'title', c.title,
                                        'video_link', c.video_link
                                      )
                                    ELSE
                                      JSON_OBJECT(
                                        'index', c.content_index,
                                        'type', 'quiz',
                                        'title', c.title,
                                        'questions', c.questions_json
                                      )
                                  END AS content_json
                                FROM contents c
                                WHERE c.part_code = sp.part_code
                                ORDER BY c.content_index
                              ) ordered_contents
                            )
                          )
                        )
                        FROM session_parts sp
                        WHERE sp.session_code = ss.session_code
                      )
                    )
                  )
                  FROM sessions ss
                  WHERE ss.parent_session_code = s.session_code
                ),

                /* -------- NORMAL SESSION CONTENTS -------- */
                'contents', (
                  SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                      'id', sp.part_code,
                      'title', sp.title,
                      'contents', (
                        SELECT JSON_ARRAYAGG(content_json)
                        FROM (
                          SELECT
                            CASE
                              WHEN c.type = 'video' THEN
                              JSON_OBJECT(
                                'index', c.content_index,
                                'type', 'video',
                                'title', c.title,
                                'video_link', c.video_link
                              )
                              ELSE
                              JSON_OBJECT(
                                'index', c.content_index,
                                'type', 'quiz',
                                'title', c.title,
                                'questions', c.questions_json
                              )
                            END AS content_json
                          FROM contents c
                          WHERE c.part_code = sp.part_code
                          ORDER BY c.content_index
                        ) ordered_contents
                      )
                    )
                  )
                  FROM session_parts sp
                  WHERE sp.session_code = s.session_code
                )
              )
            )
            FROM sessions s
            WHERE s.module_code = m.module_code
              AND s.parent_session_code IS NULL
          )
        )
      ) AS modules_json
      FROM modules m
    `;

    console.log("🟡 SQL prepared, executing...");
    const [rows] = await db.query(sql);

    console.log("🟢 Query executed successfully");
    console.log("🟢 Raw DB response:", rows);

    const result = rows?.[0]?.modules_json || [];

    console.log("🟢 Parsed modules count:", result?.length || 0);

    return res.json({
      success: true,
      data: result,
    });

  } catch (err) {
    console.error("❌ GET ALL MODULES ERROR");
    console.error("❌ Error message:", err.message);
    console.error("❌ Error code:", err.code);
    console.error("❌ Error stack:", err.stack);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};
