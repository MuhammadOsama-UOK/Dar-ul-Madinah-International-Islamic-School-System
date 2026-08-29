import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();


async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  app.post('/api/extract-marks', async (req, res) => {
    try {
      const { pdfBase64, subjects } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
      }

      const ai = new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const prompt = `
      Extract marks for each student from this marksheet.
      Expected subjects: ${subjects.join(', ')}.
      
      Return ONLY a JSON array. No explanations, no markdown block quotes.
      Format:
      [
        {
          "grNo": "1234", 
          "name": "Student Name",
          "marks": {
            "Subject Name 1": 85
          }
        }
      ]
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: [
          { 
            role: 'user', 
            parts: [
              { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
              { text: prompt }
            ] 
          }
        ],
        config: {
          responseMimeType: "application/json",
        }
      });

      const text = response.text || "[]";
      
      // Safe JSON extraction
      let parsedReport = [];
      try {
        const rawJson = JSON.parse(text.trim());
        if (Array.isArray(rawJson)) {
          parsedReport = rawJson;
        } else if (rawJson && typeof rawJson === 'object') {
          // If the model wrapped the array in an object
          const possibleArray = Object.values(rawJson).find(val => Array.isArray(val));
          if (possibleArray) {
            parsedReport = possibleArray;
          } else {
            parsedReport = [rawJson];
          }
        }
      } catch (err) {
        console.error("JSON parsing error:", err, text);
        // Fallback regex attempt just in case model ignored mimeType
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || text.match(/(\[[\s\S]*\])/);
        if (jsonMatch) {
          try {
            parsedReport = JSON.parse(jsonMatch[1]);
          } catch (e) {
            console.error("Fallback regex parsing failed", e);
          }
        }
      }

      res.json(parsedReport);
    } catch (err: any) {
      console.error('PDF Extraction Error:', err);
      res.status(500).json({ error: err?.message || 'Failed to extract marks from PDF' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
