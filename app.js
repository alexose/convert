var express = require('express'), 
    app = express(),
    path = require('path'),
    fs = require('fs'),
    exec = require('child_process').exec,
    util = require('util'),
    nodecr = require('nodecr'),
    convert = require('./routes/convert');

app.configure(function () {
    app.set('port', process.env.PORT || 3000);
    app.use(express.logger('dev'));  /* 'default', 'short', 'tiny', 'dev' */
    app.use(express.bodyParser());
    app.use(express.static(path.join(__dirname, 'components'))); 
});

var server = require('http').createServer(app),
    io = require('socket.io').listen(server);

app.get('/robots.txt', function(req, res){
    res.send('User-agent: *');
    res.send('Disallow: /');
});


// Handle upload functionality
io.sockets.on('connection', function (socket) {
    socket.emit('welcome', { message : 'Connected to Socket.' });
    socket.emit('news', { message : 'Here is some news.' });
    socket.on('my other event', function (data) {
        // console.log(data);
    });

    // via http://net.tutsplus.com/tutorials/javascript-ajax/how-to-create-a-resumable-video-uploade-in-node-js/
    var files = {};
    socket.on('start', function (data) { 
        var name = data['name'];
        files[name] = { 
           filesize : data.size,
           data   : "",
           downloaded : 0
        }

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
        fs.open("files/" + name, "a", 0755, function(err, fd){
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
        var path = 'files/' + name + '-images',
            output= 'files/' + name + '-text';
        fs.mkdir(path);
        fs.mkdir(output);

        fs.watch(path, function(e, f){
            if (e == "rename") {
                console.log(f);
                convert(path, f, output);
            }
        });
        
        fs.watch(output, function(e, f){
            if (e == "rename") {
                console.log('yeah' + f);
                var text = readFile(output + '/' + f);
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
        exec("/usr/bin/gs -dQUIET -dPARANOIDSAFER -dBATCH -dNOPAUSE -dNOPROMPT -sDEVICE=png16m -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -r72 -sOutputFile=files/"+name+"-images/%03d.png files/"+name, function (error, stdout, stderr) {
            if ( error !== null ) {
                console.log(error);
            }
            else {
                // var img = fs.readFileSync('files/'+name+'.png');
               //  pngs.push(name + '.png');
            }
        }); 
    }

    // Convert file to text using tesseract
    function convert(path, file, destination){
        exec("/usr/bin/tesseract " + path + "/" + file + " " + destination + "/" + file); 
    }

});



server.listen(3000);
console.log('Listening on port 3000');
