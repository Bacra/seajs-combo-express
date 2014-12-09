var path		= require('path');
var crypto		= require('crypto');
var fs			= require('fs');

var underscore	= require('underscore');
var send		= require('send');
var debug		= require('debug')('seajs-combo-express:main');
var SendStream	= require('./send');

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
			next();
		} else if (rs === true) {
			return;
		}


		if (1 || config.cachePath) {
			// width cache
			var file = config.cachePath+'/'+config.parseFilename(req.url);
			debug('dist file name: %s', file);

			if (0 && fs.existsSync(file)) {
				// static resource
				send(req, file, underscore.extend({}, config, {root: config.cachePath})).pipe(res);
			} else {

				var newLstats;
				var allData = [];

				sender.on('readStart', function(lstats, lfile, filePaths) {
						newLstats = lstats;
					})
					.on('data', function(data) {
						allData.push(data);
					})
					.on('end', function() {
						// write cache file
						fs.open(file, 'w+', function(err, fd) {
							if (err) return debug('open file err: %s', file, err);

							try {
								var buf = Buffer.concat(allData);
								fs.writeSync(fd, buf, 0, buf.length, null);
								fs.futimesSync(fd, newLstats.atime, newLstats.mtime);
							} catch(err) {
								debug('write file err: %s', file, err);
							}

							// close fd
							try {
								fd && fs.closeSync(fd);
							} catch(err) {
								debug('close file err: %s', file, err);
							}
						});
					})
					.on('error', function(err) {
						debug('send err', err);
					})
					.combo();
			}
		} else {
			sender.combo();
		}
	}
};
