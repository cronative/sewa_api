const express = require("express");
const router = express.Router();
const courseController = require("../controllers/course.controller");

// GET all modules
router.get("/", courseController.getAllModules);
router.get("/full-modules", courseController.getCourseModulesSessions);


module.exports = router;
