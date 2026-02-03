# Engineering Log: InsightPDF

## Project Setup
Created the folder and file elementary structure

---

## [Date: 02-02-2025] - Session 1: The AI Core

**Goal:** Implement the basic RAG pipeline (Ingestion + Retrieval) in Python.

![alt text](image.png)

### Things I Learned

#### RAG (Retrieval Augmented Generation)
RAG is simply giving AI an open book, so that it can update its knowledge and generate better answers.
- **Retrieval** - Find info
- **Augment** - Use this info to update knowledge
- **Generate** - Generate new answer

#### LangChain
It is a way to chain together different AI tools together

---

### How I Built It

#### Step 1: Library Setup
I defined the libraries to setup the RAG Engine

- **Loaders and Splitters** - They'll load text from document and split them into chunks
- **The AI Models** - Used Gemini for the main BRAIN and HuggingFace for embeddings
- **DB and Parsers** - Used for storing and prompting the engine

#### Step 2: RagEngine Class
Defined a class RagEngine

**Step 2.1 - Constructor Initialization:**
- HuggingFace embeddings model MINILM
- Gemini, with temp = 0 to give actual answers
- VectorDB - Chroma
- Turned the DB into a retriever to look for the 3 most relevant chunks as per our contexts

**Step 2.2 - Ingestion Function:**
- Split the PDF into chunks of 1000 char with 200 overlapping char to store into our database

**Step 2.3 - Chat Function with LLM:**
- Defined the prompt in which I added the context, the question and a prompt template which will directly go to GEMINI
- Made a chain where: Retrieval → Prompt → LLM → Answer

### Understanding the Chain Pipeline

**What happens when you ask a question:**

1. **Retrieval Step** - `self.retriever`
   - Converts your question into an embedding (numbers)
   - Searches ChromaDB for similar embeddings
   - Returns the top 3 most relevant text chunks

2. **Prompt Step** - `prompt`
   - Takes the retrieved chunks and your original question
   - Fills them into the template: "Context: {chunks}, Question: {your question}"

3. **LLM Step** - `self.llm`
   - Sends the formatted prompt to Gemini
   - Gemini reads the context and generates an answer

4. **Parser Step** - `StrOutputParser()`
   - Converts Gemini's response into plain text string

**Simple Flow:**
Question → Find Relevant Chunks → Build Prompt → Ask Gemini → Get Answer


_**Note:** `RunnablePassthrough()` just passes your original question through unchanged so it can be inserted into the prompt template alongside the retrieved chunks._










