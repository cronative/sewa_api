const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const controller = require("../controllers/auth.controller");

router.post(
  "/register",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "birth_proof", maxCount: 1 },
  ]),
  controller.register
);

router.post("/login", controller.login);

module.exports = router;
