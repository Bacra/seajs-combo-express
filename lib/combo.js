var fs		= require('fs');
var async	= require('async');
var debug	= require('debug')('seajs-combo-express:combo');

module.exports = Combo;

function Combo(res, filePaths) {
	this._res = res;
	this._filePaths = filePaths;
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
			if (!exists) return callback(new Error('Not Found'));

			fs.stat(file, function(err, stats) {
				if (err) return callback(err);
				if (!stats.isFile()) return callback(new Error('Not File'));

				if (!lstats || stats.mtime > lstats.mtime) lstats = stats;
				callback();
			});
		});

	}, function(err) {
		if (err) return self._error(err);

		self.emit('readStart', lstats, filePaths);

		// read file content
		async.eachSeries(filePaths, self._writeStream.bind(self), self._endWriteStream_.bind(self));

	});
};

proto._writeStream = function(file, callback)
{
	var stream = fs.createReadStream(file);
	var pipeStream = stream.pipe(this._res, {end: false});
	this.emit('readSingle', stream, function(stream) {
		pipeStream = pipeStream.pipe(stream);
	});

	stream.on('end', function() {
			callback();
		})
		.on('error', callback);
};

proto._endWriteStream_ = function(err) {
	this.emit('readEnd', err);

	if (err) return this._error(err);
	this._res.end();
};

proto._error = function(err)
{
	this._res.statusCode = 404;
	this._res.end();

	if (err) debug('err: %s', err.message);

	this.emit('_error', err);
}