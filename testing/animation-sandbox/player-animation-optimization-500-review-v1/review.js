(function () {
  "use strict";

  const CONFIG_URL = "../../../values/playerAnimationOptimization500Review.json";
  const CATALOG_URL = "./generated/player-animation-optimization-points-500.json";
  const METRICS_URL = "./generated/player-animation-optimization-500-metrics.json";

  async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json();
  }

  function assertReview(config, catalog, metrics) {
    if (!config.reviewOnly || config.productionChanged) {
      throw new Error("Review isolation contract failed");
    }
    if (catalog.pointCount !== 500 || catalog.points.length !== 500) {
      throw new Error(`Expected 500 optimization points, found ${catalog.points.length}`);
    }
    if (catalog.familyCount !== 20 || catalog.lensCount !== 25) {
      throw new Error("Expected the complete 20 × 25 matrix");
    }
    if (metrics.scenarioCount !== 3) {
      throw new Error("Expected three synchronized comparison scenarios");
    }
  }

  function showError(error) {
    const container = document.querySelector("#comparison-list");
    container.innerHTML = `
      <div class="loading-card">
        Review build could not load: ${String(error.message || error)}
      </div>`;
    document.documentElement.dataset.reviewReady = "error";
  }

  async function boot() {
    try {
      const [config, catalog, metrics] = await Promise.all([
        fetchJson(CONFIG_URL),
        fetchJson(CATALOG_URL),
        fetchJson(METRICS_URL)
      ]);
      assertReview(config, catalog, metrics);
      const approvals = window.AnimationComparisons.render(
        document.querySelector("#comparison-list"),
        config.scenarios,
        metrics
      );
      window.AnimationCatalog.init(catalog, config);
      document.querySelector("#hotspot-count").textContent =
        catalog.verifiedHotspotCount.toLocaleString();

      const harness = {
        ready: true,
        reviewOnly: true,
        productionChanged: false,
        pointCount: catalog.pointCount,
        familyCount: catalog.familyCount,
        lensCount: catalog.lensCount,
        scenarioCount: config.scenarios.length,
        approvedIds: [...approvals],
        visiblePointCount: window.AnimationCatalog.getVisibleCount(),
        getSnapshot() {
          return {
            ready: this.ready,
            reviewOnly: this.reviewOnly,
            productionChanged: this.productionChanged,
            pointCount: this.pointCount,
            familyCount: this.familyCount,
            lensCount: this.lensCount,
            scenarioCount: this.scenarioCount,
            approvedIds: [...this.approvedIds],
            visiblePointCount: this.visiblePointCount
          };
        }
      };
      window.__PLAYER_ANIMATION_OPTIMIZATION_500_REVIEW__ = harness;
      window.addEventListener("animation-review-approvals", (event) => {
        harness.approvedIds = [...event.detail.approvedIds];
      });
      window.addEventListener("animation-review-catalog", (event) => {
        harness.visiblePointCount = event.detail.visiblePointCount;
      });
      document.documentElement.dataset.reviewReady = "true";
    } catch (error) {
      console.error(error);
      showError(error);
    }
  }

  boot();
}());
