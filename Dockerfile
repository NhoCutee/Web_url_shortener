# ================================================================
# Dockerfile for Next.js URL Shortener
# 
# Dung cho DEV voi hot-reload (source code duoc mount qua volume).
# Production thi uncomment phan multi-stage build ben duoi.
# ================================================================

# Base image: Node LTS Alpine (nhe, bao mat, phu hop production)
FROM node:22-alpine

# Cai dat cac tool can thiet cho alpine
RUN apk add --no-cache libc6-compat

# Thu muc lam viec ben trong container
WORKDIR /app

# Sao chep chi package files truoc (tan dung Docker layer cache)
# -> Neu chi thay doi code ma khong doi package.json, layer nay se duoc cache lai
COPY package*.json ./

# Cai dependencies
# --frozen-lockfile: dam bao dung chinh xac phien ban trong package-lock.json
RUN npm install

# KHONG copy source code vao day (se duoc mount qua volume trong docker-compose)

# Expose port Next.js dev server
EXPOSE 3000

# Bien moi truong de Next.js lang nghe tren 0.0.0.0 (khong chi localhost)
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Lenh khoi dong dev server voi hot-reload
CMD ["npm", "run", "dev"]
