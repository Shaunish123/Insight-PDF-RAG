import axios from "axios";

// Create a dedicated "phone line" to the backend
const apiClient = axios.create({
  baseURL: "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

export const uploadPDF = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file); // Must match the backend parameter name "file"

  const response = await apiClient.post("/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

// Update the chat function to accept history
export const chatWithPDF = async (question: string, history: [string, string][]) => {
  const response = await apiClient.post("/chat", { 
    question,
    history // Send history to backend
  });
  return response.data;
};