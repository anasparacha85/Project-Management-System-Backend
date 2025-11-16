// utils/sendEmail.js
const nodemailer = require("nodemailer");
const transport = require("../config/nodeMailerConfig");

require("dotenv").config();
const sendEmail = async ({ to, subject, html }) => {

  await transport.sendMail({
    from: `"Project Management System" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
}
module.exports = sendEmail;
