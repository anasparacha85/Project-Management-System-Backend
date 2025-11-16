const express = require("express");
const NotificationRouter = express.Router();
const { getUserNotifications, markAsRead } = require("../Controller/NotificationController");
const requireAuth = require("../Middleware/requireAuth");

NotificationRouter.route("/get-notification").get(requireAuth,getUserNotifications);
NotificationRouter.route("/mark-as-read/:notifId").patch(requireAuth, markAsRead);

module.exports = NotificationRouter;
