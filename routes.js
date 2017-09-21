module.exports = function(app, io) {
  app.post('/cmp', function(req, res){
    var product_id = req.body.product_id;
    var bid = req.body.bid.split('b')[1];

    io.sockets.emit("bidSuccess", {product_id: product_id, bid: bid});
    response.json(200, {message: "Message received!"});
  })
};
