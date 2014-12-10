var path		= require('path');
var crypto		= require('crypto');

var underscore	= require('underscore');
var send		= require('send');
var debug		= require('debug')('seajs-combo-express:main');
var SendStream	= require('./send');
var doCache		= require('./cache');

var defaults = {
	cachePath	: '',
	separator	: '\n',
	root		: path.dirname(module.parent.parent.filename),
	maxage		: 0,
	comboSyntax	: ["??", ","],

	parseFilename: function(url) {
		return crypto.createHash('sha1').update(url).digest('hex')+'.js';
	}
};

module.exports = function(config) {
	if (typeof config == 'string') {
		config = {root: config};
	}

	config = underscore.extend({}, config, defaults);
	config.root = path.normalize(config.root);

	return function(req, res, next) {
		var sender = new SendStream(req, res, config);

		var rs = sender.check();
		if (rs === false) {
			return next();
		} else if (rs === true) {
			return;
		}
		
		if (config.cachePath) {
			// width cache
			var file = config.cachePath+'/'+config.parseFilename(req.url);
			debug('dist file name: %s', file);

			if (doCache(req, res, file, sender) === false) {
				debug('no cahce file ready: %s', file);
			} else {
				return;
			}
		}

		sender.combo();
	}
};
