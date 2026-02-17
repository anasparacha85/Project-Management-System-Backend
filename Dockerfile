FROM node:20

WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --production

# Copy app source
COPY . .

# Default port (can be overridden at runtime)
ENV PORT=8081
EXPOSE 8081

CMD ["npm", "start"]
