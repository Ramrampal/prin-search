 
import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const run = async () => {
  try {
    const result = await model.generateContent("Hello Gemini! Can you confirm connection?");
    console.log("Gemini says:", result.response.text());
  } catch (err) {
    console.error("Error:", err);
  }
};

run();
