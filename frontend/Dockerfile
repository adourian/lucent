# Build stage
FROM node:20 AS build

ARG VITE_API_BASE=http://localhost:8000
ENV VITE_API_BASE=$VITE_API_BASE

WORKDIR /app

# Copy package files
COPY package*.json ./

# Force complete clean install - this usually fixes native binary issues
RUN npm cache clean --force && \
    rm -rf node_modules && \
    rm -f package-lock.json && \
    npm install

# Copy source and build
COPY . .
RUN npm run build

# Production nginx stage  
FROM nginx:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html

# Simple nginx config for SPA
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]