const { User } = require("../Modal/User");
const {signAccessToken,verifyAccessToken}=require('../utils/jwtutils')
const registerEmployee=async(req, res)=> {
  const { name, email,  password,confirmPassword } = req.body;
  if(password!=confirmPassword){
    return res.status(403).json({FailureMessage:"password not matched"})
  }
  const exists = await User.findOne({ email });
  if (exists) {
    return res.status(409).json({ FailureMessage: 'Email already in use' });
  }

  const user = await User.create({ name, email, password, role:'employee' });
  res.status(201).json({ SuccessMessage:"registration SuccessFull" });
}
const registerManager=async(req, res)=> {
 const { name, email,  password,confirmPassword } = req.body;
  if(password!=confirmPassword){
    return res.status(403).json({FailureMessage:"password not matched"})
  }
  const exists = await User.findOne({ email });
  if (exists) {
    return res.status(409).json({ FailureMessage: 'Email already in use' });
  }

  const user = await User.create({ name, email, password, role:'manager' });
  res.status(201).json({ SuccessMessage:"registration SuccessFull" });
}
// login controller


const loginEmployee = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if(!user){
    return res.status(401).json({FailureMessage:"Your account is not registered please signup first"})
  }
const ok=await await user.comparePassword(password)
  if (!ok) {
    return res.status(401).json({ FailureMessage: 'Invalid credentials' });
  }
  if(user.role!=='employee'){
    res.status(401).json({FailureMessage:"You are not registered as a employee"})
  }

  const token = signAccessToken(user._id)


  // Cookie set karna
  res.cookie('token', token, {
    httpOnly: true,   // JS se access nahi hoga
  secure: false,       // dev ke liye false, prod me true
  sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000, // 1 din
  });

  return res.json({SuccessMessage: 'Login successful' });
};

const loginManager = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if(!user){
    return res.status(401).json({FailureMessage:"Your account is not registered please signup first"})
  }
 const ok=await await user.comparePassword(password)
  if ( !ok) {
    return res.status(401).json({ FailureMessage: 'Invalid credentials' });
  }
  if(user.role!=='manager'){
    res.status(401).json({FailureMessage:"Yu are not registered as a manager"})
  }

  const token = signAccessToken(user._id)
  

  // Cookie set karna
  res.cookie('token', token, {
    httpOnly: true,   // JS se access nahi hoga
   secure: false,       // dev ke liye false, prod me true
  sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000, // 1 din
  });

  return res.json({ SuccessMessage: 'Login successful' });
};


const logout=async(req,res)=>{
    try {
          res.clearCookie('token');
  res.status(200).json({ SuccessMessage: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({FailureMessage:'Internal Server error'})
        
    }
}

module.exports={registerEmployee,registerManager,loginManager,loginEmployee,logout}


