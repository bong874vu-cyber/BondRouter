# Use Node.js 20 lightweight Alpine image
FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy application source code
COPY . .

# Expose Vite's default dev server port
EXPOSE 5173

# Run Vite dev server bound to all interfaces so it is accessible from outside the container
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5173"]
