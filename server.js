import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import Mux from '@mux/mux-node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Mux with your credentials
const mux = new Mux({
  tokenId: '2051432f-fa07-4239-978f-c8e35075bd3e',
  tokenSecret: '313gCnm5WHShbSekPHsW204h+iA4bTsNrvJK37Kkzy5xw9Txi56FhurQcsN9lE6nKoUxxjqU4OG'
});

// Middleware
app.use(cors());
app.use(express.json());

// Mock prompts data
const prompts = [
  "What was your overall experience with our service?",
  "Would you recommend us to a friend or colleague?",
  "What specific feature or aspect did you find most valuable?",
  "How did our service solve your problem or meet your needs?"
];

// API Routes
app.get('/api/prompts', (req, res) => {
  res.json(prompts);
});

app.post('/api/create-upload-url', async (req, res) => {
  const { filename } = req.body;
  
  try {
    console.log('Creating Mux direct upload for:', filename);
    
    // Create a direct upload with Mux
    const upload = await mux.video.uploads.create({
      new_asset_settings: {
        playback_policy: ['public'],
        encoding_tier: 'baseline'
      },
      cors_origin: '*'
    });
    
    console.log('Mux upload created:', upload.id);
    
    res.json({
      uploadUrl: upload.url,
      assetId: upload.id
    });
  } catch (error) {
    console.error('Error creating Mux upload URL:', error);
    res.status(500).json({ error: 'Failed to create upload URL' });
  }
});

// New endpoint to check upload status
app.get('/api/upload-status/:uploadId', async (req, res) => {
  const { uploadId } = req.params;
  
  try {
    const upload = await mux.video.uploads.retrieve(uploadId);
    res.json({
      status: upload.status,
      assetId: upload.asset_id
    });
  } catch (error) {
    console.error('Error checking upload status:', error);
    res.status(500).json({ error: 'Failed to check upload status' });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 