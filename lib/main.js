var path		= require('path');
var SendStream	= require('./send');

var defaults = {
	separator	: '\n',
	root		: path.dirname(module.parent.parent.filename),
	maxage		: 0,
	comboSyntax	: ["??", ","]
};

module.exports = function(config) {
	if (typeof config == 'string') {
		config = {
			root: config;
		};
	} else if (!config) {
		config = {};
	}
	

	for(var i in defaults) {
		if (!config.hasOwnProperty(i)) config[i] = defaults[i];
	}
	
	config.root = path.normalize(config.root);

	return function(req, res, next) {
		var sender = new SendStream(req, res, config);
		if (!sender.send()) next();
	}
};