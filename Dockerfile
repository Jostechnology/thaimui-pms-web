# Use official Node.js image as base
FROM node:20-alpine AS build

# Set working directory in container
WORKDIR /app

# Copy package.json and lock files first to leverage Docker cache
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the port Vite will run on
EXPOSE 5173

# Start the Vite development server
CMD ["npm", "run", "dev"]