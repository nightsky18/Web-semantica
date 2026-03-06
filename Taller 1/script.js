document.addEventListener("DOMContentLoaded", function() {
    const albumList = document.getElementById('album-list');
    
    // ===== AGENTE SEMÁNTICO CORS-PROOF =====
    const KEY = 'sfQAOwDmmOPELwqqwuir';
    const TOKEN = 'ZqgUVgKIZMtQiGNvYfbIphqPGSgyBnSRLmrUHQFb';  // ← PEGA tu token azul
    const QUERY = 'rock';
    const PER_PAGE = 6;
    
    // Proxy universal (funciona 99% casos)
    const proxyUrls = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(
            `https://api.discogs.com/database/search?q=${QUERY}&type=release&per_page=${PER_PAGE}&key=${KEY}&token=${TOKEN}`
        )}`,
        `https://corsproxy.io/?${encodeURIComponent(
            `https://api.discogs.com/database/search?q=${QUERY}&type=release&per_page=${PER_PAGE}&key=${KEY}&token=${TOKEN}`
        )}`
    ];
    
    loadWithProxy(proxyUrls, 0, albumList);
});

function loadWithProxy(proxies, index, container) {
    if (index >= proxies.length) {
        fallbackLocal(container);
        return;
    }
    
    fetch(proxies[index])
        .then(response => {
            if (!response.ok) throw new Error(`Proxy ${index + 1} failed: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (data.results && data.results.length > 0) {
                const albums = data.results.map(item => ({
                    name: item.title,
                    artist: item.artists?.[0]?.name || 'Unknown',
                    genre: item.style?.[0] || 'Rock',
                    releaseDate: item.year || 'N/A',
                    cover: item.cover_image || 'https://via.placeholder.com/300?text=NoCover',
                    label: item.labels?.[0]?.name || ''
                }));
                renderAlbums(albums, container);
                console.log('✅ Discogs loaded:', data.results.length, 'álbumes');
            } else {
                throw new Error('No results');
            }
        })
        .catch(error => {
            console.warn('Proxy', index + 1, 'failed:', error);
            loadWithProxy(proxies, index + 1, container);
        });
}

function fallbackLocal(container) {
    // data.json local (tu backup)
    fetch('data.json')
        .then(res => res.json())
        .then(renderAlbums)
        .catch(() => {
            container.innerHTML = `
                <article style="grid-column: 1/-1; text-align:center;">
                    <h3>🔄 Agente configurando datos semánticos...</h3>
                    <p>1. Verifica TOKEN en script.js<br>2. F12 Console para logs</p>
                </article>
            `;
        });
}

function renderAlbums(albums, container) {
    container.innerHTML = '';
    albums.forEach((album, i) => {
        const article = document.createElement('article');
        article.setAttribute('vocab', 'http://schema.org/');
        article.setAttribute('typeof', 'MusicAlbum');
        article.setAttribute('data-genre', album.genre);
        article.innerHTML = `
            <img src="${album.cover}" alt="${album.name}" property="image" loading="lazy">
            <h2 property="name">${album.name}</h2>
            <p><strong>Artista:</strong> <span property="byArtist">${album.artist}</span></p>
            <p><strong>Género:</strong> <span property="genre">${album.genre}</span></p>
            ${album.label ? `<p><strong>Label:</strong> <span property="recordLabel">${album.label}</span></p>` : ''}
            <p><strong>Año:</strong> <span property="datePublished">${album.releaseDate}</span></p>
            <button onclick="addToCart('${album.name}')">🛒 Carrito</button>
        `;
        article.style.animationDelay = `${i * 0.1}s`;
        container.appendChild(article);
    });
}

function addToCart(name) {
    let cart = JSON.parse(localStorage.getItem('semanticCart') || '[]');
    cart.push(name);
    localStorage.setItem('semanticCart', JSON.stringify(cart));
    alert(`✅ ${name} agregado. Total: ${cart.length}`);
}
