require('debug').enable('*');

var expr = require('express')
var app = expr();
var port = 8022;

app.use(require('../index.js')());

app.listen(8022);
app.use(expr.static(__dirname));
console.log('listen port: '+8022);