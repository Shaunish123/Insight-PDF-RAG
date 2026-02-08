# InsightPDF 📄✨

**A powerful AI-powered PDF chat assistant built with RAG (Retrieval Augmented Generation) technology.**

Made with ❤️ by **Shaunish Sharma**

---

## 🌟 Overview

InsightPDF allows you to upload any PDF document and have intelligent conversations about its content. The AI reads your document, understands it, and answers questions based solely on the information within the PDF - no hallucinations, just facts from your document.

### ✨ Key Features

- 📤 **Smart PDF Upload** - Upload any PDF up to 50MB
- 💬 **Context-Aware Chat** - Remembers conversation history for follow-up questions
- 🎨 **Beautiful UI** - Dark mode interface with split-screen PDF viewer
- 📐 **LaTeX Math Rendering** - Properly formatted mathematical formulas
- 🔄 **Auto Model Fallback** - Seamless switching between 70B and 8B models on rate limits
- 🚀 **Fast & Accurate** - Powered by GROQ's LPU technology and Google embeddings
- 🐳 **Docker Ready** - Fully containerized for easy deployment

---

## 🏗️ Architecture

### Tech Stack

**Backend:**
- Python 3.11 with FastAPI
- LangChain for RAG orchestration
- GROQ API (Llama 3.3 70B / Llama 3.1 8B)
- Google Generative AI (Embeddings)
- ChromaDB (Vector Database)
- PyPDF for document processing

**Frontend:**
- Next.js 16 + React 19
- TypeScript
- Tailwind CSS
- ReactMarkdown + KaTeX (Math rendering)
- Axios for API calls

---

## 🔄 How It Works

### 1. **Document Ingestion**
```
PDF Upload → PyPDFLoader → Text Chunking (1000 chars, 200 overlap) 
→ Google Embeddings → ChromaDB Storage
```

### 2. **Question Processing**
```
User Question → History-Aware Retrieval → Top 3 Relevant Chunks 
→ LLM (70B primary, 8B fallback) → Formatted Answer with LaTeX
```

### 3. **Smart Fallback**
```
Try Llama-3.3-70b → Rate Limit? → Auto-switch to Llama-3.1-8b → Success ✓
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose (optional)
- GROQ API Key ([Get it here](https://console.groq.com/))
- Google AI API Key ([Get it here](https://makersuite.google.com/app/apikey))

### Local Development

#### 1. Clone the Repository
```bash
git clone https://github.com/Shaunish123/Insight-PDF-RAG.git
cd Insight-PDF-RAG
```

#### 2. Setup Backend
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file from example
cp .env.example .env
# Then edit .env and add your API keys

# Run server
uvicorn main:app --reload
```

Backend runs on `http://localhost:8000`

#### 3. Setup Frontend
```bash
cd frontend

# Install dependencies
npm install

# Create .env.local from example
cp .env.local.example .env.local
# Currently set to http://localhost:8000 (perfect for local development)

# Run development server
npm run dev
```

Frontend runs on `http://localhost:3000`

---

## 🐳 Docker Deployment

### Run with Docker Compose
```bash
# 1. Setup environment files
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

# 2. Edit backend/.env and add your API keys
# 3. Build and start
docker-compose up --build

# Frontend: http://localhost:3000
# Backend: http://localhost:8000
```

### Environment Variables

See example files:
- **Backend**: `backend/.env.example`
- **Frontend**: `frontend/.env.local.example`

**Backend (.env):**
```env
GROQ_API_KEY=gsk_...
GOOGLE_API_KEY=AIza...
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🌐 Production Deployment

### Recommended Setup: Vercel (Frontend) + Render (Backend Docker Container)

**Backend (Render - Docker Container):**
1. Push your code to GitHub
2. Create new **Web Service** on Render
3. Connect your GitHub repository
4. Configure deployment:
   - **Runtime:** Docker
   - **Dockerfile Path:** `backend/Dockerfile`
   - Render will automatically detect and build the Docker image
5. Add environment variables in Render dashboard:
   - `GROQ_API_KEY=gsk_...`
   - `GOOGLE_API_KEY=AIza...`
   - `PORT=8000`
6. Deploy - Render will build and run your Docker container
7. Copy the backend URL (e.g., `https://your-app.onrender.com`)

