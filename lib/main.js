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


		if (config.cachePath) {
			// width cache
			var file = config.cachePath+'/'+config.parseFilename(req.url);
			debug('dist file name: %s', file);

			if (fs.existsSync(file)) {
				// static resource
				// config.root = config.cachePath;
				// send(req, file, config).pipe(res);
				send(req, file, underscore.extend({}, config, {root: config.cachePath})).pipe(res);
			} else {

				var fw = fs.createWriteStream(file)
					.on('error', function(err) {
						if (fs.existsSync(file)) fs.unlinkSync(file);
					})
					.on('finish', function() {
						if (new_lstats) {
							fs.open(file, 'w', function(err, fd) {
								if (err) {
									debug('open file err: %s', file, err);
									return;
								}

								fs.futimesSync(fd, new_lstats.atime, new_lstats.mtime);
							});
						} else {
							debug('no lstats file: %s, url: %s', file, req.url);
						}
					});
				var new_lstats;
				sender.on('readStart', function(lstats, lfile, filePaths) {
						new_lstats = lstats;
					})
					.on('data', function(data) {
						fw.write(data);
					})
					.on('end', function() {
						fw.end();
					})
					.on('error', function(err) {
						fw.emit('error', err)
					})
					.combo();
			}
		} else {
			sender.combo();
		}
	}
};
