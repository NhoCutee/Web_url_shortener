FROM node:22-alpine
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm install
EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
CMD ["npm", "run", "dev"]
