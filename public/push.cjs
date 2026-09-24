var push = require('web-push')

let vapidKeys = {
    publicKeys: "BHOKUpO2splGJyFpzURcNyiGbzth4eV4YClxwRv3MYy9JgLoXbFhIoR46jKiFyxXSiRYft9sj2mAxO3BgQdC8Jg",
    privateKeys: "ogAWmk5WEK0kqL4-bxpu1LL6kai-9Gqn8yMBywc-aKo"
}

push.setVapidDetails('mailto:random@mail.com', vapidKeys.publicKeys, vapidKeys.privateKeys)

let sub =  {
    endpoint:"https://fcm.googleapis.com/fcm/send/cX_1WDhBhlI:APA91bEyyQNSmRaNnG7KRSB4NpWLNKpXNC3E88oIw5xFhcfRp5WJVHbnfxzXQr1YAAABMJGhzFG4rn-ZSYEgcxd4OVHZ5gYfD0KaBImnroTGq4Qdp2rnaxwEyAJO7VQEWewRSnZxSoED",
    expirationTime:null,
    keys:{ 
        p256dh:"BLv0e66175i94bN1Nh61RE-rKDi58QjNHpRLJKwMYbebpVHLBKrvkx5LkROs2D0BLGgXclHfbucarlS2bVIdB2A",
        auth:"qS_JWB5fRwi0MvWk_k6kxQ"
    }
}

push.sendNotification(sub, 'test message')
