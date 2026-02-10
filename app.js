// API configuration
const API_KEY = "bd939714";
const BASE_URL = "https://www.omdbapi.com/?apikey=bd939714";

// Movie Data
let movies = [];
let filteredMovies = [...movies];
let currentSort = "default";
let searchTimeout;

// DOM Elements
const moviesGrid = document.getElementById("moviesGrid");
const sortSelect = document.getElementById("sortSelect");
const searchInput = document.getElementById("searchInput");
const yearSelect = document.getElementById("yearSelect");
const maxYearSpan = document.getElementById("maxYear");
const loadingSpinner = document.getElementById("loadingSpinner");
const sectionTitle = document.querySelector(".section-title");
const browseMoviesLink = document.getElementById("browseMoviesLink");
const homeLink = document.getElementById("homeLink");

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  fetchPopularMovies();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  sortSelect.addEventListener("change", handleSort);
  searchInput.addEventListener("input", handleSearch);
  yearSelect.addEventListener("change", handleYearFilter);
  browseMoviesLink.addEventListener("click", handleBrowseMoviesClick);
  homeLink.addEventListener("click", handleHomeClick);
  populateYearDropdown();
}

// Handle browse movies click - focus on search input
function handleBrowseMoviesClick(e) {
  e.preventDefault();
  searchInput.focus();
  searchInput.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Handle home click - refresh to original state
function handleHomeClick(e) {
  e.preventDefault();
  location.reload();
}

// Fetch popular movies from OMDB API
async function fetchPopularMovies() {
  UIUtils.showLoading();
  try {
    // Search for API
    const url = `${BASE_URL}&s=guardians of the galaxy&page=1`;
    console.log("API URL:", url); // Debug log
    const response = await fetch(url);
    const data = await response.json();
    console.log("API Response:", data); // Debug log

    if (data.Response === "True" && data.Search) {
      console.log("Found movies:", data.Search.length); // Debug log

      // Limit to first 8 results for symmetrical grid
      const limitedResults = data.Search.slice(0, 8);

      // Fetch detailed information for each search result
      const moviePromises = limitedResults.map((movie) =>
        fetchMovieById(movie.imdbID),
      );
      const movieResults = await Promise.all(moviePromises);

      const searchResults = movieResults
        .filter((movie) => movie && movie.Response === "True")
        .map((movie) => ({
          id: movie.imdbID,
          title: movie.Title,
          year: parseInt(movie.Year),
          genre: movie.Genre,
          // if no poster is found, use a placeholder
          poster:
            movie.Poster !== "N/A"
              ? movie.Poster
              : `https://tse1.mm.bing.net/th/id/OIP.tqmQgcjoBxS1v1ZpujoLgAHaHV?rs=1&pid=ImgDetMain&o=7&rm=3${encodeURIComponent(movie.Title)}`,
        }));

      console.log("Processed results:", searchResults); // Debug log
      movies = searchResults;
      filteredMovies = [...movies];
      populateYearDropdown();
      renderMovies();
    } else {
      console.log("No movies found or API error:", data); // Debug log
      movies = [];
      filteredMovies = [];
      populateYearDropdown();
      renderMovies();
    }
  } catch (error) {
    console.error("Error fetching movies:", error);
    renderMovies();
  }
}

// Fetch a single movie by ID
async function fetchMovieById(imdbId) {
  const response = await fetch(`${BASE_URL}&i=${imdbId}`);
  return await response.json();
}

// Search movies by title
async function searchMoviesByTitle(searchTerm) {
  console.log("Searching for:", searchTerm); // Debug log
  UIUtils.showLoading();
  try {
    // Use page parameter to limit results and avoid "Too many results" error
    const url = `${BASE_URL}&s=${encodeURIComponent(searchTerm)}&page=1`;
    console.log("API URL:", url); // Debug log
    const response = await fetch(url);
    const data = await response.json();
    console.log("API Response:", data); // Debug log;

    if (data.Response === "True" && data.Search) {
      console.log("Found movies:", data.Search.length); // Debug log;

      // Limit to 8 results, makes symmetrical grid
      const limitedResults = data.Search.slice(0, 8);

      // Fetch detailed information for each search result
      const moviePromises = limitedResults.map((movie) =>
        fetchMovieById(movie.imdbID),
      );
      const movieResults = await Promise.all(moviePromises);

      const searchResults = movieResults
        .filter((movie) => movie && movie.Response === "True")
        .map((movie) => ({
          id: movie.imdbID,
          title: movie.Title,
          year: parseInt(movie.Year),
          genre: movie.Genre,
          poster:
            movie.Poster !== "N/A"
              ? movie.Poster
              : `https://tse1.mm.bing.net/th/id/OIP.tqmQgcjoBxS1v1ZpujoLgAHaHV?rs=1&pid=ImgDetMain&o=7&rm=3${encodeURIComponent(movie.Title)}`,
        }));

      console.log("Processed results:", searchResults); // Debug log
      movies = searchResults;
      filteredMovies = [...movies];
      populateYearDropdown();
      renderMovies();
    } else if (data.Error && data.Error.includes("Too many results")) {
      console.log("Too many results, trying alternative search"); // Debug log

      // For 1-2 letters, try a more specific search approach
      if (searchTerm.length <= 2) {
        await handleShortSearch(searchTerm);
      } else {
        // For longer searches that still overflow, show message
        movies = [];
        filteredMovies = [];
        populateYearDropdown();
        renderMovies();
      }
    } else {
      console.log("No movies found or API error:", data); // Debug log
      movies = [];
      filteredMovies = [];
      populateYearDropdown();
      renderMovies();
    }
  } catch (error) {
    console.error("Error searching movies:", error);
    movies = [];
    filteredMovies = [];
    populateYearDropdown();
    renderMovies();
  }
}

// Handle short searches (1-2 characters) with alternative strategies
async function handleShortSearch(searchTerm) {
  console.log("Handling short search for:", searchTerm); // Debug log

  // Strategy 1: Try searching with popular movie prefixes
  const commonPrefixes = [
    "the",
    "a",
    "an",
    "star",
    "war",
    "lord",
    "ring",
    "harry",
    "potter",
    "marvel",
    "dc",
    "bat",
    "spider",
    "iron",
    "captain",
    "america",
    "thor",
  ];

  // Strategy 2: Try searching for movies starting with the letter
  const searchStrategies = [
    // Try the original search first
    () => searchWithPrefix(searchTerm),
    // Try common prefixes if single letter
    searchTerm.length === 1
      ? () => searchWithCommonPrefixes(searchTerm, commonPrefixes)
      : null,
    // Try year-based search for common years
    () => searchByRecentYears(),
  ].filter((strategy) => strategy !== null);

  for (const strategy of searchStrategies) {
    try {
      const results = await strategy();
      if (results && results.length > 0) {
        console.log(
          "Alternative search successful with",
          results.length,
          "results",
        );
        movies = results;
        filteredMovies = [...movies];
        populateYearDropdown();
        renderMovies();
        return;
      }
    } catch (error) {
      console.log("Strategy failed, trying next:", error);
      continue;
    }
  }

  // If all strategies fail, show a helpful message
  console.log("All search strategies failed");
  movies = [];
  filteredMovies = [];
  populateYearDropdown();
  renderMovies();
}

// Search with specific prefix
async function searchWithPrefix(prefix) {
  const url = `${BASE_URL}&s=${encodeURIComponent(prefix)}&page=1`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.Response === "True" && data.Search) {
    const limitedResults = data.Search.slice(0, 8);
    const moviePromises = limitedResults.map((movie) =>
      fetchMovieById(movie.imdbID),
    );
    const movieResults = await Promise.all(moviePromises);

    return movieResults
      .filter((movie) => movie && movie.Response === "True")
      .map((movie) => ({
        id: movie.imdbID,
        title: movie.Title,
        year: parseInt(movie.Year),
        genre: movie.Genre,
        poster:
          movie.Poster !== "N/A"
            ? movie.Poster
            : `https://tse1.mm.bing.net/th/id/OIP.tqmQgcjoBxS1v1ZpujoLgAHaHV?rs=1&pid=ImgDetMain&o=7&rm=3${encodeURIComponent(movie.Title)}`,
      }));
  }
  return null;
}

