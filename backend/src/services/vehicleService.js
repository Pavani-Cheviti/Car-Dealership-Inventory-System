import { defaultVehicleRepo } from '../repositories/vehicleRepository.js';

function normalizeText(value) {
  return String(value ?? '').trim();
}

function validateNonNegativeNumber(value, fieldName) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    throw new Error(`${fieldName} must be a non-negative number`);
  }

  return numericValue;
}

function validateVehicleInput(data = {}) {
  const make = normalizeText(data.make);
  const model = normalizeText(data.model);
  const category = normalizeText(data.category);

  if (!make) {
    throw new Error('Make is required');
  }

  if (!model) {
    throw new Error('Model is required');
  }

  if (!category) {
    throw new Error('Category is required');
  }

  const price = validateNonNegativeNumber(data.price, 'Price');
  const quantity = Number(data.quantity);

  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error('Quantity must be a non-negative integer');
  }

  return {
    make,
    model,
    category,
    price,
    quantity,
  };
}

async function createVehicle(data, repo = defaultVehicleRepo) {
  const validVehicle = validateVehicleInput(data);

  return repo.create(validVehicle);
}

async function getAllVehicles(repo = defaultVehicleRepo) {
  return repo.findAll();
}

function parseSearchFilterNumber(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    throw new Error(`${fieldName} must be a non-negative number`);
  }

  return numericValue;
}

async function searchVehicles(filters = {}, repo = defaultVehicleRepo) {
  const query = {
    make: typeof filters.make === 'string' ? filters.make.trim() : filters.make,
    model: typeof filters.model === 'string' ? filters.model.trim() : filters.model,
    category: typeof filters.category === 'string' ? filters.category.trim() : filters.category,
    minPrice: parseSearchFilterNumber(filters.minPrice, 'minPrice'),
    maxPrice: parseSearchFilterNumber(filters.maxPrice, 'maxPrice'),
  };

  if (typeof repo.search === 'function') {
    return repo.search(query);
  }

  const vehicles = await repo.findAll();

  return vehicles.filter((vehicle) => {
    const makeMatch = !query.make || vehicle.make.toLowerCase().includes(query.make.toLowerCase());
    const modelMatch = !query.model || vehicle.model.toLowerCase().includes(query.model.toLowerCase());
    const categoryMatch = !query.category || vehicle.category.toLowerCase().includes(query.category.toLowerCase());
    const minPrice = query.minPrice ?? null;
    const maxPrice = query.maxPrice ?? null;
    const priceMatch =
      (minPrice === null || Number(vehicle.price) >= minPrice) &&
      (maxPrice === null || Number(vehicle.price) <= maxPrice);

    return makeMatch && modelMatch && categoryMatch && priceMatch;
  });
}

function parseVehicleId(id) {
  const vehicleId = Number(id);

  if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
    throw new Error('Invalid vehicle ID');
  }

  return vehicleId;
}

function validateVehicleUpdateInput(changes = {}) {
  const nextVehicle = { ...changes };

  if (changes.make !== undefined) {
    const make = String(changes.make).trim();
    if (!make) {
      throw new Error('Make is required');
    }
    nextVehicle.make = make;
  }

  if (changes.model !== undefined) {
    const model = String(changes.model).trim();
    if (!model) {
      throw new Error('Model is required');
    }
    nextVehicle.model = model;
  }

  if (changes.category !== undefined) {
    const category = String(changes.category).trim();
    if (!category) {
      throw new Error('Category is required');
    }
    nextVehicle.category = category;
  }

  if (changes.price !== undefined) {
    const price = Number(changes.price);
    if (!Number.isFinite(price) || price < 0) {
      throw new Error('Price must be a non-negative number');
    }
    nextVehicle.price = price;
  }

  if (changes.quantity !== undefined) {
    const quantity = Number(changes.quantity);
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new Error('Quantity must be a non-negative integer');
    }
    nextVehicle.quantity = quantity;
  }

  return nextVehicle;
}

async function updateVehicle(id, changes, repo = defaultVehicleRepo) {
  const vehicleId = parseVehicleId(id);
  const existing = await repo.findById(vehicleId);
  if (!existing) {
    throw new Error('Vehicle not found');
  }

  const mergedVehicle = {
    ...existing,
    ...validateVehicleUpdateInput(changes),
  };

  return repo.update(vehicleId, mergedVehicle);
}

async function deleteVehicle(id, repo = defaultVehicleRepo) {
  const vehicleId = parseVehicleId(id);
  const existing = await repo.findById(vehicleId);

  if (!existing) {
    throw new Error('Vehicle not found');
  }

  return repo.delete(vehicleId);
}

async function purchaseVehicle(id, repo = defaultVehicleRepo) {
  const vehicle = await repo.findById(id);
  if (!vehicle) {
    throw new Error('Vehicle not found');
  }

  if (vehicle.quantity <= 0) {
    throw new Error('No vehicles available');
  }

  return repo.update(id, {
    ...vehicle,
    quantity: vehicle.quantity - 1,
  });
}

function parseRestockAmount(amount) {
  const restockCount = Number(amount);

  if (!Number.isInteger(restockCount) || restockCount <= 0) {
    throw new Error('Restock quantity must be a positive integer');
  }

  return restockCount;
}

async function restockVehicle(id, amount, repo = defaultVehicleRepo) {
  const vehicleId = parseVehicleId(id);
  const vehicle = await repo.findById(vehicleId);
  if (!vehicle) {
    throw new Error('Vehicle not found');
  }

  const restockCount = parseRestockAmount(amount);

  return repo.update(vehicleId, {
    ...vehicle,
    quantity: vehicle.quantity + restockCount,
  });
}

export {
  createVehicle,
  getAllVehicles,
  searchVehicles,
  updateVehicle,
  deleteVehicle,
  purchaseVehicle,
  restockVehicle,
};
