# CRIMP-receiver
* Only admins and judges are allowed to connect to `CRIMP-receiver`, the public will connect to `CRIMP-broadcaster` (see below)
* Separation ensure that scoring will be up even if 1 million people connect to see the scores and inadvertently DDOS us
* You're strongly recommended to keep the address of this server a secret


<br>


## POST 'judge/login'
* Used by judges to login or create an account

#### Request
```
header: [FB Auth Credentials]
```

#### Response
```
Status: 200 OK / 201 Created / 401 Unauthorized
Body: {
  adminId: 'happycaterpie',
  adminStatus: -1
}
```
* Respond 200 for successful login
* Respond 201 for successful creation
* Respond 401 when adminId exists in database but credentials are wrong
* `adminStatus` 0 for pending, 1 for judges, 2 for admin, 3 for super-admin


<br><br><br>


## POST '/judge/report'
* Used by judges to report in when they are judging a route
* Server will track the judges currently active (login/scoring) on all the routes in an array
* If there is no activity from a judge for 6mins, he will be removed from the array
* Removal can be enforced by setting `force` to true, which covers the case when judges are substituted from duty

#### Request
```
header: [FB Auth Credentials]
body: {
  categoryId: 'NWQ'
  routeId: 'NWQ01
  force: false
}
```

#### Response
```
Status: 200 OK
Body: {
  adminId: 'happycaterpie',
  adminName: 'Weizhi'
  categoryId: 'NWQ',
  routeId: 'NWQ01'
  state: 1
}
```
* `adminId` and `adminName` refers to the active judge on that route
* `state` 1 for successful request, 0 for failed request
* `adminId` and `adminName` be your's if successful, someone else's if failed.
* Request will fail when there is already a judge on that route


<br><br><br>


## POST 'judge/helpme'
* Used by judges to summon help from the admin to their station

#### Request
```
header: [FB Auth Credentials]
body: {
  adminId: 'happycaterpie',
  routeId: 'NWQ01'
}
```

#### Response
```
Status: 200 OK / 401 Unauthorized
```


<br><br><br>


## GET 'judge/climbers/:categoryId'
* Used by judges to get identity of all the climbers in a specific category

#### Response
```
Status: 200 OK
Body: {
  categoryId: 'NWQ'
  climbers: [
    {
      climberId: 'NMQ001'
      climberName: 'DongWei'
    },
    {
      climberId: 'NMQ002',
      climberName: 'Weizhi'
    },

    ...

  ]
}
````


<br><br><br>


## GET 'judge/score/:routeId/:climberId'
* Used by judges to get the score of a climber on a specific route

#### Response
```
Status: 200 OK
Body: {
  routeId: 'NMQ001'
  climberId: 'NMQ001',
  climberName: 'DongWei',
  score: '11B11'
}
```


<br><br><br>


## POST 'judge/score/:routeId/:climberId'
* Used by judges to update the score of a climber on a specific route

#### Request
```
header: [FB Auth Credentials]
body: {
  score: '11T'
}
```

#### Response
```
Status: 200 OK / 401 Unauthorized
```

* `score` should only cover climbs on that attempt
  * e.g. sending in '11T' for DongWei makes his overall score to be '11B1111T'


<br><br><br>
<br><br><br>


# CRIMP-broadcaster

_Coming soon_