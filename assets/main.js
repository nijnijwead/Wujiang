(() => {
  const rail = document.querySelector('[data-rail]');
  const track = document.querySelector('.portrait-track');
  const realCards = [...document.querySelectorAll('[data-portrait]')];
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

  const cards = [...document.querySelectorAll('[data-portrait]')];
  const currentLabel = document.querySelector('[data-current]');
  const progress = document.querySelector('[data-progress]');
  const prevButton = document.querySelector('[data-prev]');
  const nextButton = document.querySelector('[data-next]');
  const aboutPage = document.querySelector('[data-about]');
  const aboutOpen = document.querySelector('[data-about-open]');
  const aboutClose = document.querySelector('[data-about-close]');
  const aboutBody = document.querySelector('[data-about-body]');
  const detail = document.querySelector('[data-detail]');
  const detailFrame = document.querySelector('[data-detail-frame]');
  const detailImage = document.querySelector('[data-detail-image]');
  const detailTitle = document.querySelector('[data-detail-title]');
  const detailNumber = document.querySelector('[data-detail-number]');
  const detailNamePrimary = document.querySelector('.detail-portrait-name-primary');
  const storyCopy = document.querySelector('[data-story-copy]');
  const storyCopyInner = document.querySelector('[data-story-copy-inner]');
  const storyGallery = document.querySelector('[data-story-gallery]');
  const galleryList = document.querySelector('[data-gallery-list]');
  const galleryEmpty = document.querySelector('[data-gallery-empty]');
  const closeButton = document.querySelector('[data-close]');
  const languageButton = document.querySelector('[data-language-toggle]');
  const homeElements = [...document.querySelectorAll('[data-home]')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const photoSets = window.WUJIANG_WALL || {};
  const portraitStories = window.WUJIANG_STORIES || {};

  const languageStorageKey = 'wujiang-language';
  const storyDelay = 3000;
  let language = 'en';
  let activeCard = null;
  let activeClone = null;
  let activeAnimation = null;
  let scrollFrame = 0;
  let depthFrame = 0;
  let storyTimer = 0;
  let storyTransitionTimer = 0;
  let storyTransitionId = 0;
  let storyTransitionCleanup = null;
  let loopTimer = 0;
  let isDragging = false;
  const depthStates = cards.map(() => ({ scale: 1, blur: 0, opacity: 1 }));
  const depthTargets = cards.map(() => ({ scale: 1, blur: 0, opacity: 1 }));

  const pad = (value) => String(value).padStart(2, '0');
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  const portraitName = (card) => (language === 'zh' ? (card.dataset.nameZh || '') : (card.dataset.nameEn || ''));
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
  const storyPlaceholder = () => (language === 'zh' ? '文本待补充。' : 'Text forthcoming.');
  const readStoredLanguage = () => {
    try {
      return localStorage.getItem(languageStorageKey) === 'zh' ? 'zh' : 'en';
    } catch {
      return 'en';
    }
  };

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
    const activeNumber = Number(getActiveCard()?.dataset.portrait) || 1;
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

    rail.addEventListener('wheel', (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      rail.scrollLeft += event.deltaY;
    }, { passive: false });
  }

  const buildStory = (portraitIndex) => {
    if (!storyCopyInner) return;
    const key = pad(portraitIndex);
    const rawText = (portraitStories[key] || '').trim();
    const fragment = document.createDocumentFragment();

    if (!rawText) {
      const placeholder = document.createElement('p');
      placeholder.className = 'story-copy-empty';
      placeholder.dataset.placeholder = 'true';
      placeholder.textContent = storyPlaceholder();
      fragment.append(placeholder);
    } else {
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
    }

    storyCopyInner.replaceChildren(fragment);
    if (storyCopy) storyCopy.scrollTop = 0;
  };

  const buildGallery = (portraitIndex) => {
    if (!galleryList) return;
    const key = pad(portraitIndex);
    const images = Array.isArray(photoSets[key]) ? photoSets[key] : [];
    const fragment = document.createDocumentFragment();

    images.forEach((src, index) => {
      const number = pad(index + 1);
      const entry = document.createElement('article');
      const figure = document.createElement('figure');
      const image = document.createElement('img');
      const caption = document.createElement('figcaption');
      const label = document.createElement('span');
      const captionSource = window.WUJIANG_CAPTIONS?.[key]?.[number] || '';

      entry.className = 'story-entry';
      entry.dataset.photo = `${key}-${number}`;
      figure.className = 'story-photo';
      image.src = src;
      image.alt = language === 'zh' ? `照片 ${number}` : `Photograph ${number}`;
      image.loading = index < 2 ? 'eager' : 'lazy';
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
    if (galleryEmpty) galleryEmpty.hidden = images.length > 0;
    if (storyGallery) {
      storyGallery.classList.toggle('is-empty', images.length === 0);
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
    document.body.classList.toggle('detail-open', locked);
    homeElements.forEach((element) => {
      element.inert = locked;
    });
  };

  const openDetail = async (card) => {
    if (!detail || !detailImage || !detailFrame || !card) return;
    const portraitIndex = Number(card.dataset.portrait);
    const source = card.dataset.src || card.querySelector('img')?.src;
    const startRect = card.getBoundingClientRect();
    const startAlt = card.querySelector('img')?.alt || '';

    activeCard = card;
    resetStory();
    resetZoom();
    updateDetailName(portraitIndex);
    detailImage.src = source;
    detailImage.alt = startAlt || portraitAlt(card);
    if (detailNumber) detailNumber.textContent = pad(portraitIndex);

    bodyLock(true);
    detail.inert = false;
    detail.setAttribute('aria-hidden', 'false');
    detail.classList.add('is-open');

    await nextFrame();
    if (!detail.classList.contains('is-open')) return;
    buildStory(portraitIndex);
    buildGallery(portraitIndex);
    startStoryTimer();
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
    const focusTarget = realCards.find((card) => card.dataset.portrait === portraitNumber) || activeCard;
    focusTarget?.focus({ preventScroll: true });
  };

  const openAbout = (event) => {
    event?.preventDefault();
    if (!aboutPage) return;
    bodyLock(true);
    aboutPage.inert = false;
    aboutPage.setAttribute('aria-hidden', 'false');
    aboutPage.classList.add('is-open');
    aboutClose?.focus({ preventScroll: true });
  };

  const closeAbout = () => {
    if (!aboutPage?.classList.contains('is-open')) return;
    aboutPage.classList.remove('is-open');
    aboutPage.setAttribute('aria-hidden', 'true');
    aboutPage.inert = true;
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

    document.querySelectorAll('.story-copy-empty[data-placeholder]').forEach((element) => {
      element.textContent = storyPlaceholder();
    });

    if (activeCard) {
      updateDetailName(activeCard.dataset.portrait);
      if (detailImage) detailImage.alt = portraitAlt(activeCard);
    }

    try {
      localStorage.setItem(languageStorageKey, language);
    } catch {
      /* localStorage can be unavailable for local files. */
    }
  };

  applyLanguage(readStoredLanguage());

  languageButton?.addEventListener('click', () => {
    applyLanguage(language === 'en' ? 'zh' : 'en');
  });

  cards.forEach((card) => {
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
  });

  closeButton?.addEventListener('click', closeDetail);
  aboutOpen?.addEventListener('click', openAbout);
  aboutClose?.addEventListener('click', closeAbout);

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
    if (aboutPage?.classList.contains('is-open')) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeAbout();
      }
      if (event.key === 'Tab') {
        const focusable = [aboutClose, aboutBody].filter(Boolean);
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
