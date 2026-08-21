import { describe, it, expect } from 'vitest';
import {
  createVehicle,
  getAllVehicles,
  searchVehicles,
  updateVehicle,
  purchaseVehicle,
  restockVehicle,
} from '../services/vehicleService.js';

describe('vehicleService', () => {
  it('adds a vehicle with valid payload', async () => {
    const repo = {
      create: async (vehicle) => ({ id: 1, ...vehicle }),
    };

    const vehicle = await createVehicle(
      {
        make: 'Toyota',
        model: 'Corolla',
        category: 'Sedan',
        price: 22000,
        quantity: 4,
      },
      repo
    );

    expect(vehicle).toMatchObject({
      make: 'Toyota',
      model: 'Corolla',
      category: 'Sedan',
      price: 22000,
      quantity: 4,
    });
  });

  it('returns vehicles matching make or model filters', async () => {
    const repo = {
      findAll: async () => [
        { id: 1, make: 'Toyota', model: 'Corolla', category: 'Sedan', price: 22000, quantity: 3 },
        { id: 2, make: 'Honda', model: 'Civic', category: 'Sedan', price: 25000, quantity: 2 },
      ],
    };

    const results = await searchVehicles({ make: 'Toyota' }, repo);

    expect(results).toHaveLength(1);
    expect(results[0].make).toBe('Toyota');
  });

  it('updates vehicle values', async () => {
    const repo = {
      findById: async () => ({ id: 2, make: 'Honda', model: 'Civic', category: 'Sedan', price: 25000, quantity: 2 }),
      update: async (id, changes) => ({ id, ...changes }),
    };

    const vehicle = await updateVehicle(2, { price: 27000 }, repo);

    expect(vehicle.price).toBe(27000);
  });

  it('decreases quantity when a vehicle is purchased', async () => {
    const repo = {
      findById: async () => ({ id: 1, make: 'Toyota', model: 'Corolla', category: 'Sedan', price: 22000, quantity: 3 }),
      update: async (id, changes) => ({ id, quantity: changes.quantity }),
    };

    const vehicle = await purchaseVehicle(1, repo);

    expect(vehicle.quantity).toBe(2);
  });

  it('does not allow purchase when quantity is zero', async () => {
    const repo = {
      findById: async () => ({ id: 1, make: 'Toyota', model: 'Corolla', category: 'Sedan', price: 22000, quantity: 0 }),
    };

    await expect(purchaseVehicle(1, repo)).rejects.toThrow('No vehicles available');
  });

  it('restocks vehicle quantity', async () => {
    const repo = {
      findById: async () => ({ id: 1, make: 'Toyota', model: 'Corolla', category: 'Sedan', price: 22000, quantity: 1 }),
      update: async (id, changes) => ({ id, quantity: changes.quantity }),
    };

    const vehicle = await restockVehicle(1, 4, repo);

    expect(vehicle.quantity).toBe(5);
  });

  it('lists all vehicles', async () => {
    const repo = {
      findAll: async () => [
        { id: 1, make: 'Toyota', model: 'Corolla', category: 'Sedan', price: 22000, quantity: 3 },
      ],
    };

    const vehicles = await getAllVehicles(repo);
    expect(vehicles).toHaveLength(1);
  });
});
