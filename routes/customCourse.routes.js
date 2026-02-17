const express = require("express");
const router = express.Router();
const controller = require("../controllers/customCourse.controller");

router.post("/create", controller.createCustomCourse);
router.put("/update/:id", controller.updateCustomCourse);
router.get("/user-course/:user_id/:course_id", controller.getUserCourseDetail);
//router.get("/simple", controller.getCustomCoursesSimple);
router.get("/", controller.getAllCustomCourses);
router.get("/user/:userId", controller.getCustomCoursesByUser);
//router.get("/list", controller.getAllCustomCoursesLight);
router.get("/list", controller.getCustomCoursesWithFilteredData);

module.exports = router;