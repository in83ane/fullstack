# Deployment Guide (Nipa Cloud)

This guide covers deploying the application on a VPS using Docker Compose with Nginx as a reverse proxy and Certbot for SSL/TLS certificates.

## Prerequisites

- A domain name pointed to your VPS IP (A record)
- SSH access to the VPS
- Docker Hub account

---

## Local — Build & Push Image to Docker Hub

### 1. Build the Docker Image

The project uses a multi-stage build defined in `Dockerfile`:

```bash
docker build -t <your-dockerhub-username>/<image-name>:latest .
```

### 2. Push to Docker Hub

```bash
docker push <your-dockerhub-username>/<image-name>:latest
```

---

## VPS — Deploy

### 3. Install Dependencies on VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose plugin
sudo apt install docker-compose-plugin -y

# Install Certbot
sudo apt install certbot -y
```

### 4. Obtain SSL Certificate

Stop any service running on port 80 first, then run Certbot standalone:

```bash
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

Certificates will be saved to `/etc/letsencrypt/live/yourdomain.com/`

### 5. Create Project Files

Create a working directory:

```bash
mkdir -p /var/www/app && cd /var/www/app
```

Create `docker-compose.yml`:

```yaml
services:
  app:
    image: <your-dockerhub-username>/<image-name>:latest
    env_file: .env.local
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - app
    restart: unless-stopped
```

Create `nginx.conf`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    client_max_body_size 10m;

    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Create `.env.local` and restrict permissions:

```bash
nano .env.local
chmod 600 .env.local
```

`.env.local` contents:

```env
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>

# JWT Secrets (use a long random string, at least 32 characters)
JWT_ACCESS_SECRET=your-access-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/callback

# App URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 6. Deploy

```bash
sudo docker compose up -d
```

Verify containers are running:

```bash
docker compose ps
docker compose logs -f
```

### 7. Create the First Owner Account

Register at `https://yourdomain.com/auth/register`, then set the role in MongoDB:

```js
db.users.updateOne(
  { email: "your@email.com" },
  { $set: { role: "owner", isApproved: true } }
)
```

---

## 8. Auto-Renew SSL Certificate

Let's Encrypt certificates expire every 90 days. Set up a cron job to check daily and reload Nginx if renewed:

```bash
sudo crontab -e
```

Add this line:

```cron
0 3 * * * certbot renew --quiet && /usr/bin/docker compose -f /path/to/app/docker-compose.yml exec -T nginx nginx -s reload >> /var/log/certbot-renew.log 2>&1
```

Test renewal:

```bash
sudo certbot renew --dry-run
```

---

## Redeploy (New Version)

```bash
# On local — build and push new image
docker build -t <your-dockerhub-username>/<image-name>:latest .
docker push <your-dockerhub-username>/<image-name>:latest

# On VPS — pull and restart
cd ~/app
sudo docker compose pull
sudo docker compose up -d
```

---

## Useful Commands

```bash
# View logs
docker compose logs -f app
docker compose logs -f nginx

# Restart services
docker compose restart

# Stop all services
docker compose down
```
