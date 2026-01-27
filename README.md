# 🚀 Autos-Infrastructure

<div align="center">

![Autos-Infrastructure Architecture](./architecture.jpg)

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-18%2B-green.svg)
![Purpose](https://img.shields.io/badge/purpose-Learning%20%2F%20POC-orange.svg)
![License](https://img.shields.io/badge/license-MIT-purple.svg)

**Deploy cloud resources with a single click — no complex CLI commands, no steep learning curve.**

_A learning-focused project for exploring AWS & Azure infrastructure automation_

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Learning Goals](#-learning-goals)

</div>

---

## 🎯 Project Goals

This project was built as a **learning tool and proof of concept** to demonstrate:

- How to build a unified interface for multi-cloud deployments
- Infrastructure as Code (IaC) with Terraform
- Full-stack development with React and Node.js
- Cloud provider SDK integrations (AWS & Azure)
- Secure credential handling in web applications

> **Who is this for?**  
> DevOps engineers, students, developers, and anyone curious about cloud automation who wants to understand how infrastructure deployment works under the hood.

---

## ✨ Features

- **One-Click Deployments** — Select a resource, click deploy, done
- **Multi-Cloud** — AWS and Azure from a single dashboard
- **20+ Services** — EC2, S3, Lambda, VMs, Storage Accounts, and more
- **Terraform Templates** — Learn IaC by exploring real templates
- **Secure Credentials** — Auto-generated SSH keys & passwords, instant download
- **Modern Stack** — React + Vite frontend, Express.js backend

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **npm** or **yarn**
- **Docker** (optional)

### Run Locally

**1. Start the Backend:**

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

**2. Start the Frontend:**

```bash
cd frontend
npm install
npm run dev
```

**3. Open:** `http://localhost:5173`

### Run with Docker

```bash
cp backend/.env.example backend/.env
docker-compose up --build
```

---

## 🏗️ Architecture

(See project overview above)

### Directory Structure

```text
autos-infrastructure/
├── backend/          # Express.js API
│   └── src/
│       ├── providers/   # AWS & Azure SDKs
│       ├── routes/      # API endpoints
│       └── services/    # Business logic
├── frontend/         # React + Vite
│   └── src/
│       ├── components/  # UI components
│       └── services/    # API client
└── terraform/        # IaC templates
    ├── aws/            # 10 AWS resources
    └── azure/          # 10 Azure resources
```

---

## 📦 Supported Resources

| AWS        | Azure               |
| ---------- | ------------------- |
| EC2        | Virtual Machines    |
| S3         | Storage Accounts    |
| VPC        | Virtual Networks    |
| Lambda     | Functions           |
| RDS        | SQL Database        |
| DynamoDB   | CosmosDB            |
| ECS        | Container Instances |
| SNS        | Service Bus         |
| SQS        | —                   |
| CloudFront | CDN                 |
| —          | App Service         |

---

## 📚 Learning Goals

By exploring this project, you can learn:

| Topic                      | What You'll Learn                                 |
| -------------------------- | ------------------------------------------------- |
| **Full-Stack Development** | React frontend + Express.js backend integration   |
| **Cloud SDKs**             | How to programmatically interact with AWS & Azure |
| **Terraform**              | Structure of IaC templates for various resources  |
| **Security**               | Credential encryption, session management, CORS   |
| **Docker**                 | Multi-container applications with Docker Compose  |
| **API Design**             | RESTful endpoints for cloud operations            |

---

## 🔐 Credentials Required

**AWS:**

- Access Key ID, Secret Access Key, Region

**Azure (Service Principal):**

- Tenant ID, Client ID, Client Secret, Subscription ID

> ⚠️ **Note:** This is a learning project. For production, use proper secrets management (AWS Secrets Manager, Azure Key Vault).

---

## ⚙️ Tech Stack

| Layer    | Technology              |
| -------- | ----------------------- |
| Frontend | React 18, Vite 5        |
| Backend  | Express.js, Node.js 18+ |
| Database | PostgreSQL 16           |
| Cache    | Redis 7                 |
| Cloud    | AWS SDK v3, Azure SDK   |
| IaC      | Terraform               |

---

## 🤝 Contributing

This is a learning project — contributions, suggestions, and improvements are welcome!

1. Fork the repository
2. Create a feature branch
3. Submit a Pull Request

---

## 📄 License

MIT License — free for learning and experimentation.

---

<div align="center">

**Built for learning cloud infrastructure automation** ☁️

</div>
