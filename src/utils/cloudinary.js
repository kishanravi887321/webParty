import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";


// Load environment variables
dotenv.config({
    path: "../../.env",
});

/// function for extract the public id of the url of the image 
//  this is for delete the  immage from the cloudinary
const findPublicId= (url)=>{
    const parts = url.split("/"); // Split the URL into parts
    const lastPart = parts.pop(); // Get the last part of the URL
    return lastPart.split(".")[0]; // Remove the file extension and return the public_id

}



// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME ,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET  ,
});

// Helper function to handle file deletion
const deleteFile = (filePath) => {
    try {
        fs.unlinkSync(filePath);
        console.log(`Deleted file: ${filePath}`);
    } catch (error) {
        console.error(`Failed to delete file: ${filePath}`, error);
    }
};

// Upload image to Cloudinary
const uploadImage = async (localFilePath) => {
    if (!localFilePath) {
        console.error("No file path provided");
        return null;
    }

    const resolvedFilePath = path.resolve(localFilePath); // Ensure absolute path

    try {
        const response = await cloudinary.uploader.upload(resolvedFilePath, {
            resource_type: "auto",
        });

        console.log("File uploaded successfully:", response.url);
        fs.unlinkSync(resolvedFilePath)
        ///  here for now we jsut returning  the url 
        return response.url;
    } catch (error) {
        console.error("Upload failed:", error.message);
        deleteFile(resolvedFilePath); // Delete file on error
        return null;
    }
};


//  function for delete the file from the cloudinary
const deleteFileOnCloudinary= async (url)=>{
    const publiId=findPublicId(url)


    try {
        const result=await cloudinary.uploader.destroy(publiId)
        console.log("deletion completed")
    } catch (error) {
        console.log("error while deleting the file ....",error.message)
        
    }

}



// uploadImage("./public/default.png")
// Test the upload function
export {uploadImage,
    deleteFile,
    findPublicId,
    deleteFileOnCloudinary

}
