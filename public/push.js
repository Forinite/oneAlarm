var push = require('web push')

let vapidKeys = {
    publicKeys: "BHOKUpO2splGJyFpzURcNyiGbzth4eV4YClxwRv3MYy9JgLoXbFhIoR46jKiFyxXSiRYft9sj2mAxO3BgQdC8Jg",
    privateKeys: meta.env.VAPID_PRIVATE_KEY
}

push.setVapidDetails('mailto:random@mail.com', vapidKeys.publicKeys, vapidKeys.privateKeys)

let sub = {}
push.sendNotification(sub, 'test message')
