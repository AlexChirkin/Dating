$(document).ready(function() {
   var socket = io('http://localhost:8810');
   var href = window.location.href;
   var parts = href.split('/');
   var conversationId = parts.pop() || parts.pop();
   socket.emit('enter conversation', conversationId);

   $('form').submit(function(){
     var msg = $('#m').val();
     var user = $('#u').val();
     console.log(conversationId);
       $.ajax({
              type: "POST",
              url: '/reply',
              data: {composedMessage: msg, conversationId: conversationId}, // serializes the form's elements.
              success: function(data)
              {
                  console.log(data); // show response from the php script.
              }
          });

     socket.emit('new message', { id: conversationId, message: msg, user: user });
     $('#m').val('');
     return false;
   });
   socket.on('chat message', function(data){
     if(conversationId == data.id) {
      //  $('#messages').append($('<li>').text(data.msg));
      $('#messages').append('<li><a href="#">' + data.user + '</a>: ' + data.msg + '</li>');
       window.scrollTo(0, document.body.scrollHeight);
     }
   });
 });
