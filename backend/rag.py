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
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

load_dotenv()

class RagEngine:
    def __init__(self, db_path = "./chroma_db"):
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
            model="gemini-2.5-flash",
            temperature=0
        )

        # setting up the vector DB - the filling cabinet
        self.vector_store = Chroma(
            persist_directory = db_path, # store db on disk
            embedding_function = self.embeddings 
        )

        # turning the cabinet into a "Retriever" to look things up
        # k = 3 means "find the top 3 most relevant chunks or index cards"
        self.retriever = self.vector_store.as_retriever(
            search_type = "similarity",
            search_kwargs = {"k": 3}
        )

    def ingest_pdf(self, file_path):
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

    def chat(self, question):
        # create a prompt template

        # {context} will be the retrieved chunks from the db
        # {question} will be the user question

        template = """ You are a helpful assistant who is an expert in answering questions based on the context provided. 
        Use the context to provide accurate answers. If you don't know the answer, just say that you don't know. Do not make up answers.
        
        Context: {context}
        Question: {question}
        """

        prompt = ChatPromptTemplate.from_template(template)

        # Build pipeline / chain
        # retreive -> prompt -> llm -> answer
        chain = (
            {"context": self.retriever, "question": RunnablePassthrough()}
            | prompt
            | self.llm
            | StrOutputParser()
        )

        return chain.invoke(question)

    
    def _format_docs(self, docs):
        # helper to join chunks into a single string
        return "\n\n".join(doc.page_content for doc in docs)
    
if __name__ == "__main__":
    engine = RagEngine()

    # test 1 ingest 
    engine.ingest_pdf("sample.pdf")

    # test 2 ask
    response = engine.chat("What are the major differences in Plant vs Animal cells?")
    print("\nGemini says:\n", response)

        



