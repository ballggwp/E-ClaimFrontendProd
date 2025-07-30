# # 1. Build
# FROM node:22-alpine AS builder

# WORKDIR /app

# ENV NODE_ENV=production
# # these must match your .env.local
# ARG NEXTAUTH_URL
# ARG NEXT_PUBLIC_BACKEND_URL

# ENV NEXTAUTH_URL=$NEXTAUTH_URL
# ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL

# # install only production deps
# COPY package.json package-lock.json ./
# RUN npm install

# # copy built assets
# COPY . .
# RUN npm run build
# EXPOSE 3000
# CMD ["npm","run","start"]
FROM node:20-alpine AS builder
WORKDIR /app

ARG NEXTAUTH_URL
ARG NEXT_PUBLIC_BACKEND_URL

ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
 
ENV NODE_ENV=production
ENV TZ=Asia/Bangkok 
 
RUN apk add --no-cache tzdata && cp /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone && apk del tzdata
 
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
 
EXPOSE 3000
CMD ["npm", "run", "start"]
