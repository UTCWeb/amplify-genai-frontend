# ---- Base Node ----
    FROM --platform=linux/amd64 node:lts-alpine3.19 AS base
    WORKDIR /app
    COPY package*.json ./
    
    # Update and upgrade packages to ensure patching
    RUN apk update && apk upgrade && \
        addgroup -S appgroup && adduser -S appuser -G appgroup && \
        chown -R appuser:appgroup /app
    
    # ---- Dependencies ----
    FROM base AS dependencies
    USER appuser

    
    # Install dependencies and update packages
    RUN npm ci
    
    # ---- Build ----
    FROM dependencies AS build
    COPY --chown=appuser:appgroup . .
    RUN npm run build
    
    # ---- Production ----
    FROM --platform=linux/amd64 node:lts-alpine3.19 AS production
    
    # Update and upgrade packages to ensure patching in the production stage
    RUN apk update && apk upgrade && \
        addgroup -S appgroup && adduser -S appuser -G appgroup
    WORKDIR /app
    
    # Copy node_modules from the "dependencies" stage
    COPY --from=dependencies /app/node_modules ./node_modules
    
    # Copy build output from the "build" stage
    COPY --chown=appuser:appgroup --from=build /app/.next ./.next
    COPY --chown=appuser:appgroup --from=build /app/public ./public
    COPY --chown=appuser:appgroup --from=build /app/package*.json ./
    COPY --chown=appuser:appgroup --from=build /app/next.config.js ./next.config.js
    COPY --chown=appuser:appgroup --from=build /app/next-i18next.config.js ./next-i18next.config.js
    
    # Cleanup virtual builds dependencies in production image
    
    # Use the new "appuser"
    USER appuser
    
    # Expose the port the app will run on
    EXPOSE 3000
    
    # Start the application
    CMD ["npm", "start"]