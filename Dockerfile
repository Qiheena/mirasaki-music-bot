FROM node:23-slim

# Create app/working/bot directory
RUN mkdir -p /app
WORKDIR /app

# Install ffmpeg for audio processing (required for Lavalink compatibility)
RUN apt-get update && apt-get install 'ffmpeg' -y --no-install-recommends \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# Install app production dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Bundle app source
COPY . ./

# Optional API/Backend port
EXPOSE 3000

# Set NODE_ENV to production
ENV NODE_ENV=production

# Run the start command with optimizations
CMD [ "node", "--max-old-space-size=512", "src/index.js" ]
