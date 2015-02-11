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

	config = underscore.extend({}, defaults, config);
	config.root = path.normalize(config.root);

	return function(req, res, next) {
		var sender = new SendStream(req, res, config);

		var rs = sender.check();
		if (rs === false) {
			// no match
			next();
			return;
		} else if (rs === true) {
			// 304
			return;
		}
		
		if (config.cachePath) {
			// width cache
			var file = config.cachePath+'/'+config.parseFilename(req.url);

			if (doCache(req, res, file, sender, config) === false) {
				// use cache file to send
				debug('use cahce file: %s', file);
				return;
			} else {
				debug('no cahce file: %s', file);
			}
		}

		sender.on('error', function(err) {
				debug('combo err %o', err);
			})
			.send();

		return sender;
	}
};
