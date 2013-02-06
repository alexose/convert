var express = require('express'), 
    app = express(),
    path = require('path'),
    fs = require('fs'),
    exec = require('child_process').exec,
    util = require('util'),
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
    
io.sockets.on('connection', function (socket) {
    socket.emit('welcome', { message : 'Connected to Socket.' });
    socket.emit('news', { message : 'Here is some news.' });
    socket.on('my other event', function (data) {
        console.log(data);
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
        
        // If file is fully uploaded
        if (file.downloaded == file.filesize){
            console.log('done');
            fs.write(file.handler, file.data, null, 'binary', function(err, writen){
                socket.emit('finished', { 'place' : place, 'percent' :  percent});
            });
        }

        // If the Data Buffer reaches 10MB
        else if (file.data.length > 10485760){ 
            fs.write(file.handler, file.data, null, 'binary', function(err, writen){
                console.log('reset');
                file.data = ""; // Reset the buffer

                var place = file.downloaded / 524288,
                    percent = (file.downloaded / file.filesize) * 100;

                socket.emit('more', { 'place' : place, 'percent' :  percent});
            });
        }
        else{
            console.log('writin');
            var place = file.downloaded / 524288,
                percent = (file.downloaded / file.filesize) * 100;

            socket.emit('more', { 'place' : place, 'percent' :  percent});
        }
     });

});

server.listen(3000);
console.log('Listening on port 3000');
