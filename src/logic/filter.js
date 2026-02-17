function toLower(value) {
  return String(value || "").toLowerCase();
}

function includesValue(collection, value) {
  const needle = toLower(value);
  if (!needle) {
    return true;
  }
  return collection.some((item) => toLower(item).includes(needle));
}

export function filterStrains(strains, filters = {}) {
  const search = toLower(filters.search).trim();
  const manufacturer = toLower(filters.manufacturer).trim();
  const effect = toLower(filters.effect).trim();
  const medical = toLower(filters.medical).trim();

  return strains.filter((strain) => {
    const effects = Array.isArray(strain.effects) ? strain.effects : [];
    const medicalApplications = Array.isArray(strain.medicalApplications) ? strain.medicalApplications : [];
    const matchesSearch = !search || toLower(strain.name).includes(search);
    const matchesManufacturer = !manufacturer || toLower(strain.manufacturer) === manufacturer;
    const matchesEffect = !effect || includesValue(effects, effect);
    const matchesMedical = !medical || includesValue(medicalApplications, medical);

    return matchesSearch && matchesManufacturer && matchesEffect && matchesMedical;
  });
}

export function uniqueValues(strains, field) {
  const values = new Set();
  strains.forEach((strain) => {
    const value = strain[field];
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry) {
          values.add(String(entry).trim());
        }
      });
      return;
    }
    if (value) {
      values.add(String(value).trim());
    }
  });
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}
