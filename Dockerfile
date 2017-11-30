FROM node:8.9.1-alpine

RUN npm i -g pm2
RUN mkdir /app

WORKDIR /app

# Bundle APP files
COPY config config/
COPY libs libs/
COPY services services/
COPY transformers transformers/
COPY package*.json ./

COPY deploy/pm2.json pm2.json
COPY config/*.json config/

COPY zftapi.js app.js

# Install app dependencies
ENV NPM_CONFIG_LOGLEVEL warn
RUN npm install --production

CMD [ "pm2-docker", "start", "pm2.json" ]