$(document).ready(function(){
    var options = {
        name    : 'convert',
        element : $('#convert-wrapper'),
        host    : ''
    }

    // options  = $.extend(inline_options, options);

    var convert = new Convert(options);

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
                '<button id="{{name}}-submit" type="submit" class="btn btn=primary">Upload!</button>' +
            '</div>' +
            '</fieldset>' +
            '</form>';         

    var html = (Handlebars.compile(tmpl))({ name : this.o.name }),
        element = $(html).appendTo(this.element);
        bar = new Convert.ProgressBar(this.o.name, this.element);

    element.find('#' + this.o.name + '-submit')
        .click($.proxy(function(evt){
            evt.preventDefault();

            var name = this.file.name.replace(/[|&;$%@"<>()+,]/g, ""); 
            if (name !== "" && this.file){
                this.reader = reader = new FileReader();
                reader.onload = function(e){
                   socket.emit('upload', { 'name' : name, data : e.target.result });
                };
                socket.emit('start', { 'name' : name, 'size' : this.file.size });
            }
        }, this));

    element.find('#' + this.o.name + '-filebox')
        .on('change', $.proxy(function(evt){
            evt.preventDefault();
            this.file = evt.target.files[0];
        }, this));

    this.socket.on('more', $.proxy(function(data){
        // Update status bar
        bar.update(data.percent);

        var place = data.place * 524288, // Next starting position 
            min = Math.min(524288, (this.file.size - place)),
            newFile; // The next block of data

        // We'd better be webkit or mozilla!
        newFile = this.file.slice(place, place + min); 
        this.reader.readAsBinaryString(newFile);
    
    }, this));

    this.socket.on('finished', $.proxy(function(data){
        // Update status bar
        bar.update(data.percent);
           
        // Prepare to recieve results from the server
        var viewer = new Convert.Viewer(this.o.name, this.element, this.socket);
    }, this));
};

// View, edit, and submit results
Convert.Viewer  = function(name, element, socket){
    var self = this;
    this.count = 0;
    this.results = $('<ul />').addClass('results').appendTo(element);
    
    socket.on('results', function(data){ self.update(data); });
    return this;
};

Convert.Viewer.prototype.update = function(page){
    if (this.count % 3 === 0)
        this.row = $('<div />').addClass('row-fluid').appendTo(this.results);
    
    var element = $('<div />').addClass('span4 well').text(page.text).appendTo(this.row);
    this.count++;
};

Convert.ProgressBar = function(name, element){
    this.wrap  = $('<div />').addClass('progress progress-striped active');
    
    this.bar = $('<div />').attr('id', name + "-bar").addClass('bar').appendTo(this.wrap);
    
    this.percent = $('<div />')
        .attr('id', name + "-percent")
        .addClass('percent');

    this.container = $('<div />')
        .append([this.wrap, this.percent])
        .addClass('progressbar')
        .appendTo(element);
    
    return this;
};

Convert.ProgressBar.prototype.update = function(percentage){
    this.bar.width(percentage + '%');
    this.percent.text(Math.round(percentage) + '%');
};
