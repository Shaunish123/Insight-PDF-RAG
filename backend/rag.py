# Rag engine setup

import os
from dotenv import load_dotenv

# Loaders and Splitters for loading the docs
# and splitting into chunks or figuratively "index cards"
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

# AI Models 
# Gemini for BRAIN
# HuggingFace for EMBEDDINGS
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings

# Vector Database Store 
# ChromaDB acts as our "filling cabinet"
from langchain_chroma import Chroma

# Prompts and parsers
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain

load_dotenv()

class RagEngine:
    def __init__(self, db_path = "./chroma_db"):
        self.db_path = db_path
        # we run our huggingface model for translating words
        # into numbers => Embeddings
        # this will run on our local CPU

        print("Initialising Embeddings ...")
        self.embeddings = HuggingFaceEmbeddings(model_name = "all-MiniLM-L6-v2")

        # now setup the brain => GEMINI
        # set temp = 0, so it gives us factual 
        # answers, exactly accordin to our text
        print("Initialising LLM ...")
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash-lite",
            temperature=0
        )

        # setting up the vector DB - the filling cabinet
        self.vector_store = Chroma(
            persist_directory = db_path, # store db on disk
            embedding_function = self.embeddings 
        )


    # wipes db to prevent mixing old and new data
    def clear_database(self):
        print("--- Clearing Database ---")
        # 1. Force the vector store to reset
        self.vector_store.delete_collection() 
        # 2. Re-initialize it
        self.vector_store = Chroma(
            persist_directory=self.db_path, 
            embedding_function=self.embeddings
        )
        print("--- Database Cleared ---")

    def ingest_pdf(self, file_path):
        # 1. CLEAR OLD DATA FIRST
        self.clear_database()

        print(f"Loading PDF: {file_path}")

        # read the PDF
        loader = PyPDFLoader(file_path)
        docs = loader.load()

        # split into chunks (our index cards)
        # chunk_size = 1000, chunk 1000 char long
        # chunk_overlap = 200, last 200 char of previous chunk
        # and first 200 char of next chunk overlap
        splitter = RecursiveCharacterTextSplitter(
            chunk_size = 1000,
            chunk_overlap = 200
        )
        splits = splitter.split_documents(docs)
        print(f"Created {len(splits)} chunks")

        # save to db
        # text -> to no -> db
        self.vector_store.add_documents(splits)
        print("Saved to Store")

    def chat(self, question, chat_history=[]):
        # # turning the cabinet into a "Retriever" to look things up
        # # k = 3 means "find the top 3 most relevant chunks or index cards"

        self.retriever = self.vector_store.as_retriever(search_kwargs={"k": 3})

        # we contextualise a question so if user asks "explain it" then 
        # what we'll do is ask ai to rewrite the question based on history

        contextualize_q_system_prompt = """Given a chat history and the latest user question 
        which might reference context in the chat history, formulate a standalone question 
        which can be understood without the chat history. Do NOT answer the question, 
        just reformulate it if needed and otherwise return it as is."""

        contextualize_q_prompt = ChatPromptTemplate.from_messages([
            ("system", contextualize_q_system_prompt),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ])

        history_aware_retriever = create_history_aware_retriever(
            self.llm, self.retriever, contextualize_q_prompt
        )

        # --- STEP 2: Answer the Question ---
        qa_system_prompt = """You are an assistant for question-answering tasks. 
        Use the following pieces of retrieved context to answer the question. 
        If you don't know the answer, just say that you don't know. 
        
        Context: {context}"""
        
        qa_prompt = ChatPromptTemplate.from_messages([
            ("system", qa_system_prompt),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ])
        
        question_answer_chain = create_stuff_documents_chain(self.llm, qa_prompt)
        rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)

        # --- Execute ---
        response = rag_chain.invoke({"input": question, "chat_history": chat_history})
        return response["answer"]
    
if __name__ == "__main__":
    engine = RagEngine()

        



