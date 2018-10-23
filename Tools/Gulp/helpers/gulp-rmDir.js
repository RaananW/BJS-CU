var path = require("path");
var fs = require("fs");

var rmDir = function(dirPath) {
    let files = null;
    try { 
        files = fs.readdirSync(dirPath); 
    }
    catch (e) {
        return; 
    }
    
    if (files && files.length > 0) {
        for (var i = 0; i < files.length; i++) {
            var filePath = path.join(dirPath, files[i]);
            if (fs.statSync(filePath).isFile())
                fs.unlinkSync(filePath);
            else
                rmDir(filePath);
        }
    }

    fs.rmdirSync(dirPath);
}

module.exports = function(dirPath) {
    // Retry cause sometimes locked on my mac :-)
    try {
        rmDir(dirPath);
    }
    catch (e) {
        try {
            rmDir(dirPath);
        }
        catch (e) {
            try {
                rmDir(dirPath);
            }
            catch (e) {
                // Something is definitely wrong here.
                throw e;
            }
        } 
    }
};