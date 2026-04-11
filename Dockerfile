FROM node:18-slim
WORKDIR /usr/src/app
COPY package*.json ./
COPY . .
RUN npm install --production
EXPOSE 8080
CMD ["npm", "start"]
