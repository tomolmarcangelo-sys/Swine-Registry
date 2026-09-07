/**
 * Hinunangan DA Swine Registry & Surveillance System
 * Internationalization (i18n) Translation Map
 * 
 * Supported Languages:
 * - 'en': English (Official administrative terminology)
 * - 'ceb': Cebuano / Bisaya / Binisaya (Native regional dialect spoken in Hinunangan & Southern Leyte)
 */

export type Language = 'en' | 'ceb';

export interface TranslationDictionary {
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    close: string;
    actions: string;
    filter: string;
    search: string;
    loading: string;
    export: string;
    print: string;
    back: string;
    yes: string;
    no: string;
    status: string;
    date: string;
    notes: string;
    details: string;
    confirm: string;
    all: string;
    refresh: string;
    download: string;
    upload: string;
    required: string;
    success: string;
    error: string;
    warning: string;
    info: string;
    offline: string;
    online: string;
    synced: string;
    queued: string;
    scope: string;
    language: string;
    english: string;
    cebuano: string;
    toggleLanguage: string;
    view: string;
    dismiss: string;
    remove: string;
    change: string;
  };
  nav: {
    dashboard: string;
    gis: string;
    recordsAdmin: string;
    recordsFocal: string;
    print: string;
    accounts: string;
    addSwine: string;
    signOut: string;
    publicPortal: string;
  };
  topbar: {
    executiveDashboard: string;
    gisMapTitle: string;
    recordsAdminTitle: string;
    recordsFocalTitle: string;
    accountsTitle: string;
    printTitle: string;
    scopeAll: string;
    scopeBarangay: string;
    liveOnline: string;
    offlineMode: string;
    queuedItems: string;
  };
  sidebar: {
    brandTitle: string;
    brandSubtitle: string;
    roleAdmin: string;
    roleFocal: string;
    quickRegister: string;
    installPwa: string;
    signOutConfirm: string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    totalSwine: string;
    backyardRaising: string;
    vaccinatedRatio: string;
    averageWeight: string;
    barangaysCovered: string;
    quickActions: string;
    openGisMap: string;
    registerNewSwine: string;
    printOfficialReports: string;
    recentRegistrations: string;
    noRegistrations: string;
    biosecurityOverview: string;
    purposeBreakdown: string;
    topBarangays: string;
    asfRiskZoneNotice: string;
    criticalAlert: string;
    certifiedCompliant: string;
    viewAllRecords: string;
  };
  records: {
    title: string;
    subtitleAdmin: string;
    subtitleFocal: string;
    searchPlaceholder: string;
    filterBarangay: string;
    filterPurpose: string;
    filterVax: string;
    allBarangays: string;
    allPurposes: string;
    allVaxStatus: string;
    vaccinatedOnly: string;
    unvaccinatedOnly: string;
    colEarTag: string;
    colOwner: string;
    colLocation: string;
    colBreedSex: string;
    colWeightAge: string;
    colVax: string;
    colBiosecurity: string;
    colActions: string;
    noRecordsFound: string;
    noRecordsSub: string;
    showingRecords: string;
    viewOnMap: string;
    editRecord: string;
    deleteRecord: string;
    confirmDelete: string;
  };
  gis: {
    mapViewTitle: string;
    mapViewSubtitle: string;
    densityHeatmap: string;
    sanitationHeatmap: string;
    toggleHeatmap: string;
    highBiosecurity: string;
    mediumBiosecurity: string;
    lowBiosecurity: string;
    legendTitle: string;
    legendDescription: string;
    legendSwineClassification: string;
    legendBiosecurityCoding: string;
    legendGreenExplanation: string;
    legendYellowExplanation: string;
    legendRedExplanation: string;
    legendVisibleFarms: string;
    sanitationScore: string;
    captureCoords: string;
    recenterMap: string;
    quarantineRadius: string;
    clickToAddPrompt: string;
    farmsNearby: string;
    boundaryRestrictedToast: string;
    boundaryPerimeterTitle: string;
    satelliteAreaLabels: string;
    streetPrecisionMarkers: string;
  };
  modal: {
    titleNew: string;
    titleEdit: string;
    deptHeader: string;
    sectionLocation: string;
    sectionOwner: string;
    sectionSpecs: string;
    sectionBiosecurity: string;
    sectionNotes: string;
    earTagLabel: string;
    ownerNameLabel: string;
    contactLabel: string;
    addressLabel: string;
    barangayLabel: string;
    breedLabel: string;
    sexLabel: string;
    ageLabel: string;
    weightLabel: string;
    purposeLabel: string;
    vaccinatedCheckbox: string;
    asfClearedCheckbox: string;
    dateRegisteredLabel: string;
    photoLabel: string;
    photoHelper: string;
    saveBtn: string;
    updateBtn: string;
    cancelBtn: string;
  };
  biosecurity: {
    sectionTitle: string;
    scoreLabel: string;
    level3High: string;
    level2Standard: string;
    level1Basic: string;
    footbath: {
      label: string;
      description: string;
    };
    fencing: {
      label: string;
      description: string;
    };
    swillBan: {
      label: string;
      description: string;
    };
    disinfection: {
      label: string;
      description: string;
    };
    visitorLog: {
      label: string;
      description: string;
    };
    quarantinePen: {
      label: string;
      description: string;
    };
    cleanWater: {
      label: string;
      description: string;
    };
  };
  notifications: {
    savedSuccess: string;
    updatedSuccess: string;
    deletedSuccess: string;
    syncQueued: string;
    syncCompleted: string;
    syncFailed: string;
    offlineMode: string;
    onlineRestored: string;
    permissionDenied: string;
    asfAlert: string;
    settingsSaved: string;
  };
  landing: {
    navServices: string;
    navAbout: string;
    navRegistry: string;
    loginBtn: string;
    heroBadge: string;
    heroTitle: string;
    heroSubtitle: string;
    exploreBtn: string;
    signInBtn: string;
    statRegistered: string;
    statBackyard: string;
    statBarangays: string;
    statMonth: string;
    aboutTitle: string;
    contactUs: string;
    footerNotice: string;
  };
}

