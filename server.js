const express = require('express');
const path = require('path');

const app = express();

// Serve all static files (HTML, CSS, JS, icons, etc.)
app.use(express.static(path.join(__dirname)));

// Proxy endpoint — la clave nunca sale del servidor
app.get('/api/cedear-price', async (req, res) => {
    const ticker = req.query.ticker;
    if (!ticker) return res.status(400).json({ error: 'Se requiere ticker' });

    const apiKey = process.env.alpha_key;
    if (!apiKey) return res.status(500).json({ error: 'API key no configurada en el servidor' });

    try {
        const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (e) {
        console.error(`Error al obtener precio de ${ticker}:`, e);
        res.status(502).json({ error: 'No se pudo obtener el precio' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
