FROM node:10.13-alpine
# env [local,dev,unittest,test,staging,start]
ENV NODE_ENV test
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
COPY . .
EXPOSE 3000
CMD ["npm","start"]