<![CDATA[# ☁️ Cloud Deploy Portal

<div align="center">

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-18%2B-green.svg)
![License](https://img.shields.io/badge/license-MIT-purple.svg)

**A self-service web portal for deploying cloud infrastructure on AWS and Azure with a single click.**

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Supported Resources](#-supported-resources) • [Contributing](#-contributing)

</div>

---

## ✨ Features

- **Multi-Cloud Support** — Deploy to AWS and Azure from a unified interface
- **20+ Cloud Services** — EC2, S3, Lambda, VMs, Storage Accounts, and more
- **Infrastructure as Code** — Terraform templates included for each resource type
- **Secure by Design** — AES-256 credential encryption, session-based auth, no credentials stored on disk
- **Modern Stack** — React + Vite frontend, Express.js backend, PostgreSQL + Redis
- **Docker Ready** — Full Docker Compose setup for local development

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **npm** or **yarn**
- **Docker** & **Docker Compose** (optional, for containerized setup)

### Option 1: Run Locally

**1. Start the Backend:**

```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
npm install
npm run dev
```

**2. Start the Frontend (new terminal):**

```bash
cd frontend
npm install
npm run dev
```

**3. Open your browser:** Navigate to `http://localhost:5173`

### Option 2: Run with Docker

```bash
# Copy and configure environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your settings

# Start all services
docker-compose up --build
```

This will start:
- **PostgreSQL** (port 5432) — Database
- **Redis** (port 6379) — Session storage
- **Backend API** (port 3001) — Express.js server
- **Frontend** (port 5173) — React application

---

## 🏗️ Architecture

```
cloud-deploy-portal/
├── backend/                 # Express.js API Server
│   ├── src/
│   │   ├── providers/       # AWS & Azure SDK integrations
│   │   ├── routes/          # REST API endpoints
│   │   ├── services/        # Business logic layer
│   │   └── server.js        # Application entry point
│   ├── db/                  # Database migrations & seeds
│   └── .env.example         # Environment template
├── frontend/                # React + Vite SPA
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── services/        # API client
│   │   └── styles/          # CSS styles
│   └── vite.config.js       # Vite configuration
├── terraform/               # Infrastructure as Code
│   ├── aws/                 # AWS resource templates
│   └── azure/               # Azure resource templates
└── docker-compose.yml       # Container orchestration
```

---

## 📦 Supported Resources

### AWS Services

| Service | Description |
|---------|-------------|
| **EC2** | Virtual machines |
| **S3** | Object storage |
| **VPC** | Virtual networking |
| **Lambda** | Serverless functions |
| **RDS** | Managed databases |
| **DynamoDB** | NoSQL database |
| **ECS** | Container orchestration |
| **SNS** | Notification service |
| **SQS** | Message queuing |
| **CloudFront** | CDN distribution |

### Azure Services

| Service | Description |
|---------|-------------|
| **Virtual Machines** | Compute instances |
| **Storage Accounts** | Blob/File storage |
| **Virtual Networks** | Network infrastructure |
| **App Service** | Web app hosting |
| **Functions** | Serverless compute |
| **SQL Database** | Managed SQL |
| **CosmosDB** | NoSQL database |
| **Container Instances** | Container hosting |
| **Service Bus** | Message broker |
| **CDN** | Content delivery |

---

## 🔐 Security

### Credential Management

- **AES-256 Encryption** — All credentials are encrypted in memory
- **Session-Based** — Credentials tied to user sessions (30-minute expiry)
- **Zero Persistence** — No credentials written to disk or logs

### Required Credentials

**AWS:**
- Access Key ID
- Secret Access Key
- Region

**Azure (Service Principal):**
- Tenant ID
- Client ID
- Client Secret
- Subscription ID

> ⚠️ **Production Note:** For production deployments, integrate with proper secrets management solutions (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault).

---

## ⚙️ Configuration

Create a `.env` file in the `backend/` directory based on `.env.example`:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Session Secret (use a strong random string in production)
SESSION_SECRET=your-super-secret-session-key

# Encryption Key (32 bytes hex)
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef

# CORS Settings
FRONTEND_URL=http://localhost:5173
```

---

## 🛠️ Development

### Available Scripts

**Backend:**
```bash
npm run dev    # Start with hot-reload
npm start      # Production start
npm test       # Run tests
```

**Frontend:**
```bash
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite 5 |
| Backend | Express.js, Node.js 18+ |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| AWS SDK | @aws-sdk/* v3 |
| Azure SDK | @azure/arm-* latest |
| Security | Helmet, crypto-js |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
Made with ❤️ for cloud infrastructure automation
</div>
]]>
