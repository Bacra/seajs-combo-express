var fs			= require('fs');
var async		= require('async');
var underscore	= require('underscore');
var debug		= require('debug')('seajs-combo-express:combo');

module.exports = Combo;

function Combo(files) {
	this.files = files;
};

require('util').inherits(Combo, require('events').EventEmitter);

underscore.extend(Combo.prototype, {
	stream: function() {
		var self = this;
		
		self.filterFiles(function(err, lstats, lfile, files) {
			if (err) return self.error(err);

			var preventNext = false;
			self.emit('readStart', lstats, lfile, files, function() {preventNext = true});

			if (preventNext) return;

			// read file content
			async.eachSeries(files, self._doWriteStream.bind(self), function(err) {
				if (err) {
					self.error(err);
				} else {
					self.emit('end');
				}
			});
		});
	},
	filterFiles: function(callback) {
		var self = this;
		var files = self.files;
		var lstats;

		// maybe file handle overflow
		async.eachLimit(files, 4, function(file, callback) {
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
			callback(err, lstats, files[0], files);
		});
	},
	_doWriteStream: function(file, callback) {
		var self = this;
		var stream = fs.createReadStream(file);

		stream.on('data', function(data) {
				self.emit('data', data);
			})
			.on('end', function() {
				self.emit('fileEnd');
				callback();
			})
			.on('error', function(err) {
				callback(self._generateError(err, file));
			});
	},
	error: function(err) {
		if (err) debug('err: %s rdFile:%s', err.message, err.rdFile);
		this.emit('error', err);
	},
	_generateError: function(err, file){
		err.rdFile = file;
		return err;
	}
});
