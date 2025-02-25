import express from "express";

export const app = express();

app.get("/", (req, res) => {
    res.send("🎥 Video Chat Server Running...");
});

app.use("/api",(req,res)=>{
    console.log("hello")
    res.send("ksn")

})





