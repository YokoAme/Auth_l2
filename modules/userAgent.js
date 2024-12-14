const pl = require('platform');
module.exports = {};
module.exports.parse = (string) => pl.parse(string);
module.exports.getBrowser = (uragent) => uragent.name ?? 'Unknow';
module.exports.getOS = (uragent) => uragent.os.family ?? 'Unknow';