# seajs-combo-express

combo plugin for express (just for seajs)


## Installation

```
$ npm install seajs-combo-express
```


## Usage

```js
var expr = require('express')
var app = expr();
app.use(require('seajs-combo-express')(opts));
```

### Options

* cachePath: use cache, and save cache to this path. default: ''
* separator: combo width this separator between files. default: '\n'
* root: the path to findup files. defaults: require module dirname
* maxage: set source browser cache age. default: 0
* comboSyntax: as same as [seajs-combo](https://github.com/seajs/seajs-combo/blob/master/src/seajs-combo.js#L11). default:["??", ","]
* parseFilename: md5 cache filename. default: md5 function

