FROM node:26.5.0-alpine
WORKDIR /app
COPY package.json .
RUN apk update && apk upgrade --no-cache && npm install --omit=dev
COPY graphserver.js .
COPY UScities.json .
USER node
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "graphserver.js"]
