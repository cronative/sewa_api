const express = require("express");
const router = express.Router();
const usersController = require("../controllers/users.controller");

// Dashboard
router.get("/fetchAll", usersController.getAllUsers);

// Actions
router.put("/users/:id/approve", usersController.approveUser);
router.put("/users/:id/decline", usersController.declineUser);
router.delete("/users/:id", usersController.deleteUser);

module.exports = router;
