exports.getStarted = function(req, res) {
    res.send('Time to get started');
};

var io = require('../sockets').listen(server),
    fs = require('fs'),
    exec = require('child_process').exec;

// Handle upload functionality
io.sockets.on('connection', function (socket) {
    socket.emit('news', { message : 'Here is some news.' });

    // via http://net.tutsplus.com/tutorials/javascript-ajax/how-to-create-a-resumable-video-uploade-in-node-js/
    var files = {};
    socket.on('start', function (data){
        var name = data.name;
        files[name] = { 
           filesize : data.size,
           data   : "",
           downloaded : 0
        };

        var file = files[name];
        var place = 0;

        try {
           var stat = fs.statSync('files/' + name);
           if(stat.isFile()) {
              file.downloaded = stat.size;
              place = stat.size / 524288;
           }
        } catch(er){} 
        
        // New file!
        fs.open("files/" + name, "a", '0755', function(err, fd){
           if(err){
              console.log(err);
           }
           else {
              file.handler = fd; 
              socket.emit('more', { place : place, percent : 0 });
           }
        });
    });

    socket.on('upload', function (data){
        var name = data.name,
            file = files[name];
        
        file.downloaded += data.data.length;
        file.data += data.data;
        
        var place = file.downloaded / 524288,
            percent = (file.downloaded / file.filesize) * 100;
      
        // If file is fully uploaded
        if (file.downloaded == file.filesize){
            fs.write(file.handler, file.data, null, 'binary', function(err, writen){
                socket.emit('finished', { 'place' : place, 'percent' :  percent});
                startConverting(name);
            });
            return;
        }

        // Write the data to disk.
        fs.write(file.handler, file.data, null, 'binary', function(err, writen){
            file.data = ""; // Reset the buffer
            socket.emit('more', { 'place' : place, 'percent' :  percent});
        });
     });

    function startConverting(name){
        function rmDir(dirPath) {
            var files;
            try { 
                files = fs.readdirSync(dirPath); 
            } catch(e) { return; }

            if (files.length > 0){
               for (var i = 0; i < files.length; i++) {
                  var filePath = dirPath + '/' + files[i];
                  if (fs.statSync(filePath).isFile())
                     fs.unlinkSync(filePath);
                  else
                     rmDir(filePath);
               }
            }
            fs.rmdirSync(dirPath);
        }
        
        var path = 'files/' + name + '-images',
            output= 'files/' + name + '-text';
        rmDir(path);
        rmDir(output);
        fs.mkdirSync(path);
        fs.mkdirSync(output);

        fs.watch(path, function(e, f){
            if (e == "rename") {
                setTimeout(function(){
                    socket.emit('status', { text : 'Added ' + f});
                    enqueue(path, f, output);
                }, 5000);
            }
        });
        
        fs.watch(output, function(e, f){
            console.log(e); 
            if (e == "change") {
                var text = fs.readFileSync(output + '/' + f, 'utf8');
                socket.emit('results', { text : text });
            }
        });
        
        split(name);

    }

    // Reads a file and returns the contents
    function readFile(path){
        fs.readFile(path, function (err, data) {
            if (err) throw err;
            return data; 
        }); 
    }

    // Splits pdf into pngs 
    function split(name){
        exec("/usr/bin/gs -dQUIET -dPARANOIDSAFER -dBATCH -dNOPAUSE -dNOPROMPT -sDEVICE=png16m -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -r300 -sOutputFile=files/"+name+"-images/%03d.png files/"+name, function (error, stdout, stderr) {
            if ( error !== null ) {
                console.log(error);
            }
            else {
                // var img = fs.readFileSync('files/'+name+'.png');
               //  pngs.push(name + '.png');
            }
        }); 
    }

    var queue = [],
        running = false;

    // Convert file to text using tesseract
    function enqueue(path, file, destination){
        var command = "/usr/bin/tesseract " + path + "/" + file + " " + destination + "/" + file;
        queue.push(command);
        if (!running) run();
    }

    function run(error, stdout, stderr){
        if (error) console.log(error);
        if (stdout) console.log(stdout);
        if (stderr) console.log(stderr);

        running = true;
        if (queue.length > 0){
            var command = queue.shift();
            console.log('processing ' + command);
            exec(command, run); 
        } else {
            console.log('Nothing in queue');
            running = false;
        }
    }

});
