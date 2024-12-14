const userNick = document.getElementById('userNick')
const avatarElement = document.getElementById('avatar')
const nick = document.getElementById("nickname")
const login = document.getElementById('login')
const creationDate = document.getElementById('creation-date')
const gender = document.getElementById('gender')
const phone = document.getElementById('phone')

let profile
window.addEventListener('DOMContentLoaded', async () => {
    profile = (await postData('/getProfile')).account

    if(profile.avatar != "null") {
        avatarElement.src = profile.avatar
    }
    if(profile.nick != "") {
        userNick.innerHTML = profile.nick
    }
    if(profile.gender != "") {
        gender.value = profile.gender
    }
    nick.value = profile.nick
    login.value = profile.login
    creationDate.value = millisecondsToDate(profile.created)
    // nick.innerHTML = profile.nick
    phone.value = profile.phone
})

const uploadAvatar = document.getElementById('uploadAvatar');
let croppie

uploadAvatar.addEventListener('change', (event) => {
    document.querySelector('.profile-container').style.pointerEvents = "none";
    document.querySelector('.previewAvatar').style.display = 'flex';
    previewImage(event)
})

function openFileDialog() {
    uploadAvatar.click();
}

function closeModal() {
    modalOverlay.style.display = 'none';
    
}

function previewImage(event) {
    const input = event.target
    const imgElement = document.getElementById('previewImage')
  
    const reader = new FileReader()
  
    reader.onload = function(e) {
        const imageUrl = e.target.result
  
        imgElement.src = imageUrl
        croppie = new Croppie(imgElement, {
            viewport: { width: 302, height: 300, type: "circle" },
            boundary: { width: 302, height: 300 }
        })
    };
  
    reader.readAsDataURL(input.files[0])
}

document.getElementById('closePreviewAvatar').addEventListener('click', () => {
    document.querySelector('.previewAvatar').style.animation = 'slideDown 1s ease-in-out forwards'
    setTimeout(function() {
        document.querySelector('.previewAvatar').style.animation = 'slideUp 1s ease-in-out forwards'
        document.querySelector('.previewAvatar').style.display = 'none'
        document.getElementById('previewImage').src = ""
        croppie.destroy()
        document.getElementById('avatar').value = ""
        document.querySelector('.profile-container').style.pointerEvents = "auto"
    }, 1000)
})

document.getElementById('savePreviewAvatar').addEventListener('click', async () => {
    const result = await croppie.result({ type: 'base64', size: 'viewport', circle: false })

    uploadAvatarToServer(result, profile.id)
})

let sended = false
document.getElementById('submitDataChanges').addEventListener('click', async () => {
    if(sended) return sendNotification('Запрос уже отправлен')
    sended = true

    if(login.value.length < 3) {
        sendNotification("В логине должно быть более 3-х символов включительно")
        sended = false
        return
    }

    if (!/^[\w]+$/.test(login.value)) {
        sendNotification("В логине не может быть специальных символов и пробелов")
        sended = false
        return
    }
    profile.nick = nick.value
    profile.login = login.value
    profile.phone = phone.value
    profile.gender = gender.value

    goToLoad(document.getElementById('submitDataChanges'), true)

    const result = await postData('/saveProfile', { data: profile })
    if(result.error) {
        sendNotification(result.msg, 5)
    } else {
        goToLoad(document.getElementById('submitDataChanges'), false)
        window.location.reload()
    }
})

async function postData(url = '', data = {}) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    return response.json();
}

function goToLoad(element, value) {
    if(value) {
        element.innerHTML = `<span class="loader"></span>`
        element.style.pointerEvents = "none"
    } else {
        element.innerHTML = "Сохранить изменения"
        element.style.pointerEvents = "auto"
    }
}

async function uploadAvatarToServer(croppieResult, userId) {
    try {
        const base64Data = croppieResult.split(',')[1]

        fetch(`https://cdn.danone.dev/ameupload/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: base64Data }),
        })
            .then(response => response.json())
            .then(async data => {
                if(data.error) {
                    sendNotification(data.message, 10)
                } else {
                    profile.avatar = data.url
                    const result = await postData('/saveProfile', { data: profile })
                    if(result.error) {
                        sendNotification(result.msg, 5)
                    } else {
                        sendNotification('Аватарка успешно сохранена', 7)
                        avatarElement.src = profile.avatar
                        document.getElementById('closePreviewAvatar').click()
                    }
                }
            })
            .catch(error => console.error('Error:', error))
    } catch (error) {
        console.error('Error uploading avatar:', error);
    }
}

function sendNotification(message, time = 5) {
    var div = document.createElement('div')
    div.setAttribute('class', 'item')
    div.innerHTML = `
    <i class="fa-regular fa-circle-exclamation"></i>
    <p>${message}</p>
    `
    document.querySelector('.notifications').appendChild(div)

    setTimeout(function() {
        div.style.animation = "hideNotification 1s ease-in-out forwards"
        setTimeout(function() {
            div.style.animation = "showNotification 1s ease-in-out forwards"
            div.remove()
        }, 1000)
    }, (time * 1000))
}

function millisecondsToDate(milliseconds) {
    const date = new Date(milliseconds)

    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')

    return `${day}.${month}.${year} ${hours}:${minutes}`
}