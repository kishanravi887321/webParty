import mongoose from "mongoose";
import dotenv from "dotenv"

dotenv.config({path:"../.env"})

const connectDB =async ()=> {
    console.log(process.env.DB_URL)
    try {
       const connectionInstance= await mongoose.connect(`${process.env.DB_URL}`)

       

       console.log("\n Db connected succsessfully connection HOST::")

       
        
    } catch (error) {
        console.log("error while connecting",error)
        process.exit(1)
    }
}

export  default  connectDB