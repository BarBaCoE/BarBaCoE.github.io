// Bootstrap for Barbacoe data files.
// Loaded as a plain (non-module) script so the page works on file://.
// Subsequent data scripts call BarbacoeData.addCategory(...) and
// BarbacoeData.addResults(categoryId, [...]) to register their content.
(function () {
  const data = {
    categories: [],
    results: [],
    addCategory(cat) {
      if (!cat || typeof cat.id !== "string") {
        console.error("BarbacoeData.addCategory: invalid category", cat);
        return;
      }
      this.categories.push(cat);
    },
    addResults(categoryId, list) {
      if (!Array.isArray(list)) {
        console.error("BarbacoeData.addResults: expected an array for", categoryId);
        return;
      }
      for (const r of list) {
        if (!r || typeof r.name !== "string" || typeof r.timeSeconds !== "number") {
          console.error("BarbacoeData.addResults: skipping invalid entry in", categoryId, r);
          continue;
        }
        this.results.push({
          category: categoryId,
          name: r.name,
          timeSeconds: r.timeSeconds,
          date: typeof r.date === "string" ? r.date : null,
        });
      }
    },
  };
  window.BarbacoeData = data;
})();
