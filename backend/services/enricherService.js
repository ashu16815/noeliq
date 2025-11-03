// Enricher Service
// Adds safe, generic review sentiment to enrich responses with expert-level knowledge

const enricherService = {
  /**
   * Get generic review hints for a product category/SKU
   * Returns safe, compliant templates that add expert-level context
   */
  genericReviewHints(activeSku, category, productRecord = null, relevantChunks = []) {
    // Infer category if not provided
    let inferredCategory = category

    if (!inferredCategory && productRecord) {
      if (productRecord.category) {
        inferredCategory = productRecord.category.toLowerCase()
      } else if (productRecord.name) {
        const name = productRecord.name.toLowerCase()
        if (name.includes('tv') || name.includes('television')) {
          inferredCategory = 'tv'
        } else if (name.includes('laptop') || name.includes('notebook')) {
          inferredCategory = 'laptop'
        } else if (name.includes('phone') || name.includes('smartphone')) {
          inferredCategory = 'phone'
        } else if (name.includes('tablet')) {
          inferredCategory = 'tablet'
        } else if (name.includes('headphone') || name.includes('earbud')) {
          inferredCategory = 'audio'
        }
      }
    }

    // Also check chunks for category indicators
    if (!inferredCategory && relevantChunks.length > 0) {
      const combinedText = relevantChunks.map(c => c.section_body || '').join(' ').toLowerCase()
      if (combinedText.includes('television') || combinedText.includes('tv ') || combinedText.includes('display')) {
        inferredCategory = 'tv'
      } else if (combinedText.includes('laptop') || combinedText.includes('notebook')) {
        inferredCategory = 'laptop'
      } else if (combinedText.includes('smartphone') || combinedText.includes('mobile phone')) {
        inferredCategory = 'phone'
      }
    }

    // Enhanced category-based review templates (safe, compliant)
    const reviewTemplates = {
      tv: "Reviewers often mention: OLED TVs typically excel at movie blacks and infinite contrast, while LCD/LED models can get brighter in sunlit rooms. Gaming buyers commonly note that 120Hz and HDMI 2.1 are important for PS5/XSX compatibility. Some reviewers highlight that larger models may need wider stand space.",
      laptop: "Buyers commonly note: good performance for everyday tasks, comfortable keyboard and trackpad, and decent battery life for portable use. Some reviewers mention that display brightness can vary, and fan noise may be noticeable under heavy workloads. Many customers appreciate the build quality and portability.",
      phone: "Reviewers typically highlight: phones under $1,000 typically run social apps smoothly; storage (128GB+) and battery life are common priorities. Many buyers note excellent camera quality for photos and videos, and smooth performance for multitasking. Some mention that screen size preferences vary.",
      tablet: "Reviewers often mention: great display for media consumption and reading, smooth performance for apps, and good battery life for all-day use. Some note that larger models can be heavy for extended holding, and accessories like keyboards are often recommended for productivity.",
      audio: "Buyers commonly note: clear sound quality with good bass response, comfortable fit for extended wear, and effective noise cancellation. Some reviewers mention that battery life can vary with usage patterns, and connectivity may occasionally drop in crowded areas.",
    }

    // Default generic template
    const defaultTemplate = "Reviewers typically highlight positive aspects of product quality and performance, with some noting practical considerations like size, weight, or setup requirements. Many buyers appreciate the overall value and features offered."

    // Check for specific features/price ranges that modify the template
    if (productRecord?.name || relevantChunks.length > 0) {
      const name = (productRecord?.name || '').toLowerCase()
      const combinedText = relevantChunks.map(c => c.section_body || '').join(' ').toLowerCase()

      // Gaming products
      if (name.includes('gaming') || combinedText.includes('gaming')) {
        return "Reviewers often mention: gaming-focused products typically prioritize performance with high refresh rates and low input lag. Buyers commonly note that gaming models excel at immersive experiences but may prioritize performance over battery life."
      }

      // OLED TVs
      if (name.includes('oled') || combinedText.includes('oled')) {
        return "Reviewers typically highlight: OLED displays offer exceptional picture quality with perfect blacks and infinite contrast, vibrant colors, and excellent viewing angles. Some buyers note that OLED can be susceptible to burn-in with static content over very long periods, though this is rare with normal use."
      }

      // QLED TVs
      if (name.includes('qled') || combinedText.includes('qled')) {
        return "Buyers commonly note: QLED displays offer excellent brightness and color volume, great for well-lit rooms, with good color accuracy. Some reviewers mention that black levels may not be as deep as OLED in dark rooms, but brightness excels in daylight viewing."
      }

      // Phones under $1,000
      if (inferredCategory === 'phone') {
        const price = parseFloat(productRecord?.list_price || productRecord?.current_price || 0)
        if (price > 0 && price < 1000) {
          return "Reviewers typically highlight: phones under $1,000 typically run social apps smoothly; storage (128GB+) and battery life are common priorities. Many buyers appreciate the good value proposition and reliable performance for daily use."
        }
      }
    }

    // Return category-specific template if available
    if (inferredCategory && reviewTemplates[inferredCategory]) {
      return reviewTemplates[inferredCategory]
    }

    return defaultTemplate
  },

  /**
   * Get review hints based on use case
   */
  getReviewHintsByUseCase(useCase, category) {
    const useCaseHints = {
      gaming: "Gaming buyers often look for 120Hz refresh rates and HDMI 2.1 support for PS5/XSX compatibility. Reviewers commonly note that low input lag and high refresh rates are priorities for smooth gameplay.",
      'work from home': "Buyers working from home commonly prioritize good video call quality, comfortable ergonomics, and reliable performance for productivity apps. Reviewers often mention battery life and display quality as important factors.",
      streaming: "Reviewers typically highlight that streaming buyers value good display quality, reliable Wi-Fi connectivity, and smooth app performance. Many note that 4K/HDR support enhances streaming experiences.",
      movies: "Buyers focused on movies commonly prioritize display quality, especially deep blacks and good contrast. Reviewers often mention that OLED displays excel for movie viewing in dark rooms.",
      sports: "Sports viewers typically look for smooth motion handling and good brightness. Reviewers commonly note that high refresh rates and good upscaling improve sports viewing experiences.",
    }

    return useCaseHints[useCase] || null
  },
}

export default enricherService

