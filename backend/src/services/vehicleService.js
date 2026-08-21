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

async function searchVehicles(filters = {}, repo = defaultVehicleRepo) {
  const vehicles = await repo.findAll();

  return vehicles.filter((vehicle) => {
    const makeMatch = !filters.make || vehicle.make.toLowerCase().includes(filters.make.toLowerCase());
    const modelMatch = !filters.model || vehicle.model.toLowerCase().includes(filters.model.toLowerCase());
    const categoryMatch = !filters.category || vehicle.category.toLowerCase().includes(filters.category.toLowerCase());
    const minPrice = filters.minPrice !== undefined ? Number(filters.minPrice) : null;
    const maxPrice = filters.maxPrice !== undefined ? Number(filters.maxPrice) : null;
    const priceMatch =
      (minPrice === null || vehicle.price >= minPrice) &&
      (maxPrice === null || vehicle.price <= maxPrice);

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

async function restockVehicle(id, amount, repo = defaultVehicleRepo) {
  const vehicle = await repo.findById(id);
  if (!vehicle) {
    throw new Error('Vehicle not found');
  }

  const restockCount = Number(amount || 0);
  if (restockCount <= 0) {
    throw new Error('Restock amount must be greater than zero');
  }

  return repo.update(id, {
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
