const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || ''
});

const uploadToCloudinary = async (filePath, folder = 'ihc') => {
    try {
        if (!process.env.CLOUDINARY_CLOUD_NAME) {

            return null;
        }
        const result = await cloudinary.uploader.upload(filePath, {
            folder,
            use_filename: true,
            unique_filename: true
        });
        return result.secure_url;
    } catch (error) {

        return null;
    }
};

module.exports = { cloudinary, uploadToCloudinary };
