
import jwt from 'jsonwebtoken';
import dotenv from "dotenv";

dotenv.config({
    path:'../../.env'
})


const verifyToken=(req,res,next)=>{
    const token=req.header('Authorization')?.split(' ')[1]
    if(!token)  return res.status(202).send("access-denied ")

    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET||"ravikishan",(err,user)=>{
        if(err)  return res.status(404).send("invalid token")

        req.user=user;
        next();
    })
    
}
export {verifyToken}