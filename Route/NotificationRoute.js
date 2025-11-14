const express = require("express");
const NotificationRouter = express.Router();
const { getUserNotifications, markAsRead } = require("../Controller/NotificationController");
const requireAuth = require("../Middleware/requireAuth");

NotificationRouter.route("/:userId").get(requireAuth,getUserNotifications);
NotificationRouter.route("/:notifId/read").put(requireAuth, markAsRead);

module.exports = NotificationRouter;
