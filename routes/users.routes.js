const express = require("express");
const router = express.Router();
const usersController = require("../controllers/users.controller");

// Dashboard
router.get("/fetchAll", usersController.getAllUsers);

// Actions
router.post("/approve", usersController.approveUser);
router.post("/decline", usersController.declineUser);
router.post("/delete", usersController.deleteUser);

module.exports = router;
