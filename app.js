var express = require('express');
var app = express(),
    path = require('path'),
    convert = require('./routes/convert');

app.configure(function () {
    app.set('port', process.env.PORT || 3000);
    app.use(express.logger('dev'));  /* 'default', 'short', 'tiny', 'dev' */
    app.use(express.bodyParser());
    app.use(express.static(path.join(__dirname, 'components'))); 
});

app.get('/robots.txt', function(req, res){
    res.send('User-agent: *');
    res.send('Disallow: /');
});

app.listen(3000);
console.log('Listening on port 3000');
