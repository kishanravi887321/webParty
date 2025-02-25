import multer from "multer";


// set the configuration for the multer 
const storage=multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,"./public")
    },

    filename:(req,file,cb)=>{
        cb(null,file.originalname)

    }
})

export const upload=multer({storage:storage})