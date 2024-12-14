(async() => {

    {
        let sended = false
        const register = document.querySelector('.register')
        
        register.querySelector('.click').addEventListener('click', async () => {
            if(sended) return sendNotification('Запрос уже отправлен')
            sended = true
            
            let _unsafeLogin = register.querySelector('input[type="text"]').value
            if(_unsafeLogin.length < 3) {
                sendNotification("В логине должно быть более 3-х символов включительно")
                sended = false
                return
            }

            if (!/^[\w]+$/.test(_unsafeLogin)) {
                sendNotification("В логине не может быть специальных символов и пробелов")
                sended = false
                return
            }
            
            let _unsafeEmail = register.querySelector('input[type="email"]').value
            if(!validateEmail(_unsafeEmail)) {
                sendNotification("Введите действительную почту")
                sended = false
                return
            }
        
            let _unsafePass1 = document.getElementById('one_pass').value
            if(_unsafePass1.length < 8) {
                sendNotification("В пароле должно быть более 8-и символов включительно")
                sended = false
                return
            }
        
            let _unsafePass2 = document.getElementById('two_pass').value
        
            if(_unsafePass1 != _unsafePass2) {
                sendNotification("Пароли не совпадают")
                sended = false
                return
            }
        
            goToLoad(register.querySelector('.click'), true)

            const req = await postData('/auth/register', {email: _unsafeEmail, login: _unsafeLogin, password: _unsafePass1})

            sended = false;
            goToLoad(register.querySelector('.click'), false)
            if(req.error) return sendNotification(req.msg, 6)
            sendNotification('Ваш аккаунт успешно зарегестрирован', 8)
            register.querySelector('input[type="text"]').value = ""
            register.querySelector('input[type="email"]').value = ""
            register.querySelectorAll('input[type="password"]').forEach(el => {
                el.value = ""
            })
            register.querySelector('.toLogin').click()
        })
    }

    {
        let sended = false
        const login = document.querySelector('.login')
        
        login.querySelector('.click').addEventListener('click', async () => {
            if(sended) return sendNotification('Запрос уже отправлен')
            sended = true
            
            let type = ""
            let text = login.querySelector('input[type="text"]').value
            if(String(text).includes('@')) {
                if(!validateEmail(text)) {
                    sendNotification("Введите действительную почту")
                    sended = false
                    return
                }
                type = "email"
            } else {
                if(text.length < 3) {
                    sendNotification("В логине должно быть более 3-х символов включительно")
                    sended = false
                    return
                }

                if (!/^[\w]+$/.test(text)) {
                    sendNotification("В логине не может быть специальных символов и пробелов")
                    sended = false
                    return
                }
                type = "login"
            }
        
            let pass = login.querySelector('input[type="password"]').value
            if(pass.length < 8) {
                sendNotification("Введите корректный пароль")
                sended = false
                return
            }
        
            goToLoad(login.querySelector('.click'), true)

            let remember = false;
            try { remember = login.querySelector('#remember_checkbox').checked } catch {}

            const req = await postData( '/auth/login', { emailOrLogin: text, type: type, pwd: pass, remember: remember } )

            sended = false;
            goToLoad(login.querySelector('.click'), false)
            if(req.error) return sendNotification(req.msg, 6)
            window.location.replace('/profile')
        })
    }

    function validateEmail(e) {
        var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(e);
    }
})()

const toLoginButtons = document.querySelectorAll('.toLogin')
const toRegiserButtons = document.querySelectorAll('.toRegister')
// const toForgotButton = document.querySelector('.toForgot')

toLoginButtons.forEach(el => {
    el.addEventListener('click', () => {
        const parentBlock = el.parentNode.parentNode.parentNode
        document.querySelector('.login').style.pointerEvents = "none"
        document.querySelector('.login').style.animation = "showBlock 1s ease forwards"
        document.querySelector('.login').style.display = "flex"
        parentBlock.style.animation = "hideBlock 1s ease forwards"
        setTimeout(() => {
            parentBlock.style.display = "none"
            document.querySelector('.login').style.pointerEvents = "auto"
        }, 1500)
    })
})

toRegiserButtons.forEach(el => {
    el.addEventListener('click', () => {
        const parentBlock = el.parentNode.parentNode.parentNode
        document.querySelector('.register').style.pointerEvents = "none"
        document.querySelector('.register').style.animation = "showBlock 1s ease forwards"
        document.querySelector('.register').style.display = "flex"
        parentBlock.style.animation = "hideBlock 1s ease forwards"
        setTimeout(() => {
            parentBlock.style.display = "none"
            document.querySelector('.register').style.pointerEvents = "auto"
        }, 1500)
    })
})

function goToLoad(element, value) {
    if(value) {
        element.innerHTML = `<span class="loader"></span>`
        element.style.pointerEvents = "none"
    } else {
        const name = element.parentNode.parentNode.classList[1]
        console.log(name)
        if(name == "login") {
            element.innerHTML = "Войти"
        } else if(name == "register") {
            element.innerHTML = "Зарегистрироваться"
        }
        element.style.pointerEvents = "auto"
    }
}

async function postData(url = '', data = {}) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    return response.json();
}

function sendNotification(text, time = 3) {
    var div = document.createElement('div')
    div.setAttribute('class', 'item')
    div.innerHTML = `
    <i class="fa-regular fa-circle-exclamation"></i>
    <p>${text}</p>
    `
    document.querySelector('.notifications').appendChild(div)

    setTimeout(function() {
        div.style.animation = "hideNotification 1s ease-in-out forwards"
        setTimeout(function() {
            div.style.animation = "showNotification 1s ease-in-out forwards"
            div.remove()
        }, 1000)
    }, time * 1000)
}