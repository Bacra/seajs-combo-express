require('debug').enable('*');

var expr = require('express')
var app = expr();
var port = 8022;
var comboServ = require('../index.js');

app.use('/static', comboServ({
	root: __dirname+'/'+'static'
}));

app.use('/cache', comboServ({
	root: __dirname+'/'+'static',
	cachePath: __dirname+'/'+'cache',
}));

app.listen(8022);
app.use(expr.static(__dirname));
console.log('listen port: '+8022);