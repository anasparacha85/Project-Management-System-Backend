const nodemailer=require('nodemailer')

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587, // use 587 instead of 465 to avoid blocked port issues
  secure: false, // false for port 587 (TLS)
  auth: {
    user: 'amiranas761@gmail.com',
    pass: 'oxgistgtmrabvhuh', // This is your Gmail App Password
  },
  requireTLS: true,
});

module.exports= transporter;
