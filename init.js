const express = require('express')
const path = require('path')
const http = require('http')
const mongoose = require('mongoose')
const cookieParser = require('cookie-parser');
const bs = require('./modules/better-sessions')

mongoose.set('strictQuery', false);

mongoose.connect("mongodb://ame:71vkBW99WzfxmRWDNdd4UruCfDnyaR3h@103.137.251.207:27017/AmeYoko?authSource=admin")
console.log(`The main database has been successfully connected`)

const mongo = require('./modules/mongodb.js')

const _session = bs({
    name: 'localhost',
    expires: new Date(Date.now() + 86400000),
    httpOnly: true,
    domain: 'localhost',
    path: '/',
    secure: true
});

const web = express()
web
.disable('x-powered-by')
.use(express.static(path.join(__dirname, '/.public')))
.engine('html', require('ejs').renderFile)
.set('view engine', 'ejs')
.set('views', path.join(__dirname, '/.views'))
.use(express.urlencoded({extended: true}))
.use(express.json())
.use(cookieParser())
.use(function(req, res, next){
    req._ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress).replace('::ffff:', '').replace('::1', '127.0.0.1')
    next()
})
.use(_session.init)

.get('/', async(req, res) => {
    res.render('main')
})
.get('/auth', async(req, res) => {
    if(checkAuth(req)) return res.redirect('/profile')
    res.render('auth')
})
.get('/profile', async(req, res) => {
    if(!checkAuth(req)) return res.redirect('/auth')

    res.render('profile')
})

.post('/getProfile', async(req, res) => {
    const account = await mongo.user.findOne({ id: req.bs.data })

    if(account) {
        res.status(200).json( { error: false, account: {
            id: account.id,
            email: account.email,
            login: account.login,
            nick: account.name,
            avatar: account.avatar,
            gender: account.gender,
            phone: account.phone,
            created: account.created
        } })
    } else {
        await req.bs.destroy()
        res.status(401).json( { error: true, msg: `Аккаунт не найден` })
    }
})
.post('/saveProfile', async(req, res) => {
    const data = req.body.data
    let account = await mongo.user.findOne({ id: req.bs.data })

    if(account) {
        account.login = data.login;
        account.name = data.nick;
        account.avatar = data.avatar;
        account.gender = data.gender;
        account.phone = data.phone; await account.save()
        res.status(200).json( { error: false, msg: `Информация успешно сохранена`})
    } else {
        await req.bs.destroy()
        res.status(401).json( { error: true, msg: `Аккаунт не найден` })
    }
})

.post('/auth/register', async(req, res) => {
    const data = req.body

    const email = data.email
    const login = data.login

	if(!validateEmail(email)) return res.status(400).json({error: true, msg: 'Введите действительную почту'})
	if(login.length < 3) return res.status(400).json({error: true, msg: 'В логине должно быть более 3-х символов включительно'})

	if(await mongo.user.exists({email})) return res.status(400).json({error: true, msg: 'Аккаунт с данной почтой уже зарегистрирован'});
	if(await mongo.user.exists({login})) return res.status(400).json({error: true, msg: 'Аккаунт с данным логином уже зарегистрирован'});

	const newUser = new mongo.user({
        id: (await mongo.user.find()).length + 1,
        email: email,
        login: login,
        pass: data.password
    }); await newUser.save()

	res.status(200).json( { error:false } )
})

.post('/auth/login', async(req, res) => {
    const data = req.body

    const text = data.emailOrLogin
    if(data.type == "email") {
        if(!validateEmail(text)) return res.status(400).json({error: true, msg: 'Введите действительную почту'})
        
        if(!await mongo.user.exists({ email: text })) return res.status(400).json({error: true, msg: 'Аккаунт с данной почтой не найден'});
    } else if(data.type == "login") {
        if(text.length < 3) return res.status(400).json({error: true, msg: 'В логине должно быть более 3-х символов включительно'})

        if(!await mongo.user.exists({ login: text })) return res.status(400).json({error: true, msg: 'Аккаунт с данным логином не найден'});
    }

    const account = await mongo.user.findOne({ $or: [ {email: text}, {login: text} ], pass: data.pwd })
    if(account) {
        req.bs.data = account.id
        await req.bs.save(data.remember ? new Date(Date.now() + 2592000000) : new Date(Date.now() + 86400000))
        res.status(200).json( {error: false } )
    } else {
        return res.status(400).json({error: true, msg: 'Вы ввели неверный логин/почту или пароль'})
    }
})

.get('/auth/logout', async(req, res) => {
    await req.bs.destroy()
    res.redirect('/auth')
})

function validateEmail(e) {
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(e);
}

function checkAuth(req) {
    if(isNaN(req.bs.data) || req.bs.data == 0) return false
    return true
}

http.createServer(web).listen(7482, 'localhost')

process.on('unhandledRejection', (err) => console.error(err));
process.on('uncaughtException', (err) => console.error(err));