**Frontend (Vercel):**
1. Import project from GitHub
2. Framework preset: Next.js
3. Root directory: `frontend`
4. Add environment variable:
   - `NEXT_PUBLIC_API_URL=https://your-app.onrender.com` (from Render backend)
5. Deploy

**Note:** Render's free tier spins down after 15 minutes of inactivity. The first request takes 30-50 seconds to wake up (handled by the 30s timeout in the frontend).

### Alternative: Docker Container (Any Platform)
You can deploy the Docker container to any cloud provider that supports Docker:
- AWS ECS/Fargate
- Google Cloud Run
- Azure Container Instances
- DigitalOcean App Platform
- Fly.io

---

## 📖 Usage Guide

### 1. Upload a PDF
- Click "Upload PDF" or drag & drop
- File size limit: 50MB
- Supported format: PDF only

### 2. Ask Questions
```
Example: "What is the main topic of this document?"
Example: "Summarize the key findings in bullet points"
Example: "What is the formula for intensity?" (renders LaTeX)
```

### 3. Follow-up Questions
```
You: "What is photosynthesis?"
AI: "Photosynthesis is the process by which plants..."

You: "How does that work in detail?" ← AI understands "that" = photosynthesis
```

### 4. Math & Formulas
The AI automatically formats mathematical expressions:
- Inline: `$E = mc^2$` → $E = mc^2$
- Display: `$$\int_0^\infty e^{-x^2} dx$$` → Centered equation

---

## 🔧 Configuration

### Backend Settings

**Model Configuration** (`backend/rag.py`):
```python
# Primary model (smart, rate-limited)
self.llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0)

# Backup model (fast, high quota)
backup_llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)
```

**Chunking Settings** (`backend/rag.py`):
```python
chunk_size = 1000      # Characters per chunk
chunk_overlap = 200    # Overlapping characters
```

**Retrieval Settings** (`backend/rag.py`):
```python
search_kwargs={"k": 3}  # Return top 3 relevant chunks
```

### Frontend Settings

**Timeout** (`frontend/lib/api.ts`):
```typescript
timeout: 30000  // 30 seconds (for Render cold starts)
```

**Chat History Limit** (`frontend/components/ChatInterface.tsx`):
```typescript
const history = messages.slice(-6)  // Last 6 messages for context
```

---

## 🎯 Features Roadmap

- [x] Basic RAG implementation
- [x] Chat history support
- [x] LaTeX math rendering
- [x] Model rollback mechanism
- [x] Docker containerization
---

## 🐛 Known Limitations

1. **Ephemeral Storage on Render Free Tier:**
   - ChromaDB resets on server restart
   - For production, use cloud vector DB (Pinecone/Supabase)

2. **Cold Start Delay:**
   - Render free tier sleeps after 15 minutes
   - First request takes 30-50 seconds (handled by timeout)

3. **Rate Limits:**
   - GROQ free tier has quota limits
   - App automatically falls back to 8B model (seamless to users)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👨‍💻 Author

**Shaunish Sharma**

- GitHub: [@Shaunish123](https://github.com/Shaunish123)
- Project Link: [https://github.com/Shaunish123/Insight-PDF-RAG](https://github.com/Shaunish123/Insight-PDF-RAG)

---

## 🙏 Acknowledgments

- [LangChain](https://langchain.com/) - RAG framework
- [GROQ](https://groq.com/) - Lightning-fast LLM inference
- [Google AI](https://ai.google.dev/) - High-quality embeddings
- [Vercel](https://vercel.com/) - Frontend hosting
- [Render](https://render.com/) - Backend hosting

---

**Made with ❤️ by Shaunish Sharma**

© 2026 Shaunish Sharma. All rights reserved.
