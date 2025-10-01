# Use an official lightweight Node.js image
FROM node:20-alpine

# Create and define the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json for dependency installation
# This is done first to leverage Docker's layer caching
COPY package*.json ./

# Install the application's dependencies
RUN npm install

# Copy the rest of your application's source code
COPY . .

# Build your TypeScript code into JavaScript
RUN npm run build

# Expose the port your application runs on
EXPOSE 8080

# The command to run your application when the container starts
CMD [ "node", "dist/server.js" ]