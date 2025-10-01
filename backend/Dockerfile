# Use an official lightweight Node.js image
FROM node:20-alpine

# Create and define the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json for dependency installation
COPY package*.json ./

# Install the application's dependencies
RUN npm install

# Copy the rest of your application's source code
# .dockerignore will prevent copying node_modules and dist
COPY . .

# Build your TypeScript code into JavaScript (fresh build inside container)
RUN npm run build

# Expose the port your application runs on
EXPOSE 8080

# Set NODE_ENV (can be overridden at runtime)
ENV NODE_ENV=production

# The command to run your application when the container starts
CMD [ "node", "dist/server.js" ]