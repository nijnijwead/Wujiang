(() => {
  let cards = [];
  let realCards = [];
  let sceneryCards = [];
  let sceneryRealCards = [];
  const detail = document.querySelector('[data-detail]');
  const detailFrame = document.querySelector('[data-detail-frame]');
  const detailImage = document.querySelector('[data-detail-image]');
  const detailTitle = document.querySelector('[data-detail-title]');
  const detailNumber = document.querySelector('[data-detail-number]');
  const detailTotal = document.querySelector('[data-detail-total]');
  const detailNamePrimary = document.querySelector('.detail-portrait-name-primary');
  const storyCopy = document.querySelector('[data-story-copy]');
  const storyCopyInner = document.querySelector('[data-story-copy-inner]');
  const storyGallery = document.querySelector('[data-story-gallery]');
  const galleryList = document.querySelector('[data-gallery-list]');
  const galleryEmpty = document.querySelector('[data-gallery-empty]');
  const closeButton = document.querySelector('[data-close]');
  const languageButton = document.querySelector('[data-language-toggle]');
  const aboutOpen = document.querySelector('[data-about-open]');
  const aboutDialog = document.querySelector('[data-about-dialog]');
  const aboutDialogClose = document.querySelector('[data-about-close]');
  const aboutDialogBody = document.querySelector('[data-about-dialog] [data-about-body]');
  const aboutSource = document.querySelector('[data-about] .about-copy');
  const aboutDialogCopy = document.querySelector('[data-about-dialog-copy]');
  const homeElements = [...document.querySelectorAll('[data-home]')];
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduceMotion = motionPreference.matches;
  const syncMotionPreference = (event) => {
    reduceMotion = event.matches;
  };
  if (typeof motionPreference.addEventListener === 'function') {
    motionPreference.addEventListener('change', syncMotionPreference);
  } else {
    motionPreference.addListener?.(syncMotionPreference);
  }
  const photoSets = window.WUJIANG_WALL || {};
  const sceneryPhotoSets = window.WUJIANG_SCENERY_WALL || {};
  const portraitStories = window.WUJIANG_STORIES || {};
  const sceneryStories = window.WUJIANG_SCENERY_STORIES || {};

  const languageStorageKey = 'wujiang-language';
  const storyDelay = 3000;
  let language = 'en';
  let activeCard = null;
  let activeClone = null;
  let activeAnimation = null;
  let storyTimer = 0;
  let storyTransitionTimer = 0;
  let storyTransitionId = 0;
  let storyTransitionCleanup = null;

  const pad = (value) => String(value).padStart(2, '0');
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  const portraitName = (card) => (language === 'zh' ? (card.dataset.nameZh || '') : (card.dataset.nameEn || ''));
  const portraitWall = (card, index) => photoSets[card?.dataset.wall || pad(index)] || [];
  const portraitAlt = (card) => {
    const number = pad(card.dataset.portrait);
    const name = portraitName(card);
    return language === 'zh' ? `肖像 ${number}，${name}` : `Portrait ${number}, ${name}`;
  };
  const renderName = (primaryElement, card) => {
    if (primaryElement) primaryElement.textContent = portraitName(card);
  };
  const updateDetailName = (portraitNumber) => {
    const card = realCards.find((item) => Number(item.dataset.portrait) === Number(portraitNumber));
    if (!card) return;
    if (detail) detail.dataset.portrait = String(Number(portraitNumber));
    renderName(detailNamePrimary, card);
    if (detailTitle) detailTitle.textContent = portraitName(card);
    if (detailFrame) {
      const name = portraitName(card);
      detailFrame.setAttribute('aria-label', language === 'zh' ? `显示${name}的肖像文本` : `Show portrait text for ${name}`);
    }
  };
  const updateStoryLabels = (isScenery) => {
    const isZh = language === 'zh';
    if (storyCopy) {
      storyCopy.setAttribute('aria-label', isScenery
        ? (isZh ? '风景文本' : 'Scenery text')
        : (isZh ? '肖像文本' : 'Portrait text'));
    }
    const storyRegion = detail?.querySelector('[data-story]');
    if (storyRegion) {
      storyRegion.setAttribute('aria-label', isScenery
        ? (isZh ? '风景故事' : 'Scenery story')
        : (isZh ? '肖像故事' : 'Portrait story'));
    }
  };
  const storyPlaceholder = () => (language === 'zh' ? '文本待补充。' : 'Text forthcoming.');
  const readStoredLanguage = () => {
    try {
      return localStorage.getItem(languageStorageKey) === 'zh' ? 'zh' : 'en';
    } catch {
      return 'en';
    }
  };

  const initRippleRail = (root) => {
    if (!root) return { cards: [], realCards: [] };

    const rail = root.querySelector('[data-rail]');
    const track = root.querySelector('.portrait-track');
    const realCards = [...root.querySelectorAll('.portrait-card:not([data-clone])')];
    const realCount = realCards.length;

    if (track && realCount > 1) {
      const makeClone = (card) => {
        const clone = card.cloneNode(true);
        clone.dataset.clone = 'true';
        clone.tabIndex = -1;
        clone.setAttribute('aria-hidden', 'true');
        return clone;
      };

      track.prepend(...realCards.map(makeClone));
      track.append(...realCards.map(makeClone));
    }

    const cards = [...root.querySelectorAll('.portrait-card')];
    const currentLabel = root.querySelector('[data-current]');
    const progress = root.querySelector('[data-progress]');
    const prevButton = root.querySelector('[data-prev]');
    const nextButton = root.querySelector('[data-next]');
    let scrollFrame = 0;
    let depthFrame = 0;
    let loopTimer = 0;
    let isDragging = false;
    const depthStates = cards.map(() => ({ scale: 1, blur: 0, opacity: 1 }));
    const depthTargets = cards.map(() => ({ scale: 1, blur: 0, opacity: 1 }));

    const getCardStep = () => {
      if (cards.length < 2) return 0;
      return cards[1].offsetLeft - cards[0].offsetLeft;
    };

    const getSetWidth = () => getCardStep() * realCount;

    const getActiveCard = () => {
      if (!rail || !cards.length) return cards[0];
      const railRect = rail.getBoundingClientRect();
      const railCenter = railRect.left + railRect.width / 2;
      let nearestCard = cards[0];
      let nearestDistance = Infinity;

      cards.forEach((card) => {
        const cardRect = card.getBoundingClientRect();
        const distance = Math.abs(cardRect.left + cardRect.width / 2 - railCenter);
        if (distance < nearestDistance) {
          nearestCard = card;
          nearestDistance = distance;
        }
      });

      return nearestCard;
    };

    const getActiveNumber = () => {
      if (!cards.length || !realCount) return 1;
      const index = cards.indexOf(getActiveCard());
      return index >= 0 ? (index % realCount) + 1 : 1;
    };

    const renderCardDepth = () => {
      cards.forEach((card, index) => {
        const state = depthStates[index];
        card.style.setProperty('--card-scale', state.scale.toFixed(4));
        card.style.setProperty('--card-blur', `${state.blur.toFixed(2)}px`);
        card.style.setProperty('--card-opacity', state.opacity.toFixed(3));
      });
    };

    const animateCardDepth = () => {
      depthFrame = 0;
      let moving = false;
      const easing = reduceMotion ? 1 : 0.18;

      cards.forEach((card, index) => {
        const state = depthStates[index];
        const target = depthTargets[index];
        state.scale += (target.scale - state.scale) * easing;
        state.blur += (target.blur - state.blur) * easing;
        state.opacity += (target.opacity - state.opacity) * easing;

        if (
          Math.abs(target.scale - state.scale) > 0.0002 ||
          Math.abs(target.blur - state.blur) > 0.004 ||
          Math.abs(target.opacity - state.opacity) > 0.0002
        ) {
          moving = true;
        }

        card.style.setProperty('--card-scale', state.scale.toFixed(4));
        card.style.setProperty('--card-blur', `${state.blur.toFixed(2)}px`);
        card.style.setProperty('--card-opacity', state.opacity.toFixed(3));
      });

      if (moving) depthFrame = requestAnimationFrame(animateCardDepth);
    };

    const updateCardDepth = () => {
      if (!rail || !cards.length) return;
      const railRect = rail.getBoundingClientRect();
      const railCenter = railRect.left + railRect.width / 2;
      const cardWidth = cards[0].offsetWidth || 1;
      const falloff = Math.max(cardWidth * 1.05, 180);
      const maxBlur = window.matchMedia('(max-width: 700px)').matches ? 1.5 : 2.4;

      cards.forEach((card, index) => {
        const cardRect = card.getBoundingClientRect();
        const cardCenter = cardRect.left + cardRect.width / 2;
        const distance = Math.min(Math.abs(cardCenter - railCenter) / falloff, 1);
        const eased = distance * distance * (3 - 2 * distance);
        const scale = 1.2 - 0.3 * eased;
        const blur = maxBlur * eased;
        const opacity = 1 - 0.2 * eased;

        depthTargets[index].scale = scale;
        depthTargets[index].blur = blur;
        depthTargets[index].opacity = opacity;
        card.style.zIndex = String(10 - Math.round(eased * 5));
      });

      if (reduceMotion) {
        cards.forEach((_, index) => {
          depthStates[index] = { ...depthTargets[index] };
        });
        renderCardDepth();
        return;
      }

      if (!depthFrame) depthFrame = requestAnimationFrame(animateCardDepth);
    };

    const updateRail = () => {
      if (!rail || !currentLabel || !progress) return;
      const activeNumber = getActiveNumber();
      currentLabel.textContent = pad(activeNumber);
      progress.style.width = `${(activeNumber / realCount) * 100}%`;
      updateCardDepth();
    };

    const snapDepthToTargets = () => {
      if (depthFrame) {
        cancelAnimationFrame(depthFrame);
        depthFrame = 0;
      }
      cards.forEach((_, index) => {
        depthStates[index] = { ...depthTargets[index] };
      });
      renderCardDepth();
    };

    const normalizeLoop = () => {
      if (!rail || realCount < 2 || isDragging) return;
      const setWidth = getSetWidth();
      if (!setWidth) return;

      let shifted = false;
      if (rail.scrollLeft < setWidth) {
        rail.scrollLeft += setWidth;
        shifted = true;
      } else if (rail.scrollLeft > setWidth * 2) {
        rail.scrollLeft -= setWidth;
        shifted = true;
      }

      if (!shifted) return;
      updateRail();
      snapDepthToTargets();
    };

    const scheduleLoopNormalize = () => {
      window.clearTimeout(loopTimer);
      loopTimer = window.setTimeout(normalizeLoop, 160);
    };

    const scrollRail = (direction) => {
      rail?.scrollBy({
        left: getCardStep() * direction,
        behavior: reduceMotion ? 'auto' : 'smooth'
      });
    };

    rail?.addEventListener('scroll', () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => {
        updateRail();
        scrollFrame = 0;
      });
      scheduleLoopNormalize();
    }, { passive: true });

    rail?.addEventListener('scrollend', normalizeLoop);

    if (rail && realCount > 1) {
      rail.scrollLeft = getSetWidth();
    }

    updateRail();
    window.addEventListener('resize', updateRail);

    const centerInitialCard = () => {
      if (!rail || !realCards.length) return;
      const railRect = rail.getBoundingClientRect();
      const railCenter = railRect.left + railRect.width / 2;
      const firstRect = realCards[0].getBoundingClientRect();
      rail.scrollLeft += firstRect.left + firstRect.width / 2 - railCenter;
      updateRail();
    };

    requestAnimationFrame(centerInitialCard);

    prevButton?.addEventListener('click', () => scrollRail(-1));
    nextButton?.addEventListener('click', () => scrollRail(1));

    if (rail) {
      let pointerDown = false;
      let startX = 0;
      let startScroll = 0;
      let moved = false;
      let suppressClick = false;

      rail.addEventListener('pointerdown', (event) => {
        if (event.pointerType !== 'mouse' || event.button !== 0) return;
        pointerDown = true;
        isDragging = true;
        moved = false;
        startX = event.clientX;
        startScroll = rail.scrollLeft;
      });

      rail.addEventListener('pointermove', (event) => {
        if (!pointerDown) return;
        const distance = event.clientX - startX;
        if (Math.abs(distance) > 6) {
          if (!moved) rail.classList.add('is-dragging');
          moved = true;
          rail.setPointerCapture?.(event.pointerId);
          rail.scrollLeft = startScroll - distance;
        }
      });

      const endDrag = () => {
        if (!pointerDown) return;
        pointerDown = false;
        isDragging = false;
        rail.classList.remove('is-dragging');
        scheduleLoopNormalize();
        if (moved) {
          suppressClick = true;
          window.setTimeout(() => {
            suppressClick = false;
          }, 80);
        }
      };

      rail.addEventListener('pointerup', endDrag);
      rail.addEventListener('pointercancel', endDrag);
      rail.addEventListener('pointerleave', endDrag);

      rail.addEventListener('click', (event) => {
        if (!suppressClick) return;
        event.preventDefault();
        event.stopPropagation();
      }, true);

      rail.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          scrollRail(-1);
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          scrollRail(1);
        }
      });

      /* A vertical wheel over a pinned rail must scroll the page. Taking it
         over to move the rail sideways made the portrait section a dead end:
         the rail fills the screen, so every upward or downward gesture was
         swallowed and the page could not be left at all. The rail still moves
         by horizontal trackpad gesture (natively), drag, or the arrow keys. */
    }

    return { rail, cards, realCards };
  };

  const portraitRailController = initRippleRail(document.querySelector('[data-rail-root="portrait"]'));
  cards = portraitRailController.cards;
  realCards = portraitRailController.realCards;
  const sceneryRailController = initRippleRail(document.querySelector('[data-rail-root="scenery"]'));
  sceneryCards = sceneryRailController.cards;
  sceneryRealCards = sceneryRailController.realCards;

  const initSectionMagnets = () => {
    const sections = [...document.querySelectorAll('[data-rail-root]')];
    if (!sections.length) return;

    const coverageThreshold = 0.75;
    const settleDelay = 150;
    let settleTimer = 0;
    let animationFrame = 0;
    let animationGeneration = 0;
    let isAnimating = false;

    const viewportHeight = () => document.documentElement.clientHeight || window.innerHeight;
    const maxScrollTop = () => Math.max(0, document.documentElement.scrollHeight - viewportHeight());
    const clampScroll = (value) => Math.max(0, Math.min(maxScrollTop(), value));

    const stopMagnet = ({ clearPending = false } = {}) => {
      animationGeneration += 1;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      isAnimating = false;
      if (clearPending) {
        window.clearTimeout(settleTimer);
        settleTimer = 0;
      }
    };

    const findMagnetTarget = () => {
      if (document.documentElement.classList.contains('detail-open')) return null;

      const viewport = viewportHeight();
      if (!viewport) return null;

      let candidate = null;
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const visibleHeight = Math.max(0, Math.min(rect.bottom, viewport) - Math.max(rect.top, 0));
        const coverage = visibleHeight / viewport;
        const target = clampScroll(window.scrollY + rect.top);
        const distance = Math.abs(target - window.scrollY);

        if (coverage < coverageThreshold || distance <= 2) return;
        if (!candidate || coverage > candidate.coverage || (coverage === candidate.coverage && distance < candidate.distance)) {
          candidate = { coverage, distance, target };
        }
      });

      return candidate;
    };

    const animateMagnet = (target) => {
      stopMagnet({ clearPending: true });

      const start = window.scrollY;
      const destination = clampScroll(target);
      const delta = destination - start;
      if (Math.abs(delta) <= 2) return;

      const generation = animationGeneration;
      const stiffness = 170;
      const damping = reduceMotion ? 20 : 17;
      const fixedStep = 1 / 120;
      const maximumFrameTime = 1 / 20;
      const maximumDuration = reduceMotion ? 1100 : 1600;
      const startTime = performance.now();
      let lastTime = startTime;
      let displacement = -delta;
      let velocity = 0;
      isAnimating = true;

      const step = (now) => {
        if (generation !== animationGeneration) return;

        let remainingTime = Math.min((now - lastTime) / 1000, maximumFrameTime);
        lastTime = now;

        while (remainingTime > 0) {
          const timeStep = Math.min(fixedStep, remainingTime);
          const acceleration = -stiffness * displacement - damping * velocity;
          velocity += acceleration * timeStep;
          displacement += velocity * timeStep;
          remainingTime -= timeStep;
        }

        const settled = Math.abs(displacement) < 0.25 && Math.abs(velocity) < 4;
        if (settled || now - startTime >= maximumDuration) {
          animationFrame = 0;
          isAnimating = false;
          window.scrollTo(0, destination);
          return;
        }

        window.scrollTo(0, destination + displacement);
        animationFrame = requestAnimationFrame(step);
      };

      animationFrame = requestAnimationFrame(step);
    };

    const settleMagnet = () => {
      settleTimer = 0;
      if (isAnimating) return;
      const target = findMagnetTarget();
      if (target) animateMagnet(target.target);
    };

    const scheduleMagnet = () => {
      if (isAnimating) return;
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settleMagnet, settleDelay);
    };

    const interruptMagnet = () => {
      if (isAnimating || settleTimer) stopMagnet({ clearPending: true });
    };

    window.addEventListener('scroll', scheduleMagnet, { passive: true });
    window.addEventListener('resize', scheduleMagnet);
    window.addEventListener('wheel', interruptMagnet, { passive: true });
    window.addEventListener('touchstart', interruptMagnet, { passive: true });
    window.addEventListener('pointerdown', interruptMagnet, { passive: true });
    window.addEventListener('keydown', (event) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) {
        interruptMagnet();
      }
    });
  };

  initSectionMagnets();

  const appendStoryBody = (fragment, rawText) => {
    let hasParagraph = false;
    let sectionBreak = false;

    rawText.split('\n').forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) {
        sectionBreak = hasParagraph;
        return;
      }

      if (sectionBreak) {
        const divider = document.createElement('hr');
        divider.className = 'story-divider';
        divider.setAttribute('aria-hidden', 'true');
        fragment.append(divider);
        sectionBreak = false;
      }

      const paragraph = document.createElement('p');
      paragraph.className = 'story-paragraph';
      paragraph.textContent = line;
      fragment.append(paragraph);
      hasParagraph = true;
    });
  };

  const appendStoryPlaceholder = (fragment) => {
    if (!fragment) return;
    const placeholder = document.createElement('p');
    placeholder.className = 'story-copy-empty';
    placeholder.dataset.placeholder = 'true';
    placeholder.textContent = storyPlaceholder();
    fragment.append(placeholder);
  };

  const buildStory = (portraitIndex) => {
    if (!storyCopyInner) return;
    const key = pad(portraitIndex);
    const storySet = portraitStories[language];
    const rawText = (
      storySet && typeof storySet === 'object'
        ? (storySet[key] || '')
        : (language === 'zh' ? (portraitStories[key] || '') : '')
    ).trim();
    const fragment = document.createDocumentFragment();

    if (!rawText) {
      appendStoryPlaceholder(fragment);
    } else {
      appendStoryBody(fragment, rawText);
    }

    storyCopyInner.lang = '';
    storyCopyInner.replaceChildren(fragment);
    if (storyCopy) storyCopy.scrollTop = 0;
  };

  const buildSceneryStory = (sceneryIndex, card) => {
    if (!storyCopyInner) return;
    const key = pad(sceneryIndex);
    const story = sceneryStories[key] || {};
    const bodyZh = (story.bodyZh || '').trim();
    const bodyEn = (story.bodyEn || '').trim();
    const body = language === 'en' ? bodyEn : bodyZh;
    const title = language === 'en'
      ? (story.titleEn || card?.dataset.nameEn || '')
      : (story.titleZh || card?.dataset.nameZh || '');
    const fragment = document.createDocumentFragment();

    if (title) {
      const heading = document.createElement('h2');
      heading.className = 'story-title';
      heading.textContent = title;
      fragment.append(heading);
    }

    if (!body) {
      appendStoryPlaceholder(fragment);
    } else {
      appendStoryBody(fragment, body);
    }

    storyCopyInner.lang = language === 'zh' ? 'zh-Hans' : 'en';
    storyCopyInner.replaceChildren(fragment);
    if (storyCopy) storyCopy.scrollTop = 0;
  };

  const buildGallery = (index, images, captionSets = null) => {
    if (!galleryList) return;
    const key = pad(index);
    const galleryImages = Array.isArray(images) ? images : [];
    const fragment = document.createDocumentFragment();

    galleryImages.forEach((src, imageIndex) => {
      const number = pad(imageIndex + 1);
      const entry = document.createElement('article');
      const figure = document.createElement('figure');
      const image = document.createElement('img');
      const caption = document.createElement('figcaption');
      const label = document.createElement('span');
      const captionSet = captionSets?.[language] && typeof captionSets[language] === 'object'
        ? captionSets[language]
        : (language === 'zh' ? captionSets : null);
      const captionSource = captionSet?.[key]?.[number] || '';

      entry.className = 'story-entry';
      entry.dataset.photo = `${key}-${number}`;
      figure.className = 'story-photo';
      image.src = src;
      image.alt = language === 'zh' ? `照片 ${number}` : `Photograph ${number}`;
      image.loading = imageIndex < 2 ? 'eager' : 'lazy';
      image.decoding = 'async';
      image.draggable = false;
      figure.append(image);

      caption.className = 'story-caption';
      label.className = 'story-caption-number';
      label.textContent = number;
      if (captionSource) {
        const text = document.createElement('p');
        text.className = 'story-caption-text';
        text.textContent = captionSource;
        caption.append(label, text);
      } else {
        caption.append(label);
      }
      entry.append(figure, caption);
      fragment.append(entry);
    });

    galleryList.replaceChildren(fragment);
    if (galleryEmpty) galleryEmpty.hidden = galleryImages.length > 0;
    if (storyGallery) {
      storyGallery.classList.toggle('is-empty', galleryImages.length === 0);
      storyGallery.scrollTop = 0;
    }
  };

  const setReading = (reading) => {
    if (!detail) return;
    detail.classList.toggle('is-reading', reading);
    if (storyCopy) {
      storyCopy.inert = !reading;
      storyCopy.setAttribute('aria-hidden', String(!reading));
    }
    if (detailFrame) {
      detailFrame.inert = reading;
      detailFrame.setAttribute('aria-hidden', String(reading));
    }
  };

  const settleStoryTransition = (transitionId) => {
    if (transitionId !== storyTransitionId || !detail) return;
    window.clearTimeout(storyTransitionTimer);
    storyTransitionTimer = 0;
    storyTransitionCleanup?.();
    storyTransitionCleanup = null;
    detail.classList.remove('is-story-transitioning');
    detail.classList.add('is-story-settled');
  };

  const transitionStory = (reading, { moveFocus = false } = {}) => {
    if (!detail?.classList.contains('is-open') || detail.classList.contains('is-story-transitioning')) return;
    window.clearTimeout(storyTimer);
    storyTimer = 0;
    const transitionId = ++storyTransitionId;
    detail.classList.remove('is-story-settled');
    detail.classList.add('is-story-transitioning');
    setReading(reading);

    storyTransitionCleanup?.();
    if (storyCopy) {
      const handleTransitionEnd = (event) => {
        if (event.target !== storyCopy || event.propertyName !== 'opacity') return;
        settleStoryTransition(transitionId);
      };
      storyTransitionCleanup = () => storyCopy.removeEventListener('transitionend', handleTransitionEnd);
      storyCopy.addEventListener('transitionend', handleTransitionEnd);
    }

    if (moveFocus) {
      (reading ? storyCopy : detailFrame)?.focus({ preventScroll: true });
    }

    window.clearTimeout(storyTransitionTimer);
    storyTransitionTimer = window.setTimeout(() => settleStoryTransition(transitionId), 2600);
  };

  const startStoryTimer = () => {
    window.clearTimeout(storyTimer);
    window.clearTimeout(storyTransitionTimer);
    storyTransitionTimer = 0;
    storyTransitionId += 1;
    storyTransitionCleanup?.();
    storyTransitionCleanup = null;
    detail?.classList.remove('is-story-transitioning');
    setReading(false);
    detail?.classList.add('is-story-settled');
    if (storyCopy) storyCopy.scrollTop = 0;
    if (storyGallery) storyGallery.scrollTop = 0;
    storyTimer = window.setTimeout(() => {
      storyTimer = 0;
      transitionStory(true);
    }, storyDelay);
  };

  const resetStory = () => {
    window.clearTimeout(storyTimer);
    window.clearTimeout(storyTransitionTimer);
    storyTimer = 0;
    storyTransitionTimer = 0;
    storyTransitionId += 1;
    storyTransitionCleanup?.();
    storyTransitionCleanup = null;
    detail?.classList.remove('is-story-transitioning');
    setReading(false);
    detail?.classList.add('is-story-settled');
    if (storyCopy) storyCopy.scrollTop = 0;
    if (storyGallery) storyGallery.scrollTop = 0;
  };

  const resetZoom = () => {
    activeAnimation?.cancel();
    activeClone?.remove();
    activeAnimation = null;
    activeClone = null;
    if (detailFrame) detailFrame.style.visibility = '';
  };

  const bodyLock = (locked) => {
    document.documentElement.classList.toggle('detail-open', locked);
    document.body.classList.toggle('detail-open', locked);
    homeElements.forEach((element) => {
      element.inert = locked;
    });
  };

  const openDetail = async (card) => {
    if (!detail || !detailImage || !detailFrame || !card) return;
    const isScenery = Boolean(card.dataset.scenery);
    const itemIndex = Number(isScenery ? card.dataset.scenery : card.dataset.portrait);
    const source = card.dataset.src || card.querySelector('img')?.src;
    const startRect = card.getBoundingClientRect();
    const startAlt = card.querySelector('img')?.alt || '';

    activeCard = card;
    resetStory();
    resetZoom();
    detail.dataset.detailMode = isScenery ? 'scenery' : 'portrait';
    if (isScenery) {
      delete detail.dataset.portrait;
      detail.dataset.scenery = String(itemIndex);
      if (detailTitle) {
        detailTitle.textContent = portraitName(card) || (language === 'zh' ? '风景' : 'Scenery');
      }
      detailFrame.setAttribute('role', 'button');
      detailFrame.tabIndex = 0;
      detailFrame.setAttribute('aria-label', language === 'zh' ? '显示风景文本' : 'Show scenery text');
      updateStoryLabels(true);
    } else {
      delete detail.dataset.scenery;
      updateDetailName(itemIndex);
      detailFrame.setAttribute('role', 'button');
      detailFrame.tabIndex = 0;
      updateStoryLabels(false);
    }
    detailImage.src = source;
    detailImage.alt = startAlt || (isScenery ? `Scenery ${pad(itemIndex)}` : portraitAlt(card));
    if (detailNumber) detailNumber.textContent = pad(itemIndex);
    if (detailTotal) detailTotal.textContent = pad(isScenery ? sceneryRealCards.length : realCards.length);

    bodyLock(true);
    detail.inert = false;
    detail.setAttribute('aria-hidden', 'false');
    detail.classList.add('is-open');

    await nextFrame();
    if (!detail.classList.contains('is-open')) return;
    if (isScenery) {
      buildSceneryStory(itemIndex, card);
      buildGallery(itemIndex, sceneryPhotoSets[pad(itemIndex)] || []);
      startStoryTimer();
    } else {
      buildStory(itemIndex);
      buildGallery(itemIndex, portraitWall(card, itemIndex), window.WUJIANG_CAPTIONS);
      startStoryTimer();
    }
    closeButton?.focus({ preventScroll: true });
    const endRect = detailFrame.getBoundingClientRect();

    if (reduceMotion || !startRect.width || !endRect.width) return;

    const clone = document.createElement('div');
    const cloneImage = document.createElement('img');
    const cloneName = card.querySelector('.portrait-name')?.cloneNode(true);
    clone.className = 'zoom-clone';
    cloneImage.src = source;
    cloneImage.alt = '';
    clone.append(cloneImage);
    if (cloneName) clone.append(cloneName);
    clone.style.top = `${startRect.top}px`;
    clone.style.left = `${startRect.left}px`;
    clone.style.width = `${startRect.width}px`;
    clone.style.height = `${startRect.height}px`;
    document.body.append(clone);

    activeClone = clone;
    detailFrame.style.visibility = 'hidden';

    const translateX = endRect.left - startRect.left;
    const translateY = endRect.top - startRect.top;
    const scaleX = endRect.width / startRect.width;
    const scaleY = endRect.height / startRect.height;

    activeAnimation = clone.animate([
      { transform: 'translate3d(0, 0, 0) scale(1, 1)' },
      { transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${scaleX}, ${scaleY})` }
    ], {
      duration: 720,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'both'
    });

    try {
      await activeAnimation.finished;
    } catch {
      return;
    }

    clone.remove();
    activeClone = null;
    activeAnimation = null;
    detailFrame.style.visibility = '';
    closeButton?.focus();
  };

  const closeDetail = () => {
    if (!detail?.classList.contains('is-open')) return;
    resetZoom();
    resetStory();
    detail.classList.remove('is-open');
    detail.setAttribute('aria-hidden', 'true');
    detail.inert = true;
    bodyLock(false);
    const portraitNumber = activeCard?.dataset.portrait;
    const sceneryNumber = activeCard?.dataset.scenery;
    const focusTarget = sceneryNumber
      ? sceneryRealCards.find((card) => card.dataset.scenery === sceneryNumber) || activeCard
      : realCards.find((card) => card.dataset.portrait === portraitNumber) || activeCard;
    focusTarget?.focus({ preventScroll: true });
  };

  const openAbout = (event) => {
    event?.preventDefault();
    if (!aboutDialog || aboutDialog.classList.contains('is-open') || detail?.classList.contains('is-open')) return;

    if (aboutSource && aboutDialogCopy) {
      const aboutClone = aboutSource.cloneNode(true);
      aboutClone.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
      aboutDialogCopy.replaceChildren(...aboutClone.childNodes);
    }

    bodyLock(true);
    aboutDialog.inert = false;
    aboutDialog.setAttribute('aria-hidden', 'false');
    aboutDialog.classList.add('is-open');
    if (aboutDialogBody) aboutDialogBody.scrollTop = 0;
    aboutDialogClose?.focus({ preventScroll: true });
  };

  const closeAbout = () => {
    if (!aboutDialog?.classList.contains('is-open')) return;
    aboutDialog.classList.remove('is-open');
    aboutDialog.setAttribute('aria-hidden', 'true');
    aboutDialog.inert = true;
    bodyLock(false);
    aboutOpen?.focus({ preventScroll: true });
  };

  const applyLanguage = (next) => {
    language = next === 'zh' ? 'zh' : 'en';
    const isZh = language === 'zh';

    document.documentElement.lang = isZh ? 'zh-Hans' : 'en';
    document.documentElement.dataset.lang = language;
    document.title = isZh ? '乌江镇：我们珍爱的地方' : 'Wujiang: The Places We Hold Dear';

    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute('content', isZh ? '一个极简的肖像摄影索引。' : 'A minimal photographic portrait index.');
    }

    languageButton?.setAttribute('data-active-lang', language);
    languageButton?.setAttribute('aria-pressed', String(isZh));
    languageButton?.setAttribute('aria-label', isZh ? '切换到英文' : 'Switch to Chinese');

    document.querySelectorAll('[data-en][data-zh]').forEach((element) => {
      element.textContent = element.dataset[language];
    });

    document.querySelectorAll('[data-aria-en][data-aria-zh]').forEach((element) => {
      element.setAttribute('aria-label', element.dataset[isZh ? 'ariaZh' : 'ariaEn']);
    });

    cards.forEach((card) => {
      const number = pad(card.dataset.portrait);
      const name = portraitName(card);
      card.setAttribute('aria-label', isZh ? `打开肖像 ${number}，${name}` : `Open portrait ${number}, ${name}`);
      const image = card.querySelector('img');
      if (image) image.alt = portraitAlt(card);
      const primaryElement = card.querySelector('.portrait-name-primary');
      renderName(primaryElement, card);
    });

    sceneryCards.forEach((card) => {
      const number = pad(card.dataset.scenery);
      const name = portraitName(card);
      card.setAttribute('aria-label', isZh ? `打开风景 ${number}，${name}` : `Open scenery ${number}, ${name}`);
      const image = card.querySelector('img');
      if (image) {
        image.alt = isZh
          ? (image.dataset.altZh || `风景 ${number}`)
          : (image.dataset.altEn || image.alt);
      }
      const primaryElement = card.querySelector('.portrait-name-primary');
      renderName(primaryElement, card);
    });

    document.querySelectorAll('.story-copy-empty[data-placeholder]').forEach((element) => {
      element.textContent = storyPlaceholder();
    });

    if (activeCard?.dataset.scenery) {
      if (detailTitle) {
        detailTitle.textContent = portraitName(activeCard) || (isZh ? '风景' : 'Scenery');
      }
      if (detailFrame) detailFrame.setAttribute('aria-label', isZh ? '显示风景文本' : 'Show scenery text');
      if (detailImage) detailImage.alt = activeCard.querySelector('img')?.alt || '';
      updateStoryLabels(true);
      if (detail.classList.contains('is-open') && detail.dataset.detailMode === 'scenery') {
        buildSceneryStory(Number(activeCard.dataset.scenery), activeCard);
      }
    } else if (activeCard) {
      updateDetailName(activeCard.dataset.portrait);
      if (detailImage) detailImage.alt = portraitAlt(activeCard);
      updateStoryLabels(false);
      if (detail.classList.contains('is-open') && detail.dataset.detailMode === 'portrait') {
        const portraitIndex = Number(activeCard.dataset.portrait);
        buildStory(portraitIndex);
        buildGallery(portraitIndex, portraitWall(activeCard, portraitIndex), window.WUJIANG_CAPTIONS);
      }
    }

    try {
      localStorage.setItem(languageStorageKey, language);
    } catch {
      /* localStorage can be unavailable for local files. */
    }
  };

  try {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  } catch {
    /* History controls can be unavailable for local files. */
  }
  if (!window.location.hash) window.scrollTo(0, 0);

  applyLanguage(readStoredLanguage());

  languageButton?.addEventListener('click', () => {
    applyLanguage(language === 'en' ? 'zh' : 'en');
  });

  const wireCard = (card) => {
    const image = card.querySelector('img');
    image?.addEventListener('error', () => {
      if (!image.dataset.retried) {
        image.dataset.retried = '1';
        const base = (card.dataset.src || image.getAttribute('src') || '').split('?')[0];
        const retry = `${base}?retry=${Date.now()}`;
        card.dataset.src = retry;
        image.src = retry;
        return;
      }
      card.classList.add('is-missing');
    });

    card.addEventListener('click', () => openDetail(card));
  };

  cards.forEach(wireCard);
  sceneryCards.forEach(wireCard);

  closeButton?.addEventListener('click', closeDetail);
  aboutOpen?.addEventListener('click', openAbout);
  aboutDialogClose?.addEventListener('click', closeAbout);
  detailFrame?.addEventListener('click', () => {
    if (detail.classList.contains('is-story-settled') && !detail.classList.contains('is-reading')) {
      transitionStory(true, { moveFocus: true });
    }
  });

  detailFrame?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (detail.classList.contains('is-story-settled') && !detail.classList.contains('is-reading')) {
        transitionStory(true, { moveFocus: true });
      }
    }
  });

  storyCopy?.addEventListener('click', (event) => {
    if (!detail.classList.contains('is-story-settled') || !detail.classList.contains('is-reading')) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && storyCopy.contains(selection.anchorNode) && storyCopy.contains(selection.focusNode)) return;
    const bounds = storyCopy.getBoundingClientRect();
    if (storyCopy.scrollHeight > storyCopy.clientHeight && event.clientX >= bounds.right - 18) return;
    transitionStory(false, { moveFocus: true });
  });

  storyCopy?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (detail.classList.contains('is-story-settled') && detail.classList.contains('is-reading')) {
        transitionStory(false, { moveFocus: true });
      }
    }
  });

  document.addEventListener('keydown', (event) => {
    if (aboutDialog?.classList.contains('is-open')) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeAbout();
        return;
      }
      if (event.key === 'Tab') {
        const focusable = [aboutDialogClose, aboutDialogBody].filter(Boolean);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
      return;
    }

    if (!detail?.classList.contains('is-open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDetail();
      return;
    }
    if (event.key === 'Tab') {
      const activeStoryPanel = detail.classList.contains('is-reading') ? storyCopy : detailFrame;
      const storyIsSettled = detail.classList.contains('is-story-settled');
      const focusable = [closeButton, storyIsSettled ? activeStoryPanel : null, storyGallery].filter((element) => element && !element.inert);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
})();
