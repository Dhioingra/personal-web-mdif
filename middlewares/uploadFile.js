const multer = require ('multer')

//inisialisasi multer diskStorage
//make destination file for upload

const storage = multer.diskStorage({
    destination : function (req, file,cb){
        cb(null,"uploads") //file storage location
    },
    filename : function (req, file, cb){
        cb(null, Date.now() + "-" + file.originalname) //rename file name by time now and origin name
    }   
})

const upload = multer({storage : storage})

module.exports = upload