var path		= require('path');
var underscore	= require('underscore');
var debug		= require('debug')('seajs-combo-express:send');
var Combo		= require('./combo');
var send		= require('send');


module.exports = SendStream;

function SendStream(req, res, options) {
	var obj = send(req, '', options);
	underscore.extend(this, obj);

	this.res		= res;
	this.req		= req;
	this.files		= [];

	var separator = this.options.separator;
	if (separator) {
		this._separator = Buffer.isBuffer(separator) ? separator : new Buffer(separator);
	}
};

SendStream.prototype = send();

underscore.extend(SendStream.prototype, {
	check: function() {
		var self = this;
		var options = self.options;
		var res = self.res;
		var req = self.req;

		// get files from url
		var urls = req.url.split(options.comboSyntax[0]);
		if (urls.length != 2) return false;

		var urlRootPath = path.normalize(options.root + '/'+ urls[0]);

		debug('root path: %s', urlRootPath);

		var urlFiles = urls[1].split(options.comboSyntax[1]);

		for(var i = 0, len = urlFiles.length; i < len; i++) {
			// check root path
			var file = path.normalize(urlRootPath+ '/' + urlFiles[i]);

			if (file.indexOf(options.root) === 0) {
				self.files.push(file);
			} else {
				debug('path overflow, root: %s, file: %s, urlRootPath: %s, offset: %d', options.root, file, urlFiles[i], file.indexOf(options.root));
				return false;
			}
		}
	},
	combo: function() {
		var self = this;
		var combo = new Combo(self.files);

		// hook
		var emit = combo.emit;
		combo.emit = function() {
			self.emit.apply(self, arguments);
			return emit.apply(combo, arguments);
		};

		combo.on('readStart', function(lstats, lfile, files, prevent) {
				self.setHeader(lfile, lstats);
				self.type(lfile);

				// cache check from send
				if (self.isConditionalGET() && self.isCachable() && self.isFresh()) {
					self.notModified();
					prevent();
				}
			})
			.on('data', function(data) {
				self.res.write(data);
			})
			.on('fileEnd', function() {
				if (self._separator) {
					self.res.write(self._separator);
					self.emit('data', self._separator);
				}
			})
			.on('end', function() {
				self.res.end();
			})
			.on('error', function(err) {
				self.res.statusCode = 404;
				self.res.end();
			})
			.stream();
	}
});
