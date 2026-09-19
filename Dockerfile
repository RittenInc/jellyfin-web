ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-slim AS build
WORKDIR /src
COPY package*.json ./
RUN npm ci
COPY . .
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm run build:production

FROM nginx:alpine
COPY --from=build /src/dist /usr/share/nginx/html
COPY publish.sh /publish.sh
RUN chmod +x /publish.sh
ENTRYPOINT ["/publish.sh"]