// Search with common prefixes for single letters
async function searchWithCommonPrefixes(letter, prefixes) {
  const matchingPrefixes = prefixes.filter((prefix) =>
    prefix.startsWith(letter.toLowerCase()),
  );

  for (const prefix of matchingPrefixes.slice(0, 3)) {
    // Try first 3 matches
    const results = await searchWithPrefix(prefix);
    if (results && results.length > 0) {
      return results;
    }
  }
  return null;
}

// Search by recent years as fallback
async function searchByRecentYears() {
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2]; // Last 3 years

  for (const year of years) {
    const results = await searchWithPrefix(year.toString());
    if (results && results.length > 0) {
      return results.slice(0, 8); // Limit to 8 for year results
    }
  }
  return null;
}

// Handle case where there are too many results
async function handleTooManyResults(searchTerm) {
  try {
    // For single letters, just show a message instead of hardcoded movies
    movies = [];
    filteredMovies = [];
    renderMovies();
  } catch (error) {
    console.error("Error handling too many results:", error);
    movies = [];
    filteredMovies = [];
    renderMovies();
  }
}

// Render movies to the grid
function renderMovies() {
  moviesGrid.innerHTML = "";

  if (filteredMovies.length === 0) {
    moviesGrid.innerHTML = '<p class="no-results">No movies found</p>';
    moviesGrid.style.display = "grid"; // Show the grid with no results message
    // Hide spinner after 1.5 seconds if no results
    setTimeout(() => {
      UIUtils.hideLoading();
    }, 500);
    return;
  }

  UIUtils.hideLoading();
  moviesGrid.style.display = "grid";

  filteredMovies.forEach((movie) => {
    const movieCard = createMovieCard(movie);
    moviesGrid.appendChild(movieCard);
  });
}

