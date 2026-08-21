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

async function updateVehicle(id, changes, repo = defaultVehicleRepo) {
  const existing = await repo.findById(id);
  if (!existing) {
    throw new Error('Vehicle not found');
  }

  return repo.update(id, {
    ...existing,
    ...changes,
    price: changes.price !== undefined ? Number(changes.price) : existing.price,
    quantity: changes.quantity !== undefined ? Number(changes.quantity) : existing.quantity,
  });
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
  purchaseVehicle,
  restockVehicle,
};
