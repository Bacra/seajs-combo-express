var path		= require('path');
var crypto		= require('crypto');
var fs			= require('fs');

var async		= require('async');
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


		if (config.cachePath) {
			// width cache
			var file = config.cachePath+'/'+config.parseFilename(req.url);
			debug('dist file name: %s', file);

			if (fs.existsSync(file)) {
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
						var fd = null;

						async.waterfall([
							function(callback) {
								fs.open(file, 'w+', function(err, f) {
									fd = f;
									callback(err);
								});
							},
							function(callback) {
								var buf = Buffer.concat(allData);
								fs.write(fd, buf, 0, buf.length, null, function(err) {
									callback(err);
								});
							},
							function(callback) {
								fs.futimes(fd, newLstats.atime, newLstats.mtime, function(err) {
									callback(err);
								});
							}
						], function(err) {
							if (err) {
								debug('write file err: %s', file, err);
							}
							if (fd) {
								try {
									fs.closeSync(fd);
								} catch(e) {}
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
