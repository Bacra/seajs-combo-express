var fs			= require('fs');
var async		= require('async');
var underscore	= require('underscore');
var debug		= require('debug')('seajs-combo-express:combo');

module.exports = Combo;

function Combo(writeStream, filePaths, separator) {
	this._writeStream = writeStream;
	this._filePaths = filePaths;

	if (separator) {
		this._separator = Buffer.isBuffer(separator) ? separator : new Buffer(separator);
	}
};

require('util').inherits(Combo, require('events').EventEmitter);

underscore.extend(Combo.prototype, {
	stream: function() {
		var self = this;
		var filePaths = self._filePaths;
		var lstats;

		// maybe file handle overflow
		async.eachLimit(filePaths, 4, function(file, callback) {
			// file stat
			fs.exists(file, function(exists) {
				if (!exists) return callback(self._generateError(new Error('Not Found'), file));

				fs.stat(file, function(err, stats) {
					if (err) return callback(self._generateError(err, file));
					if (!stats.isFile()) return callback(self._generateError(new Error('Not File'), file));

					if (!lstats || stats.mtime > lstats.mtime) lstats = stats;
					callback();
				});
			});

		}, function(err) {
			if (err) return self._error(err);

			self.emit('readStart', lstats, filePaths);

			// read file content
			async.eachSeries(filePaths, self._doWriteStream.bind(self), function(err) {
				if (err) {
					self._error(err);
				} else {
					self._writeStream.end();
				}
			});

		});
	},
	_doWriteStream: function(file, callback) {
		var self = this;
		var stream = fs.createReadStream(file);
		stream.pipe(this._writeStream, {end: false});

		stream.on('end', function() {
				if (self._separator) self._writeStream.write(self._separator);
				callback();
			})
			.on('error', function(err) {
				callback(self._generateError(err, file));
			});
	},
	_error: function(err) {
		if (err) debug('err: %s rdFile:%s', err.message, err.rdFile);
		this.emit('error', err);
	},
	_generateError: function(err, file){
		err.rdFile = file;
		return err;
	}
});
