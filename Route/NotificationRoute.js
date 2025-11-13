const express = require("express");
const NotificationRouter = express.Router();
const { getUserNotifications, markAsRead } = require("../Controller/NotificationController");

NotificationRouter.get("/:userId", getUserNotifications);
NotificationRouter.put("/:notifId/read", markAsRead);

module.exports = NotificationRouter;
