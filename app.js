// API configuration
const API_KEY = 'bd939714';
const BASE_URL = 'http://www.omdbapi.com';

// Sample movie data - fallback if API fails
let movies = [];
let filteredMovies = [...movies];
let currentSort = 'default';
let searchTimeout;

// DOM Elements
const moviesGrid = document.getElementById('moviesGrid');
const sortSelect = document.getElementById('sortSelect');
const searchInput = document.getElementById('searchInput');
const yearSelect = document.getElementById('yearSelect');
const maxYearSpan = document.getElementById('maxYear');
const loadingSpinner = document.getElementById('loadingSpinner');
const sectionTitle = document.querySelector('.section-title');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    fetchPopularMovies();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    sortSelect.addEventListener('change', handleSort);
    searchInput.addEventListener('input', handleSearch);
    yearSelect.addEventListener('change', handleYearFilter);
    populateYearDropdown();
}

// Fetch popular movies from OMDB API
async function fetchPopularMovies() {
    showLoading();
    try {
        // Fetch some popular movies by their IMDb IDs
        const popularMovieIds = [
            'tt0111161', // The Shawshank Redemption
            'tt0068646', // The Godfather
            'tt0468569', // The Dark Knight
            'tt0071562', // The Godfather Part II
            'tt0050083', // 12 Angry Men
            'tt0411008', // Pulp Fiction
            'tt0060196', // The Good, the Bad and the Ugly
            'tt0109830'  // Forrest Gump
        ];

        const moviePromises = popularMovieIds.map(id => fetchMovieById(id));
        const movieResults = await Promise.all(moviePromises);
        
        // Filter out any failed requests and format the data
        movies = movieResults
            .filter(movie => movie && movie.Response === 'True')
            .map(movie => ({
                id: movie.imdbID,
                title: movie.Title,
                year: parseInt(movie.Year),
                genre: movie.Genre,
                poster: movie.Poster !== 'N/A' ? movie.Poster : `https://tse1.mm.bing.net/th/id/OIP.tqmQgcjoBxS1v1ZpujoLgAHaHV?rs=1&pid=ImgDetMain&o=7&rm=3${encodeURIComponent(movie.Title)}`
            }));

        filteredMovies = [...movies];
        renderMovies();
    } catch (error) {
        console.error('Error fetching movies:', error);
        renderMovies();
    }
}

// Fetch a single movie by ID
async function fetchMovieById(imdbId) {
    const response = await fetch(`${BASE_URL}?i=${imdbId}&apikey=${API_KEY}`);
    return await response.json();
}

// Search movies by title
async function searchMoviesByTitle(searchTerm) {
    console.log('Searching for:', searchTerm); // Debug log
    showLoading();
    try {
        // Use page parameter to limit results and avoid "Too many results" error
        const url = `${BASE_URL}?s=${encodeURIComponent(searchTerm)}&apikey=${API_KEY}&page=1`;
        console.log('API URL:', url); // Debug log
        const response = await fetch(url);
        const data = await response.json();
        console.log('API Response:', data); // Debug log
        
        if (data.Response === 'True' && data.Search) {
            console.log('Found movies:', data.Search.length); // Debug log
            
            // Limit to first 8 results to avoid overwhelming the user
            const limitedResults = data.Search.slice(0, 8);
            
            // Fetch detailed information for each search result
            const moviePromises = limitedResults.map(movie => fetchMovieById(movie.imdbID));
            const movieResults = await Promise.all(moviePromises);
            
            const searchResults = movieResults
                .filter(movie => movie && movie.Response === 'True')
                .map(movie => ({
                    id: movie.imdbID,
                    title: movie.Title,
                    year: parseInt(movie.Year),
                    genre: movie.Genre,
                    poster: movie.Poster !== 'N/A' ? movie.Poster : `https://tse1.mm.bing.net/th/id/OIP.tqmQgcjoBxS1v1ZpujoLgAHaHV?rs=1&pid=ImgDetMain&o=7&rm=3${encodeURIComponent(movie.Title)}`
                }));
            
            console.log('Processed results:', searchResults); // Debug log
            movies = searchResults;
            filteredMovies = [...movies];
            renderMovies();
        } else if (data.Error && data.Error.includes('Too many results')) {
            console.log('Too many results, showing limited results'); // Debug log
            // For single letters, just show a message instead of hardcoded movies
            movies = [];
            filteredMovies = [];
            renderMovies();
        } else {
            console.log('No movies found or API error:', data); // Debug log
            movies = [];
            filteredMovies = [];
            renderMovies();
        }
    } catch (error) {
        console.error('Error searching movies:', error);
        movies = [];
        filteredMovies = [];
        renderMovies();
    }
}