export const translations: Record<Language, TranslationDictionary> = {
  // =========================================================================
  // ENGLISH TRANSLATIONS
  // =========================================================================
  en: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      actions: 'Actions',
      filter: 'Filter',
      search: 'Search',
      loading: 'Loading...',
      export: 'Export',
      print: 'Print',
      back: 'Back',
      yes: 'Yes',
      no: 'No',
      status: 'Status',
      date: 'Date',
      notes: 'Notes',
      details: 'Details',
      confirm: 'Confirm',
      all: 'All',
      refresh: 'Refresh',
      download: 'Download',
      upload: 'Upload',
      required: 'Required',
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Information',
      offline: 'Offline',
      online: 'Online',
      synced: 'Synced',
      queued: 'Queued',
      scope: 'Scope',
      language: 'Language',
      english: 'English',
      cebuano: 'Cebuano',
      toggleLanguage: 'Switch to Cebuano (Binisaya)',
      view: 'View',
      dismiss: 'Dismiss',
      remove: 'Remove',
      change: 'Change'
    },
    nav: {
      dashboard: 'Dashboard',
      gis: 'GIS Swine Map & Heatmap',
      recordsAdmin: 'Pig Records Database',
      recordsFocal: 'My Barangay Records',
      print: 'Print Official Reports',
      accounts: 'Accounts & Settings',
      addSwine: 'Add Swine Registration',
      signOut: 'Sign Out',
      publicPortal: 'Public Swine Portal'
    },
    topbar: {
      executiveDashboard: 'Executive Dashboard',
      gisMapTitle: 'GIS Swine Map',
      recordsAdminTitle: 'Swine Records Database',
      recordsFocalTitle: 'Barangay {barangay} Records',
      accountsTitle: 'Accounts & Settings',
      printTitle: 'Official Reports Generator',
      scopeAll: 'Scope: All 40 Barangays',
      scopeBarangay: 'Scope: Brgy. {barangay}',
      liveOnline: 'Live Online',
      offlineMode: 'Offline Mode',
      queuedItems: '{count} Queued'
    },
    sidebar: {
      brandTitle: 'Hinunangan DA',
      brandSubtitle: 'Swine Registry & Records',
      roleAdmin: 'Central Administrator',
      roleFocal: 'Brgy. {barangay} Focal Person',
      quickRegister: 'Add Swine Registration',
      installPwa: 'Install App (Offline Ready)',
      signOutConfirm: 'Are you sure you want to sign out?'
    },
    dashboard: {
      title: 'Swine Surveillance & Registry Summary',
      subtitle: 'Official Livestock Program of Hinunangan, Southern Leyte',
      totalSwine: 'Total Registered Swine',
      backyardRaising: 'Backyard Swine',
      vaccinatedRatio: 'Vaccinated & Protected',
      averageWeight: 'Average Weight (kg)',
      barangaysCovered: 'Active Barangays',
      quickActions: 'Quick Navigation & Actions',
      openGisMap: 'Open GIS Map',
      registerNewSwine: 'Register Swine',
      printOfficialReports: 'Generate Reports',
      recentRegistrations: 'Recent Swine Registrations',
      noRegistrations: 'No swine recorded yet.',
      biosecurityOverview: 'Biosecurity Compliance Levels',
      purposeBreakdown: 'Production Purpose Distribution',
      topBarangays: 'Top Barangays by Swine Population',
      asfRiskZoneNotice: 'African Swine Fever (ASF) Biosecurity Watch',
      criticalAlert: 'Action Required: High sanitation risk pens detected',
      certifiedCompliant: 'Certified High Biosecurity',
      viewAllRecords: 'View All Records'
    },
    records: {
      title: 'Swine Records Registry',
      subtitleAdmin: 'Centralized registry database for all 40 barangays of Hinunangan',
      subtitleFocal: 'Swine registry filtered exclusively for Barangay {barangay}',
      searchPlaceholder: 'Search by ear tag, owner name, address, or breed...',
      filterBarangay: 'Filter Barangay',
      filterPurpose: 'Filter Purpose',
      filterVax: 'Vaccination Status',
      allBarangays: 'All Barangays',
      allPurposes: 'All Production Purposes',
      allVaxStatus: 'All Health Statuses',
      vaccinatedOnly: 'Vaccinated Only',
      unvaccinatedOnly: 'Unvaccinated / Pending',
      colEarTag: 'Ear Tag / ID',
      colOwner: 'Owner & Contact',
      colLocation: 'Location / Barangay',
      colBreedSex: 'Breed & Sex',
      colWeightAge: 'Weight & Age',
      colVax: 'Vaccination & ASF',
      colBiosecurity: 'Biosecurity Score',
      colActions: 'Actions',
      noRecordsFound: 'No swine records matching your query',
      noRecordsSub: 'Try broadening your search term or filter selection.',
      showingRecords: 'Showing {count} of {total} registered swine records',
      viewOnMap: 'View on GIS Map',
      editRecord: 'Edit Record',
      deleteRecord: 'Delete Record',
      confirmDelete: 'Are you sure you want to delete swine record {earTag}? This cannot be undone.'
    },
    gis: {
      mapViewTitle: 'Interactive Geospatial Surveillance Map',
      mapViewSubtitle: 'Real-time farm coordinates, density clusters, and sanitation biosecurity levels',
      densityHeatmap: 'Population Density Heatmap',
      sanitationHeatmap: 'Sanitation & Biosecurity Heatmap',
      toggleHeatmap: 'Switch Heatmap Mode',
      highBiosecurity: 'Level 3: High Biosecurity (85-100%)',
      mediumBiosecurity: 'Level 2: Standard Biosecure (55-84%)',
      lowBiosecurity: 'Level 1: Basic / High Risk (<55%)',
      legendTitle: 'Biosecurity Sanitation Color Coding',
      legendDescription: 'Color markers indicate farm compliance with national DA biosecurity guidelines:',
      legendSwineClassification: 'Swine Purpose Classification',
      legendBiosecurityCoding: 'Biosecurity Score Color Coding',
      legendGreenExplanation: 'High Biosecurity (Level 3 / 6-7 pts) — Full footbath, fence barrier, zero-swill compliance',
      legendYellowExplanation: 'Standard Biosecurity (Level 2 / 4-5 pts) — Basic disinfection, moderate containment deficits',
      legendRedExplanation: 'Critical Risk (Level 1 / 0-3 pts) — Swill feeding violation, open runoff, or missing barriers',
      legendVisibleFarms: '{count} farms plotted',
      sanitationScore: 'Sanitation Score',
      captureCoords: 'Capture Current GPS',
      recenterMap: 'Recenter Hinunangan',
      quarantineRadius: '1.0 km Quarantine Buffer Ring',
      clickToAddPrompt: 'Click on the map to register a swine at that specific GPS location',
      farmsNearby: '{count} farms within 1 km radius',
      boundaryRestrictedToast: 'Swine registrations are restricted to Hinunangan municipality boundaries.',
      boundaryPerimeterTitle: 'Hinunangan Official Municipal Perimeter',
      satelliteAreaLabels: 'Barangay Area Badges (Satellite / Hybrid)',
      streetPrecisionMarkers: 'Pinpoint Street Markers (Street View)'
    },
    modal: {
      titleNew: 'New Swine Registration',
      titleEdit: 'Edit Registration — {earTag}',
      deptHeader: 'Department of Agriculture · Hinunangan',
      sectionLocation: 'Geographic Farm Location (GIS)',
      sectionOwner: 'Owner & Farm Registry Identification',
      sectionSpecs: 'Swine Specifications & Health',
      sectionBiosecurity: 'Biosecurity & Sanitation Assessment (ASF Prevention)',
      sectionNotes: 'Field Notes / Clinical & Inspection Observations',
      earTagLabel: 'Ear Tag / Municipal Registry ID *',
      ownerNameLabel: 'Full Name of Swine Owner *',
      contactLabel: 'Contact Number / Mobile',
      addressLabel: 'Sitio / Purok / Street Address *',
      barangayLabel: 'Designated Barangay *',
      breedLabel: 'Breed *',
      sexLabel: 'Sex *',
      ageLabel: 'Age (in Months) *',
      weightLabel: 'Estimated Weight (kg) *',
      purposeLabel: 'Primary Purpose *',
      vaccinatedCheckbox: 'Vaccinated (Hog Cholera / Swine Erysipelas)',
      asfClearedCheckbox: 'ASF Negative Clearance Certified',
      dateRegisteredLabel: 'Date Registered *',
      photoLabel: 'Swine / Pen Photo (Optional)',
      photoHelper: 'Upload ear notch, pen inspection, or ear tag photo (auto-compressed for offline sync).',
      saveBtn: 'Register Swine Record',
      updateBtn: 'Save Updates',
      cancelBtn: 'Cancel'
    },
    biosecurity: {
      sectionTitle: 'DA National Biosecurity Compliance',
      scoreLabel: 'Compliance Score: {score}% ({count}/{total} criteria satisfied)',
      level3High: 'Level 3: High Biosecurity (Certified Compliant)',
      level2Standard: 'Level 2: Standard Biosecure (Acceptable)',
      level1Basic: 'Level 1: Basic (Moderate to High Risk)',
      footbath: {
        label: 'Footbath Maintenance',
        description: 'Functional entrance footbath with active chemical disinfectant (e.g. Virkon S / bleach) replenished regularly.'
      },
      fencing: {
        label: 'Perimeter Fencing Integrity',
        description: 'Sturdy, intact perimeter barrier preventing unauthorized entry by stray swine, domestic dogs, and wild boars.'
      },
      swillBan: {
        label: 'Zero-Swill Feeding (DA ASF Ban)',
        description: 'Strict prohibition of feeding untreated kitchen food scraps, restaurant slop (kanin-baboy), or unboiled food waste.'
      },
      disinfection: {
        label: 'Scheduled Pen Disinfection',
        description: 'Documented regular schedule of pen power washing, drying, and surface disinfectant spraying (at least weekly).'
      },
      visitorLog: {
        label: 'Visitor & Vehicle Access Control',
        description: 'Restricted farm entry, mandatory visitor logbook, boot change / plastic shoe covers, and tire disinfection spray.'
      },
      quarantinePen: {
        label: 'Quarantine / Isolation Facility',
        description: 'Dedicated isolation pen with separate feed/water troughs for newly introduced stock (14-21 day hold) or sick swine.'
      },
      cleanWater: {
        label: 'Protected Clean Water Source',
        description: 'Enclosed potable drinking water line or protected deep-well supply isolated from open canal runoff contamination.'
      }
    },
    notifications: {
      savedSuccess: 'Swine record {earTag} successfully registered.',
      updatedSuccess: 'Swine record {earTag} successfully updated.',
      deletedSuccess: 'Swine record {earTag} successfully deleted.',
      syncQueued: 'Change recorded locally and queued for cloud synchronization.',
      syncCompleted: 'Cloud synchronization completed successfully.',
      syncFailed: 'Cloud synchronization failed. Retrying when connection stabilizes.',
      offlineMode: 'You are currently offline. Changes are saved locally on your device.',
      onlineRestored: 'Internet connection restored. Real-time sync active.',
      permissionDenied: 'Access denied: You do not have permission for this operation.',
      asfAlert: 'ASF Risk Alert: Potential disease proximity in {barangay}.',
      settingsSaved: 'System settings saved successfully.'
    },
    landing: {
      navServices: 'Programs & Services',
      navAbout: 'About Office',
      navRegistry: 'Swine Registry Portal',
      loginBtn: 'Sign In (Staff Portal)',
      heroBadge: 'Municipal Agriculture Office · Hinunangan, Southern Leyte',
      heroTitle: 'Official Swine Registration & Biosecurity Surveillance System',
      heroSubtitle: 'Protecting our local hog raisers, empowering barangay focal persons with GIS mapping, and preventing African Swine Fever (ASF) in Hinunangan.',
      exploreBtn: 'Explore Registry Services',
      signInBtn: 'Sign In as Officer / Focal Person',
      statRegistered: 'Total Registered Swine',
      statBackyard: 'Backyard Raisers Supported',
      statBarangays: 'Barangays with Active Data',
      statMonth: 'Registrations This Month',
      aboutTitle: 'About Municipal Agriculture Office',
      contactUs: 'Contact & Support',
      footerNotice: 'Municipal Agriculture Office of Hinunangan, Southern Leyte. All rights reserved.'
    }
  },

  // =========================================================================
  // CEBUANO / BISAYA TRANSLATIONS (Binisaya nga Pinulongan sa Southern Leyte)
  // =========================================================================
  ceb: {
    common: {
      save: 'I-save',
      cancel: 'Kanselahon',
      delete: 'Papason',
      edit: 'Bag-uhon',
      close: 'Isira',
      actions: 'Mga Aksyon',
      filter: 'Salaon',
      search: 'Pangitaa',
      loading: 'Nag-load...',
      export: 'I-export',
      print: 'I-print',
      back: 'Balik',
      yes: 'Oo',
      no: 'Dili',
      status: 'Kahimtang',
      date: 'Petsa',
      notes: 'Mubo nga Sulat',
      details: 'Mga Detalye',
      confirm: 'Kompirmaron',
      all: 'Tanan',
      refresh: 'Bag-uhon',
      download: 'I-download',
      upload: 'I-upload',
      required: 'Gikinahanglan',
      success: 'Malampuson',
      error: 'Sayop',
      warning: 'Pahimangno',
      info: 'Kasayuran',
      offline: 'Offline',
      online: 'Online',
      synced: 'Na-sync',
      queued: 'Nalinya',
      scope: 'Sakop',
      language: 'Pinulongan',
      english: 'Iningles',
      cebuano: 'Binisaya',
      toggleLanguage: 'Balhin sa English',
      view: 'Tan-awon',
      dismiss: 'Isalikway',
      remove: 'Tangtangon',
      change: 'Ilisan'
    },
    nav: {
      dashboard: 'Dashboard',
      gis: 'GIS Mapa sa Baboy & Heatmap',
      recordsAdmin: 'Database sa Tanang Baboy',
      recordsFocal: 'Mga Rekord sa Akong Barangay',
      print: 'Pag-print sa Opisyal nga Taho',
      accounts: 'Mga Account & Settings',
      addSwine: 'Pagrehistro og Baboy',
      signOut: 'Gawas sa Sistema',
      publicPortal: 'Publikong Portal sa Baboy'
    },
    topbar: {
      executiveDashboard: 'Pangulong Dashboard',
      gisMapTitle: 'GIS Mapa sa Baboy',
      recordsAdminTitle: 'Database sa mga Rekord sa Baboy',
      recordsFocalTitle: 'Mga Rekord sa Barangay {barangay}',
      accountsTitle: 'Mga Account & Settings',
      printTitle: 'Tighimo sa Opisyal nga mga Taho',
      scopeAll: 'Sakop: Tanan 40 ka Barangay',
      scopeBarangay: 'Sakop: Brgy. {barangay}',
      liveOnline: 'Konektado (Online)',
      offlineMode: 'Offline Mode',
      queuedItems: '{count} ang Nalinya'
    },
    sidebar: {
      brandTitle: 'Hinunangan DA',
      brandSubtitle: 'Rehistro & Rekord sa Baboy',
      roleAdmin: 'Sentral nga Administrador',
      roleFocal: 'Focal Person sa Brgy. {barangay}',
      quickRegister: 'Pagrehistro og Baboy',
      installPwa: 'I-install ang App (Mugana bisan Offline)',
      signOutConfirm: 'Sigurado ka ba nga mogawas sa sistema?'
    },
    dashboard: {
      title: 'Katingbanan sa Rehistro & Pagbantay sa Baboy',
      subtitle: 'Opisyal nga Programa sa Panguma sa Hinunangan, Southern Leyte',
      totalSwine: 'Tibuok Rehistradong Baboy',
      backyardRaising: 'Pang-Backyard nga Baboy',
      vaccinatedRatio: 'Nabakunahan & Napanalipdan',
      averageWeight: 'Kasagarang Timbang (kg)',
      barangaysCovered: 'Aktibong mga Barangay',
      quickActions: 'Dali nga Pagpili & Aksyon',
      openGisMap: 'Ablihi ang GIS Mapa',
      registerNewSwine: 'Rehistro og Bag-ong Baboy',
      printOfficialReports: 'Paghimo og Taho',
      recentRegistrations: 'Bag-ong Narehistro nga mga Baboy',
      noRegistrations: 'Wala pay narehistro nga baboy.',
      biosecurityOverview: 'Ang-ang sa Biosecurity / Kalimpyo',
      purposeBreakdown: 'Katuyoan sa Pag-alima sa Baboy',
      topBarangays: 'Nag-unang Barangay sa Kadaghanon sa Baboy',
      asfRiskZoneNotice: 'Pagbantay sa African Swine Fever (ASF)',
      criticalAlert: 'Gikinahanglan ang Aksyon: Adunay tangkal nga nameligro sa kalimpyo',
      certifiedCompliant: 'Sertipikado nga Taas og Biosecurity',
      viewAllRecords: 'Tan-awa ang Tanang Rekord'
    },
    records: {
      title: 'Talaan sa mga Baboy',
      subtitleAdmin: 'Sentral nga listahan sa tanang 40 ka barangay sa Hinunangan',
      subtitleFocal: 'Talaan sa baboy alang lamang sa Barangay {barangay}',
      searchPlaceholder: 'Pangitaa pinaagi sa ear tag, ngalan sa tag-iya, purok, o kaliwat...',
      filterBarangay: 'Pilia ang Barangay',
      filterPurpose: 'Pilia ang Katuyoan',
      filterVax: 'Kahimtang sa Bakuna',
      allBarangays: 'Tanan nga Barangay',
      allPurposes: 'Tanan nga Katuyoan',
      allVaxStatus: 'Tanan nga Kahimtang',
      vaccinatedOnly: 'Nabakunahan Lamang',
      unvaccinatedOnly: 'Wala pa Mabakunahi',
      colEarTag: 'Ear Tag / ID',
      colOwner: 'Tag-iya & Numero',
      colLocation: 'Nahimutangan / Barangay',
      colBreedSex: 'Kaliwat & Sekso',
      colWeightAge: 'Timbang & Pangidaron',
      colVax: 'Bakuna & ASF',
      colBiosecurity: 'Puntos sa Biosecurity',
      colActions: 'Mga Aksyon',
      noRecordsFound: 'Walay nakit-an nga rekord sa baboy',
      noRecordsSub: 'Sulayi pag-ilis ang imong gipangita o ang filter.',
      showingRecords: 'Gipakita ang {count} sa {total} ka narehistrong baboy',
      viewOnMap: 'Tan-awa sa GIS Mapa',
      editRecord: 'Bag-uhon ang Rekord',
      deleteRecord: 'Papason ang Rekord',
      confirmDelete: 'Sigurado ka ba nga papason ang rekord sa baboy nga {earTag}? Dili na kini mabalik.'
    },
    gis: {
      mapViewTitle: 'Interaktibong GIS Mapa sa Pagbantay',
      mapViewSubtitle: 'Tinuod nga koordinasyon sa tangkal, densidad, ug ang-ang sa biosecurity',
      densityHeatmap: 'Heatmap sa Densidad sa Baboy',
      sanitationHeatmap: 'Heatmap sa Kalimpyo & Biosecurity',
      toggleHeatmap: 'Ilisdi ang Mode sa Heatmap',
      highBiosecurity: 'Level 3: Taas nga Biosecurity (85-100%)',
      mediumBiosecurity: 'Level 2: Sakto nga Biosecurity (55-84%)',
      lowBiosecurity: 'Level 1: Ubos / Peligro (<55%)',
      legendTitle: 'Giya sa Kolor sa Kalimpyo (Biosecurity)',
      legendDescription: 'Ang mga kolor sa marka nagpakita sa pagsunod sa mga lagda sa DA:',
      legendSwineClassification: 'Klasipikasyon sa Paggamit sa Baboy',
      legendBiosecurityCoding: 'Giya sa Kolor sa Puntos sa Biosecurity',
      legendGreenExplanation: 'Taas nga Biosecurity (Level 3 / 6-7 pts) — Kompleto sa footbath, koral, ug walay pasaw',
      legendYellowExplanation: 'Sakto nga Biosecurity (Level 2 / 4-5 pts) — Dunay kalimpyo apan may gamayng kakulangon',
      legendRedExplanation: 'Peligro nga kahimtang (Level 1 / 0-3 pts) — Nagpasaw, way footbath, o bukas ang tangkal',
      legendVisibleFarms: '{count} ka tangkal nga napakita',
      sanitationScore: 'Puntos sa Kalimpyo',
      captureCoords: 'Kuhaa ang Kasamtangang GPS',
      recenterMap: 'Ibalik sa Hinunangan',
      quarantineRadius: '1.0 km Kwarantina nga Sona',
      clickToAddPrompt: 'Pindota ang mapa aron marehistro ang baboy sa maong eksaktong GPS',
      farmsNearby: '{count} ka tangkal sulod sa 1 km',
      boundaryRestrictedToast: 'Ang pagrehistro sa baboy limitado lamang sa sulod sa Hinunangan municipality boundary.',
      boundaryPerimeterTitle: 'Opisyal nga Perimetro sa Munisipyo sa Hinunangan',
      satelliteAreaLabels: 'Mga Badges sa Barangay (Satellite / Hybrid)',
      streetPrecisionMarkers: 'Pinpoint Marker sa Dalan (Street View)'
    },
    modal: {
      titleNew: 'Bag-ong Pagrehistro sa Baboy',
      titleEdit: 'Pag-usab sa Rehistro — {earTag}',
      deptHeader: 'Departamento sa Agrikultura · Hinunangan',
      sectionLocation: 'Geograpikanhong Lokasyon sa Tangkal (GIS)',
      sectionOwner: 'Impormasyon sa Tag-iya & Tangkal',
      sectionSpecs: 'Karakteristika sa Baboy & Panglawas',
      sectionBiosecurity: 'Pagsusi sa Biosecurity & Kalimpyo (Pagpugong sa ASF)',
      sectionNotes: 'Mubo nga Sulat sa Pag-inspeksyon',
      earTagLabel: 'Numero sa Ear Tag / ID sa Munisipyo *',
      ownerNameLabel: 'Tibuok Ngalan sa Tag-iya *',
      contactLabel: 'Numero sa Telepono / Selpon',
      addressLabel: 'Sitio / Purok / Dalan *',
      barangayLabel: 'Designadong Barangay *',
      breedLabel: 'Kaliwat sa Baboy *',
      sexLabel: 'Sekso *',
      ageLabel: 'Pangidaron (sa Bulan) *',
      weightLabel: 'Gibanabanang Timbang (kg) *',
      purposeLabel: 'Panguna nga Katuyoan *',
      vaccinatedCheckbox: 'Nabakunahan (Hog Cholera / Swine Erysipelas)',
      asfClearedCheckbox: 'Sertipikado nga Negatibo sa ASF',
      dateRegisteredLabel: 'Petsa sa Pagrehistro *',
      photoLabel: 'Litrato sa Baboy / Tangkal (Opsyonal)',
      photoHelper: 'I-upload ang litrato sa ear tag o tangkal (awtomatikong gi-compress alang sa offline).',
      saveBtn: 'Rehistroha ang Baboy',
      updateBtn: 'I-save ang Kausaban',
      cancelBtn: 'Kanselahon'
    },
    biosecurity: {
      sectionTitle: 'Pagsunod sa Nasyonal nga Lagda sa DA Biosecurity',
      scoreLabel: 'Puntos sa Pagsunod: {score}% ({count}/{total} ka lagda ang nasunod)',
      level3High: 'Level 3: Taas nga Biosecurity (Sertipikado)',
      level2Standard: 'Level 2: Sakto nga Biosecurity (Dawat)',
      level1Basic: 'Level 1: Ubos / Peligro sa Sakit',
      footbath: {
        label: 'Pagmentinar sa Footbath',
        description: 'Adunay disinfectant footbath (sama sa Virkon S o bleach) sa entrada nga kanunay ginailisan.'
      },
      fencing: {
        label: 'Kalig-on sa Koral / Perimeter',
        description: 'Lig-on nga koral aron dili makasulod ang laing mananap, iro, o ihalas nga baboy.'
      },
      swillBan: {
        label: 'Pagbawal sa Pasaw (Zero-Swill Feeding)',
        description: 'Hingpit nga pagdili sa pagpakaon og hugaw sa kusina, kanin-baboy o tirang pagkaon subay sa balaod sa DA.'
      },
      disinfection: {
        label: 'Eskedyul sa Pagdisinfect sa Tangkal',
        description: 'Regular nga paghugas ug pag-spray og kemikal nga pangpatay sa kagaw labing menos kausa sa usa ka semana.'
      },
      visitorLog: {
        label: 'Pagkontrol sa Bisita ug Sakyanan',
        description: 'Talaan sa mga bisita, pag-ilis og botas o sapin, ug pag-spray sa ligid sa sakyanan.'
      },
      quarantinePen: {
        label: 'Tangkal nga Kwarantina / Separasyon',
        description: 'Lain nga tangkal alang sa bag-ong palit o nasakit nga baboy aron dili makapanakod (14-21 ka adlaw).'
      },
      cleanWater: {
        label: 'Protektadong Limpyong Tubig',
        description: 'Limpyo ug mainom nga suplay sa tubig nga layo sa hugaw o kanal.'
      }
    },
    notifications: {
      savedSuccess: 'Ang rekord sa baboy {earTag} malampusong narehistro.',
      updatedSuccess: 'Ang rekord sa baboy {earTag} malampusong nabag-o.',
      deletedSuccess: 'Ang rekord sa baboy {earTag} malampusong natangtang.',
      syncQueued: 'Naluwas sa imong galamiton ug nalista alang sa pag-sync sa cloud.',
      syncCompleted: 'Malampusong nahuman ang pag-sync sa cloud.',
      syncFailed: 'Napakyas ang pag-sync. Mosulay kini pag-usab inig balik sa signal.',
      offlineMode: 'Offline ka karon. Ang tanang datos maluwas sa imong selpon o kompyuter.',
      onlineRestored: 'Konektado na sa internet. Aktibo na ang realtime sync.',
      permissionDenied: 'Gidili: Wala kay pagtugot alang niini nga buhat.',
      asfAlert: 'Alerto sa ASF: Adunay nameligro nga tangkal sa {barangay}.',
      settingsSaved: 'Malampusong naluwas ang mga setting sa sistema.'
    },
    landing: {
      navServices: 'Mga Programa & Serbisyo',
      navAbout: 'Mahitungod sa Opisina',
      navRegistry: 'Portal sa Rehistro sa Baboy',
      loginBtn: 'Sulod (Portal sa Staff)',
      heroBadge: 'Opisina sa Agrikultura sa Munisipyo · Hinunangan, Southern Leyte',
      heroTitle: 'Opisyal nga Rehistro sa Baboy & Sistema sa Pagbantay sa Biosecurity',
      heroSubtitle: 'Pagpanalipod sa atong mga mag-uuma sa baboy, paghatag og GIS mapping sa mga focal person, ug paglikay sa African Swine Fever (ASF) sa Hinunangan.',
      exploreBtn: 'Susiha ang mga Serbisyo',
      signInBtn: 'Sulod isip Opisyal / Focal Person',
      statRegistered: 'Tibuok Rehistradong Baboy',
      statBackyard: 'Mag-uuma nga Natabangan',
      statBarangays: 'Barangay nga Adunay Datos',
      statMonth: 'Narehistro Karong Bulana',
      aboutTitle: 'Mahitungod sa Municipal Agriculture Office',
      contactUs: 'Pakigkita & Suporta',
      footerNotice: 'Municipal Agriculture Office sa Hinunangan, Southern Leyte. Tanan katungod gigahin.'
    }
  }
};
