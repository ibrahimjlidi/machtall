FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm ci
COPY apps/api apps/api
COPY src/data.js src/data.js
RUN npm run db:generate --workspace @mashtal/api
RUN npm run api:build

FROM build AS migration
USER node
CMD ["npm", "run", "db:migrate", "--workspace", "@mashtal/api"]

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm ci --omit=dev --workspace @mashtal/api
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/prisma apps/api/prisma
COPY --from=build /app/src/data.js src/data.js
COPY --from=build /app/node_modules/.prisma node_modules/.prisma
USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