// Handle case where there are too many results
async function handleTooManyResults(searchTerm) {
    try {
        // For single letters, just show a message instead of hardcoded movies
        // Try searching with quotes for exact match or use popular movies starting with letter
        const popularStartingWith = await getPopularMoviesStartingWith(searchTerm);
        if (popularStartingWith.length > 0) {
            movies = popularStartingWith;
            filteredMovies = [...movies];
            renderMovies();
            return;
        }
        
        // Fallback: show some popular movies
        movies = [];
        filteredMovies = [];
        renderMovies();
    } catch (error) {
        console.error('Error handling too many results:', error);
        movies = [];
        filteredMovies = [];
        renderMovies();
    }
}

// Get popular movies starting with specific letter or two-letter combination
async function getPopularMoviesStartingWith(searchTerm) {
    const popularMovies = {
        // Single letters
        'a': ['tt0120737', 'tt0120338', 'tt1375666'], // Avatar, Alien, Avatar 2
        'g': ['tt3896198', 'tt0068646', 'tt0468569'], // Guardians, Godfather, Dark Knight
        's': ['tt0111161', 'tt0050083', 'tt0411008'], // Shawshank, 12 Angry Men, Pulp Fiction
        't': ['tt0052520', 'tt0080684', 'tt1375670'], // Terminator, Star Wars, Toy Story 3
        'h': ['tt0114709', 'tt0120382', 'tt0145487'], // The Matrix, Harry Potter, Spider-Man
        'b': ['tt0050083', 'tt0095327', 'tt0108778'], // Batman, Batman Begins, Batman
        'c': ['tt0095016', 'tt0105698', 'tt0120915'], // Casablanca, City Slickers, Chicago
        'd': ['tt0068646', 'tt0468569', 'tt0050083'], // Godfather, Dark Knight, 12 Angry Men
        'f': ['tt0109830', 'tt0083658', 'tt0120737'], // Forrest Gump, Full Metal Jacket, Avatar
        'i': ['tt0111161', 'tt0083658', 'tt0120737'], // Inception, Full Metal Jacket, Avatar
        'j': ['tt0050083', 'tt0095327', 'tt0108778'], // Jurassic Park, Batman, Batman
        'k': ['tt0050083', 'tt0095327', 'tt0108778'], // King Kong, Batman, Batman
        'l': ['tt0050083', 'tt0095327', 'tt0108778'], // Lord of the Rings, Batman, Batman
        'm': ['tt0083658', 'tt0120737', 'tt0095327'], // Matrix, Avatar, Batman
        'n': ['tt0083658', 'tt0120737', 'tt0095327'], // No Country for Old Men, Avatar, Batman
        'o': ['tt0083658', 'tt0120737', 'tt0095327'], // Once Upon a Time, Avatar, Batman
        'p': ['tt0411008', 'tt0095327', 'tt0108778'], // Pulp Fiction, Batman, Batman
        'q': ['tt0083658', 'tt0120737', 'tt0095327'], // Quantum of Solace, Avatar, Batman
        'r': ['tt0083658', 'tt0120737', 'tt0095327'], // Raiders of the Lost Ark, Avatar, Batman
        'u': ['tt0083658', 'tt0120737', 'tt0095327'], // Up, Avatar, Batman
        'v': ['tt0083658', 'tt0120737', 'tt0095327'], // V for Vendetta, Avatar, Batman
        'w': ['tt0083658', 'tt0120737', 'tt0095327'], // Wall-E, Avatar, Batman
        'x': ['tt0083658', 'tt0120737', 'tt0095327'], // X-Men, Avatar, Batman
        'y': ['tt0083658', 'tt0120737', 'tt0095327'], // Toy Story, Avatar, Batman
        'z': ['tt0083658', 'tt0120737', 'tt0095327'], // Zombieland, Avatar, Batman
        
        // Two-letter combinations
        'av': ['tt0120737', 'tt1375666', 'tt0120338'], // Avatar, Avatar 2, Alien
        'gu': ['tt3896198', 'tt0068646', 'tt0468569'], // Guardians, Godfather, Dark Knight
        'sh': ['tt0111161', 'tt0050083', 'tt0411008'], // Shawshank, 12 Angry Men, Pulp Fiction
        'st': ['tt0052520', 'tt0080684', 'tt1375670'], // Star Wars, Terminator, Toy Story
        'ha': ['tt0120382', 'tt0145487', 'tt0114709'], // Harry Potter, Spider-Man, Matrix
        'ba': ['tt0095327', 'tt0108778', 'tt0050083'], // Batman, Batman Begins, Batman
        'ca': ['tt0095016', 'tt0105698', 'tt0120915'], // Casablanca, City Slickers, Chicago
        'da': ['tt0068646', 'tt0468569', 'tt0050083'], // Godfather, Dark Knight, 12 Angry Men
        'fo': ['tt0109830', 'tt0083658', 'tt0120737'], // Forrest Gump, Full Metal Jacket, Avatar
        'in': ['tt0111161', 'tt0083658', 'tt0120737'], // Inception, Full Metal Jacket, Avatar
        'ju': ['tt0050083', 'tt0095327', 'tt0108778'], // Jurassic Park, Batman, Batman
        'ki': ['tt0050083', 'tt0095327', 'tt0108778'], // King Kong, Batman, Batman
        'lo': ['tt0050083', 'tt0095327', 'tt0108778'], // Lord of the Rings, Batman, Batman
        'ma': ['tt0083658', 'tt0120737', 'tt0095327'], // Matrix, Avatar, Batman
        'no': ['tt0083658', 'tt0120737', 'tt0095327'], // No Country for Old Men, Avatar, Batman
        'on': ['tt0083658', 'tt0120737', 'tt0095327'], // Once Upon a Time, Avatar, Batman
        'pu': ['tt0411008', 'tt0095327', 'tt0108778'], // Pulp Fiction, Batman, Batman
        'qu': ['tt0083658', 'tt0120737', 'tt0095327'], // Quantum of Solace, Avatar, Batman
        'ra': ['tt0083658', 'tt0120737', 'tt0095327'], // Raiders of the Lost Ark, Avatar, Batman
        'ro': ['tt0083658', 'tt0120737', 'tt0095327'], // Rocky, Avatar, Batman
        'sp': ['tt0145487', 'tt0114709', 'tt0120382'], // Spider-Man, Matrix, Harry Potter
        'te': ['tt0052520', 'tt0080684', 'tt1375670'], // Terminator, Star Wars, Toy Story
        'th': ['tt0114709', 'tt0120382', 'tt0145487'], // The Matrix, Harry Potter, Spider-Man
        'to': ['tt0083658', 'tt0120737', 'tt0095327'], // Toy Story, Avatar, Batman
        'wa': ['tt0083658', 'tt0120737', 'tt0095327'], // Wall-E, Avatar, Batman
        'x-': ['tt0083658', 'tt0120737', 'tt0095327'], // X-Men, Avatar, Batman
        'zo': ['tt0083658', 'tt0120737', 'tt0095327']  // Zombieland, Avatar, Batman
    };
    
    const movieIds = popularMovies[searchTerm.toLowerCase()] || [];
    const moviePromises = movieIds.map(id => fetchMovieById(id));
    const movieResults = await Promise.all(moviePromises);
    
    return movieResults
        .filter(movie => movie && movie.Response === 'True')
        .map(movie => ({
            id: movie.imdbID,
            title: movie.Title,
            year: parseInt(movie.Year),
            genre: movie.Genre,
            poster: movie.Poster !== 'N/A' ? movie.Poster : `https://via.placeholder.com/300x450?text=${encodeURIComponent(movie.Title)}`
        }));
}

