const mongo = require('./mongo');
const geoIP = require('../geoIP');
const userAgent = require('../userAgent');
const crypt = require('../cryptoData');

module.exports = function(config = {
    name: 'qurre-id',
    //expires: Date.now(),
    httpOnly: false,
    domain: '.qurre.app',
    path: '/',
    secure: true
}) {
    let cache = [];
    return {
        config:config,
        get: async(id, latest = false, ip = null, userAgent = null) => {
            const hashCurIp = ip ? crypt.sha256(ip) : null;
            const cryptBrowser = (() => {
                if(!userAgent) return null;
                const urag = userAgent.parse(userAgent);
                return crypt.encryptSession(userAgent.getBrowser(urag)) +
                crypt.encryptSession(userAgent.getOS(urag))
            })();

            if(!latest && cache.some(x => x.uid == id &&
                Date.now() - x.lastSyns < 100000 &&
                x.expires - Date.now() > 0 &&
                ((!hashCurIp || hashCurIp == x.hashedIp) &&
                (!cryptBrowser || cryptBrowser == x.browser + x.os)))){
                    const _exist = await mongo.exists({id:crypt.sha256(id)});
                    if(!_exist) return 0;
                    return cache.find(x => x.uid == id).data;
            }

            const _data = await mongo.findOne({id:crypt.sha256(id)});
            if(_data == null || _data == undefined) return 0;

            if ((hashCurIp && _data.hashedIp != hashCurIp) ||
                (cryptBrowser && cryptBrowser != _data.browser + _data.os)){
                cache = cache.filter(x => x.uid != id);
                await _data.deleteOne();
                return 0;
            }

            cache = cache.filter(x => x.uid != id);
            cache.push({
                uid:id,
                data:_data.account,
                lastSyns: Date.now(),
                expires: _data.expires,
                hashedIp: _data.hashedIp,
                browser: cryptBrowser,
            });

            return _data.account;
        },
        
        init: async(req, res, next) => {
            const ck = req.cookies[config.name];
            const hashedIp = crypt.sha256(req._ip);
            const urag = userAgent.parse(req.headers['user-agent']);
            const cryptBrowser = crypt.encryptSession(userAgent.getBrowser(urag)) +
            crypt.encryptSession(userAgent.getOS(urag));

            req.bs = {
                data: 0,
                save: async function(expires = config.expires) {
                    let uid = ck;
                    if(uid == null || uid == undefined){
                        uid = crypt.guid(100);
                        res.cookie(config.name, uid, {
                            expires,
                            httpOnly:config.httpOnly,
                            domain:config.domain,
                            path:config.path,
                            secure:config.secure
                        });
                    }

                    if(!cache.some(x => x.uid == uid)){
                        cache.push({uid,
                            data:req.bs.data, 
                            lastSyns: Date.now(), 
                            expires: expires.getTime(), 
                            hashedIp: hashedIp,
                            browser: cryptBrowser,
                        });
                    }else{
                        const _chc = cache.find(x => x.uid == uid);
                        _chc.data = req.bs.data;
                        _chc.lastSyns = Date.now();
                    }
                    await MongoUpdate();

                    async function MongoUpdate() {
                        const _data = await mongo.findOne({id:crypt.sha256(uid)});
                        if(_data == null || _data == undefined){
                            const ipinf = await geoIP.getIpInfo(req._ip);
                            await new mongo({
                                id:crypt.sha256(uid),
                                account:req.bs.data,
                                expires: expires.getTime(),
                                loc: crypt.encryptSession(geoIP.getInfLocation(ipinf)),
                                browser: crypt.encryptSession(userAgent.getBrowser(urag)),
                                os: crypt.encryptSession(userAgent.getOS(urag)),
                                hashedIp: crypt.sha256(req._ip)
                            }).save();
                        }else{
                            if(_data.hashedIp != hashedIp || cryptBrowser != _data.browser + _data.os){
                                cache = cache.filter(x => x.uid != ck);
                                await _data.deleteOne();
                            }else{
                                _data.account = req.bs.data;
                                await _data.save();
                            }
                        }
                    }
                },
                destroy: async function(){
                    if(ck == null || ck == undefined) return;
                    res.clearCookie(config.name, {
                        httpOnly:config.httpOnly,
                        domain:config.domain,
                        path:config.path,
                        secure:config.secure
                    });
                    cache = cache.filter(x => x.uid != ck);
                    await mongo.deleteMany({id:crypt.sha256(ck)});
                },
                clearAll: async(account) => {
                    try{cache = cache.filter(x => x.data != account);}catch{}
                    await mongo.deleteMany({account});
                }
            }

            if(ck == null || ck == undefined) return next();

            if(cache.some(x => x.uid == ck && Date.now() - x.lastSyns < 100000 && x.expires - Date.now() > 0 && hashedIp == x.hashedIp)){
                const _exist = await mongo.exists({id:crypt.sha256(ck)});
                if(!_exist) req.bs.data = 0;
                else req.bs.data = cache.find(x => x.uid == ck).data;
            }else{
                const _data = await mongo.findOne({id:crypt.sha256(ck)});
                if(_data == null || _data == undefined) return next();

                if(_data.hashedIp != hashedIp || cryptBrowser != _data.browser + _data.os){
                    cache = cache.filter(x => x.uid != ck);
                    await _data.deleteOne();
                }else{
                    req.bs.data = _data.account;
                    cache = cache.filter(x => x.uid != ck);
                    cache.push({
                        uid:ck,
                        data:req.bs.data,
                        lastSyns: Date.now(),
                        expires: _data.expires,
                        hashedIp: _data.hashedIp,
                        browser: _data.browser + _data.os,
                    });
                }
            }
            next();
        }
    }
}