var express = require('express'), 
    app = express(),
    path = require('path'),
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
    socket.on('my other event', function (data) {
        console.log(data);
    });
});

server.listen(3000);
console.log('Listening on port 3000');
