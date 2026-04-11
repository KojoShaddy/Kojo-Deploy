import express from 'express';
const app = express();
const port = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Kojo-Deploy Success</title>
        <style>
          body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #000F27; color: white; margin: 0; }
          .card { background: rgba(255,255,255,0.1); padding: 2rem; border-radius: 1rem; backdrop-filter: blur(10px); text-align: center; border: 1px solid rgba(255,255,255,0.2); }
          h1 { color: #00D2FF; margin-bottom: 0.5rem; }
          p { color: #ccc; }
          .badge { background: #00D2FF; color: #000F27; padding: 0.25rem 0.75rem; border-radius: 2rem; font-weight: bold; font-size: 0.8rem; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">LIVE</div>
          <h1>🚀 Kojo-Deploy</h1>
          <p>Your application is now running on Google Cloud Run.</p>
          <p style="font-size: 0.8rem; margin-top: 2rem; opacity: 0.5;">Built for the developer community</p>
        </div>
      </body>
    </html>
  `);
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
