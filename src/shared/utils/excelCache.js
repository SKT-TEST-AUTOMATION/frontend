// 매우 가벼운 in-memory 캐시
export const excelCache = {
  store: {},

  makeKey(file) {
    if (!file) return null;
    return `${file.name}_${file.size}_${file.lastModified}`;
  },

  get(file, sheet) {
    const key = this.makeKey(file);
    if (!key) return null;
    return this.store[key]?.[sheet] ?? null;
  },

  set(file, sheet, aoa) {
    const key = this.makeKey(file);
    if (!key) return;
    if (!this.store[key]) this.store[key] = {};
    this.store[key][sheet] = aoa;
  },

  clear(file) {
    const key = this.makeKey(file);
    if (this.store[key]) delete this.store[key];
  }
};
