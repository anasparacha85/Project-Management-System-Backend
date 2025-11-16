// src/middleware/auth.js

const { User } = require("../Modal/User");
const { verifyAccessToken } = require("../utils/jwtutils.js");



const requireAuth=async(req, res, next)=> {
  try {
    // cookie se token read karna
    const token = req.header('Authorization')?.replace('Bearer ',"").trim();
   
    
    console.log("cookestoken",token);
    
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.userId).select('+password');
    if (!user || user.status !== 'active') {
      return res.status(401).json({ message: 'User not active' });
    }
    // if (user.changedPasswordAfter(payload.iat)) {
    //   return res.status(401).json({ message: 'Token invalid after password change' });
    // }

    req.user = user;
    req.token=payload;
    
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
module.exports=requireAuth
