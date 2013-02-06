$(document).ready(function(){
    console.log('here we go!');

    var convert = new Convert();

});

// Initialize
Convert = function(){
    this.socket = io.connect('http://localhost');
    
    this.socket.on('news', function (data) {
        console.log(data);
        socket.emit('my other event', { my: 'data' });
    });


}

Convert.Uploader = {
    $(function () {
        $('#fileupload').fileupload({
            dataType: 'json',
            done: function (e, data) {
                $.each(data.result.files, function (index, file) {
                    $('<p/>').text(file.name).appendTo(document.body);
                });
            }
        });
    }); 
}
