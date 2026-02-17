// src/utils/jwt.js
const jwt=require('jsonwebtoken')

const ACCESS_TTL = '1d'; // short-lived
require('dotenv').config()
const signAccessToken=(user)=> {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
      email:user.email
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TTL }
  );
}
const verifyAccessToken=(token)=> {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

// export function signRawRefreshToken() {
//   // raw random string; you’ll hash and store it in DB
//   // could also use crypto.randomBytes(64).toString('hex')
//   return cryptoRandom(64);
// }

// export function refreshExpiryDate() {
//   const d = new Date();
//   d.setDate(d.getDate() + REFRESH_TTL_DAYS);
//   return d;
// }

// // simple cryptographically-strong random string
// import { randomBytes, createHash } from 'crypto';
// export function cryptoRandom(n = 64) {
//   return randomBytes(n).toString('hex');
// }
// export function sha256(str) {
//   return createHash('sha256').update(str).digest('hex');
// }
module.exports={signAccessToken,verifyAccessToken}