class TrademarkSearchApp {
  constructor() {
    this.currentPage = 0;
    this.pageSize = 10;
    this.totalPages = 0;
    this.totalElements = 0;
    this.currentQuery = "";

    this.initializeElements();
    this.attachEventListeners();
  }

  initializeElements() {
    this.searchForm = document.getElementById("searchForm");
    this.searchInput = document.getElementById("searchInput");
    this.searchBtn = document.getElementById("searchBtn");
    this.pageSizeSelect = document.getElementById("pageSize");
    this.spinner = document.getElementById("spinner");

    this.errorMessage = document.getElementById("errorMessage");
    this.resultsSection = document.getElementById("resultsSection");
    this.resultsTitle = document.getElementById("resultsTitle");
    this.resultsCount = document.getElementById("resultsCount");
    this.resultsContainer = document.getElementById("resultsContainer");

    this.prevPageBtn = document.getElementById("prevPage");
    this.nextPageBtn = document.getElementById("nextPage");
    this.pageInfo = document.getElementById("pageInfo");

    this.modal = document.getElementById("modal");
    this.modalContent = document.getElementById("modalContent");
    this.closeModal = document.querySelector(".close");

    // Wildcard search checkboxes
    this.exactMatchCb = document.getElementById("exactMatch");
    this.containsMatchCb = document.getElementById("containsMatch");
    this.startsWithMatchCb = document.getElementById("startsWithMatch");
    this.endsWithMatchCb = document.getElementById("endsWithMatch");
    this.wordBoundaryMatchCb = document.getElementById("wordBoundaryMatch");
    this.spellingVariationsCb = document.getElementById("spellingVariations");
    this.phoneticMatchCb = document.getElementById("phoneticMatch");
    this.pluralMatchCb = document.getElementById("pluralMatch");

    // Similarity controls
    this.similarityControls = document.getElementById("similarityControls");
    this.similaritySlider = document.getElementById("similaritySlider");
    this.sliderValue = document.getElementById("sliderValue");
  }