// Render movies to the grid
function renderMovies() {
    moviesGrid.innerHTML = '';
    
    if (filteredMovies.length === 0) {
        moviesGrid.innerHTML = '<p class="no-results">No movies found</p>';
        moviesGrid.style.display = 'grid'; // Show the grid with no results message
        // Hide spinner after 1.5 seconds if no results
        setTimeout(() => {
            loadingSpinner.style.display = 'none';
        }, 500);
        return;
    }
    
    loadingSpinner.style.display = 'none'; // Hide spinner when movies are found
    moviesGrid.style.display = 'grid';
    
    filteredMovies.forEach(movie => {
        const movieCard = createMovieCard(movie);
        moviesGrid.appendChild(movieCard);
    });
}

// Create a movie card element
function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.innerHTML = `
        <img src="${movie.poster}" alt="${movie.title}" class="movie-poster" onerror="this.src='https://tse1.mm.bing.net/th/id/OIP.tqmQgcjoBxS1v1ZpujoLgAHaHV?rs=1&pid=ImgDetMain&o=7&rm=3'">
        <div class="movie-info">
            <h3 class="movie-title">${movie.title}</h3>
            <p class="movie-year">${movie.year}</p>
            <p class="movie-genre">${movie.genre}</p>
        </div>
    `;
    return card;
}

