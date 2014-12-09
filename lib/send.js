var path	= require('path');

var etag	= require('etag');
var debug	= require('debug')('seajs-combo-express:send');
var mime	= require('mime');
var fresh	= require('fresh');
var Combo	= require('./combo');

module.exports = SendStream;

function SendStream(req, res, config) {
	this._res		= res;
	this._req		= req;
	this._config	= config;
};

// require('util').inherits(SendStream, require('stream'));

var proto = SendStream.prototype;

proto.send = function() {
	var self = this;
	var config = self._config;
	var res = self._res;
	var req = self._req;

	if (self.isCache() && fresh(req, res)) return self.notModified();

	var urls = req.url.split(config.comboSyntax[0]);
	if (urls.length != 2) return false;

	var myRoot = path.normalize(config.root + '/'+ urls[0]);

	debug('root path: %s', myRoot);

	var filePaths = urls[1].split(config.comboSyntax[1]);
	var files = [];

	for(var i = 0, len = filePaths.length; i < len; i++) {
		var file = path.normalize(myRoot+ '/' + filePaths[i]);
		if (file.indexOf(config.root) === 0) {
			files.push(file);
		} else {
			debug('path overflow, root: %s, file: %s, filepath: %s, offset: %d', config.root, file, filePaths[i], file.indexOf(config.root));
			return false;
		}
	}

	self._comboStream(files);

	return true;
};

proto.notModified = function() {
	var res = this.res;
	debug('not modified');

	Object.keys(res._headers).forEach(function (field) {
		if (0 === field.indexOf('content')) {
			res.removeHeader(field);
		}
	});

	res.statusCode = 304;
	res.end();
};

proto.setCacheHeader = function(stat) {
	var res = this._res;

	if (!res.getHeader('Accept-Ranges')) {
		res.setHeader('Accept-Ranges', 'bytes');
	}
	if (!res.getHeader('ETag')) {
		res.setHeader('ETag', etag(stat));
	}
	if (!res.getHeader('Date')) {
		res.setHeader('Date', new Date().toUTCString());
	}
	if (!res.getHeader('Cache-Control')) {
		res.setHeader('Cache-Control', 'public, max-age=' + ((this._config.maxage || 0) / 1000));
	}
	if (!res.getHeader('Last-Modified')) {
		res.setHeader('Last-Modified', stat.mtime.toUTCString());
	}
};

proto.isCache = function() {
	return (this._req.headers['if-none-match'] || this._req.headers['if-modified-since'])
		&& ((this._res.statusCode >= 200 && this._res.statusCode < 300) ||
        304 === this._res.statusCode);
};

proto.setTypeHeader = function(path) {
	var res = this._res;

	if (!res.getHeader('Content-Type')) {
		var type = mime.lookup(path);
		var charset = mime.charsets.lookup(type);
		debug('content-type %s', type);
		res.setHeader('Content-Type', type + (charset ? '; charset=' + charset : ''));
	}
};


proto._comboStream = function(filePaths) {
	var self = this;

	(new Combo(self._res, filePaths, self._config.separator))
		.on('readStart', function(lstats, filePaths) {
			self.setTypeHeader(filePaths[0]);
			self.setCacheHeader(lstats);
		})
		.on('error', function(err) {
			self._res.statusCode = 404;
		})
		.stream();
};
