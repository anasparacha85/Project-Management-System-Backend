const nodemailer=require('nodemailer')
require('dotenv').config()

const transport = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587, // use 587 instead of 465 to avoid blocked port issues
  secure: false, // false for port 587 (TLS)
  auth: {
    user:process.env.EMAIL_USER, 
    pass:process.env.EMAIL_PASS, // This is your Gmail App Password
  },
  requireTLS: true,
});

module.exports= transport;
