import { Mux } from '@mux/mux-node';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

export const handler = async (event, context) => {
  // Enable CORS for all origins
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { 
      statusCode: 200, 
      headers, 
      body: '' 
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers, 
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  try {
    const { filename } = JSON.parse(event.body);
    
    console.log('Creating upload URL for filename:', filename);
    
    // Create a direct upload URL with Mux
    const upload = await mux.video.uploads.create({
      new_asset_settings: {
        playback_policy: ['public'],
        video_quality: 'premium',
        mp4_support: 'standard',
        normalize_audio: true
      },
      cors_origin: '*',
    });

    console.log('Upload URL created successfully:', upload.asset_id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        uploadUrl: upload.url,
        assetId: upload.asset_id,
      }),
    };
  } catch (error) {
    console.error('Error creating upload URL:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to create upload URL',
        details: error.message 
      }),
    };
  }
}; 