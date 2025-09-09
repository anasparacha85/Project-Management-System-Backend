const mongoose=require('mongoose')
require('dotenv').config()
const url=process.env.MONGODB_URL

const connectDb=async()=>{
    try {
        await mongoose.connect(url)
        console.log("database connected sussessfully");
        

        
    } catch (error) {
        console.error("database connection failed");
        
        
    }
}

module.exports=connectDb
