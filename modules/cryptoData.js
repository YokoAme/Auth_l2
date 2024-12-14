const crypto = require('crypto');
module.exports = {};

module.exports.encryptLogin = (login) => login;
module.exports.decryptLogin = (login) => login;

module.exports.encryptEmail = (email) => email.toLowerCase();
module.exports.decryptEmail = (email) => email.toLowerCase();

module.exports.encryptSession = (data) => data;
module.exports.decryptSession = (data) => data;

module.exports.sha256 = (str) => crypto.createHash('sha256').update(str).digest('hex');

module.exports.guid = (length = 30) => {
    const symbol = () => (Math.random()*35|0).toString(36);
    let str = '';
    for (let i = 0; i < length; i++) {
        str += symbol();
    }
    return str;
}