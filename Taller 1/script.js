// ===== VARIABLES GLOBALES =====
let allAlbums = [];
let allArtistsData = [];  // Cache artistas separado
const KEY = 'sfQAOwDmmOPELwqqwuir';
const TOKEN = 'ZqgUVgKIZMtQiGNvYfbIphqPGSgyBnSRLmrUHQFb';
const PER_PAGE = 8;
const PROXY_BASE = 'https://api.allorigins.win/raw?url=';

// ===== DOMContentLoaded =====
document.addEventListener("DOMContentLoaded", async function() {
    const albumList = document.getElementById('album-list');
    
    // Pre-carga cache inicial
    await preloadCaches();
    
    // Init router
    initRouter();
    loadView('albumes', '');
    
    updateCartCount();
});

async function preloadCaches() {
    // Cache álbumes rock
    allAlbums = await fetchDiscogs('rock', 'release');
    
    // Cache artistas para navegación
    allArtistsData = await fetchDiscogs('', 'artist');
    console.log('✅ Caches: álbumes', allAlbums.length, 'artistas', allArtistsData.length);
}

async function fetchDiscogs(query, type = 'release') {
    const proxyUrls = [
        `${PROXY_BASE}${encodeURIComponent(
            `https://api.discogs.com/database/search?q=${query}&type=${type}&per_page=${PER_PAGE}&key=${KEY}&token=${TOKEN}`
        )}`,
        `https://corsproxy.io/?${encodeURIComponent(
            `https://api.discogs.com/database/search?q=${query}&type=${type}&per_page=${PER_PAGE}&key=${KEY}&token=${TOKEN}`
        )}`
    ];
    
    for (let i = 0; i < proxyUrls.length; i++) {
        try {
            const response = await fetch(proxyUrls[i]);
            if (!response.ok) throw new Error(`Proxy ${i+1}: ${response.status}`);
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                return type === 'artist' ? data.results : parseAlbums(data.results);
            }
        } catch (e) {
            console.warn(`Proxy ${i+1} failed:`, e);
        }
    }
    
    return type === 'artist' ? [] : fallbackLocalData();
}

function parseAlbums(results) {
    return results.map(item => {
        let artists = item.artists?.map(a => a.name).filter(Boolean) || [];
        let title = item.title || '';
        
        if (artists.length === 0 && title.includes(' - ')) {
            artists = [title.split(' - ')[0].trim()];
            title = title.split(' - ').slice(1).join(' - ').trim();
        }
        
        return {
            id: item.id,
            name: title || 'Álbum sin título',
            artists: artists.join(', '),
            artistNames: artists,  // Array para filter
            genre: item.style?.filter(Boolean).join(' / ') || 'Género desconocido',
            year: item.year ? `${item.year}` : 'N/D',
            cover: item.cover_image || `https://via.placeholder.com/300x200/333/fff?text=NoCover`,
            label: item.labels?.map(l => l.name).filter(Boolean).join(', ') || '',
            masterUrl: item.master_url
        };
    });
}

function fallbackLocalData() {
    return [{
        name: 'Demo Album',
        artists: ['Local Artist'],
        genre: 'Demo',
        year: '2026',
        cover: 'https://via.placeholder.com/300x200/1a1a1d/fff?text=Demo'
    }];
}

// ===== RENDER =====
function renderAlbums(albums, container) {
    container.innerHTML = '';
    if (!albums.length) {
        container.innerHTML = '<article style="grid-column:1/-1"><p>🎵 No hay resultados</p></article>';
        return;
    }
    
    albums.forEach((album, i) => {
        const article = document.createElement('article');
        article.className = `album-card ${album.genre.replace(/\//g, ' ').toLowerCase()}`;
        article.setAttribute('vocab', 'http://schema.org/');
        article.setAttribute('typeof', 'MusicAlbum');
        article.setAttribute('data-artist', album.artists.toLowerCase());
        article.setAttribute('data-genre', album.genre);
        article.innerHTML = `
            <img src="${album.cover}" alt="${album.name}" property="image" loading="lazy">
            <h2 property="name">${album.name}</h2>
            <p><strong>👤</strong> <span property="byArtist">${album.artists}</span></p>
            <p><strong>🎸</strong> <span property="genre">${album.genre}</span></p>
            ${album.label ? `<p><strong>🏷️</strong> ${album.label}</p>` : ''}
            <p><strong>📅</strong> ${album.year}</p>
            ${album.masterUrl ? `<a href="${album.masterUrl}" property="url" target="_blank" class="master-link">🔗 Master</a>` : ''}
            <button onclick="addToCart('${album.name}')" aria-label="Agregar">🛒</button>
        `;
        article.style.animationDelay = `${i * 0.08}s`;
        container.appendChild(article);
    });
}

