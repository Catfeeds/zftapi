# 电小鸽 后台 [![Build Status](https://travis-ci.org/cloudenergy/zftapi.svg?branch=develop)](https://travis-ci.org/cloudenergy/zftapi)

## Development Environment

### docker-compose

```bash
docker-compose up --build
```

will start up a dev environment on `localhost:8000`, 

it uses `nodemon` for reloading the environment.

### working with web-zft

Make sure you have `ZFT_BACKEND_PROXY` properly set for `web-zft`, 
this will override its default mock proxy. 

```bash
export ZFT_BACKEND_PROXY=http://localhost:8000
```

Then start `web-zft` by running:

```bash
npm run dev
```

### refresh db schema

use 

```bash
docker-compose down && docker-compose up --build

```
after changing database schema every time.

database schema stores [here: db/init.sql](db/init.sql)


## Deployment

### travis CI 

### Aliyun 

### dockerhub