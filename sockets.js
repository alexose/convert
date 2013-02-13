// sockets.js
var socketio = require('socket.io');

module.exports.listen = function(server){
    io = socketio.listen(server);
    return io;
};
