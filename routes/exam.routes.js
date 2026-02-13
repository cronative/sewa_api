const express = require("express");
const router = express.Router();
const controller = require("../controllers/exam.controller");

/**
 * ===========================
 * EXAM ROUTES
 * ===========================
 */

// Create exam
router.post("/create_exam", controller.createExam);

// Get all exams
router.get("/", controller.getAllExams);

// Get single exam by ID
router.get("/:id", controller.getExamById);

// Update exam
router.put("/:id", controller.updateExam);

// Delete exam
router.delete("/:id", controller.deleteExam);

module.exports = router;