  attachEventListeners() {
    this.searchForm.addEventListener("submit", (e) => this.handleSearch(e));
    this.pageSizeSelect.addEventListener("change", () =>
      this.handlePageSizeChange()
    );

    this.prevPageBtn.addEventListener("click", () => this.goToPreviousPage());
    this.nextPageBtn.addEventListener("click", () => this.goToNextPage());

    this.closeModal.addEventListener("click", () => this.hideModal());
    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) {
        this.hideModal();
      }
    });

    // Close modal with Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.modal.style.display !== "none") {
        this.hideModal();
      }
    });

    // Phonetic matching and similarity slider
    this.phoneticMatchCb.addEventListener("change", () =>
      this.toggleSimilarityControls()
    );
    this.similaritySlider.addEventListener("input", () =>
      this.updateSliderValue()
    );
  }

  async handleSearch(e) {
    e.preventDefault();

    const query = this.searchInput.value.trim();
    if (!query) {
      this.showError("Please enter a brand name to analyze for protection.");
      return;
    }

    this.currentQuery = query;
    this.currentPage = 0;
    this.pageSize = parseInt(this.pageSizeSelect.value);

    await this.performSearch();
  }

  async handlePageSizeChange() {
    if (this.currentQuery) {
      this.currentPage = 0;
      this.pageSize = parseInt(this.pageSizeSelect.value);
      await this.performSearch();
    }
  }

  async performSearch() {
    this.setLoadingState(true);
    this.hideError();

    try {
      // Generate search patterns based on selected options
      const patterns = this.generateSearchPatterns(this.currentQuery);

      if (patterns.length === 0) {
        throw new Error("Please select at least one search type");
      }

      // Combine patterns with OR operator (comma in RSQL)
      const query = patterns.join(",");

      const params = new URLSearchParams({
        query: query,
        page: this.currentPage,
        size: this.pageSize,
      });

      const response = await fetch(`/api/search?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      this.displayResults(data);
    } catch (error) {
      console.error("Search error:", error);
      this.showError(`Search failed: ${error.message}`);
      this.hideResults();
    } finally {
      this.setLoadingState(false);
    }
  }

  displayResults(data) {
    // Apply similarity filtering if phonetic matching is enabled
    let filteredTrademarks = data.trademarks;
    if (this.phoneticMatchCb.checked) {
      const threshold = parseInt(this.similaritySlider.value);
      filteredTrademarks = this.filterBySimilarity(
        data.trademarks,
        this.currentQuery,
        threshold
      );
    }

    this.totalElements = filteredTrademarks.length;
    this.totalPages = Math.ceil(this.totalElements / this.pageSize);

    this.resultsTitle.textContent = `Brand Protection Analysis: "${this.currentQuery}"`;
    this.resultsCount.textContent = `${this.totalElements} potential conflict${
      this.totalElements !== 1 ? "s" : ""
    } identified${
      this.phoneticMatchCb.checked
        ? ` (filtered by ${this.similaritySlider.value}% similarity threshold)`
        : ""
    }`;

    this.updatePagination();
    this.renderTrademarks(filteredTrademarks);
    this.showResults();
  }

  renderTrademarks(trademarks) {
    if (!trademarks || trademarks.length === 0) {
      this.resultsContainer.innerHTML = `
                <div class="no-results">
                    <h3>🛡️ No Brand Conflicts Detected</h3>
                    <p>Your brand appears to be clear in this analysis. Consider expanding your search criteria or try different variations.</p>
                </div>
            `;
      return;
    }

    this.resultsContainer.innerHTML = trademarks
      .map((trademark) => this.createTrademarkCard(trademark))
      .join("");

    // Add click handlers for trademark cards
    this.resultsContainer
      .querySelectorAll(".trademark-card")
      .forEach((card) => {
        card.addEventListener("click", () => {
          const applicationNumber = card.dataset.applicationNumber;
          this.showTrademarkDetails(applicationNumber);
        });
      });
  }

  createTrademarkCard(trademark) {
    const verbalElement =
      trademark.wordMarkSpecification?.verbalElement || "N/A";
    const applicationDate = trademark.applicationDate
      ? new Date(trademark.applicationDate).toLocaleDateString()
      : "N/A";
    const registrationDate = trademark.registrationDate
      ? new Date(trademark.registrationDate).toLocaleDateString()
      : "N/A";
    const expiryDate = trademark.expiryDate
      ? new Date(trademark.expiryDate).toLocaleDateString()
      : "N/A";
    const status = trademark.status || "UNKNOWN";
    const niceClasses = trademark.niceClasses || [];

    const statusClass = this.getStatusClass(status);
    const applicants =
      trademark.applicants
        ?.map((a) => a.name)
        .filter(Boolean)
        .join(", ") || "N/A";

    // Calculate similarity score if phonetic matching is enabled
    let similarityScore = null;
    if (this.phoneticMatchCb.checked && verbalElement !== "N/A") {
      similarityScore = this.calculateSimilarity(
        this.currentQuery,
        verbalElement
      );
    }

    return `
             <div class="trademark-card" data-application-number="${
               trademark.applicationNumber
             }">
                 ${
                   this.isFigurativeMark(trademark)
                     ? `<div class="trademark-image-container">
                      <img src="/api/trademark/${trademark.applicationNumber}/image/thumbnail" 
                           alt="Trademark ${trademark.applicationNumber}" 
                           class="trademark-thumbnail"
                           onerror="this.style.display='none'; this.parentElement.style.display='none';"
                           loading="lazy">
                      <div class="image-overlay" onclick="event.stopPropagation(); window.trademarkApp.showImageModal('${trademark.applicationNumber}')">
                        <span class="zoom-icon">🔍</span>
                      </div>
                    </div>`
                     : ""
                 }
                 <div class="trademark-header">
                     <h3 class="trademark-name">${this.escapeHtml(
                       verbalElement
                     )}</h3>
                     <div class="header-info">
                       <div class="application-number">#${
                         trademark.applicationNumber
                       }</div>
                       ${
                         similarityScore !== null
                           ? `<div class="similarity-score" title="Similarity to '${this.currentQuery}'">${similarityScore}% match</div>`
                           : ""
                       }
                       <button class="find-threats-btn" onclick="event.stopPropagation(); window.open('https://pro.urlscan.io/result/d48e4171-1c4c-4820-9b58-4771d6111732', '_blank')" title="Analyze potential threats">
                         🔍 Find threats
                       </button>
                     </div>
                 </div>
                
                <div class="trademark-details">
                    <div class="detail-item">
                        <div class="detail-label">Status</div>
                        <div class="detail-value">
                            <span class="status ${statusClass}">${status.replace(
      /_/g,
      " "
    )}</span>
                        </div>
                    </div>
                    
                    <div class="detail-item">
                        <div class="detail-label">Mark Feature</div>
                        <div class="detail-value">${
                          trademark.markFeature || "N/A"
                        }</div>
                    </div>
                    
                    <div class="detail-item">
                        <div class="detail-label">Application Date</div>
                        <div class="detail-value">${applicationDate}</div>
                    </div>
                    
                    <div class="detail-item">
                        <div class="detail-label">Registration Date</div>
                        <div class="detail-value">${registrationDate}</div>
                    </div>
                    
                    <div class="detail-item">
                        <div class="detail-label">Expiry Date</div>
                        <div class="detail-value">${expiryDate}</div>
                    </div>
                    
                    <div class="detail-item">
                        <div class="detail-label">Applicant(s)</div>
                        <div class="detail-value">${this.escapeHtml(
                          applicants
                        )}</div>
                    </div>
                </div>
                
                ${
                  niceClasses.length > 0
                    ? `
                    <div class="nice-classes">
                        ${niceClasses
                          .map(
                            (cls) =>
                              `<span class="nice-class">Class ${cls}</span>`
                          )
                          .join("")}
                    </div>
                `
                    : ""
                }
            </div>
        `;
  }

  getStatusClass(status) {
    const statusLower = status.toLowerCase();
    if (statusLower.includes("registered")) return "registered";
    if (statusLower.includes("refused") || statusLower.includes("cancelled"))
      return "refused";
    return "pending";
  }

  async showTrademarkDetails(applicationNumber) {
    this.showModal();
    this.modalContent.innerHTML =
      '<div class="loading-placeholder">Loading trademark details...</div>';

    try {
      const response = await fetch(`/api/trademark/${applicationNumber}`);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch trademark details: ${response.statusText}`
        );
      }

      const trademark = await response.json();
      this.renderTrademarkDetails(trademark);
    } catch (error) {
      console.error("Error fetching trademark details:", error);
      this.modalContent.innerHTML = `
                <div class="error-message">
                    <h3>Error Loading Details</h3>
                    <p>${error.message}</p>
                </div>
            `;
    }
  }

  renderTrademarkDetails(trademark) {
    const verbalElement =
      trademark.wordMarkSpecification?.verbalElement || "N/A";
    const description = trademark.description || [];
    const goodsAndServices = trademark.goodsAndServices || [];

    let descriptionHtml = "";
    if (description.length > 0) {
      descriptionHtml = description
        .map(
          (desc) =>
            `<p><strong>${desc.language.toUpperCase()}:</strong> ${this.escapeHtml(
              desc.text
            )}</p>`
        )
        .join("");
    }

    let goodsServicesHtml = "";
    if (goodsAndServices.length > 0) {
      goodsServicesHtml = goodsAndServices
        .map(
          (gs) => `
                <div class="goods-services-class">
                    <h4>Class ${gs.classNumber}</h4>
                    ${gs.description
                      .map(
                        (desc) => `
                        <div class="class-description">
                            <strong>${desc.language.toUpperCase()}:</strong>
                            <ul>
                                ${desc.terms
                                  .map(
                                    (term) =>
                                      `<li>${this.escapeHtml(term)}</li>`
                                  )
                                  .join("")}
                            </ul>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            `
        )
        .join("");
    }

    this.modalContent.innerHTML = `
            <h2>${this.escapeHtml(verbalElement)}</h2>
            <p class="application-number">Application Number: ${
              trademark.applicationNumber
            }</p>
            
            <div class="trademark-details">
                <div class="detail-item">
                    <div class="detail-label">Status</div>
                    <div class="detail-value">
                        <span class="status ${this.getStatusClass(
                          trademark.status
                        )}">${trademark.status.replace(/_/g, " ")}</span>
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">Mark Feature</div>
                    <div class="detail-value">${
                      trademark.markFeature || "N/A"
                    }</div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">Mark Kind</div>
                    <div class="detail-value">${
                      trademark.markKind || "N/A"
                    }</div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">Application Date</div>
                    <div class="detail-value">${
                      trademark.applicationDate
                        ? new Date(
                            trademark.applicationDate
                          ).toLocaleDateString()
                        : "N/A"
                    }</div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">Registration Date</div>
                    <div class="detail-value">${
                      trademark.registrationDate
                        ? new Date(
                            trademark.registrationDate
                          ).toLocaleDateString()
                        : "N/A"
                    }</div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">Expiry Date</div>
                    <div class="detail-value">${
                      trademark.expiryDate
                        ? new Date(trademark.expiryDate).toLocaleDateString()
                        : "N/A"
                    }</div>
                </div>
            </div>
            
            ${
              descriptionHtml
                ? `
                <div class="section">
                    <h3>Description</h3>
                    ${descriptionHtml}
                </div>
            `
                : ""
            }
            
            ${
              goodsServicesHtml
                ? `
                <div class="section">
                    <h3>Goods and Services</h3>
                    ${goodsServicesHtml}
                </div>
            `
                : ""
            }
        `;
  }

  updatePagination() {
    this.pageInfo.textContent = `Page ${this.currentPage + 1} of ${Math.max(
      1,
      this.totalPages
    )}`;
    this.prevPageBtn.disabled = this.currentPage <= 0;
    this.nextPageBtn.disabled = this.currentPage >= this.totalPages - 1;
  }

  async goToPreviousPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      await this.performSearch();
    }
  }

  async goToNextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      await this.performSearch();
    }
  }

  setLoadingState(loading) {
    this.searchBtn.disabled = loading;
    this.searchBtn.classList.toggle("loading", loading);
  }

  showError(message) {
    this.errorMessage.textContent = message;
    this.errorMessage.style.display = "block";
  }

  hideError() {
    this.errorMessage.style.display = "none";
  }

  showResults() {
    this.resultsSection.style.display = "block";
  }

  hideResults() {
    this.resultsSection.style.display = "none";
  }

  showModal() {
    this.modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  hideModal() {
    this.modal.style.display = "none";
    document.body.style.overflow = "auto";
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Check if trademark is figurative (has images)
  isFigurativeMark(trademark) {
    return (
      trademark.markFeature &&
      (trademark.markFeature === "FIGURATIVE" ||
        trademark.markFeature === "SHAPE_3D" ||
        trademark.markFeature === "COLOUR" ||
        trademark.markFeature === "HOLOGRAM" ||
        trademark.markFeature === "POSITION" ||
        trademark.markFeature === "PATTERN" ||
        trademark.markFeature === "MOTION" ||
        trademark.markFeature === "MULTIMEDIA")
    );
  }

  // Show image in modal
  showImageModal(applicationNumber) {
    this.showModal();
    this.modalContent.innerHTML = `
       <div class="image-modal-content">
         <h2>Trademark Image - #${applicationNumber}</h2>
         <div class="image-loading">Loading full-size image...</div>
         <img src="/api/trademark/${applicationNumber}/image" 
              alt="Trademark ${applicationNumber} - Full Size" 
              class="trademark-full-image"
              onload="this.previousElementSibling.style.display='none'"
              onerror="this.previousElementSibling.textContent='Image could not be loaded'; this.style.display='none';">
       </div>
     `;
  }

  // Similarity control methods
  toggleSimilarityControls() {
    this.similarityControls.style.display = this.phoneticMatchCb.checked
      ? "block"
      : "none";
  }

  updateSliderValue() {
    const value = this.similaritySlider.value;
    this.sliderValue.textContent = `${value}%`;
  }

  // Levenshtein distance algorithm
  calculateLevenshteinDistance(str1, str2) {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    // Create matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1, // deletion
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j - 1] + 1 // substitution
          );
        }
      }
    }

    return matrix[len1][len2];
  }

  // Calculate similarity percentage
  calculateSimilarity(str1, str2) {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 100;

    const distance = this.calculateLevenshteinDistance(
      str1.toLowerCase(),
      str2.toLowerCase()
    );
    return Math.round(((maxLength - distance) / maxLength) * 100);
  }

  // Filter results by similarity threshold
  filterBySimilarity(results, searchTerm, threshold) {
    if (!this.phoneticMatchCb.checked || !results || results.length === 0) {
      return results;
    }

    return results
      .filter((trademark) => {
        const verbalElement =
          trademark.wordMarkSpecification?.verbalElement || "";
        const similarity = this.calculateSimilarity(searchTerm, verbalElement);
        return similarity >= threshold;
      })
      .sort((a, b) => {
        // Sort by similarity (highest first)
        const simA = this.calculateSimilarity(
          searchTerm,
          a.wordMarkSpecification?.verbalElement || ""
        );
        const simB = this.calculateSimilarity(
          searchTerm,
          b.wordMarkSpecification?.verbalElement || ""
        );
        return simB - simA;
      });
  }

  // Wildcard generation methods
  generateSearchPatterns(name) {
    const patterns = [];
    const cleanName = name.trim().toLowerCase();

    // Exact match
    if (this.exactMatchCb.checked) {
      patterns.push(`wordMarkSpecification.verbalElement==${cleanName}`);
    }

    // Contains match (*name*)
    if (this.containsMatchCb.checked) {
      patterns.push(`wordMarkSpecification.verbalElement==*${cleanName}*`);
    }

    // Starts with (name*)
    if (this.startsWithMatchCb.checked) {
      patterns.push(`wordMarkSpecification.verbalElement==${cleanName}*`);
    }

    // Ends with (*name)
    if (this.endsWithMatchCb.checked) {
      patterns.push(`wordMarkSpecification.verbalElement==*${cleanName}`);
    }

    // Word boundary matching
    if (this.wordBoundaryMatchCb.checked) {
      patterns.push(`wordMarkSpecification.verbalElement==* ${cleanName} *`);
      patterns.push(`wordMarkSpecification.verbalElement==${cleanName} *`);
      patterns.push(`wordMarkSpecification.verbalElement==* ${cleanName}`);
    }

    // Spelling variations
    if (this.spellingVariationsCb.checked) {
      const variations = this.generateSpellingVariations(cleanName);
      variations.forEach((variation) => {
        patterns.push(`wordMarkSpecification.verbalElement==*${variation}*`);
      });
    }

    // Phonetic matching
    if (this.phoneticMatchCb.checked) {
      const phoneticVariations = this.generatePhoneticVariations(cleanName);
      phoneticVariations.forEach((variation) => {
        patterns.push(`wordMarkSpecification.verbalElement==*${variation}*`);
      });
    }

    // Plural/Singular variations
    if (this.pluralMatchCb.checked) {
      const pluralVariations = this.generatePluralVariations(cleanName);
      pluralVariations.forEach((variation) => {
        patterns.push(`wordMarkSpecification.verbalElement==*${variation}*`);
      });
    }

    return patterns;
  }

  generateSpellingVariations(name) {
    const variations = new Set();

    // Common letter substitutions
    const substitutions = {
      i: ["y", "e"],
      y: ["i", "e"],
      c: ["k", "ck"],
      k: ["c", "ck"],
      f: ["ph"],
      ph: ["f"],
      s: ["z"],
      z: ["s"],
      er: ["or", "ar"],
      or: ["er", "ar"],
      ar: ["er", "or"],
    };

    // Generate single character substitutions
    for (let i = 0; i < name.length; i++) {
      const char = name[i];
      const subs = substitutions[char];
      if (subs) {
        subs.forEach((sub) => {
          variations.add(name.substring(0, i) + sub + name.substring(i + 1));
        });
      }
    }

    // Common double letter variations
    for (let i = 0; i < name.length - 1; i++) {
      if (name[i] === name[i + 1]) {
        // Remove double letter
        variations.add(name.substring(0, i) + name.substring(i + 1));
      } else {
        // Add double letter
        variations.add(
          name.substring(0, i + 1) + name[i] + name.substring(i + 1)
        );
      }
    }

    return Array.from(variations);
  }

  generatePhoneticVariations(name) {
    const variations = new Set();

    // Common phonetic substitutions
    const phoneticSubs = {
      f: ["ph"],
      ph: ["f"],
      c: ["k", "s"],
      k: ["c"],
      x: ["ks", "z"],
      ks: ["x"],
      j: ["g"],
      g: ["j"],
      th: ["t"],
      t: ["th"],
    };

    // Apply phonetic substitutions
    Object.entries(phoneticSubs).forEach(([from, tos]) => {
      if (name.includes(from)) {
        tos.forEach((to) => {
          variations.add(name.replace(new RegExp(from, "g"), to));
        });
      }
    });

    return Array.from(variations);
  }

  generatePluralVariations(name) {
    const variations = new Set();

    // Add plural forms
    if (!name.endsWith("s")) {
      variations.add(name + "s");
      if (name.endsWith("y")) {
        variations.add(name.slice(0, -1) + "ies");
      }
      if (
        name.endsWith("ch") ||
        name.endsWith("sh") ||
        name.endsWith("x") ||
        name.endsWith("z")
      ) {
        variations.add(name + "es");
      }
    }

    // Remove plural forms (if input appears to be plural)
    if (name.endsWith("s") && name.length > 2) {
      variations.add(name.slice(0, -1));
    }
    if (name.endsWith("ies") && name.length > 4) {
      variations.add(name.slice(0, -3) + "y");
    }
    if (name.endsWith("es") && name.length > 3) {
      variations.add(name.slice(0, -2));
    }

    // Common prefix/suffix variations
    const prefixes = ["the", "a", "an"];
    const suffixes = ["co", "corp", "inc", "ltd", "llc", "company"];

    prefixes.forEach((prefix) => {
      variations.add(`${prefix} ${name}`);
      if (name.startsWith(`${prefix} `)) {
        variations.add(name.substring(prefix.length + 1));
      }
    });

    suffixes.forEach((suffix) => {
      variations.add(`${name} ${suffix}`);
      if (name.endsWith(` ${suffix}`)) {
        variations.add(name.substring(0, name.length - suffix.length - 1));
      }
    });

    return Array.from(variations);
  }
}

// Initialize the application when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.trademarkApp = new TrademarkSearchApp();
});
