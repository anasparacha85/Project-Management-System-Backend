// utils/sendEmail.js
const nodemailer = require("nodemailer");
const { transporter } = require("../config/nodeMailerConfig");
require("dotenv").config();
const sendEmail = async ({ to, subject, html }) => {

  await transporter.sendMail({
    from: `"Project Management System" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
}
module.exports = sendEmail;
