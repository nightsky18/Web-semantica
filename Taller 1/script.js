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
                const albums = data.results.map(item => {
                    // === PARSER SEMÁNTICO INTELIGENTE ===
                    
                    // 1. Extrae artista de title si artists vacío (patrón "Artista - Álbum")
                    let artists = item.artists?.map(a => a.name).filter(Boolean) || [];
                    let title = item.title || '';
                    
                    if (artists.length === 0 && title.includes(' - ')) {
                        artists = [title.split(' - ')[0].trim()];  // "David Bowie" de "David Bowie - Rock Suicide"
                        title = title.split(' - ').slice(1).join(' - ').trim();  // "Rock Suicide"
                    } else if (artists.length === 0) {
                        artists = ['Artista inferido'];  // Último fallback
                    }
                    
                    const finalArtists = artists.join(', ');
                    const finalTitle = title || 'Álbum sin título';
                    
                    return {
                        id: item.id,
                        name: finalTitle,
                        artists: finalArtists,
                        genre: item.style?.filter(Boolean).join(' / ') || 'Género desconocido',
                        year: item.year ? `${item.year}` : 'N/D',
                        cover: item.cover_image || `https://via.placeholder.com/300x200/333/fff?text=${finalTitle.slice(0,8)}`,
                        label: item.labels?.map(l => l.name).filter(Boolean).join(', ') || '',
                        masterUrl: item.master_url,
                        country: item.country || ''
                    };
                });


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
        
        // LÓGICA MEJORADA: Datos ricos Discogs
        article.innerHTML = `
            <img src="${album.cover}" 
                 alt="Portada ${album.name} - ${album.artists}" 
                 property="image" 
                 loading="lazy"
                 onerror="this.src='https://via.placeholder.com/300?text=${encodeURIComponent(album.name.slice(0,10))}'">
            
            <h2 property="name">${album.name}</h2>
            
            <p><strong>👥 Artistas:</strong> 
               <span property="byArtist">${album.artists}</span>
            </p>
            
            <p><strong>🎸 Géneros:</strong> 
               <span property="genre">${album.genre}</span>
            </p>
            
            ${album.label ? `<p><strong>🏷️ Label:</strong> <span property="recordLabel">${album.label}</span></p>` : ''}
            
            <p><strong>📅 Año:</strong> 
               <span property="datePublished">${album.year}</span>
            </p>
            
            ${album.masterUrl ? `<p><strong>🔗 Original:</strong> <a href="${album.masterUrl}" property="url" target="_blank">Master Discogs</a></p>` : ''}
            
            <button onclick="addToCart('${album.name} - ${album.artists.slice(0,20)}...')" 
                    aria-label="Agregar ${album.name} al carrito">
                🛒 + Carrito (${album.id})
            </button>
        `;
        
        article.style.animationDelay = `${i * 0.12}s`;
        container.appendChild(article);
    });
}


function addToCart(name) {
    let cart = JSON.parse(localStorage.getItem('semanticCart') || '[]');
    cart.push(name);
    localStorage.setItem('semanticCart', JSON.stringify(cart));
    alert(`✅ ${name} agregado. Total: ${cart.length}`);
}
