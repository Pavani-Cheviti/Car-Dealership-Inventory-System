import { useEffect, useMemo, useState } from 'react';
import './App.css';

const API_URL = 'http://localhost:5000/api';

const emptyVehicleForm = {
  make: '',
  model: '',
  category: '',
  price: '',
  quantity: '',
};

const heroImage = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=85';
const vehicleImages = [
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=900&q=85',
];

function getVehicleImage(vehicle, index) {
  const vehicleText = `${vehicle.make} ${vehicle.model}`.toLowerCase();
  const imageIndex = vehicleText.includes('suv') ? 1 : vehicleText.includes('sedan') ? 2 : index % vehicleImages.length;
  return vehicleImages[imageIndex];
}

function App() {
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('northstarUser');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('northstarToken') || '');
  const [vehicles, setVehicles] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedCity, setSelectedCity] = useState('Hyderabad');
  const [citySearch, setCitySearch] = useState('');
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState({ type: 'info', text: '' });
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicleForm);
  const [wishlist, setWishlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('northstarWishlist') || '[]');
    } catch {
      return [];
    }
  });
  const [showWishlist, setShowWishlist] = useState(false);

  const isAdmin = user?.role === 'admin';

  const fetchVehicles = async () => {
    if (!token || !user) {
      setVehicles([]);
      return;
    }

    setLoading(true);

    try {
      const hasFilters = categoryFilter !== 'all' || minPrice || maxPrice;
      const params = new URLSearchParams();

      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);

      const endpoint = hasFilters ? `${API_URL}/vehicles/search?${params.toString()}` : `${API_URL}/vehicles`;
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load vehicles.');
      }

      setVehicles(Array.isArray(data) ? data : data.vehicles || []);
    } catch (error) {
      setVehicles([]);
      setNotice({ type: 'error', text: error.message || 'Unable to load vehicles.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || !user) {
      setVehicles([]);
      return;
    }

    fetchVehicles();
  }, [token, user, categoryFilter, minPrice, maxPrice]);

  const categories = useMemo(
    () => [...new Set(vehicles.map((vehicle) => vehicle.category).filter(Boolean))],
    [vehicles]
  );

  const visibleVehicles = useMemo(
    () => (showWishlist ? vehicles.filter((vehicle) => wishlist.includes(vehicle.id)) : vehicles),
    [vehicles, showWishlist, wishlist]
  );

  const apiHeaders = (includeJson = true) => {
    const headers = {};

    if (includeJson) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  };

  const handleAuthInput = (event) => {
    const { name, value } = event.target;
    setAuthForm((current) => ({ ...current, [name]: value }));
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setNotice({ type: 'info', text: '' });

    const endpoint = authMode === 'login' ? `${API_URL}/auth/login` : `${API_URL}/auth/register`;
    const payload =
      authMode === 'login'
        ? { email: authForm.email, password: authForm.password }
        : { name: authForm.name, email: authForm.email, password: authForm.password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed.');
      }

      if (authMode === 'register') {
        setNotice({
          type: 'success',
          text: 'Registration was successful. Please sign in to continue.',
        });
        setAuthMode('login');
        setAuthForm({ name: '', email: authForm.email, password: '' });
        return;
      }

      const nextToken = data.token;
      const nextUser = {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
      };

      localStorage.setItem('northstarToken', nextToken);
      localStorage.setItem('northstarUser', JSON.stringify(nextUser));
      setToken(nextToken);
      setUser(nextUser);
      setNotice({ type: 'success', text: `Welcome to Northstar Auto, ${nextUser.name}.` });
      setAuthForm({ name: '', email: '', password: '' });
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Authentication failed.' });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('northstarToken');
    localStorage.removeItem('northstarUser');
    setToken('');
    setUser(null);
    setVehicles([]);
    setCategoryFilter('all');
    setMinPrice('');
    setMaxPrice('');
    setNotice({ type: 'info', text: 'You have been signed out.' });
  };

  const clearFilters = () => {
    setCategoryFilter('all');
    setMinPrice('');
    setMaxPrice('');
  };

  const toggleWishlist = (vehicleId) => {
    setWishlist((current) => {
      const nextWishlist = current.includes(vehicleId)
        ? current.filter((id) => id !== vehicleId)
        : [...current, vehicleId];
      localStorage.setItem('northstarWishlist', JSON.stringify(nextWishlist));
      return nextWishlist;
    });
  };

  const popularCities = [
    'Delhi NCR',
    'Bangalore',
    'Hyderabad',
    'Mumbai',
    'Pune',
    'Delhi',
    'Gurgaon',
    'Noida',
    'Ahmedabad',
    'Chennai',
    'Kolkata',
    'Lucknow',
    'Jaipur',
    'Chandigarh',
  ];
  const moreCities = [
    'Agra',
    'Ambala',
    'Coimbatore',
    'Faridabad',
    'Ghaziabad',
    'Jodhpur',
    'Kanpur',
    'Karnal',
    'Kochi',
    'Ludhiana',
    'Mangaluru',
    'Mohali',
    'Mysuru',
    'Nagpur',
    'Prayagraj',
  ];
  const filteredCities = [...popularCities, ...moreCities].filter((city) =>
    city.toLowerCase().includes(citySearch.toLowerCase())
  );

  const resetVehicleForm = () => {
    setEditingVehicle(null);
    setVehicleForm(emptyVehicleForm);
    setShowVehicleForm(false);
  };

  const openAddVehicleForm = () => {
    setEditingVehicle(null);
    setVehicleForm(emptyVehicleForm);
    setShowVehicleForm(true);
  };

  const openEditVehicleForm = (vehicle) => {
    setEditingVehicle(vehicle);
    setVehicleForm({
      make: vehicle.make,
      model: vehicle.model,
      category: vehicle.category,
      price: vehicle.price,
      quantity: vehicle.quantity,
    });
    setShowVehicleForm(true);
  };

  const handleVehicleFieldChange = (event) => {
    const { name, value } = event.target;
    setVehicleForm((current) => ({ ...current, [name]: value }));
  };

  const submitVehicleForm = async (event) => {
    event.preventDefault();

    const payload = {
      make: vehicleForm.make.trim(),
      model: vehicleForm.model.trim(),
      category: vehicleForm.category.trim(),
      price: Number(vehicleForm.price),
      quantity: Number(vehicleForm.quantity),
    };

    if (!payload.make || !payload.model || !payload.category) {
      setNotice({ type: 'error', text: 'Vehicle make, model, and category are required.' });
      return;
    }

    if (!Number.isFinite(payload.price) || payload.price < 0) {
      setNotice({ type: 'error', text: 'Vehicle price must be a valid non-negative number.' });
      return;
    }

    if (!Number.isInteger(payload.quantity) || payload.quantity < 0) {
      setNotice({ type: 'error', text: 'Vehicle quantity must be a valid non-negative integer.' });
      return;
    }

    try {
      const endpoint = editingVehicle ? `${API_URL}/vehicles/${editingVehicle.id}` : `${API_URL}/vehicles`;
      const method = editingVehicle ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: apiHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'Vehicle update failed.');
      }

      setNotice({
        type: 'success',
        text: editingVehicle ? 'Vehicle updated successfully.' : 'Vehicle added successfully.',
      });
      resetVehicleForm();
      await fetchVehicles();
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Vehicle update failed.' });
    }
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (!window.confirm('Delete this vehicle from inventory?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/vehicles/${vehicleId}`, {
        method: 'DELETE',
        headers: apiHeaders(false),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'Vehicle deletion failed.');
      }

      setNotice({ type: 'success', text: 'Vehicle deleted successfully.' });
      await fetchVehicles();
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Vehicle deletion failed.' });
    }
  };

  const handlePurchaseVehicle = async (vehicleId) => {
    try {
      const response = await fetch(`${API_URL}/vehicles/${vehicleId}/purchase`, {
        method: 'POST',
        headers: apiHeaders(),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'Purchase failed.');
      }

      setNotice({ type: 'success', text: 'Purchase completed successfully.' });
      await fetchVehicles();
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Purchase failed.' });
    }
  };

  const handleRestockVehicle = async (vehicleId) => {
    const restockAmountInput = window.prompt('Enter restock quantity:', '5');

    if (restockAmountInput === null) {
      return;
    }

    const restockQuantity = Number(restockAmountInput);

    if (!Number.isInteger(restockQuantity) || restockQuantity <= 0) {
      setNotice({ type: 'error', text: 'Restock quantity must be a positive integer.' });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/vehicles/${vehicleId}/restock`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ quantity: restockQuantity }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'Restock failed.');
      }

      setNotice({ type: 'success', text: 'Inventory restocked successfully.' });
      await fetchVehicles();
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Restock failed.' });
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__content">
          <div className="brand-lockup">
            <span className="brand-mark">N</span>
            <div>
              <p className="brand-kicker">Northstar</p>
              <h1>Auto</h1>
            </div>
          </div>

          <button type="button" className="location-button" onClick={() => setShowCitySelector(true)}>
            <span className="location-pin">+</span>
            <span><small>Your location</small>{selectedCity}</span>
            <span className="chevron">⌄</span>
          </button>

          <nav className="main-nav" aria-label="Main navigation">
            <a href="#inventory" onClick={() => setShowWishlist(false)}>Buy Cars</a>
            <a href="#inventory" onClick={() => setShowWishlist(false)}>Browse</a>
            <button type="button" className={showWishlist ? 'nav-link active' : 'nav-link'} onClick={() => setShowWishlist(true)}>Wishlist</button>
            <a href="#offers">Offers</a>
          </nav>

          {user && token ? (
            <div className="user-chip-group">
              <div className="user-details"><strong>{user.name}</strong><span>{user.role}</span></div>
              <button type="button" className="secondary-button" onClick={handleLogout}>Logout</button>
            </div>
          ) : null}
        </div>
      </header>

      {showCitySelector ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowCitySelector(false)}>
          <section className="city-modal" role="dialog" aria-modal="true" aria-labelledby="city-title">
            <div className="modal-heading">
              <div><span className="eyebrow">Northstar Auto</span><h2 id="city-title">Where are you looking?</h2></div>
              <button type="button" className="close-button" onClick={() => setShowCitySelector(false)} aria-label="Close city selector">×</button>
            </div>
            <input
              className="city-search"
              type="search"
              value={citySearch}
              onChange={(event) => setCitySearch(event.target.value)}
              placeholder="Search city"
              autoFocus
            />
            <div className="city-options">
              <div className="city-group">
                <h3>Popular cities</h3>
                <div className="city-grid">
                  {popularCities.filter((city) => filteredCities.includes(city)).map((city) => (
                    <button key={city} type="button" className={selectedCity === city ? 'city-option selected' : 'city-option'} onClick={() => { setSelectedCity(city); setShowCitySelector(false); setCitySearch(''); }}>{city}</button>
                  ))}
                </div>
              </div>
              <div className="city-group">
                <h3>More cities</h3>
                <div className="city-grid">
                  {moreCities.filter((city) => filteredCities.includes(city)).map((city) => (
                    <button key={city} type="button" className={selectedCity === city ? 'city-option selected' : 'city-option'} onClick={() => { setSelectedCity(city); setShowCitySelector(false); setCitySearch(''); }}>{city}</button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      <main className="app-main">
        {!user || !token ? (
          <section className="auth-card">
            <div className="auth-toggle">
              <button
                type="button"
                className={authMode === 'login' ? 'auth-toggle__button active' : 'auth-toggle__button'}
                onClick={() => setAuthMode('login')}
              >
                Login
              </button>
              <button
                type="button"
                className={authMode === 'register' ? 'auth-toggle__button active' : 'auth-toggle__button'}
                onClick={() => setAuthMode('register')}
              >
                Register
              </button>
            </div>

            <div className="auth-copy">
              <h2>{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
              <p>
                {authMode === 'login'
                  ? 'Use your email and password to access the dealership inventory.'
                  : 'Register a new account to access the dealership inventory.'}
              </p>
            </div>

            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {authMode === 'register' ? (
                <label>
                  <span>Full name</span>
                  <input
                    name="name"
                    type="text"
                    value={authForm.name}
                    onChange={handleAuthInput}
                    placeholder="Alex Johnson"
                    required
                  />
                </label>
              ) : null}

              <label>
                <span>Email</span>
                <input
                  name="email"
                  type="email"
                  value={authForm.email}
                  onChange={handleAuthInput}
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label>
                <span>Password</span>
                <input
                  name="password"
                  type="password"
                  value={authForm.password}
                  onChange={handleAuthInput}
                  placeholder="Enter your password"
                  required
                />
              </label>

              <button type="submit" className="primary-button auth-submit">
                {authMode === 'login' ? 'Login' : 'Register'}
              </button>
            </form>

            {notice.text ? <div className={`notice ${notice.type}`}>{notice.text}</div> : null}
          </section>
        ) : (
          <section className="dashboard-shell">
            <section className="hero-banner">
              <div className="hero-copy">
                <span className="eyebrow">A better way to buy</span>
                <h2>Find Your Next Car</h2>
                <p>Quality cars. Transparent prices. Ready to drive.</p>
                <a className="primary-button hero-button" href="#inventory">Explore Cars <span>→</span></a>
              </div>
              <img className="hero-car-image" src={heroImage} alt="Premium Northstar vehicle" />
              <div className="hero-stat"><strong>{vehicles.length}</strong><span>cars in your market</span></div>
            </section>

            <section className="featured-section" aria-labelledby="featured-title">
              <div className="section-heading"><div><span className="eyebrow">Handpicked for you</span><h2 id="featured-title">Featured Cars</h2></div><a href="#inventory">View all cars →</a></div>
              <div className="featured-grid">
                {vehicles.slice(0, 3).map((vehicle, index) => (
                  <a className="featured-card" href="#inventory" key={vehicle.id}>
                    <img src={getVehicleImage(vehicle, index)} alt={`${vehicle.make} ${vehicle.model}`} />
                    <div><span>{vehicle.category}</span><strong>{vehicle.make} {vehicle.model}</strong></div>
                  </a>
                ))}
              </div>
            </section>

            <div className="dashboard-toolbar">
              <div className="section-intro" id="inventory">
                <span className="eyebrow">Curated for your journey</span>
                <h2>{showWishlist ? 'Your Wishlist' : 'Explore Our Cars'}</h2>
              </div>

              <div className="toolbar-filter">
                <label htmlFor="categoryFilter">Category</label>
                <select
                  id="categoryFilter"
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                >
                  <option value="all">All categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="toolbar-filter price-filter">
                <label htmlFor="minPrice">Min price</label>
                <input id="minPrice" type="number" min="0" placeholder="₹ Min" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} />
              </div>
              <div className="toolbar-filter price-filter">
                <label htmlFor="maxPrice">Max price</label>
                <input id="maxPrice" type="number" min="0" placeholder="₹ Max" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} />
              </div>

              {isAdmin ? (
                <button type="button" className="primary-button add-button" onClick={openAddVehicleForm}>+ Add Vehicle</button>
              ) : null}
              <button type="button" className="clear-button" onClick={clearFilters}>Clear filters</button>
            </div>

            <div className="dashboard-metrics">
              <div className="metric-card">
                <span>Total vehicles</span>
                <strong>{visibleVehicles.length}</strong>
              </div>
              <div className="metric-card">
                <span>In stock</span>
                <strong>{vehicles.filter((vehicle) => Number(vehicle.quantity) > 0).length}</strong>
              </div>
              <div className="metric-card">
                <span>Inventory value</span>
                <strong>
                  {new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    maximumFractionDigits: 0,
                  }).format(
                    vehicles.reduce((sum, vehicle) => sum + Number(vehicle.price || 0) * Number(vehicle.quantity || 0), 0)
                  )}
                </strong>
              </div>
            </div>

            {notice.text ? <div className={`notice ${notice.type}`}>{notice.text}</div> : null}

            {showVehicleForm ? (
              <div className="vehicle-form-panel">
                <div className="panel-header">
                  <h3>{editingVehicle ? 'Edit vehicle' : 'Add vehicle'}</h3>
                  <button type="button" className="ghost-button" onClick={resetVehicleForm}>
                    Close
                  </button>
                </div>

                <form className="vehicle-form" onSubmit={submitVehicleForm}>
                  <div className="form-grid">
                    <label>
                      <span>Make</span>
                      <input name="make" value={vehicleForm.make} onChange={handleVehicleFieldChange} required />
                    </label>
                    <label>
                      <span>Model</span>
                      <input name="model" value={vehicleForm.model} onChange={handleVehicleFieldChange} required />
                    </label>
                    <label>
                      <span>Category</span>
                      <input name="category" value={vehicleForm.category} onChange={handleVehicleFieldChange} required />
                    </label>
                    <label>
                      <span>Price</span>
                      <input name="price" type="number" min="0" step="0.01" value={vehicleForm.price} onChange={handleVehicleFieldChange} required />
                    </label>
                    <label>
                      <span>Quantity</span>
                      <input name="quantity" type="number" min="0" step="1" value={vehicleForm.quantity} onChange={handleVehicleFieldChange} required />
                    </label>
                  </div>

                  <div className="panel-actions">
                    <button type="button" className="secondary-button" onClick={resetVehicleForm}>
                      Cancel
                    </button>
                    <button type="submit" className="primary-button">
                      {editingVehicle ? 'Save changes' : 'Create vehicle'}
                    </button>
                  </div>
                </form>
              </div>
            ) : null}

            <div className="vehicle-list">
              {loading ? (
                <div className="empty-state">Loading inventory…</div>
              ) : visibleVehicles.length === 0 ? (
                showWishlist ? (
                  <div className="empty-state"><strong>Your wishlist is empty</strong><button type="button" className="primary-button empty-action" onClick={() => setShowWishlist(false)}>Explore Cars</button></div>
                ) : <div className="empty-state">No vehicles match your current filters.</div>
              ) : (
                visibleVehicles.map((vehicle, index) => (
                  <article key={vehicle.id} className="vehicle-card">
                    <div className={`vehicle-visual vehicle-visual-${index % 4}`}>
                      <span className="visual-badge">NORTHSTAR SELECT</span>
                      <img src={getVehicleImage(vehicle, index)} alt={`${vehicle.make} ${vehicle.model}`} onError={(event) => { event.currentTarget.src = heroImage; }} />
                      <button type="button" className={wishlist.includes(vehicle.id) ? 'wishlist-button active' : 'wishlist-button'} onClick={() => toggleWishlist(vehicle.id)} aria-label={wishlist.includes(vehicle.id) ? 'Remove from wishlist' : 'Add to wishlist'}>{wishlist.includes(vehicle.id) ? '♥' : '♡'}</button>
                    </div>
                    <div className="vehicle-card__header">
                      <div>
                        <p className="vehicle-card__category">{vehicle.category}</p>
                        <h3>
                          {vehicle.make} {vehicle.model}
                        </h3>
                      </div>

                      <span className={`stock-tag ${Number(vehicle.quantity) > 0 ? 'in-stock' : 'out-of-stock'}`}>
                        {Number(vehicle.quantity) > 0 ? `${vehicle.quantity} in stock` : 'Out of stock'}
                      </span>
                    </div>

                    <div className="vehicle-card__meta">
                      <div>
                        <span>Price</span>
                        <strong>
                          {new Intl.NumberFormat('en-IN', {
                            style: 'currency', currency: 'INR', maximumFractionDigits: 0, localeMatcher: 'best fit',
                          }).format(Number(vehicle.price || 0))}
                        </strong>
                      </div>
                      <div>
                        <span>Quantity</span>
                        <strong>{vehicle.quantity}</strong>
                      </div>
                    </div>

                    <div className="vehicle-card__actions">
                      <button
                        type="button"
                        className="primary-button compact"
                        onClick={() => handlePurchaseVehicle(vehicle.id)}
                        disabled={Number(vehicle.quantity) <= 0}
                      >
                        Purchase
                      </button>

                      {isAdmin ? (
                        <>
                          <button type="button" className="secondary-button compact" onClick={() => openEditVehicleForm(vehicle)}>
                            Update
                          </button>
                          <button type="button" className="secondary-button compact" onClick={() => handleRestockVehicle(vehicle.id)}>
                            Restock
                          </button>
                          <button type="button" className="danger-button compact" onClick={() => handleDeleteVehicle(vehicle.id)}>
                            Delete
                          </button>
                        </>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>

            {showWishlist ? null : null}

            <section className="benefits-section" aria-labelledby="benefits-title">
              <div><span className="eyebrow">The Northstar standard</span><h2 id="benefits-title">Why Buy From Northstar?</h2></div>
              <div className="benefits-grid">
                <span>✓ <strong>Verified Vehicles</strong></span><span>✓ <strong>Transparent Pricing</strong></span><span>✓ <strong>Easy Purchase</strong></span><span>✓ <strong>Trusted Inventory</strong></span>
              </div>
            </section>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;