// Create a movie card element
function createMovieCard(movie) {
  const card = document.createElement("div");
  card.className = "movie-card";
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
    case "alphabetical-az":
      filteredMovies = moviesToSort.sort((a, b) =>
        a.title.localeCompare(b.title),
      );
      break;
    case "alphabetical-za":
      filteredMovies = moviesToSort.sort((a, b) =>
        b.title.localeCompare(a.title),
      );
      break;
    case "newest-to-oldest":
      filteredMovies = moviesToSort.sort((a, b) => b.year - a.year);
      break;
    case "oldest-to-newest":
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

  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  if (searchTerm === "") {
    fetchPopularMovies(); // Reload popular movies
  } else if (searchTerm.length >= 1) {
    // Search with 1 or more characters
    searchTimeout = setTimeout(() => {
      searchMoviesByTitle(searchTerm); // Search API
    }, 300); // Wait 300ms after user stops typing
  }

  updateSectionTitle(searchTerm);
}

// Handle year filter
function handleYearFilter(e) {
  const selectedYear = e.target.value;

  if (selectedYear === "") {
    filteredMovies = [...movies];
  } else {
    filteredMovies = movies.filter(
      (movie) => movie.year === parseInt(selectedYear),
    );
  }

  // Re-apply current sort
  if (currentSort !== "default") {
    sortMovies();
  }

  renderMovies();
}

// Populate year dropdown with available years from movie data
function populateYearDropdown() {
  // Clear existing options except "All Years"
  yearSelect.innerHTML = '<option value="">All Years</option>';

  if (movies.length === 0) {
    // If no movies loaded, show current year back to 1900 as fallback
    const currentYear = new Date().getFullYear();
    const startYear = 1900;

    for (let year = currentYear; year >= startYear; year--) {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      yearSelect.appendChild(option);
    }
    return;
  }

  // Get unique years from movie data
  const movieYears = [...new Set(movies.map((movie) => movie.year))].sort(
    (a, b) => b - a,
  );

  // Add only years that have movies
  movieYears.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  });

  // Update max year display if element exists
  if (maxYearSpan) {
    maxYearSpan.textContent = Math.max(...movieYears);
  }
}

// Update section title based on search
function updateSectionTitle(searchTerm) {
  if (searchTerm) {
    sectionTitle.textContent = `Search results for '${searchTerm}'`;
  } else {
    sectionTitle.textContent = "Search results";
  }
}

// Loading and UI utilities
const UIUtils = {
  showLoading() {
    loadingSpinner.style.display = "block";
    moviesGrid.style.display = "none";
  },

  hideLoading() {
    loadingSpinner.style.display = "none";
    moviesGrid.style.display = "grid";
  },

  addNoResultsStyle() {
    const style = document.createElement("style");
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
  },
};

UIUtils.addNoResultsStyle();
