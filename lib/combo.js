var fs		= require('fs');
var async	= require('async');
var debug	= require('debug')('seajs-combo-express:combo');

module.exports = Combo;

function Combo(writeStreams, filePaths, separator) {
	this._writeStreams = writeStreams;
	this._filePaths = filePaths;

	if (separator) {
		this._separator = Buffer.isBuffer(separator) ? separator : new Buffer(separator);
	}
};

require('util').inherits(Combo, require('events').EventEmitter);
var proto = Combo.prototype;

proto.stream = function() {
	var self = this;
	var filePaths = self._filePaths;
	var lstats;

	// maybe file handle overflow
	async.eachLimit(filePaths, 4, function(file, callback) {
		// file stat
		fs.exists(file, function(exists) {
			if (!exists) return callback(self._generateError(new Error('Not Found'), file));

			fs.stat(file, function(err, stats) {
				if (err) return callback(err);
				if (!stats.isFile()) return callback(self._generateError(new Error('Not File'), file));

				if (!lstats || stats.mtime > lstats.mtime) lstats = stats;
				callback();
			});
		});

	}, function(err) {
		if (err) return self._error(err);

		self.emit('readStart', lstats, filePaths);

		// read file content
		async.eachSeries(filePaths, self._writeStream.bind(self), function(err) {
			if (err) {
				self._error(err);
			} else {
				self._end();
			}
		});

	});
};

proto._writeStream = function(file, callback) {
	var self = this;
	var stream = fs.createReadStream(file);
	var pipeStream = stream;

	self._doWriteStream(function(item) {
		pipeStream = pipeStream.pipe(item, {end: false});
	});
		
	self.emit('readSingle', stream, pipeStream);

	stream.on('end', function() {
			if (self._separator) {
				self._doWriteStream(function(item) {
					item.write(self._separator);
				});
			}
			callback();
		})
		.on('error', function(err) {
			callback(self._generateError(err, file));
		});
};

proto._error = function(err) {
	if (err) debug('err: %s rdFile:%s', err.message, err.rdFile);

	this._end(err);
};

proto._end = function(err) {
	this.emit('readEnd', err);

	this._doWriteStream(function(item) {
		item.end();
	});
};

proto._doWriteStream = function(callback) {
	if (this._writeStreams.forEach) {
		this._writeStreams.forEach(callback);
	} else {
		callback(this._writeStreams);
	}
};

proto._generateError = function(err, file){
	err.rdFile = file;
	return err;
};
