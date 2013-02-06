$(document).ready(function(){
    console.log('here we go!');
    
    var o = {
        name    : 'convert',
        element : $('#convert-wrapper'),
        host    : 'http://gibson.local'
    }

    var convert = new Convert(o);

    convert.begin();
});

// Initialize
Convert = function(o){
    this.o = o;
    this.element = o.element;

    this.element = $('<div />')
        .attr('id', o.name + '-main')
        .appendTo(o.element);

    this.socket = socket = io.connect(o.host);
    
    socket.on('news', function (data) {
        console.log(data);
        socket.emit('my other event', { my: 'data' });
    });
};


// Begin upload process
Convert.prototype.begin = function(){

    // Append uploader to screen
    var tmpl = ''+
            '<form>' +
            '<fieldset>' +
            '<div id="{{name}}-uploader">' +
                '<label for="{{name}}-filebox"> Choose A File: </label>' +
                '<input type="file" id="{{name}}-filebox"><br>' +
                '<label for="{{name}}-namebox"> Name: </label>' +
                '<input type="text" id="{{name}}-namebox"><br>' +
                '<button id="{{name}}-submit" type="submit" class="btn btn=primary">Upload!</button>' +
            '</div>' +
            '</fieldset>' +
            '</form>' +         
            '<div id="{{name}}-progress"><div id="{{name}}-progressbar"></div></div><span id="{{name}}-percent">0%</span>' +
            '<span id="{{name}}-uploaded"> - <span id="{{name}}-total">0</span></span>';

    var html = (Handlebars.compile(tmpl))({ name : this.o.name })
    
    var element = $(html).appendTo(this.element);

    element.find('#' + this.o.name + '-submit')
        .click($.proxy(function(evt){
            evt.preventDefault();

            var name = $('#' + this.o.name + '-namebox').val();

            if (name !== "" && this.file){
                this.reader = reader = new FileReader();

                this.file.name = name;
                reader.onload = function(e){
                   socket.emit('upload', { 'name' : name, data : e.target.result });
                }
                socket.emit('start', { 'name' : name, 'size' : this.file.size });
            }
        }, this));

    element.find('#' + this.o.name + '-filebox')
        .on('change', $.proxy(function(evt){
            evt.preventDefault();
            this.file = evt.target.files[0];
        }, this));


    this.socket.on('more', $.proxy(function(data){
        console.log(data);

        var place = data['place'] * 524288, // Next starting position 
            min = Math.min(524288, (this.file.size - place)),
            newFile; // The next block of data

        // We'd better be webkit or mozilla!
        newFile = this.file.slice(place, place + min); 
 
        this.reader.readAsBinaryString(newFile);
    }, this));

    this.socket.on('finished', $.proxy(function(data){
        console.log('all done.');
    }, this));
}
