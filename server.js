import express from 'express';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import cors from 'cors';
import fs from 'fs';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/generate-ui', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file' });

    const audioBuffer = fs.readFileSync(req.file.path);
    const audioBase64 = audioBuffer.toString('base64');

    const systemInstruction = `
      You are an expert Frontend Designer.
      Analyze the user's voice description and generate a stunning, ultra-modern dashboard card component.
      
      CRITICAL INSTRUCTIONS:
      1. Do NOT use Tailwind CSS classes.
      2. Use ONLY inline HTML styles (e.g., style="background: #1e293b; border-radius: 12px; padding: 20px;").
      3. Make designs look highly professional and premium:
         - Use modern dark themes (like rich dark slate #0f172a or midnight black #020617).
         - Use smooth card backgrounds (#1e293b), soft glowing box-shadows, and elegant typography sizes.
         - Organize grids or side-by-side items using simple flex layouts (style="display: flex; gap: 16px;").
      4. Return ONLY a valid JSON object matching this structure:
         { "title": "Short title of the component", "code": "The raw HTML template layout using beautiful inline styles" }
      5. Do NOT include markdown code blocks (\`\`\`html) or conversational text inside the JSON string values.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { inlineData: { mimeType: req.file.mimetype, data: audioBase64 } },
        "Generate a pixel-perfect, responsive UI component dashboard layout matching the style requested in this audio using inline CSS styles."
      ],
      config: { 
        systemInstruction: systemInstruction, 
        responseMimeType: "application/json" 
      }
    });

    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    let rawText = response.text || "";
    if (rawText.startsWith("```json")) {
       rawText = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    } else if (rawText.startsWith("```")) {
       rawText = rawText.replace(/^```\s*/i, "").replace(/```\s*\$/, "");
    }

    const parsedData = JSON.parse(rawText.trim());

    let targetCode = parsedData.code || "";
    targetCode = targetCode.replace(/^```html\s*/i, "");
    targetCode = targetCode.replace(/^```\s*/i, "");
    targetCode = targetCode.replace(/```\s*$/, "");

    res.json({
       title: parsedData.title || "Generated Canvas Layout",
       code: targetCode.trim()
    });

  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).json({ error: 'Internal Error Parsing Layout Data' });
  }
});

app.listen(9000, () => console.log('Server running on port 9000'));
