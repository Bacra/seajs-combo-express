var fs			= require('fs');
var send		= require('send');
var debug		= require('debug')('seajs-combo-express:cache');
var underscore	= require('underscore');


module.exports = writeCache;
writeCache.lockTimeout = 60*1000*5;

function writeCache(res, req, file, sender) {
	// lockfile when fork
	var lockfile = file+'~';

	if (fs.existsSync(lockfile)) {
		try {
			// check ctime
			var ctime = +fs.statSync(lockfile).ctime;
			var now = +(new Date);
			if (ctime < writeCache.lockTimeout+now) {
				debug('lock file timeout: %s, ctime: %d', lockfile, ctime);

				if (fs.existsSync(file)) fs.unlinkSync(file);
			} else {
				debug('lock file time: %s, ctime: %d, now: %d, d: %d', lockfile, ctime, now, now - ctime);
				return false;
			}
		} catch(err) {
			debug('check lockfile info err: %s', lockfile, err);
		}
	}

	if (fs.existsSync(file)) {
		// static resource
		send(req, file, underscore.extend({}, config, {root: config.cachePath})).pipe(res);
		return;
	}

	try {
		var lockFd = fs.openSync(lockfile, 'w+');
		var lockFileContent = process.pid+'$end';
		var buf = new Buffer(lockFileContent);
		fs.writeSync(lockFd, buf, 0, buf.length, null);
		fs.readSync(lockFd, buf, 0, buf.length, null);
		fs.closeSync(lockFd);

		if (buf.toString() != lockFileContent) {
			debug('write lock file sync: %s', lockfile);
			return false;
		}
	} catch(err) {
		debug('write lock file err: %s', lockfile, err);
		return false;
	}

	function doFinal() {
		try {
			fs.unlinkSync(lockfile);
		} catch(err) {
			debug('delete unlink file err: %s', lockfile);
		}
	}

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
			fs.open(file, 'w', function(err, fd) {
				try {
					if (err) throw err;

					var buf = Buffer.concat(allData);
					fs.writeSync(fd, buf, 0, buf.length, null);
					fs.futimesSync(fd, newLstats.atime, newLstats.mtime);
					fs.closeSync(fd);

					debug('write file: %s', file);

				} catch(err) {
					debug('write file err: %s', file, err);

					try {
						fd && fs.closeSync(fd);
						if (fs.existsSync(file)) fs.unlinkSync(file);
					} catch(err) {
						debug('close file err: %s', file, err);
					}
				}

				doFinal();
			});
		})
		.on('error', function(err) {
			doFinal();
			debug('send err', err);
		})
		.combo();
};

