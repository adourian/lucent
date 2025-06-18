# Build stage
FROM node:20 AS build

WORKDIR /app
COPY . .
RUN rm -rf node_modules package-lock.json
RUN npm install
RUN npm run build

# Serve stage
FROM nginx:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]