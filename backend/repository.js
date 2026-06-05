const { seed } = require("./seed");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createStore() {
  let state = clone(seed);

  function list(collection) {
    return clone(state[collection] || []);
  }

  function find(collection, id) {
    return list(collection).find((item) => String(item.id).toLowerCase() === String(id).toLowerCase()) || null;
  }

  function create(collection, payload) {
    const item = {
      ...payload,
      id: payload.id || `${collection}-${Date.now()}`,
      createdAt: payload.createdAt || new Date().toISOString(),
    };
    state[collection] = [item, ...(state[collection] || [])];
    return clone(item);
  }

  function patch(collection, id, payload) {
    const items = state[collection] || [];
    const index = items.findIndex((item) => String(item.id).toLowerCase() === String(id).toLowerCase());
    if (index === -1) return null;
    items[index] = { ...items[index], ...payload, updatedAt: new Date().toISOString() };
    return clone(items[index]);
  }

  function reset() {
    state = clone(seed);
    return snapshot();
  }

  function snapshot() {
    return Object.fromEntries(Object.entries(state).map(([key, value]) => [key, value.length]));
  }

  return { create, find, list, patch, reset, snapshot };
}

module.exports = { createStore };