// Handle sorting
function handleSort(e) {
    currentSort = e.target.value;
    sortMovies();
    renderMovies();
}

// Sort movies based on selected option
function sortMovies() {
    // Create a copy to avoid modifying the original array
    const moviesToSort = [...filteredMovies];
    
    switch (currentSort) {
        case 'alphabetical-az':
            filteredMovies = moviesToSort.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'alphabetical-za':
            filteredMovies = moviesToSort.sort((a, b) => b.title.localeCompare(a.title));
            break;
        case 'newest-to-oldest':
            filteredMovies = moviesToSort.sort((a, b) => b.year - a.year);
            break;
        case 'oldest-to-newest':
            filteredMovies = moviesToSort.sort((a, b) => a.year - b.year);
            break;
        default:
            filteredMovies = [...movies];
            break;
    }
}

// Handle search with API call
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    // Clear previous timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    if (searchTerm === '') {
        fetchPopularMovies(); // Reload popular movies
    } else if (searchTerm.length >= 1) { // Search with 1 or more characters
        // Debounce search to avoid too many API calls
        searchTimeout = setTimeout(() => {
            searchMoviesByTitle(searchTerm); // Search API
        }, 300); // Wait 300ms after user stops typing
    }
    
    updateSectionTitle(searchTerm);
}

// Handle year filter
function handleYearFilter(e) {
    const selectedYear = e.target.value;
    
    if (selectedYear === '') {
        filteredMovies = [...movies];
    } else {
        filteredMovies = movies.filter(movie => movie.year === parseInt(selectedYear));
    }
    
    // Re-apply current sort
    if (currentSort !== 'default') {
        sortMovies();
    }
    
    renderMovies();
}

// Populate year dropdown with available years
function populateYearDropdown() {
    const currentYear = new Date().getFullYear();
    const startYear = 1900;
    
    // Clear existing options except "All Years"
    yearSelect.innerHTML = '<option value="">All Years</option>';
    
    // Add years from current year back to 1900
    for (let year = currentYear; year >= startYear; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
}

// Update section title based on search
function updateSectionTitle(searchTerm) {
    if (searchTerm) {
        sectionTitle.textContent = `Search results for '${searchTerm}'`;
    } else {
        sectionTitle.textContent = 'Search results';
    }
}

// Simulate loading state
function showLoading() {
    loadingSpinner.style.display = 'block';
    moviesGrid.style.display = 'none';
}

function hideLoading() {
    loadingSpinner.style.display = 'none';
    moviesGrid.style.display = 'grid';
}

async function fetchMoviesFromAPI() {
    showLoading();
    try {
        // Fetch popular movies by their IMDb IDs
        const popularMovieIds = [
            'tt0111161', // The Shawshank Redemption
            'tt0068646', // The Godfather
            'tt0468569', // The Dark Knight
            'tt0071562', // The Godfather Part II
            'tt0050083', // 12 Angry Men
            'tt0411008', // Pulp Fiction
            'tt0060196', // The Good, the Bad and the Ugly
            'tt0109830'  // Forrest Gump
        ];

        const moviePromises = popularMovieIds.map(id => fetchMovieById(id));
        const movieResults = await Promise.all(moviePromises);
        
        // Filter out any failed requests and format the data
        movies = movieResults
            .filter(movie => movie && movie.Response === 'True')
            .map(movie => ({
                id: movie.imdbID,
                title: movie.Title,
                year: parseInt(movie.Year),
                genre: movie.Genre,
                poster: movie.Poster !== 'N/A' ? movie.Poster : `https://via.placeholder.com/300x450?text=${encodeURIComponent(movie.Title)}`
            }));

        filteredMovies = [...movies];
        renderMovies();
    } catch (error) {
        console.error('Error fetching movies:', error);
        renderMovies();
    }
}

// Utility function to add CSS for no results message
const style = document.createElement('style');
style.textContent = `
    .no-results {
        text-align: center;
        padding: 2rem;
        color: #666;
        font-size: 1.2rem;
        grid-column: 1 / -1;
    }
`;
document.head.appendChild(style);