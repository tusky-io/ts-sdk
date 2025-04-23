FROM node:22-alpine

WORKDIR /app

COPY package.json yarn.lock ./
    
RUN yarn install

COPY index.ts .

CMD ["yarn", "start"] 