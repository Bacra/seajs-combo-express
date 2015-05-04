var path		= require('path');
var crypto		= require('crypto');

var _			= require('underscore');
var debug		= require('debug')('seajs-combo-express:main');
var SendStream	= require('./send');
var doCache		= require('./cache');

var defaults = {
	cachePath		: '',
	separator		: '\n',
	root			: process.cwd(),
	maxage			: 0,
	comboSyntax		: ["??", ","],
	// 最多合并文件数
	comboMaxFiles	: 40,
	comboExtnames	: ['.js'],

	parseFilename: function(url) {
		return crypto.createHash('sha1').update(url).digest('hex')+'.js';
	}
};

module.exports = function(config) {
	if (typeof config == 'string') {
		config = {root: config};
	}

	config = _.extend({}, defaults, config);
	config.root = path.normalize(config.root);

	// 自己创建一下目录，防止出错
	if (config.cachePath) require('mkdirp')(config.cachePath);

	return function(req, res, next) {
		var sender = new SendStream(req, res, config);
		var rs;
		try {
			rs = sender.checkComboUrl();
		} catch (err) {
			return next(err);
		}
		if (rs === false) return next();


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

		sender.on('error', next).comboSend();

		return sender;
	}
};