// ===== ROUTER COMPLETO =====
function initRouter() {
    document.querySelectorAll('nav a[data-view]').forEach(link => {
        link.addEventListener('click', handleNavClick);
    });
    
    window.addEventListener('popstate', (e) => {
        const state = e.state || {view: 'albumes'};
        loadView(state.view);
    });
}

function handleNavClick(e) {
    e.preventDefault();
    const view = e.target.closest('a').dataset.view;
    loadView(view);
    history.pushState({view}, '', e.target.href);
    
    // Active state
    document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
    e.target.classList.add('active');
}

async function loadView(view) {
    const albumList = document.getElementById('album-list');
    
    document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
    document.querySelector(`nav a[data-view="${view}"]`)?.classList.add('active');
    
    switch(view) {
        case 'inicio':
            renderWelcome(albumList);
            break;
        case 'albumes':
            renderAlbums(allAlbums, albumList);
            break;
        case 'artistas':
            renderArtistsView(albumList);
            break;
        case 'generos':
            renderGenresView(albumList);
            break;
        case 'carrito':
            showCart(albumList);
            break;
    }
}

function renderWelcome(container) {
    container.innerHTML = `
        <article style="grid-column:1/-1; text-align:center;">
            <h2>🎵 Tienda Semántica Discogs</h2>
            <p><strong>Álbumes:</strong> ${allAlbums.length} | <strong>Artistas únicos:</strong> ${new Set(allAlbums.map(a => a.artists)).size}</p>
            <p>Click Álbumes/Artistas/Géneros para filtrar ontológicamente</p>
        </article>`;
}

function renderArtistsView(container) {
    const artistAlbums = {};
    allAlbums.forEach(album => {
        const artist = album.artists.split(', ')[0];  // Principal
        if (!artistAlbums[artist]) artistAlbums[artist] = [];
        artistAlbums[artist].push(album);
    });
    
    let html = '<h2>👤 Por Artista</h2>';
    Object.entries(artistAlbums).slice(0, 8).forEach(([artist, albums]) => {
        html += `
            <details>
                <summary>${artist} (${albums.length})</summary>
                ${albums.slice(0,3).map(a => 
                    `<div class="mini-album">${a.name} (${a.year})</div>`
                ).join('')}
            </details>`;
    });
    container.innerHTML = `<article style="grid-column:1/-1">${html}</article>`;
}

function renderGenresView(container) {
    const genreAlbums = {};
    allAlbums.forEach(album => {
        album.genre.split(' / ').forEach(g => {
            const genre = g.trim();
            if (!genreAlbums[genre]) genreAlbums[genre] = [];
            genreAlbums[genre].push(album);
        });
    });
    
    let html = '<h2>🎯 Por Género</h2>';
    Object.entries(genreAlbums).slice(0, 8).forEach(([genre, albums]) => {
        html += `
            <details>
                <summary>${genre} (${albums.length})</summary>
                ${albums.slice(0,3).map(a => 
                    `<div class="mini-album">${a.name} (${a.year})</div>`
                ).join('')}
            </details>`;
    });
    container.innerHTML = `<article style="grid-column:1/-1">${html}</article>`;
}

function showCart(container) {
    const cart = JSON.parse(localStorage.getItem('semanticCart') || '[]');
    container.innerHTML = cart.length ? 
        `<article style="grid-column:1/-1">
            <h2>🛒 Carrito (${cart.length})</h2>
            ${cart.map((item,i) => `<p>${i+1}. ${item}</p>`).join('')}
            <button onclick="localStorage.removeItem(\'semanticCart\');loadView(\'carrito\')">Vaciar</button>
        </article>` :
        '<article style="grid-column:1/-1"><h3>Carrito vacío</h3></article>';
}

function addToCart(name) {
    let cart = JSON.parse(localStorage.getItem('semanticCart') || '[]');
    cart.push(name);
    localStorage.setItem('semanticCart', JSON.stringify(cart));
    updateCartCount();
}

function updateCartCount() {
    const count = JSON.parse(localStorage.getItem('semanticCart') || '[]').length;
    const span = document.getElementById('cartCount');
    if (span) span.textContent = count;
}

