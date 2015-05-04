var _		= require('underscore');
var path	= require('path');
var debug	= require('debug')('seajs-combo-express:send');
var Combo	= require('./combo');
var send	= require('send');


module.exports = SendStream;

function SendStream(req, res, options) {
	var obj = send(req, '', options);
	_.extend(this, obj);

	this.res	= res;
	this.req	= req;
	this.files	= [];

	var separator = this.options.separator;
	if (separator) {
		this._separator = Buffer.isBuffer(separator) ? separator : new Buffer(separator);
	}
};

SendStream.prototype = send();

_.extend(SendStream.prototype, {
	checkComboUrl: function() {
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
		if (urlFiles.length > options.comboMaxFiles) {
			throw new Error('to many files,'+options.comboMaxFiles);
		}
		var gbExtname = null;

		for(var i = 0, len = urlFiles.length; i < len; i++) {
			// check root path
			var file = path.normalize(urlRootPath+ '/' + urlFiles[i]);
			var reqFile = urls[0]+'/'+urlFiles[i];

			if (file.indexOf(options.root) === 0) {
				var extname = path.extname(file).toLowerCase();
				if (gbExtname !== null && gbExtname != extname) {
					throw new Error('mulit extname,'+gbExtname+','+extname+','+reqFile);
				}
				if (options.comboExtnames.indexOf(extname) == -1) {
					throw new Error('involve not allowed extname,'+extname+','+reqFile);
				}
				gbExtname = extname;
				self.files.push(file);
			} else {
				debug('path overflow, root: %s, file: %s, urlRootPath: %s, offset: %d', options.root, file, urlFiles[i], file.indexOf(options.root));
				throw new Error('path overflow,'+reqFile);
			}
		}
	},
	comboSend: function() {
		var self = this;

		(new Combo(self.files)).on('readStart', function(lstats, lfile, files, prevent) {
				self.setHeader(lfile, lstats);
				self.type(lfile);

				// cache check from send
				if (self.isConditionalGET() && self.isCachable() && self.isFresh()) {
					self.notModified();
					prevent();
				}

				self.emit('readStart', lstats, lfile, files, prevent);
			})
			.on('data', function(data) {
				self.res.write(data);
				self.emit('data', data);
			})
			.on('fileEnd', function() {
				if (self._separator) {
					self.res.write(self._separator);
					self.emit('data', self._separator);
				}

				self.emit('fileEnd');
			})
			.on('end', function() {
				self.res.end();
				self.emit('end');
			})
			.on('error', function(err) {
				if (err.rdFile) {
					err.message += ','+err.rdFile.substr(self.options.root.length);
				}

				self.emit('error', err);
			})
			.stream();
	}
});
