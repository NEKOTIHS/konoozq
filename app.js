(() => {
  'use strict';


  /* =========================================================
     CONSTANTS
     ========================================================= */

  const categories = {
    flight: {
      label: 'الطيران',
      icon: '✈'
    },

    hotel: {
      label: 'الفنادق',
      icon: '⌂'
    },

    transfer: {
      label: 'التنقلات',
      icon: '↔'
    },

    activity: {
      label: 'الأنشطة',
      icon: '✦'
    }
  };


  const LEGACY_STORAGE_KEY =
    'konooz-tourism-quote-malaysia-request-v4';


  const OFFERS_STORAGE_KEY =
    'konooz-tourism-saved-offers-v1';


  const ACTIVE_OFFER_KEY =
    'konooz-tourism-active-offer-v1';


  const USER_NAME_KEY =
    'konooz-user-name-v1';


  const GOOGLE_DRIVE_CONSENT_KEY =
    'konooz-google-drive-consent-v1';


  const GOOGLE_CLIENT_ID =
    '50537229482-vke9e22htlfn1ec570u3ehrba1b4dqjb.apps.googleusercontent.com';


  const GOOGLE_DRIVE_SCOPE =
    'https://www.googleapis.com/auth/drive.file';


  const DRIVE_FOLDER_NAME =
    'Konooz Quotes';


  const DRIVE_OFFERS_FILE_NAME =
    'offers.json';


  const DRIVE_APP_KEY =
    'konoozTravelApp';


  const DRIVE_APP_VALUE =
    'quotes-v1';


  const DRIVE_FOLDER_KIND =
    'quotes-folder';


  const DRIVE_OFFERS_KIND =
    'offers-file';


  /* =========================================================
     GOOGLE STATE
     ========================================================= */

  let googleAccessToken =
    null;


  let googleTokenClient =
    null;


  let googleTokenExpiresAt =
    0;


  let googleDriveInitPromise =
    null;


  let googleAuthRequest =
    null;


  let driveFolderId =
    null;


  let driveOffersFileId =
    null;


  let driveSyncTimer =
    null;


  let driveSyncRunning =
    false;


  let pendingDriveOffers =
    null;


  /* =========================================================
     SELECTORS
     ========================================================= */

  const $ =
    selector =>
      document.querySelector(
        selector
      );


  const $$ =
    selector => [
      ...document.querySelectorAll(
        selector
      )
    ];


  /* =========================================================
     FIXED COPY
     ========================================================= */

  const defaultCopy = {
    brandName:
      'كنوز السفر',

    brandTagline:
      'اسم المستخدم',

    editorEyebrow:
      'عرض مبدئي قابل للتعديل',

    editorTitle:
      'رحلة خاصة',

    editorSubtitle:
      'طلب سفر قابل للتعديل.',

    clientWelcome:
      'عرض مخصص لـ',

    clientHeroTitle:
      '{destination} تنتظركم',

    clientHeroSubtitle:
      'رحلة مصممة بعناية من {origin} إلى {destination}',

    flightsTitle:
      'رحلات الطيران',

    flightsSubtitle:
      'تفاصيل الرحلات',

    hotelsTitle:
      'الفنادق',

    hotelsSubtitle:
      'تفاصيل الإقامة',

    transfersTitle:
      'التنقلات',

    transfersSubtitle:
      'خدمات النقل',

    activitiesTitle:
      'الأنشطة',

    activitiesSubtitle:
      'التجارب المختارة',

    itineraryTitle:
      'برنامج الرحلة',

    itinerarySubtitle:
      'يوماً بيوم',

    priceTitle:
      'إجمالي سعر الباقة',

    notesTitle:
      'ملاحظات مهمة',

    footerText:
      'نسعد بخدمتكم وصناعة رحلة لا تنسى'
  };


  /* =========================================================
     USER PROFILE
     ========================================================= */

  function getUserName() {
    const value =
      localStorage.getItem(
        USER_NAME_KEY
      );


    return (
      value ||
      'اسم المستخدم'
    ).trim();
  }


  function saveUserName(
    value
  ) {
    const userName =
      String(
        value || ''
      ).trim();


    if (
      userName
    ) {
      localStorage.setItem(
        USER_NAME_KEY,
        userName
      );
    } else {
      localStorage.removeItem(
        USER_NAME_KEY
      );
    }


    return getUserName();
  }


  /* =========================================================
     BASIC HELPERS
     ========================================================= */

  function toNumber(
    value,
    fallback = 0
  ) {
    const number =
      Number(value);


    return Number.isFinite(
      number
    )
      ? number
      : fallback;
  }


  function escapeHtml(
    value = ''
  ) {
    return String(value)
      .replace(
        /[&<>'"]/g,

        character => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;'
        })[character]
      );
  }


  function toast(
    message
  ) {
    const element =
      $('#toast');


    if (
      !element
    ) {
      return;
    }


    element.textContent =
      message;


    element.classList.add(
      'show'
    );


    clearTimeout(
      toast.timer
    );


    toast.timer =
      setTimeout(
        () => {
          element.classList.remove(
            'show'
          );
        },
        2400
      );
  }


  function nextFrame() {
    return new Promise(
      resolve => {
        requestAnimationFrame(
          () => {
            requestAnimationFrame(
              resolve
            );
          }
        );
      }
    );
  }


  /* =========================================================
     NUMBER FORMAT
     ========================================================= */

  const englishNumber =
    new Intl.NumberFormat(
      'en-US',
      {
        maximumFractionDigits: 2
      }
    );


  const money = {
    format(
      value
    ) {
      return (
        `${englishNumber.format(
          toNumber(
            value
          )
        )} SAR`
      );
    }
  };


  /* =========================================================
     DATE HELPERS
     ========================================================= */

  const clientMonths = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ];


  const monthNames = {
    يناير: 1,
    january: 1,
    jan: 1,

    فبراير: 2,
    february: 2,
    feb: 2,

    مارس: 3,
    march: 3,
    mar: 3,

    ابريل: 4,
    أبريل: 4,
    april: 4,
    apr: 4,

    مايو: 5,
    may: 5,

    يونيو: 6,
    june: 6,
    jun: 6,

    يوليو: 7,
    july: 7,
    jul: 7,

    اغسطس: 8,
    أغسطس: 8,
    august: 8,
    aug: 8,

    سبتمبر: 9,
    september: 9,
    sep: 9,
    sept: 9,

    اكتوبر: 10,
    أكتوبر: 10,
    october: 10,
    oct: 10,

    نوفمبر: 11,
    november: 11,
    nov: 11,

    ديسمبر: 12,
    december: 12,
    dec: 12
  };


  function normalizeDigits(
    value = ''
  ) {
    const arabic =
      '٠١٢٣٤٥٦٧٨٩';


    const persian =
      '۰۱۲۳۴۵۶۷۸۹';


    return String(value)
      .replace(
        /[٠-٩]/g,

        digit =>
          arabic.indexOf(
            digit
          )
      )
      .replace(
        /[۰-۹]/g,

        digit =>
          persian.indexOf(
            digit
          )
      );
  }


  function expandedYear(
    value
  ) {
    const year =
      Number(value);


    return year < 100
      ? 2000 + year
      : year;
  }


  function parseFlexibleDate(
    value = ''
  ) {
    const original =
      normalizeDigits(
        value
      )
        .trim()
        .replace(
          /[،,]/g,
          ' '
        )
        .replace(
          /\s+/g,
          ' '
        );


    if (
      !original
    ) {
      return {
        display: '',
        dateKey: '',
        valid: true
      };
    }


    let year;
    let month;
    let day;


    let match =
      original.match(
        /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/
      );


    if (
      match
    ) {
      year =
        Number(
          match[1]
        );


      month =
        Number(
          match[2]
        );


      day =
        Number(
          match[3]
        );
    }


    if (
      !match
    ) {
      match =
        original.match(
          /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})$/
        );


      if (
        match
      ) {
        day =
          Number(
            match[1]
          );


        month =
          Number(
            match[2]
          );


        year =
          expandedYear(
            match[3]
          );
      }
    }


    if (
      !match
    ) {
      match =
        original.match(
          /^(\d{1,2})\s+([\p{L}.]+)\s+(\d{2,4})$/iu
        );


      if (
        match
      ) {
        day =
          Number(
            match[1]
          );


        month =
          monthNames[
            match[2]
              .replace(
                /\./g,
                ''
              )
              .toLowerCase()
          ];


        year =
          expandedYear(
            match[3]
          );
      }
    }


    if (
      !match
    ) {
      match =
        original.match(
          /^([\p{L}.]+)\s+(\d{1,2})\s+(\d{2,4})$/iu
        );


      if (
        match
      ) {
        month =
          monthNames[
            match[1]
              .replace(
                /\./g,
                ''
              )
              .toLowerCase()
          ];


        day =
          Number(
            match[2]
          );


        year =
          expandedYear(
            match[3]
          );
      }
    }


    const valid =
      Boolean(
        match &&
        Number.isFinite(
          year
        ) &&
        Number.isFinite(
          month
        ) &&
        Number.isFinite(
          day
        ) &&
        year >= 1900 &&
        year <= 2200 &&
        month >= 1 &&
        month <= 12 &&
        day >= 1 &&
        day <=
          new Date(
            year,
            month,
            0
          ).getDate()
      );


    if (
      !valid
    ) {
      return {
        display:
          original,

        dateKey:
          '',

        valid:
          false
      };
    }


    return {
      display:
        `${day}/${month}/${year}`,

      dateKey:
        `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,

      valid:
        true
    };
  }


  function parseFlexibleTime(
    value = ''
  ) {
    const original =
      normalizeDigits(
        value
      )
        .trim()
        .replace(
          /\s+/g,
          ' '
        );


    if (
      !original
    ) {
      return {
        display: '',
        minutes: null,
        valid: true
      };
    }


    const match =
      original.match(
        /^(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM|A\.M\.|P\.M\.|ص|م|صباحا|صباحًا|مساء|مساءً)?$/i
      );


    if (
      !match
    ) {
      return {
        display:
          original,

        minutes:
          null,

        valid:
          false
      };
    }


    let hour =
      Number(
        match[1]
      );


    const minute =
      Number(
        match[2] || 0
      );


    const suffix =
      (
        match[3] ||
        ''
      ).toUpperCase();


    const isPm =
      [
        'PM',
        'P.M.',
        'م',
        'مساء',
        'مساءً'
      ].includes(
        suffix
      );


    const isAm =
      [
        'AM',
        'A.M.',
        'ص',
        'صباحا',
        'صباحًا'
      ].includes(
        suffix
      );


    if (
      minute > 59
    ) {
      return {
        display:
          original,

        minutes:
          null,

        valid:
          false
      };
    }


    if (
      (
        isPm ||
        isAm
      ) &&
      (
        hour < 1 ||
        hour > 12
      )
    ) {
      return {
        display:
          original,

        minutes:
          null,

        valid:
          false
      };
    }


    if (
      !isPm &&
      !isAm &&
      hour > 23
    ) {
      return {
        display:
          original,

        minutes:
          null,

        valid:
          false
      };
    }


    if (
      isPm &&
      hour < 12
    ) {
      hour +=
        12;
    }


    if (
      isAm &&
      hour === 12
    ) {
      hour =
        0;
    }


    return {
      display:
        `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`,

      minutes:
        hour * 60 +
        minute,

      valid:
        true
    };
  }


  function formatClientDate(
    date
  ) {
    if (
      !(date instanceof Date) ||
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '';
    }


    return (
      `${String(date.getDate()).padStart(2, '0')} ${clientMonths[date.getMonth()]}`
    );
  }


  function formatFlexibleClientDate(
    value
  ) {
    const parsed =
      parseFlexibleDate(
        value
      );


    if (
      !parsed.dateKey
    ) {
      return value || '';
    }


    const date =
      new Date(
        `${parsed.dateKey}T00:00:00`
      );


    return formatClientDate(
      date
    );
  }


  function hotelDateTimestamp(
    value
  ) {
    const parsed =
      parseFlexibleDate(
        value
      );


    if (
      !parsed.dateKey
    ) {
      return null;
    }


    const time =
      new Date(
        `${parsed.dateKey}T00:00:00`
      ).getTime();


    return Number.isFinite(
      time
    )
      ? time
      : null;
  }


  function clientDateTime(
    dateValue = '',
    timeValue = ''
  ) {
    const dateText =
      dateValue ||
      'غير محدد';


    const timeText =
      timeValue
        ? ` - ${timeValue}`
        : '';


    return (
      `${dateText}${timeText}`
    );
  }


  function dayCount() {
    const startInput =
      $('#startDate');


    const endInput =
      $('#endDate');


    if (
      !startInput ||
      !endInput
    ) {
      return 0;
    }


    const start =
      new Date(
        `${startInput.value}T00:00:00`
      );


    const end =
      new Date(
        `${endInput.value}T00:00:00`
      );


    if (
      Number.isNaN(
        start.getTime()
      ) ||
      Number.isNaN(
        end.getTime()
      ) ||
      end < start
    ) {
      return 0;
    }


    return (
      Math.round(
        (
          end -
          start
        ) /
        86400000
      ) +
      1
    );
  }


  /* =========================================================
     FLIGHT SEGMENTS
     ========================================================= */

  function createSegment(
    from = '',
    to = '',
    departureDate = '',
    departureTime = '',
    arrivalDate = '',
    arrivalTime = '',
    price = 0,
    extraDetails = ''
  ) {
    return {
      id:
        `seg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,

      from,
      to,
      departureDate,
      departureTime,
      arrivalDate,
      arrivalTime,
      price,
      extraDetails
    };
  }


  function ensureFlightSegments(
    item
  ) {
    if (
      item.category !==
      'flight'
    ) {
      return [];
    }


    if (
      !Array.isArray(
        item.segments
      )
    ) {
      item.segments =
        [];


      if (
        item.departureDate ||
        item.returnDate
      ) {
        item.segments.push(
          createSegment(
            $('#origin')?.value || '',
            $('#destination')?.value || '',
            item.departureDate || '',
            item.departureTime || ''
          )
        );


        item.segments.push(
          createSegment(
            $('#destination')?.value || '',
            $('#origin')?.value || '',
            item.returnDate || '',
            item.returnTime || ''
          )
        );
      }


      if (
        !item.segments.length
      ) {
        item.segments.push(
          createSegment()
        );
      }


      delete item.departureDate;
      delete item.departureTime;
      delete item.returnDate;
      delete item.returnTime;
    }


    item.segments =
      item.segments.map(
        segment => ({
          id:
            segment.id ||
            `seg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,

          from:
            segment.from || '',

          to:
            segment.to || '',

          departureDate:
            segment.departureDate || '',

          departureTime:
            segment.departureTime || '',

          arrivalDate:
            segment.arrivalDate || '',

          arrivalTime:
            segment.arrivalTime || '',

          price:
            Math.max(
              0,
              toNumber(
                segment.price
              )
            ),

          extraDetails:
            segment.extraDetails || ''
        })
      );


    return item.segments;
  }


  /* =========================================================
     SAMPLE
     ========================================================= */

  const sample = {
    services: [
      {
        id:
          'f1',

        category:
          'flight',

        name:
          'تذاكر الطيران الدولي',

        details:
          'الدرجة السياحية',

        segments: [
          {
            id:
              'seg-outbound',

            from:
              'جدة',

            to:
              'كوالالمبور',

            departureDate:
              '6/10/2026',

            departureTime:
              '9:55 PM',

            arrivalDate:
              '7/10/2026',

            arrivalTime:
              '9:30 AM',

            price:
              0,

            extraDetails:
              ''
          },

          {
            id:
              'seg-return',

            from:
              'كوالالمبور',

            to:
              'جدة',

            departureDate:
              '20/10/2026',

            departureTime:
              '2:20 PM',

            arrivalDate:
              '20/10/2026',

            arrivalTime:
              '9:10 PM',

            price:
              0,

            extraDetails:
              ''
          }
        ],

        costMode:
          'total',

        qty:
          2,

        cost:
          0
      },

      {
        id:
          'h1',

        category:
          'hotel',

        city:
          'سلنجور',

        name:
          'فندق صن واي برايميد',

        details:
          'غرفة مطلة على الملاهي',

        checkIn:
          '6/10/2026',

        checkInTime:
          '3:00 PM',

        checkOut:
          '8/10/2026',

        checkOutTime:
          '12:00 PM',

        hotelTax:
          0,

        costMode:
          'total',

        qty:
          2,

        cost:
          0
      },

      {
        id:
          'h2',

        category:
          'hotel',

        city:
          'لانكاوي',

        name:
          'منتجع برجايا',

        details:
          'غرفة مع جاكوزي',

        checkIn:
          '8/10/2026',

        checkInTime:
          '3:00 PM',

        checkOut:
          '11/10/2026',

        checkOutTime:
          '12:00 PM',

        hotelTax:
          0,

        costMode:
          'total',

        qty:
          2,

        cost:
          0
      },

      {
        id:
          'h3',

        category:
          'hotel',

        city:
          'بينينغ',

        name:
          'فندق رويال بارك',

        details:
          'بلكونة مطلة على البحر',

        checkIn:
          '11/10/2026',

        checkInTime:
          '3:00 PM',

        checkOut:
          '13/10/2026',

        checkOutTime:
          '12:00 PM',

        hotelTax:
          0,

        costMode:
          'total',

        qty:
          2,

        cost:
          0
      },

      {
        id:
          'h4',

        category:
          'hotel',

        city:
          'كاميرون',

        name:
          'فندق زينث كاميرون',

        details:
          'غرفة ديلوكس',

        checkIn:
          '13/10/2026',

        checkInTime:
          '3:00 PM',

        checkOut:
          '15/10/2026',

        checkOutTime:
          '12:00 PM',

        hotelTax:
          0,

        costMode:
          'total',

        qty:
          2,

        cost:
          0
      },

      {
        id:
          'h5',

        category:
          'hotel',

        city:
          'كوالالمبور',

        name:
          'فندق جي دبليو ماريوت',

        details:
          'غرفة ديلوكس',

        checkIn:
          '15/10/2026',

        checkInTime:
          '3:00 PM',

        checkOut:
          '18/10/2026',

        checkOutTime:
          '12:00 PM',

        hotelTax:
          0,

        costMode:
          'total',

        qty:
          2,

        cost:
          0
      },

      {
        id:
          'h6',

        category:
          'hotel',

        city:
          'كوالالمبور',

        name:
          'فندق تريدرس',

        details:
          'غرفة مطلة على البرجين',

        checkIn:
          '18/10/2026',

        checkInTime:
          '3:00 PM',

        checkOut:
          '20/10/2026',

        checkOutTime:
          '12:00 PM',

        hotelTax:
          0,

        costMode:
          'total',

        qty:
          2,

        cost:
          0
      },

      {
        id:
          't1',

        category:
          'transfer',

        name:
          'التنقلات بين المدن والمطارات',

        details:
          'سيارة خاصة',

        costMode:
          'total',

        qty:
          1,

        cost:
          0
      }
    ],

    itinerary:
      [],

    hotelCities: [
      'سلنجور',
      'لانكاوي',
      'بينينغ',
      'كاميرون',
      'كوالالمبور'
    ]
  };


  /* =========================================================
     STATE
     ========================================================= */

  let state = {
    services:
      structuredClone(
        sample.services
      ),

    itinerary:
      [],

    childAges:
      [],

    hotelCities:
      structuredClone(
        sample.hotelCities
      ),

    copy: {
      ...structuredClone(
        defaultCopy
      ),

      brandTagline:
        getUserName()
    }
  };


  /* =========================================================
     STATE MIGRATION
     ========================================================= */

  function ensureStateStructure() {
    if (
      !Array.isArray(
        state.services
      )
    ) {
      state.services =
        [];
    }


    if (
      !Array.isArray(
        state.itinerary
      )
    ) {
      state.itinerary =
        [];
    }


    if (
      !Array.isArray(
        state.childAges
      )
    ) {
      state.childAges =
        [];
    }


    /*
     * جميع نصوص النظام ثابتة من الكود.
     * لا نعتمد على النصوص المخزنة داخل العرض.
     */
    state.copy = {
      ...structuredClone(
        defaultCopy
      ),

      brandTagline:
        getUserName()
    };


    if (
      !Array.isArray(
        state.hotelCities
      )
    ) {
      state.hotelCities =
        Array.isArray(
          state.hotelCountries
        )
          ? [
              ...state.hotelCountries
            ]
          : [];
    }


    delete state.hotelCountries;


    state.services.forEach(
      item => {
        item.id =
          item.id ||
          `service-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;


        item.qty =
          Math.max(
            1,
            toNumber(
              item.qty,
              1
            )
          );


        item.cost =
          Math.max(
            0,
            toNumber(
              item.cost
            )
          );


        item.costMode =
          item.costMode ===
          'unit'
            ? 'unit'
            : 'total';


        if (
          item.category ===
          'hotel'
        ) {
          item.city =
            String(
              item.city ||
              item.country ||
              'غير محددة'
            ).trim();


          delete item.country;
          delete item.breakfastType;
          delete item.breakfastOther;


          item.checkInTime =
            item.checkInTime ||
            '';


          item.checkOutTime =
            item.checkOutTime ||
            '';


          item.hotelTax =
            Math.max(
              0,
              toNumber(
                item.hotelTax
              )
            );


          if (
            item.city &&
            !state.hotelCities.includes(
              item.city
            )
          ) {
            state.hotelCities.push(
              item.city
            );
          }
        }


        if (
          item.category ===
          'flight'
        ) {
          ensureFlightSegments(
            item
          );
        }
      }
    );


    state.hotelCities = [
      ...new Set(
        state.hotelCities
          .map(
            value =>
              String(
                value
              ).trim()
          )
          .filter(
            Boolean
          )
      )
    ];
  }


  /* =========================================================
     HOTEL
     ========================================================= */

  function hotelNights(
    item
  ) {
    const checkIn =
      hotelDateTimestamp(
        item.checkIn
      );


    const checkOut =
      hotelDateTimestamp(
        item.checkOut
      );


    if (
      checkIn ===
        null ||
      checkOut ===
        null
    ) {
      return 0;
    }


    return Math.max(
      0,

      Math.round(
        (
          checkOut -
          checkIn
        ) /
        86400000
      )
    );
  }


  /* =========================================================
     PRICING
     ========================================================= */

  function serviceTotal(
    item
  ) {
    const enteredCost =
      Math.max(
        0,
        toNumber(
          item.cost
        )
      );


    const baseCost =
      item.costMode ===
      'unit'
        ? (
            Math.max(
              0,
              toNumber(
                item.qty
              )
            ) *
            enteredCost
          )
        : enteredCost;


    const hotelTax =
      item.category ===
      'hotel'
        ? Math.max(
            0,
            toNumber(
              item.hotelTax
            )
          )
        : 0;


    const flightPrices =
      item.category ===
      'flight'
        ? ensureFlightSegments(
            item
          ).reduce(
            (
              sum,
              segment
            ) =>
              sum +
              Math.max(
                0,
                toNumber(
                  segment.price
                )
              ),
            0
          )
        : 0;


    return (
      baseCost +
      hotelTax +
      flightPrices
    );
  }


  function totals() {
    const cost =
      state.services.reduce(
        (
          sum,
          item
        ) =>
          sum +
          serviceTotal(
            item
          ),
        0
      );


    const markupValue =
      Math.max(
        0,
        toNumber(
          $('#markupValue')?.value
        )
      );


    const markupType =
      $('#markupType')
        ?.value ||
      'percent';


    const profit =
      markupType ===
      'fixed'
        ? markupValue
        : (
            cost *
            markupValue /
            100
          );


    const subtotal =
      cost +
      profit;


    const vatEnabled =
      Boolean(
        $('#vatEnabled')
          ?.checked
      );


    const vat =
      vatEnabled
        ? subtotal * .15
        : 0;


    const total =
      subtotal +
      vat;


    const travelers =
      Math.max(
        0,
        toNumber(
          $('#adults')?.value
        )
      ) +
      Math.max(
        0,
        toNumber(
          $('#children')?.value
        )
      );


    return {
      cost,
      profit,
      subtotal,
      vat,
      total,
      travelers,

      perTraveler:
        travelers
          ? total /
            travelers
          : 0,

      margin:
        subtotal
          ? (
              profit /
              subtotal *
              100
            )
          : 0
    };
  }


  /* =========================================================
     FIXED COPY
     ========================================================= */

  function replaceCopyTokens(
    value = ''
  ) {
    const destination =
      $('#destination')
        ?.value
        .trim()
        .split(
          /\s+-\s+/
        )[0]
        .trim() ||
      '';


    const origin =
      $('#origin')
        ?.value
        .trim() ||
      '';


    return String(
      value
    )
      .replaceAll(
        '{destination}',
        destination
      )
      .replaceAll(
        '{origin}',
        origin
      );
  }


  function applyCopy() {
    ensureStateStructure();


    state.copy = {
      ...structuredClone(
        defaultCopy
      ),

      brandTagline:
        getUserName()
    };


    const copy =
      state.copy;


    document.title =
      `${copy.brandName} - عروض السفر`;


    const values = {
      appBrandName:
        copy.brandName,

      appBrandTagline:
        copy.brandTagline,

      editorEyebrow:
        copy.editorEyebrow,

      editorTitle:
        copy.editorTitle,

      editorSubtitle:
        copy.editorSubtitle,

      clientBrandName:
        copy.brandName,

      clientBrandTagline:
        copy.brandTagline,

      clientWelcomeText:
        copy.clientWelcome,

      clientFlightsTitle:
        copy.flightsTitle,

      clientFlightsSubtitle:
        copy.flightsSubtitle,

      clientHotelsTitle:
        copy.hotelsTitle,

      clientHotelsSubtitle:
        copy.hotelsSubtitle,

      clientTransfersTitle:
        copy.transfersTitle,

      clientTransfersSubtitle:
        copy.transfersSubtitle,

      clientActivitiesTitle:
        copy.activitiesTitle,

      clientActivitiesSubtitle:
        copy.activitiesSubtitle,

      clientItineraryTitle:
        copy.itineraryTitle,

      clientItinerarySubtitle:
        copy.itinerarySubtitle,

      clientPriceTitle:
        copy.priceTitle,

      clientNotesTitle:
        copy.notesTitle,

      clientFooterBrand:
        `${copy.brandName} للسياحة والسفر`,

      clientFooterText:
        copy.footerText,

      clientFooterThanks:
        `شكراً لاختياركم ${copy.brandName}`
    };


    Object.entries(
      values
    ).forEach(
      (
        [
          id,
          value
        ]
      ) => {
        const element =
          $(`#${id}`);


        if (
          element
        ) {
          element.textContent =
            value;
        }
      }
    );


    /*
 * الشعار الرسمي الثابت.
 */
$$('.brand-mark')
  .forEach(
    mark => {
      mark.replaceChildren();


      const image =
        document.createElement(
          'img'
        );


      image.src =
        './assets/logo.png';


      image.alt =
        'كنوز السفر';


      image.className =
        'brand-logo-image';


      mark.appendChild(
        image
      );
    }
  );

    /*
     * النصوص ظاهرة في صفحة الإعدادات كما هي.
     * الحقل الوحيد القابل للتعديل هو brandTagline.
     */
    $$(
      '[data-copy-key]'
    ).forEach(
      input => {
        const key =
          input.dataset.copyKey;


        const editable =
          key ===
          'brandTagline';


        if (
          'readOnly' in
          input
        ) {
          input.readOnly =
            !editable;
        }


        if (
          input.tagName ===
          'SELECT'
        ) {
          input.disabled =
            !editable;
        }


        input.classList.toggle(
          'copy-field-locked',
          !editable
        );


        if (
          document.activeElement !==
          input
        ) {
          input.value =
            editable
              ? getUserName()
              : (
                  defaultCopy[
                    key
                  ] ||
                  ''
                );
        }
      }
    );
  }


  /* =========================================================
     SERVICE LABELS
     ========================================================= */

  function categoryLabel(
    category
  ) {
    const copyKeys = {
      flight:
        'flightsTitle',

      hotel:
        'hotelsTitle',

      transfer:
        'transfersTitle',

      activity:
        'activitiesTitle'
    };


    return (
      state.copy[
        copyKeys[
          category
        ]
      ] ||
      categories[
        category
      ]?.label ||
      category
    );
  }


  function serviceDetailsLabel(
    item
  ) {
    if (
      item.category ===
      'hotel'
    ) {
      return 'نوع الغرفة';
    }


    if (
      item.category ===
      'flight'
    ) {
      return 'درجة الطيران';
    }


    return 'التفاصيل';
  }


  function serviceQtyLabel(
    item
  ) {
    if (
      item.category ===
      'hotel'
    ) {
      return 'عدد الأشخاص';
    }


    return 'الكمية';
  }


  /* =========================================================
     SERVICE SCHEDULE
     ========================================================= */

  function serviceScheduleFields(
    item
  ) {
    if (
      item.category ===
      'hotel'
    ) {
      return `
        <div class="service-dates service-dates-hotel">

          <label>
            المدينة

            <input
              data-field="city"
              type="text"
              list="hotelCitiesList"
              value="${escapeHtml(item.city || '')}"
            >
          </label>

          <label>
            تاريخ الدخول

            <input
              class="hotel-date-input"
              data-field="checkIn"
              data-hotel-date="true"
              type="text"
              value="${escapeHtml(item.checkIn || '')}"
              placeholder="18/10/2026"
              dir="ltr"
              autocomplete="off"
            >
          </label>

          <label>
            وقت الدخول

            <input
              class="hotel-time-input"
              data-field="checkInTime"
              data-hotel-time="true"
              type="text"
              value="${escapeHtml(item.checkInTime || '')}"
              placeholder="15:00"
              dir="ltr"
              autocomplete="off"
            >
          </label>

          <label>
            تاريخ الخروج

            <input
              class="hotel-date-input"
              data-field="checkOut"
              data-hotel-date="true"
              type="text"
              value="${escapeHtml(item.checkOut || '')}"
              placeholder="20/10/2026"
              dir="ltr"
              autocomplete="off"
            >
          </label>

          <label>
            وقت الخروج

            <input
              class="hotel-time-input"
              data-field="checkOutTime"
              data-hotel-time="true"
              type="text"
              value="${escapeHtml(item.checkOutTime || '')}"
              placeholder="12:00"
              dir="ltr"
              autocomplete="off"
            >
          </label>

          <label>
            ضريبة الفندق

            <input
              data-field="hotelTax"
              type="number"
              min="0"
              step="0.01"
              value="${Math.max(0, toNumber(item.hotelTax))}"
            >
          </label>

        </div>
      `;
    }


    if (
      item.category ===
      'flight'
    ) {
      return `
        <div class="service-dates flight-segments">

          <div class="flight-segments-head">

            <div>

              <strong>
                رحلات ومواعيد الطيران
              </strong>

              <span>
                اسحب المقاطع لتغيير ترتيبها.
              </span>

            </div>

            <button
              class="add-flight-segment"
              type="button"
            >
              + إضافة رحلة
            </button>

          </div>

          <div class="flight-segments-list">

            ${
              ensureFlightSegments(
                item
              )
                .map(
                  (
                    segment,
                    index
                  ) => `
                    <details
                      class="flight-segment"
                      data-segment-id="${escapeHtml(segment.id)}"
                      ${index === 0 ? 'open' : ''}
                    >

                      <summary>

                        <b
                          class="segment-drag-handle"
                          draggable="true"
                        >
                          ⋮⋮
                        </b>

                        <span>
                          الرحلة ${index + 1}
                        </span>

                        <strong>
                          ${escapeHtml(
                            [
                              segment.from,
                              segment.to
                            ]
                              .filter(Boolean)
                              .join(' ← ') ||
                            'رحلة جديدة'
                          )}
                        </strong>

                        <small>
                          ${escapeHtml(
                            [
                              segment.departureDate,
                              segment.departureTime
                            ]
                              .filter(Boolean)
                              .join('، ') ||
                            'أضف الموعد'
                          )}
                        </small>

                      </summary>

                      <div class="segment-fields">

                        <label>
                          من

                          <input
                            data-segment-field="from"
                            type="text"
                            value="${escapeHtml(segment.from || '')}"
                          >
                        </label>

                        <label>
                          إلى

                          <input
                            data-segment-field="to"
                            type="text"
                            value="${escapeHtml(segment.to || '')}"
                          >
                        </label>

                        <label>
                          تاريخ الإقلاع

                          <input
                            data-segment-field="departureDate"
                            data-segment-kind="date"
                            type="text"
                            value="${escapeHtml(segment.departureDate || '')}"
                            dir="ltr"
                          >
                        </label>

                        <label>
                          وقت الإقلاع

                          <input
                            data-segment-field="departureTime"
                            data-segment-kind="time"
                            type="text"
                            value="${escapeHtml(segment.departureTime || '')}"
                            dir="ltr"
                          >
                        </label>

                        <label>
                          تاريخ الوصول

                          <input
                            data-segment-field="arrivalDate"
                            data-segment-kind="date"
                            type="text"
                            value="${escapeHtml(segment.arrivalDate || '')}"
                            dir="ltr"
                          >
                        </label>

                        <label>
                          وقت الوصول

                          <input
                            data-segment-field="arrivalTime"
                            data-segment-kind="time"
                            type="text"
                            value="${escapeHtml(segment.arrivalTime || '')}"
                            dir="ltr"
                          >
                        </label>

                        <label>
                          سعر الرحلة

                          <input
                            data-segment-field="price"
                            type="number"
                            min="0"
                            step="0.01"
                            value="${Math.max(0, toNumber(segment.price))}"
                          >
                        </label>

                        <label class="segment-extra-details">
                          تفاصيل إضافية

                          <input
                            data-segment-field="extraDetails"
                            type="text"
                            value="${escapeHtml(segment.extraDetails || '')}"
                          >
                        </label>

                      </div>

                      <button
                        class="remove-flight-segment"
                        type="button"
                      >
                        حذف هذه الرحلة
                      </button>

                    </details>
                  `
                )
                .join('')
            }

          </div>

        </div>
      `;
    }


    return '';
  }


  function serviceRow(
    item
  ) {
    const hotelDragHandle =
      item.category ===
      'hotel'
        ? `
          <div
            class="hotel-drag-handle"
            draggable="true"
            title="اسحب لتغيير ترتيب الفندق"
          >

            <span class="hotel-drag-grip">
              ⋮⋮
            </span>

            <span>
              اسحب لترتيب الفندق
            </span>

          </div>
        `
        : '';


    return `
      <div
        class="service-row ${
          item.category ===
          'hotel'
            ? 'hotel-service-row'
            : ''
        }"
        data-id="${escapeHtml(item.id)}"
        ${
          item.category ===
          'hotel'
            ? `data-hotel-city="${escapeHtml(item.city || '')}"`
            : ''
        }
      >

        ${hotelDragHandle}

        <label>
          اسم الخدمة

          <input
            data-field="name"
            type="text"
            value="${escapeHtml(item.name || '')}"
          >
        </label>

        <label>
          ${serviceDetailsLabel(item)}

          <input
            data-field="details"
            type="text"
            value="${escapeHtml(item.details || '')}"
            placeholder="${
              item.category ===
              'hotel'
                ? 'مثال: غرفة ديلوكس مطلة على البحر'
                : item.category ===
                  'flight'
                    ? 'مثال: الدرجة السياحية'
                    : ''
            }"
          >
        </label>

        <label>
          نوع التكلفة

          <select data-field="costMode">

            <option
              value="total"
              ${
                item.costMode !==
                'unit'
                  ? 'selected'
                  : ''
              }
            >
              إجمالية
            </option>

            <option
              value="unit"
              ${
                item.costMode ===
                'unit'
                  ? 'selected'
                  : ''
              }
            >
              للوحدة
            </option>

          </select>
        </label>

        <label>
          ${serviceQtyLabel(item)}

          <input
            data-field="qty"
            type="number"
            min="1"
            step="1"
            value="${Math.max(1, toNumber(item.qty, 1))}"
          >
        </label>

        <label class="cost-field">

          <span>
            ${
              item.costMode ===
              'unit'
                ? 'تكلفة الوحدة'
                : 'التكلفة الإجمالية'
            }
          </span>

          <input
            data-field="cost"
            type="number"
            min="0"
            step="0.01"
            value="${Math.max(0, toNumber(item.cost))}"
          >

        </label>

        <div class="line-total">
          ${money.format(serviceTotal(item))}
        </div>

        <button
          class="remove-service"
          type="button"
          aria-label="حذف الخدمة"
        >
          ×
        </button>

        ${serviceScheduleFields(item)}

      </div>
    `;
  }


  function hotelCityGroupsHtml(
    items
  ) {
    return state.hotelCities
      .map(
        (
          city,
          cityIndex
        ) => {
          const hotels =
            items.filter(
              item =>
                item.city ===
                city
            );


          return `
            <section
              class="hotel-city-group"
              data-city="${escapeHtml(city)}"
            >

              <div class="hotel-city-head">

                <label class="hotel-city-name-field">

                  المدينة

                  <input
                    class="city-name-input"
                    data-city-index="${cityIndex}"
                    type="text"
                    value="${escapeHtml(city)}"
                  >

                </label>

              </div>

              <div class="hotel-city-list">

                ${
                  hotels.length
                    ? hotels
                        .map(
                          serviceRow
                        )
                        .join('')
                    : `
                      <p class="city-empty">
                        لا توجد فنادق في هذه المدينة.
                      </p>
                    `
                }

              </div>

            </section>
          `;
        }
      )
      .join('');
  }


  function categoryGroups() {
    return Object.keys(
      categories
    )
      .map(
        key => ({
          key,

          items:
            state.services.filter(
              item =>
                item.category ===
                key
            )
        })
      )
      .filter(
        group =>
          group.items.length ||
          (
            group.key ===
              'hotel' &&
            state.hotelCities.length
          )
      );
  }


  function renderServices() {
    ensureStateStructure();


    const list =
      $('#servicesList');


    if (
      !list
    ) {
      return;
    }


    const groups =
      categoryGroups();


    list.innerHTML =
      groups.length
        ? groups
            .map(
              group => `
                <section class="service-group">

                  <div class="service-group-head">

                    <span class="service-icon">
                      ${categories[group.key].icon}
                    </span>

                    <strong>
                      ${escapeHtml(categoryLabel(group.key))}
                    </strong>

                  </div>

                  ${
                    group.key ===
                    'hotel'
                      ? hotelCityGroupsHtml(
                          group.items
                        )
                      : group.items
                          .map(
                            serviceRow
                          )
                          .join('')
                  }

                </section>
              `
            )
            .join('')
        : `
          <div class="sub-card">
            <p>
              لا توجد خدمات بعد.
            </p>
          </div>
        `;


    const dataList =
      $('#hotelCitiesList');


    if (
      dataList
    ) {
      dataList.innerHTML =
        state.hotelCities
          .map(
            city =>
              `<option value="${escapeHtml(city)}"></option>`
          )
          .join('');
    }
  }


  /* =========================================================
     CHILD AGES
     ========================================================= */

  function renderChildAges() {
    const childrenInput =
      $('#children');


    const wrap =
      $('#childAgesWrap');


    const list =
      $('#childAges');


    if (
      !childrenInput ||
      !wrap ||
      !list
    ) {
      return;
    }


    const count =
      Math.max(
        0,
        Math.floor(
          toNumber(
            childrenInput.value
          )
        )
      );


    while (
      state.childAges.length <
      count
    ) {
      state.childAges.push(
        6
      );
    }


    state.childAges =
      state.childAges.slice(
        0,
        count
      );


    wrap.hidden =
      count === 0;


    list.innerHTML =
      state.childAges
        .map(
          (
            age,
            index
          ) => `
            <label class="age-field">

              الطفل ${index + 1}

              <input
                class="child-age"
                data-index="${index}"
                type="number"
                min="0"
                max="17"
                value="${age}"
              >

            </label>
          `
        )
        .join('');
  }


  /* =========================================================
     ITINERARY
     ========================================================= */

  function renderItinerary() {
    const list =
      $('#itineraryList');


    if (
      !list
    ) {
      return;
    }


    list.innerHTML =
      state.itinerary.length
        ? state.itinerary
            .map(
              (
                day,
                index
              ) => `
                <article
                  class="day-card"
                  draggable="true"
                  data-index="${index}"
                >

                  <div class="day-handle">
                    ${index + 1}
                  </div>

                  <label>
                    عنوان اليوم

                    <input
                      data-day-field="title"
                      type="text"
                      value="${escapeHtml(day.title || '')}"
                    >
                  </label>

                  <label>
                    التفاصيل

                    <input
                      data-day-field="details"
                      type="text"
                      value="${escapeHtml(day.details || '')}"
                    >
                  </label>

                  <button
                    class="remove-service remove-day"
                    type="button"
                  >
                    ×
                  </button>

                </article>
              `
            )
            .join('')
        : `
          <div class="empty-itinerary">

            <strong>
              جدول الأنشطة فارغ
            </strong>

            <span>
              أضف يوماً عندما تحتاج إلى برنامج تفصيلي.
            </span>

          </div>
        `;
  }


  /* =========================================================
     SUMMARY
     ========================================================= */

  function updateDuration() {
    const display =
      $('#durationDisplay');


    if (
      !display
    ) {
      return;
    }


    const days =
      dayCount();


    const nights =
      Math.max(
        0,
        days - 1
      );


    display.value =
      days
        ? `${days} أيام / ${nights} ليالٍ`
        : 'تحقق من التواريخ';
  }


  function setText(
    selector,
    value
  ) {
    const element =
      $(
        selector
      );


    if (
      element
    ) {
      element.textContent =
        value;
    }
  }


  function updateSummary() {
    const result =
      totals();


    setText(
      '#costTotal',
      money.format(
        result.cost
      )
    );


    setText(
      '#profitTotal',
      money.format(
        result.profit
      )
    );


    setText(
      '#subtotalTotal',
      money.format(
        result.subtotal
      )
    );


    setText(
      '#vatTotal',
      money.format(
        result.vat
      )
    );


    setText(
      '#grandTotal',
      money.format(
        result.total
      )
    );


    setText(
      '#perTraveler',
      `${money.format(result.perTraveler)} للفرد`
    );


    setText(
      '#marginPercent',
      `${englishNumber.format(result.margin)}%`
    );


    const marginBar =
      $('#marginBar');


    if (
      marginBar
    ) {
      marginBar.style.width =
        `${Math.min(100, result.margin * 2.2)}%`;
    }


    const vatRow =
      $('#vatRow');


    if (
      vatRow
    ) {
      vatRow.classList.toggle(
        'muted-row',
        !$('#vatEnabled')?.checked
      );
    }


    const suffix =
      $('.input-suffix');


    if (
      suffix
    ) {
      suffix.textContent =
        $('#markupType')?.value ===
        'fixed'
          ? 'SAR'
          : '%';
    }


    setText(
      '#travelerCountBadge',

      result.travelers ===
      1
        ? 'مسافر واحد'
        : `${result.travelers} مسافرين`
    );


    updateDuration();


    validate(
      false
    );
  }


  /* =========================================================
     VALIDATION
     ========================================================= */

  function validate(
    showBanner = true
  ) {
    const errors =
      [];


    if (
      !$('#origin')
        ?.value
        .trim()
    ) {
      errors.push(
        'أدخل مدينة المغادرة'
      );
    }


    if (
      !$('#destination')
        ?.value
        .trim()
    ) {
      errors.push(
        'أدخل الوجهة'
      );
    }


    if (
      dayCount() <
      1
    ) {
      errors.push(
        'تحقق من تاريخي الرحلة'
      );
    }


    if (
      toNumber(
        $('#adults')
          ?.value
      ) <
      1
    ) {
      errors.push(
        'يجب وجود مسافر بالغ واحد على الأقل'
      );
    }


    state.services
      .filter(
        item =>
          item.category ===
          'hotel'
      )
      .forEach(
        item => {
          const checkIn =
            hotelDateTimestamp(
              item.checkIn
            );


          const checkOut =
            hotelDateTimestamp(
              item.checkOut
            );


          if (
            item.checkIn &&
            checkIn ===
              null
          ) {
            errors.push(
              `تحقق من تاريخ دخول ${item.name}`
            );
          }


          if (
            item.checkOut &&
            checkOut ===
              null
          ) {
            errors.push(
              `تحقق من تاريخ خروج ${item.name}`
            );
          }


          if (
            checkIn !==
              null &&
            checkOut !==
              null &&
            checkOut <
              checkIn
          ) {
            errors.push(
              `تاريخ خروج ${item.name} يسبق تاريخ الدخول`
            );
          }
        }
      );


    const banner =
      $('#validationBanner');


    if (
      showBanner &&
      banner
    ) {
      banner.hidden =
        errors.length ===
        0;


      banner.textContent =
        errors.length
          ? `يرجى التصحيح: ${errors.join('، ')}.`
          : '';
    }


    return errors;
  }


  /* =========================================================
     CLIENT DETAILS
     ========================================================= */

  function detailRows(
    rows
  ) {
    return `
      <dl class="client-detail-list">

        ${
          rows
            .map(
              (
                [
                  label,
                  value
                ]
              ) => `
                <div>

                  <dt>
                    ${escapeHtml(label)}:
                  </dt>

                  <dd>
                    ${escapeHtml(value || 'غير محدد')}
                  </dd>

                </div>
              `
            )
            .join('')
        }

      </dl>
    `;
  }


  function hotelClientItem(
    item
  ) {
    return `
      <div class="included-item hotel-client-item">

        <span class="included-icon">
          ${categories.hotel.icon}
        </span>

        <div>

          <strong>
            ${escapeHtml(item.name)}
          </strong>

          <small>
            نوع الغرفة:
            ${escapeHtml(item.details || 'غير محدد')}
          </small>

          ${
            detailRows([
              [
                'تاريخ الدخول',

                clientDateTime(
                  formatFlexibleClientDate(
                    item.checkIn
                  ),

                  item.checkInTime
                )
              ],

              [
                'تاريخ الخروج',

                clientDateTime(
                  formatFlexibleClientDate(
                    item.checkOut
                  ),

                  item.checkOutTime
                )
              ],

              [
                'عدد الليالي',

                englishNumber.format(
                  hotelNights(
                    item
                  )
                )
              ],

              [
                'عدد الأشخاص',

                englishNumber.format(
                  item.qty
                )
              ]
            ])
          }

        </div>

      </div>
    `;
  }


  function flightClientItem(
    item
  ) {
    const legs =
      ensureFlightSegments(
        item
      )
        .map(
          (
            segment,
            index
          ) => `
            <div class="client-flight-leg">

              <strong>
                الرحلة ${index + 1} -
                ${escapeHtml(
                  [
                    segment.from,
                    segment.to
                  ]
                    .filter(Boolean)
                    .join(' ← ') ||
                  'غير محددة'
                )}
              </strong>

              ${
                detailRows([
                  [
                    'تاريخ الإقلاع',

                    clientDateTime(
                      formatFlexibleClientDate(
                        segment.departureDate
                      ),

                      segment.departureTime
                    )
                  ],

                  [
                    'تاريخ الوصول',

                    clientDateTime(
                      formatFlexibleClientDate(
                        segment.arrivalDate
                      ),

                      segment.arrivalTime
                    )
                  ]
                ])
              }

              ${
                segment.extraDetails
                  ? `
                    <small>
                      ${escapeHtml(segment.extraDetails)}
                    </small>
                  `
                  : ''
              }

            </div>
          `
        )
        .join('');


    return `
      <div class="included-item flight-client-item">

        <span class="included-icon">
          ${categories.flight.icon}
        </span>

        <div>

          <strong>
            ${escapeHtml(item.name)}
          </strong>

          <small>
            درجة الطيران:
            ${escapeHtml(item.details || 'غير محددة')}
          </small>

          <div class="client-flight-legs">
            ${legs}
          </div>

        </div>

      </div>
    `;
  }


  function serviceClientItems(
    category
  ) {
    const items =
      state.services.filter(
        item =>
          item.category ===
          category
      );


    if (
      category ===
      'hotel'
    ) {
      return state.hotelCities
        .map(
          city => {
            const hotels =
              items.filter(
                item =>
                  item.city ===
                  city
              );


            return hotels.length
              ? `
                <section class="client-hotel-city">

                  <h3 dir="auto">
                    ${escapeHtml(city)}
                  </h3>

                  <div class="included-grid">

                    ${
                      hotels
                        .map(
                          hotelClientItem
                        )
                        .join('')
                    }

                  </div>

                </section>
              `
              : '';
          }
        )
        .join('');
    }


    if (
      category ===
      'flight'
    ) {
      return items
        .map(
          flightClientItem
        )
        .join('');
    }


    return items
      .map(
        item => `
          <div class="included-item">

            <span class="included-icon">
              ${categories[item.category].icon}
            </span>

            <div>

              <strong>
                ${escapeHtml(item.name)}
              </strong>

              <small>
                ${escapeHtml(item.details || '')}
              </small>

            </div>

          </div>
        `
      )
      .join('');
  }


  /* =========================================================
     CLIENT VIEW
     ========================================================= */

  function buildClientView() {
    const errors =
      validate(
        true
      );


    if (
      errors.length
    ) {
      toast(
        'تحقق من بيانات العرض أولاً'
      );


      return false;
    }


    ensureStateStructure();


    const result =
      totals();


    const start =
      new Date(
        `${$('#startDate').value}T00:00:00`
      );


    const end =
      new Date(
        `${$('#endDate').value}T00:00:00`
      );


    applyCopy();


    setText(
      '#clientQuoteNumber',
      $('#quoteNumber')
        ?.value
        .trim() ||
      '-'
    );


    setText(
      '#clientNameDisplay',
      $('#clientName')
        ?.value
        .trim() ||
      'ضيفنا الكريم'
    );


    setText(
      '#offerTitle',
      replaceCopyTokens(
        state.copy.clientHeroTitle
      )
    );


    setText(
      '#offerSubtitle',
      replaceCopyTokens(
        state.copy.clientHeroSubtitle
      )
    );


    setText(
      '#offerDates',
      `${formatClientDate(start)} - ${formatClientDate(end)}`
    );


    setText(
      '#offerDuration',
      $('#durationDisplay')
        ?.value ||
      ''
    );


    const adults =
      Math.max(
        0,
        toNumber(
          $('#adults')
            ?.value
        )
      );


    const children =
      Math.max(
        0,
        toNumber(
          $('#children')
            ?.value
        )
      );


    const facts =
      $('#offerFacts');


    if (
      facts
    ) {
      facts.innerHTML =
        [
          [
            'المسافرون',

            `${adults} بالغين${
              children
                ? ` + ${children} أطفال`
                : ''
            }`
          ],

          [
            'تاريخ الوصول',
            formatClientDate(
              start
            )
          ],

          [
            'تاريخ العودة',
            formatClientDate(
              end
            )
          ],

          [
            'المدة',
            `${dayCount()} أيام`
          ]
        ]
          .map(
            (
              [
                label,
                value
              ]
            ) => `
              <div class="offer-fact">

                <span>
                  ${escapeHtml(label)}
                </span>

                <strong>
                  ${escapeHtml(value)}
                </strong>

              </div>
            `
          )
          .join('');
    }


    const sections = [
      [
        'flight',
        'clientFlights',
        'clientFlightsSection',
        'showFlights'
      ],

      [
        'hotel',
        'clientHotels',
        'clientHotelsSection',
        'showHotels'
      ],

      [
        'transfer',
        'clientTransfers',
        'clientTransfersSection',
        'showTransfers'
      ],

      [
        'activity',
        'clientActivities',
        'clientActivitiesSection',
        'showActivities'
      ]
    ];


    sections.forEach(
      (
        [
          category,
          contentId,
          sectionId,
          toggleId
        ]
      ) => {
        const html =
          serviceClientItems(
            category
          );


        const content =
          $(`#${contentId}`);


        const section =
          $(`#${sectionId}`);


        const toggle =
          $(`#${toggleId}`);


        if (
          content
        ) {
          content.innerHTML =
            html;
        }


        if (
          section
        ) {
          section.hidden =
            !toggle?.checked ||
            !html;
        }
      }
    );


    const itinerary =
      $('#clientItinerary');


    if (
      itinerary
    ) {
      itinerary.innerHTML =
        state.itinerary
          .map(
            (
              day,
              index
            ) => `
              <div class="client-day">

                <span>
                  اليوم ${index + 1}
                </span>

                <strong>
                  ${escapeHtml(day.title)}
                </strong>

                <p>
                  ${escapeHtml(day.details)}
                </p>

              </div>
            `
          )
          .join('');
    }


    if (
      facts
    ) {
      facts.hidden =
        !$('#showFacts')
          ?.checked;
    }


    const itinerarySection =
      $('#clientItinerarySection');


    if (
      itinerarySection
    ) {
      itinerarySection.hidden =
        !$('#showItinerary')
          ?.checked ||
        !state.itinerary.length;
    }


    const priceSection =
      $('#clientPriceSection');


    if (
      priceSection
    ) {
      priceSection.hidden =
        !$('#showPrices')
          ?.checked;
    }


    const notesSection =
      $('#clientNotesSection');


    if (
      notesSection
    ) {
      notesSection.hidden =
        !$('#showNotes')
          ?.checked;
    }


    setText(
      '#clientGrandTotal',

      result.total >
      0
        ? money.format(
            result.total
          )
        : 'بانتظار التسعير'
    );


    setText(
      '#clientPerTraveler',

      result.total >
      0
        ? `${money.format(result.perTraveler)} تقريباً لكل مسافر`
        : 'بانتظار التسعير'
    );


    setText(
      '#priceTaxNote',

      $('#vatEnabled')
        ?.checked
        ? 'شامل ضريبة القيمة المضافة'
        : 'السعر النهائي للعرض'
    );


    const internal =
      $('#internalView');


    const client =
      $('#clientView');


    if (
      internal
    ) {
      internal.hidden =
        true;
    }


    if (
      client
    ) {
      client.hidden =
        false;
    }


    refreshFloatingEditorActions();


    requestAnimationFrame(
      () => {
        calculateClientBackVisibility();
      }
    );


    window.scrollTo({
      top:
        0,

      behavior:
        'auto'
    });


    return true;
  }


  /* =========================================================
     FLOATING BUTTONS
     ========================================================= */

  let previewClientButtonInView =
    false;


  function refreshFloatingEditorActions() {
    const actions =
      $('#floatingOfferActions');


    const internal =
      $('#internalView');


    if (
      !actions ||
      !internal
    ) {
      return;
    }


    const shouldShow =
      !internal.hidden &&
      !previewClientButtonInView;


    actions.classList.toggle(
      'is-visible',
      shouldShow
    );


    actions.setAttribute(
      'aria-hidden',
      shouldShow
        ? 'false'
        : 'true'
    );


    [
      $('#floatingClientBtn'),
      $('#floatingSummaryBtn')
    ]
      .filter(
        Boolean
      )
      .forEach(
        button => {
          button.tabIndex =
            shouldShow
              ? 0
              : -1;
        }
      );
  }


  function calculatePreviewButtonVisibility() {
    const button =
      $('#previewClientBtn');


    if (
      !button
    ) {
      return;
    }


    const rect =
      button.getBoundingClientRect();


    const topbarHeight =
      $('.topbar')
        ?.getBoundingClientRect()
        .height ||
      0;


    previewClientButtonInView =
      rect.bottom >
        topbarHeight &&
      rect.top <
        window.innerHeight &&
      rect.right >
        0 &&
      rect.left <
        window.innerWidth;


    refreshFloatingEditorActions();
  }


  function scrollToOfferSummary() {
    const summary =
      $('#offerSummaryPanel');


    if (
      !summary
    ) {
      return;
    }


    const topbarHeight =
      $('.topbar')
        ?.getBoundingClientRect()
        .height ||
      0;


    const target =
      window.scrollY +
      summary
        .getBoundingClientRect()
        .top -
      topbarHeight -
      16;


    window.scrollTo({
      top:
        Math.max(
          0,
          target
        ),

      behavior:
        'smooth'
    });
  }


  let topBackButtonInView =
    true;


  function refreshFloatingClientBack() {
    const wrapper =
      $('#floatingClientBackAction');


    const button =
      $('#floatingBackToEditBtn');


    const client =
      $('#clientView');


    if (
      !wrapper ||
      !button ||
      !client
    ) {
      return;
    }


    const shouldShow =
      !client.hidden &&
      !topBackButtonInView;


    wrapper.classList.toggle(
      'is-visible',
      shouldShow
    );


    wrapper.setAttribute(
      'aria-hidden',
      shouldShow
        ? 'false'
        : 'true'
    );


    button.tabIndex =
      shouldShow
        ? 0
        : -1;
  }


  function calculateClientBackVisibility() {
    const topButton =
      $('#backToEditBtn');


    const client =
      $('#clientView');


    if (
      !topButton ||
      !client ||
      client.hidden
    ) {
      topBackButtonInView =
        true;


      refreshFloatingClientBack();


      return;
    }


    const rect =
      topButton.getBoundingClientRect();


    topBackButtonInView =
      rect.bottom >
        0 &&
      rect.top <
        window.innerHeight &&
      rect.right >
        0 &&
      rect.left <
        window.innerWidth;


    refreshFloatingClientBack();
  }


  function backToEditor() {
    const client =
      $('#clientView');


    const internal =
      $('#internalView');


    if (
      client
    ) {
      client.hidden =
        true;
    }


    if (
      internal
    ) {
      internal.hidden =
        false;
    }


    topBackButtonInView =
      true;


    refreshFloatingClientBack();


    window.scrollTo({
      top:
        0,

      behavior:
        'auto'
    });


    requestAnimationFrame(
      calculatePreviewButtonVisibility
    );
  }


  /* =========================================================
     SERVICE DIALOG
     ========================================================= */

  let pendingHotelCity =
    '';


  function updateNewServiceScheduleFields() {
    const categoryElement =
      $('#newServiceCategory');


    if (
      !categoryElement
    ) {
      return;
    }


    const category =
      categoryElement.value;


    const flightDates =
      $('#newFlightDates');


    const hotelDates =
      $('#newHotelDates');


    if (
      flightDates
    ) {
      flightDates.hidden =
        category !==
        'flight';
    }


    if (
      hotelDates
    ) {
      hotelDates.hidden =
        category !==
        'hotel';
    }


    const detailsLabel =
      $('#newServiceDetailsLabel');


    const detailsInput =
      $('#newServiceDetails');


    const qtyLabel =
      $('#newServiceQtyLabel');


    if (
      category ===
      'hotel'
    ) {
      if (
        detailsLabel
      ) {
        detailsLabel.textContent =
          'نوع الغرفة';
      }


      if (
        detailsInput
      ) {
        detailsInput.placeholder =
          'مثال: غرفة ديلوكس مطلة على البحر';
      }


      if (
        qtyLabel
      ) {
        qtyLabel.textContent =
          'عدد الأشخاص';
      }
    } else if (
      category ===
      'flight'
    ) {
      if (
        detailsLabel
      ) {
        detailsLabel.textContent =
          'درجة الطيران';
      }


      if (
        detailsInput
      ) {
        detailsInput.placeholder =
          'مثال: سياحي، سياحي مميز، أعمال، أولى';
      }


      if (
        qtyLabel
      ) {
        qtyLabel.textContent =
          'الكمية';
      }
    } else {
      if (
        detailsLabel
      ) {
        detailsLabel.textContent =
          'التفاصيل';
      }


      if (
        detailsInput
      ) {
        detailsInput.placeholder =
          'اكتب تفاصيل الخدمة';
      }


      if (
        qtyLabel
      ) {
        qtyLabel.textContent =
          'الكمية';
      }
    }
  }


  function openServiceDialog(
    category = 'flight',
    city = ''
  ) {
    pendingHotelCity =
      city;


    const categoryElement =
      $('#newServiceCategory');


    const cityElement =
      $('#newHotelCity');


    if (
      categoryElement
    ) {
      categoryElement.value =
        category;
    }


    if (
      cityElement
    ) {
      cityElement.value =
        city;
    }


    updateNewServiceScheduleFields();


    $('#serviceDialog')
      ?.showModal();
  }


  /* =========================================================
     HOTEL DRAG
     ========================================================= */

  let draggedHotel =
    null;


  function clearHotelDropClasses() {
    $$('.hotel-service-row')
      .forEach(
        row => {
          row.classList.remove(
            'hotel-dragging',
            'hotel-drop-target'
          );
        }
      );
  }


  const servicesList =
    $('#servicesList');


  servicesList
    ?.addEventListener(
      'dragstart',

      event => {
        const handle =
          event.target.closest(
            '.hotel-drag-handle'
          );


        if (
          !handle
        ) {
          return;
        }


        const row =
          handle.closest(
            '.hotel-service-row'
          );


        if (
          !row
        ) {
          return;
        }


        const item =
          state.services.find(
            service =>
              service.id ===
              row.dataset.id
          );


        if (
          !item ||
          item.category !==
          'hotel'
        ) {
          return;
        }


        draggedHotel = {
          id:
            item.id,

          city:
            item.city
        };


        row.classList.add(
          'hotel-dragging'
        );


        if (
          event.dataTransfer
        ) {
          event.dataTransfer.effectAllowed =
            'move';


          event.dataTransfer.setData(
            'text/plain',
            item.id
          );
        }
      }
    );


  servicesList
    ?.addEventListener(
      'dragover',

      event => {
        if (
          !draggedHotel
        ) {
          return;
        }


        const targetRow =
          event.target.closest(
            '.hotel-service-row'
          );


        if (
          !targetRow
        ) {
          return;
        }


        const targetItem =
          state.services.find(
            service =>
              service.id ===
              targetRow.dataset.id
          );


        if (
          !targetItem ||
          targetItem.city !==
            draggedHotel.city
        ) {
          return;
        }


        event.preventDefault();


        $$('.hotel-service-row')
          .forEach(
            row => {
              row.classList.remove(
                'hotel-drop-target'
              );
            }
          );


        if (
          targetItem.id !==
          draggedHotel.id
        ) {
          targetRow.classList.add(
            'hotel-drop-target'
          );
        }


        if (
          event.dataTransfer
        ) {
          event.dataTransfer.dropEffect =
            'move';
        }
      }
    );


  servicesList
    ?.addEventListener(
      'drop',

      event => {
        if (
          !draggedHotel
        ) {
          return;
        }


        const targetRow =
          event.target.closest(
            '.hotel-service-row'
          );


        if (
          !targetRow
        ) {
          clearHotelDropClasses();

          draggedHotel =
            null;

          return;
        }


        const targetItem =
          state.services.find(
            service =>
              service.id ===
              targetRow.dataset.id
          );


        const draggedItem =
          state.services.find(
            service =>
              service.id ===
              draggedHotel.id
          );


        if (
          !targetItem ||
          !draggedItem ||
          targetItem.id ===
            draggedItem.id ||
          targetItem.city !==
            draggedItem.city
        ) {
          clearHotelDropClasses();

          draggedHotel =
            null;

          return;
        }


        event.preventDefault();


        const targetRect =
          targetRow
            .getBoundingClientRect();


        const insertAfter =
          event.clientY >
          targetRect.top +
          targetRect.height /
          2;


        const fromIndex =
          state.services
            .findIndex(
              service =>
                service.id ===
                draggedItem.id
            );


        if (
          fromIndex <
          0
        ) {
          return;
        }


        const [
          moved
        ] =
          state.services.splice(
            fromIndex,
            1
          );


        let targetIndex =
          state.services
            .findIndex(
              service =>
                service.id ===
                targetItem.id
            );


        if (
          targetIndex <
          0
        ) {
          state.services.push(
            moved
          );
        } else {
          if (
            insertAfter
          ) {
            targetIndex +=
              1;
          }


          state.services.splice(
            targetIndex,
            0,
            moved
          );
        }


        draggedHotel =
          null;


        clearHotelDropClasses();


        renderServices();


        scheduleAutoSave();


        toast(
          'تم تغيير ترتيب الفندق'
        );
      }
    );


  servicesList
    ?.addEventListener(
      'dragend',

      event => {
        if (
          event.target.closest(
            '.hotel-drag-handle'
          )
        ) {
          draggedHotel =
            null;


          clearHotelDropClasses();
        }
      }
    );


  /* =========================================================
     FLIGHT DRAG
     ========================================================= */

  let draggedFlight =
    null;


  servicesList
    ?.addEventListener(
      'dragstart',

      event => {
        const handle =
          event.target.closest(
            '.segment-drag-handle'
          );


        if (
          !handle
        ) {
          return;
        }


        const row =
          handle.closest(
            '.service-row'
          );


        const segment =
          handle.closest(
            '.flight-segment'
          );


        if (
          !row ||
          !segment
        ) {
          return;
        }


        draggedFlight = {
          serviceId:
            row.dataset.id,

          segmentId:
            segment.dataset.segmentId
        };


        segment.classList.add(
          'dragging'
        );
      }
    );


  servicesList
    ?.addEventListener(
      'dragover',

      event => {
        if (
          draggedFlight &&
          event.target.closest(
            '.flight-segment'
          )
        ) {
          event.preventDefault();
        }
      }
    );


  servicesList
    ?.addEventListener(
      'drop',

      event => {
        if (
          !draggedFlight
        ) {
          return;
        }


        const target =
          event.target.closest(
            '.flight-segment'
          );


        const row =
          event.target.closest(
            '.service-row'
          );


        if (
          !target ||
          !row ||
          row.dataset.id !==
            draggedFlight.serviceId
        ) {
          return;
        }


        event.preventDefault();


        const item =
          state.services.find(
            service =>
              service.id ===
              row.dataset.id
          );


        if (
          !item
        ) {
          return;
        }


        const segments =
          ensureFlightSegments(
            item
          );


        const from =
          segments.findIndex(
            segment =>
              segment.id ===
              draggedFlight.segmentId
          );


        const to =
          segments.findIndex(
            segment =>
              segment.id ===
              target.dataset.segmentId
          );


        if (
          from >=
            0 &&
          to >=
            0 &&
          from !==
            to
        ) {
          const [
            moved
          ] =
            segments.splice(
              from,
              1
            );


          segments.splice(
            to,
            0,
            moved
          );


          renderServices();


          scheduleAutoSave();
        }


        draggedFlight =
          null;
      }
    );


  servicesList
    ?.addEventListener(
      'dragend',

      event => {
        if (
          event.target.closest(
            '.segment-drag-handle'
          )
        ) {
          draggedFlight =
            null;


          $$('.flight-segment')
            .forEach(
              segment => {
                segment.classList.remove(
                  'dragging'
                );
              }
            );
        }
      }
    );


  /* =========================================================
     SERVICE INPUT
     ========================================================= */

  servicesList
    ?.addEventListener(
      'input',

      event => {
        const row =
          event.target.closest(
            '.service-row'
          );


        if (
          !row
        ) {
          return;
        }


        const item =
          state.services.find(
            service =>
              service.id ===
              row.dataset.id
          );


        if (
          !item
        ) {
          return;
        }


        const segmentField =
          event.target.dataset
            .segmentField;


        if (
          segmentField
        ) {
          const segmentElement =
            event.target.closest(
              '.flight-segment'
            );


          const segment =
            ensureFlightSegments(
              item
            ).find(
              entry =>
                entry.id ===
                segmentElement
                  ?.dataset
                  .segmentId
            );


          if (
            !segment
          ) {
            return;
          }


          segment[
            segmentField
          ] =
            segmentField ===
            'price'
              ? Math.max(
                  0,
                  toNumber(
                    event.target.value
                  )
                )
              : event.target.value;


          const lineTotal =
            row.querySelector(
              '.line-total'
            );


          if (
            lineTotal
          ) {
            lineTotal.textContent =
              money.format(
                serviceTotal(
                  item
                )
              );
          }


          updateSummary();


          return;
        }


        const field =
          event.target.dataset.field;


        if (
          !field
        ) {
          return;
        }


        item[
          field
        ] =
          [
            'qty',
            'cost',
            'hotelTax'
          ].includes(
            field
          )
            ? Math.max(
                0,
                toNumber(
                  event.target.value
                )
              )
            : event.target.value;


        const costLabel =
          row.querySelector(
            '.cost-field span'
          );


        if (
          costLabel
        ) {
          costLabel.textContent =
            item.costMode ===
            'unit'
              ? 'تكلفة الوحدة'
              : 'التكلفة الإجمالية';
        }


        const lineTotal =
          row.querySelector(
            '.line-total'
          );


        if (
          lineTotal
        ) {
          lineTotal.textContent =
            money.format(
              serviceTotal(
                item
              )
            );
        }


        updateSummary();
      }
    );


  servicesList
    ?.addEventListener(
      'change',

      event => {
        if (
          event.target.matches(
            '.city-name-input'
          )
        ) {
          const index =
            toNumber(
              event.target.dataset
                .cityIndex,
              -1
            );


          const oldCity =
            state.hotelCities[
              index
            ];


          const newCity =
            event.target.value
              .trim();


          if (
            !oldCity ||
            !newCity
          ) {
            renderServices();

            return;
          }


          if (
            state.hotelCities.includes(
              newCity
            ) &&
            newCity !==
              oldCity
          ) {
            toast(
              'اسم المدينة موجود بالفعل'
            );


            renderServices();


            return;
          }


          state.hotelCities[
            index
          ] =
            newCity;


          state.services
            .filter(
              item =>
                item.category ===
                  'hotel' &&
                item.city ===
                  oldCity
            )
            .forEach(
              item => {
                item.city =
                  newCity;
              }
            );


          renderServices();


          scheduleAutoSave();


          return;
        }


        const row =
          event.target.closest(
            '.service-row'
          );


        if (
          !row
        ) {
          return;
        }


        const item =
          state.services.find(
            service =>
              service.id ===
              row.dataset.id
          );


        if (
          !item
        ) {
          return;
        }


        if (
          event.target.dataset
            .hotelDate
        ) {
          const parsed =
            parseFlexibleDate(
              event.target.value
            );


          event.target.classList.toggle(
            'invalid-datetime',
            !parsed.valid
          );


          if (
            parsed.valid
          ) {
            event.target.value =
              parsed.display;


            item[
              event.target.dataset.field
            ] =
              parsed.display;
          }


          validate(
            false
          );


          return;
        }


        if (
          event.target.dataset
            .hotelTime
        ) {
          const parsed =
            parseFlexibleTime(
              event.target.value
            );


          event.target.classList.toggle(
            'invalid-datetime',
            !parsed.valid
          );


          if (
            parsed.valid
          ) {
            event.target.value =
              parsed.display;


            item[
              event.target.dataset.field
            ] =
              parsed.display;
          }


          return;
        }


        if (
          event.target.dataset
            .field ===
          'city'
        ) {
          const city =
            event.target.value
              .trim() ||
            'غير محددة';


          item.city =
            city;


          if (
            !state.hotelCities.includes(
              city
            )
          ) {
            state.hotelCities.push(
              city
            );
          }


          renderServices();


          scheduleAutoSave();


          return;
        }


        const segmentKind =
          event.target.dataset
            .segmentKind;


        if (
          segmentKind
        ) {
          const segmentElement =
            event.target.closest(
              '.flight-segment'
            );


          const segment =
            ensureFlightSegments(
              item
            ).find(
              entry =>
                entry.id ===
                segmentElement
                  ?.dataset
                  .segmentId
            );


          if (
            !segment
          ) {
            return;
          }


          const parsed =
            segmentKind ===
            'date'
              ? parseFlexibleDate(
                  event.target.value
                )
              : parseFlexibleTime(
                  event.target.value
                );


          event.target.classList.toggle(
            'invalid-datetime',
            !parsed.valid
          );


          if (
            parsed.valid
          ) {
            event.target.value =
              parsed.display;


            segment[
              event.target.dataset
                .segmentField
            ] =
              parsed.display;
          }
        }
      }
    );


  servicesList
    ?.addEventListener(
      'click',

      event => {
        const row =
          event.target.closest(
            '.service-row'
          );


        if (
          row &&
          event.target.closest(
            '.add-flight-segment'
          )
        ) {
          const item =
            state.services.find(
              service =>
                service.id ===
                row.dataset.id
            );


          if (
            !item
          ) {
            return;
          }


          ensureFlightSegments(
            item
          ).push(
            createSegment()
          );


          renderServices();


          scheduleAutoSave();


          return;
        }


        if (
          row &&
          event.target.closest(
            '.remove-flight-segment'
          )
        ) {
          const item =
            state.services.find(
              service =>
                service.id ===
                row.dataset.id
            );


          if (
            !item
          ) {
            return;
          }


          const segmentId =
            event.target
              .closest(
                '.flight-segment'
              )
              ?.dataset
              .segmentId;


          item.segments =
            ensureFlightSegments(
              item
            ).filter(
              segment =>
                segment.id !==
                segmentId
            );


          renderServices();


          updateSummary();


          scheduleAutoSave();


          return;
        }


        if (
          row &&
          event.target.closest(
            '.remove-service'
          )
        ) {
          state.services =
            state.services.filter(
              item =>
                item.id !==
                row.dataset.id
            );


          renderServices();


          updateSummary();


          scheduleAutoSave();


          toast(
            'تم حذف الخدمة'
          );
        }
      }
    );


  /* =========================================================
     ADD CITY
     ========================================================= */

  $('#addCityBtn')
    ?.addEventListener(
      'click',

      () => {
        const input =
          $('#newCityName');


        const city =
          input
            ?.value
            .trim() ||
          '';


        if (
          !city
        ) {
          toast(
            'اكتب اسم المدينة أولاً'
          );


          return;
        }


        if (
          state.hotelCities.includes(
            city
          )
        ) {
          toast(
            'المدينة موجودة بالفعل'
          );


          return;
        }


        state.hotelCities.push(
          city
        );


        input.value =
          '';


        renderServices();


        scheduleAutoSave();
      }
    );


  /* =========================================================
     SERVICE DIALOG EVENTS
     ========================================================= */

  $('#newServiceCategory')
    ?.addEventListener(
      'change',
      updateNewServiceScheduleFields
    );


  $('#addServiceBtn')
    ?.addEventListener(
      'click',

      () => {
        openServiceDialog(
          'flight'
        );
      }
    );


  $('#serviceDialog')
    ?.addEventListener(
      'change',

      event => {
        const kind =
          event.target.dataset
            .flexibleKind;


        if (
          !kind
        ) {
          return;
        }


        const parsed =
          kind ===
          'date'
            ? parseFlexibleDate(
                event.target.value
              )
            : parseFlexibleTime(
                event.target.value
              );


        event.target.classList.toggle(
          'invalid-datetime',
          !parsed.valid
        );


        if (
          parsed.valid
        ) {
          event.target.value =
            parsed.display;
        }
      }
    );


  $('#serviceForm')
    ?.addEventListener(
      'submit',

      event => {
        if (
          event.submitter
            ?.value ===
          'cancel'
        ) {
          return;
        }


        event.preventDefault();


        const category =
          $('#newServiceCategory')
            ?.value ||
          'transfer';


        const item = {
          id:
            `service-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,

          category,

          name:
            $('#newServiceName')
              ?.value
              .trim() ||
            '',

          details:
            $('#newServiceDetails')
              ?.value
              .trim() ||
            '',

          costMode:
            $('#newServiceCostMode')
              ?.value ||
            'total',

          qty:
            Math.max(
              1,
              toNumber(
                $('#newServiceQty')
                  ?.value,
                1
              )
            ),

          cost:
            Math.max(
              0,
              toNumber(
                $('#newServiceCost')
                  ?.value
              )
            )
        };


        if (
          !item.name
        ) {
          toast(
            'اكتب اسم الخدمة'
          );


          return;
        }


        if (
          category ===
          'hotel'
        ) {
          const checkIn =
            parseFlexibleDate(
              $('#newHotelCheckIn')
                ?.value ||
              ''
            );


          const checkOut =
            parseFlexibleDate(
              $('#newHotelCheckOut')
                ?.value ||
              ''
            );


          const checkInTime =
            parseFlexibleTime(
              $('#newHotelCheckInTime')
                ?.value ||
              ''
            );


          const checkOutTime =
            parseFlexibleTime(
              $('#newHotelCheckOutTime')
                ?.value ||
              ''
            );


          if (
            !checkIn.valid ||
            !checkOut.valid ||
            !checkInTime.valid ||
            !checkOutTime.valid
          ) {
            toast(
              'تحقق من تواريخ وأوقات الفندق'
            );


            return;
          }


          item.city =
            $('#newHotelCity')
              ?.value
              .trim() ||
            pendingHotelCity ||
            'غير محددة';


          item.checkIn =
            checkIn.display;


          item.checkInTime =
            checkInTime.display;


          item.checkOut =
            checkOut.display;


          item.checkOutTime =
            checkOutTime.display;


          item.hotelTax =
            Math.max(
              0,
              toNumber(
                $('#newHotelTax')
                  ?.value
              )
            );


          if (
            !state.hotelCities.includes(
              item.city
            )
          ) {
            state.hotelCities.push(
              item.city
            );
          }
        }


        if (
          category ===
          'flight'
        ) {
          const origin =
            $('#origin')
              ?.value
              .trim() ||
            '';


          const destination =
            $('#destination')
              ?.value
              .split(
                /\s+-\s+/
              )[0]
              .trim() ||
            '';


          const outboundDepartureDate =
            parseFlexibleDate(
              $('#newOutboundDepartureDate')
                ?.value ||
              ''
            );


          const outboundDepartureTime =
            parseFlexibleTime(
              $('#newOutboundDepartureTime')
                ?.value ||
              ''
            );


          const outboundArrivalDate =
            parseFlexibleDate(
              $('#newOutboundArrivalDate')
                ?.value ||
              ''
            );


          const outboundArrivalTime =
            parseFlexibleTime(
              $('#newOutboundArrivalTime')
                ?.value ||
              ''
            );


          const returnDepartureDate =
            parseFlexibleDate(
              $('#newReturnDepartureDate')
                ?.value ||
              ''
            );


          const returnDepartureTime =
            parseFlexibleTime(
              $('#newReturnDepartureTime')
                ?.value ||
              ''
            );


          const returnArrivalDate =
            parseFlexibleDate(
              $('#newReturnArrivalDate')
                ?.value ||
              ''
            );


          const returnArrivalTime =
            parseFlexibleTime(
              $('#newReturnArrivalTime')
                ?.value ||
              ''
            );


          item.segments = [
            createSegment(
              origin,
              destination,

              outboundDepartureDate.valid
                ? outboundDepartureDate.display
                : '',

              outboundDepartureTime.valid
                ? outboundDepartureTime.display
                : '',

              outboundArrivalDate.valid
                ? outboundArrivalDate.display
                : '',

              outboundArrivalTime.valid
                ? outboundArrivalTime.display
                : ''
            ),

            createSegment(
              destination,
              origin,

              returnDepartureDate.valid
                ? returnDepartureDate.display
                : '',

              returnDepartureTime.valid
                ? returnDepartureTime.display
                : '',

              returnArrivalDate.valid
                ? returnArrivalDate.display
                : '',

              returnArrivalTime.valid
                ? returnArrivalTime.display
                : ''
            )
          ];
        }


        state.services.push(
          item
        );


        $('#serviceDialog')
          ?.close();


        $('#serviceForm')
          ?.reset();


        if (
          $('#newServiceQty')
        ) {
          $('#newServiceQty').value =
            1;
        }


        if (
          $('#newServiceCost')
        ) {
          $('#newServiceCost').value =
            0;
        }


        pendingHotelCity =
          '';


        updateNewServiceScheduleFields();


        renderServices();


        updateSummary();


        scheduleAutoSave();


        toast(
          'تمت إضافة الخدمة'
        );
      }
    );


  /* =========================================================
     CHILDREN
     ========================================================= */

  $('#childAges')
    ?.addEventListener(
      'input',

      event => {
        if (
          !event.target.matches(
            '.child-age'
          )
        ) {
          return;
        }


        state.childAges[
          Number(
            event.target.dataset.index
          )
        ] =
          Number(
            event.target.value
          );
      }
    );


  /* =========================================================
     ITINERARY EVENTS
     ========================================================= */

  $('#addDayBtn')
    ?.addEventListener(
      'click',

      () => {
        state.itinerary.push({
          title:
            'يوم جديد',

          details:
            'أضف تفاصيل البرنامج.'
        });


        renderItinerary();


        scheduleAutoSave();
      }
    );


  $('#syncDaysBtn')
    ?.addEventListener(
      'click',

      () => {
        const days =
          dayCount();


        if (
          !days
        ) {
          toast(
            'تحقق من تاريخي الرحلة'
          );


          return;
        }


        state.itinerary =
          state.itinerary.slice(
            0,
            days
          );


        while (
          state.itinerary.length <
          days
        ) {
          state.itinerary.push({
            title:
              'يوم جديد',

            details:
              'أضف تفاصيل البرنامج.'
          });
        }


        renderItinerary();


        scheduleAutoSave();


        toast(
          'تمت مزامنة الأيام'
        );
      }
    );


  $('#itineraryList')
    ?.addEventListener(
      'input',

      event => {
        const card =
          event.target.closest(
            '.day-card'
          );


        const field =
          event.target.dataset
            .dayField;


        if (
          !card ||
          !field
        ) {
          return;
        }


        state.itinerary[
          Number(
            card.dataset.index
          )
        ][field] =
          event.target.value;
      }
    );


  $('#itineraryList')
    ?.addEventListener(
      'click',

      event => {
        const button =
          event.target.closest(
            '.remove-day'
          );


        if (
          !button
        ) {
          return;
        }


        const card =
          button.closest(
            '.day-card'
          );


        if (
          !card
        ) {
          return;
        }


        state.itinerary.splice(
          Number(
            card.dataset.index
          ),
          1
        );


        renderItinerary();


        scheduleAutoSave();
      }
    );


  let draggedDay =
    null;


  $('#itineraryList')
    ?.addEventListener(
      'dragstart',

      event => {
        const card =
          event.target.closest(
            '.day-card'
          );


        if (
          !card
        ) {
          return;
        }


        draggedDay =
          Number(
            card.dataset.index
          );


        card.classList.add(
          'dragging'
        );
      }
    );


  $('#itineraryList')
    ?.addEventListener(
      'dragover',

      event => {
        event.preventDefault();
      }
    );


  $('#itineraryList')
    ?.addEventListener(
      'drop',

      event => {
        event.preventDefault();


        const card =
          event.target.closest(
            '.day-card'
          );


        if (
          !card ||
          draggedDay ===
            null
        ) {
          return;
        }


        const target =
          Number(
            card.dataset.index
          );


        const [
          moved
        ] =
          state.itinerary.splice(
            draggedDay,
            1
          );


        state.itinerary.splice(
          target,
          0,
          moved
        );


        draggedDay =
          null;


        renderItinerary();


        scheduleAutoSave();
      }
    );


  $('#itineraryList')
    ?.addEventListener(
      'dragend',

      () => {
        draggedDay =
          null;


        $$('.day-card')
          .forEach(
            card => {
              card.classList.remove(
                'dragging'
              );
            }
          );
      }
    );


  /* =========================================================
     SETTINGS
     ========================================================= */

  $('#settingsPanel')
    ?.addEventListener(
      'input',

      event => {
        const key =
          event.target.dataset
            .copyKey;


        if (
          key !==
          'brandTagline'
        ) {
          return;
        }


        const userName =
          saveUserName(
            event.target.value
          );


        state.copy.brandTagline =
          userName;


        applyCopy();
      }
    );


  /*
   * إذا كانت عناصر تغيير الشعار ما زالت في HTML
   * نمنع استخدامها لأن الشعار ثابت.
   */
  $('#companyLogoInput')
    ?.addEventListener(
      'change',

      event => {
        event.target.value =
          '';


        toast(
          'الشعار ثابت ولا يمكن تغييره'
        );
      }
    );


  $('#removeCompanyLogoBtn')
    ?.addEventListener(
      'click',

      () => {
        toast(
          'الشعار ثابت ولا يمكن تغييره'
        );
      }
    );


  $('#resetCopyBtn')
    ?.addEventListener(
      'click',

      () => {
        applyCopy();


        toast(
          'نصوص النظام ثابتة'
        );
      }
    );


  /* =========================================================
     GENERAL INPUTS
     ========================================================= */

  [
    'origin',
    'destination',
    'hotelStars',
    'startDate',
    'endDate',
    'adults',
    'children',
    'markupType',
    'markupValue',
    'vatEnabled'
  ]
    .forEach(
      id => {
        $(`#${id}`)
          ?.addEventListener(
            'input',

            () => {
              if (
                id ===
                'children'
              ) {
                renderChildAges();
              }


              updateSummary();
            }
          );
      }
    );


  /* =========================================================
     TABS
     ========================================================= */

  $$('.tab')
    .forEach(
      tab => {
        tab.addEventListener(
          'click',

          () => {
            $$('.tab')
              .forEach(
                current => {
                  current.classList.toggle(
                    'active',
                    current ===
                    tab
                  );
                }
              );


            $$('.tab-panel')
              .forEach(
                panel => {
                  panel.classList.toggle(
                    'active',

                    panel.dataset.panel ===
                    tab.dataset.tab
                  );
                }
              );
          }
        );
      }
    );


  /* =========================================================
     CLIENT BUTTONS
     ========================================================= */

  [
    'previewClientBtn',
    'showClientBtn',
    'floatingClientBtn'
  ]
    .forEach(
      id => {
        $(`#${id}`)
          ?.addEventListener(
            'click',
            buildClientView
          );
      }
    );


  $('#floatingSummaryBtn')
    ?.addEventListener(
      'click',
      scrollToOfferSummary
    );


  $('#backToEditBtn')
    ?.addEventListener(
      'click',
      backToEditor
    );


  $('#floatingBackToEditBtn')
    ?.addEventListener(
      'click',
      backToEditor
    );


  /* =========================================================
     STORAGE
     ========================================================= */

  const savedFieldIds = [
    'quoteNumber',
    'clientName',
    'origin',
    'destination',
    'hotelStars',
    'startDate',
    'endDate',
    'adults',
    'children',
    'internalNotes',
    'markupType',
    'markupValue',
    'vatEnabled',
    'showFacts',
    'showFlights',
    'showHotels',
    'showTransfers',
    'showActivities',
    'showItinerary',
    'showPrices',
    'showNotes'
  ];


  let activeOfferId =
    localStorage.getItem(
      ACTIVE_OFFER_KEY
    ) ||
    null;


  let currentOfferTouched =
    false;


  let autoSaveTimer =
    null;


  function createOfferId() {
    if (
      typeof crypto !==
        'undefined' &&
      typeof crypto.randomUUID ===
        'function'
    ) {
      return crypto.randomUUID();
    }


    return (
      `offer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    );
  }


  function collectFormState() {
    ensureStateStructure();


    const stateSnapshot =
      structuredClone(
        state
      );


    /*
     * نصوص النظام واسم المستخدم لا يتم
     * تخزينها مع العرض ولا رفعها إلى Drive.
     */
    delete stateSnapshot.copy;


    return {
      version:
        7,

      fields:
        Object.fromEntries(
          savedFieldIds.map(
            id => {
              const element =
                $(`#${id}`);


              if (
                !element
              ) {
                return [
                  id,
                  ''
                ];
              }


              return [
                id,

                element.type ===
                'checkbox'
                  ? element.checked
                  : element.value
              ];
            }
          )
        ),

      state:
        stateSnapshot
    };
  }


  function readSavedOffers() {
    try {
      const offers =
        JSON.parse(
          localStorage.getItem(
            OFFERS_STORAGE_KEY
          ) ||
          '[]'
        );


      return Array.isArray(
        offers
      )
        ? offers
        : [];
    } catch {
      return [];
    }
  }


  function writeSavedOffers(
    offers,
    options = {}
  ) {
    const {
      syncDrive = true
    } =
      options;


    localStorage.setItem(
      OFFERS_STORAGE_KEY,

      JSON.stringify(
        offers
      )
    );


    if (
      syncDrive
    ) {
      scheduleDriveSync(
        offers
      );
    }
  }


  function createOfferRecord(
    id,
    payload,
    existing = null
  ) {
    const now =
      new Date()
        .toISOString();


    const quote =
      String(
        payload.fields
          ?.quoteNumber ||
        ''
      ).trim();


    const client =
      String(
        payload.fields
          ?.clientName ||
        ''
      ).trim();


    const destination =
      String(
        payload.fields
          ?.destination ||
        ''
      ).trim();


    return {
      id,

      title:
        [
          quote,
          client
        ]
          .filter(
            Boolean
          )
          .join(
            ' - '
          ) ||
        destination ||
        'عرض جديد',

      destination,

      createdAt:
        existing
          ?.createdAt ||
        now,

      updatedAt:
        now,

      payload
    };
  }


  function saveDraft(
    silent = false
  ) {
    ensureStateStructure();


    const offers =
      readSavedOffers();


    let existing =
      offers.find(
        offer =>
          offer.id ===
          activeOfferId
      );


    if (
      !existing
    ) {
      activeOfferId =
        createOfferId();
    }


    const payload =
      collectFormState();


    const record =
      createOfferRecord(
        activeOfferId,
        payload,
        existing
      );


    const next =
      offers.filter(
        offer =>
          offer.id !==
          activeOfferId
      );


    next.unshift(
      record
    );


    writeSavedOffers(
      next
    );


    localStorage.setItem(
      ACTIVE_OFFER_KEY,
      activeOfferId
    );


    currentOfferTouched =
      false;


    updateActiveOfferStatus();


    if (
      !silent
    ) {
      toast(
        'تم حفظ العرض'
      );
    }


    return record;
  }


  function applyFormState(
    payload
  ) {
    if (
      !payload?.fields ||
      !payload?.state
    ) {
      return false;
    }


    Object.entries(
      payload.fields
    ).forEach(
      (
        [
          id,
          value
        ]
      ) => {
        const element =
          $(`#${id}`);


        if (
          !element
        ) {
          return;
        }


        if (
          element.type ===
          'checkbox'
        ) {
          element.checked =
            Boolean(
              value
            );
        } else {
          element.value =
            value ??
            '';
        }
      }
    );


    state =
      structuredClone(
        payload.state
      );


    ensureStateStructure();


    renderAll();


    return true;
  }


  function migrateLegacyDraft() {
    if (
      readSavedOffers()
        .length
    ) {
      return;
    }


    const raw =
      localStorage.getItem(
        LEGACY_STORAGE_KEY
      );


    if (
      !raw
    ) {
      return;
    }


    try {
      const payload =
        JSON.parse(
          raw
        );


      if (
        !payload?.fields ||
        !payload?.state
      ) {
        return;
      }


      if (
        payload.state
      ) {
        delete payload.state.copy;
      }


      const id =
        createOfferId();


      writeSavedOffers(
        [
          createOfferRecord(
            id,
            payload
          )
        ],

        {
          syncDrive:
            false
        }
      );


      activeOfferId =
        id;


      localStorage.setItem(
        ACTIVE_OFFER_KEY,
        id
      );


      localStorage.removeItem(
        LEGACY_STORAGE_KEY
      );
    } catch (
      error
    ) {
      console.error(
        '[Legacy migration]',
        error
      );
    }
  }


  function loadDraft() {
    migrateLegacyDraft();


    const offers =
      readSavedOffers();


    if (
      !offers.length
    ) {
      return false;
    }


    const offer =
      offers.find(
        item =>
          item.id ===
          activeOfferId
      ) ||
      offers[0];


    if (
      !offer
    ) {
      return false;
    }


    applyFormState(
      offer.payload
    );


    activeOfferId =
      offer.id;


    localStorage.setItem(
      ACTIVE_OFFER_KEY,
      offer.id
    );


    updateActiveOfferStatus();


    return true;
  }


  function updateActiveOfferStatus() {
    const status =
      $('#activeOfferStatus');


    if (
      !status
    ) {
      return;
    }


    const offer =
      readSavedOffers().find(
        item =>
          item.id ===
          activeOfferId
      );


    if (
      !offer
    ) {
      status.textContent =
        currentOfferTouched
          ? 'عرض جديد - توجد تغييرات غير محفوظة'
          : 'عرض جديد غير محفوظ';


      return;
    }


    status.textContent =
      currentOfferTouched
        ? `${offer.title} - توجد تغييرات غير محفوظة`
        : offer.title;
  }


  function scheduleAutoSave() {
    currentOfferTouched =
      true;


    updateActiveOfferStatus();


    clearTimeout(
      autoSaveTimer
    );


    autoSaveTimer =
      setTimeout(
        () => {
          try {
            saveDraft(
              true
            );
          } catch (
            error
          ) {
            console.error(
              '[Autosave]',
              error
            );
          }
        },
        650
      );
  }


  function renderSavedOffers(
    search = ''
  ) {
    const value =
      String(
        search
      )
        .trim()
        .toLowerCase();


    const offers =
      readSavedOffers()
        .filter(
          offer =>
            !value ||
            `${offer.title} ${offer.destination}`
              .toLowerCase()
              .includes(
                value
              )
        );


    setText(
      '#savedOffersCount',
      `${offers.length} عروض`
    );


    const list =
      $('#savedOffersList');


    if (
      !list
    ) {
      return;
    }


    list.innerHTML =
      offers.length
        ? offers
            .map(
              offer => `
                <article
                  class="saved-offer-card ${
                    offer.id ===
                    activeOfferId
                      ? 'active'
                      : ''
                  }"
                  data-offer-id="${escapeHtml(offer.id)}"
                >

                  <div class="saved-offer-main">

                    <strong>
                      ${escapeHtml(offer.title)}
                    </strong>

                    <p>
                      ${escapeHtml(offer.destination || '')}
                    </p>

                    <div class="saved-offer-meta">

                      <span>
                        ${
                          new Date(
                            offer.updatedAt
                          ).toLocaleString(
                            'ar-SA'
                          )
                        }
                      </span>

                    </div>

                  </div>

                  <div class="saved-offer-actions">

                    <button
                      class="saved-offer-open"
                      data-offer-action="open"
                      type="button"
                    >
                      فتح
                    </button>

                    <button
                      class="saved-offer-copy"
                      data-offer-action="duplicate"
                      type="button"
                    >
                      نسخ
                    </button>

                    <button
                      class="saved-offer-delete"
                      data-offer-action="delete"
                      type="button"
                    >
                      حذف
                    </button>

                  </div>

                </article>
              `
            )
            .join('')
        : `
          <div class="saved-offers-empty">

            <strong>
              لا توجد عروض
            </strong>

          </div>
        `;
  }


  function loadOfferById(
    id
  ) {
    if (
      activeOfferId &&
      activeOfferId !==
        id &&
      currentOfferTouched
    ) {
      saveDraft(
        true
      );
    }


    const offer =
      readSavedOffers().find(
        item =>
          item.id ===
          id
      );


    if (
      !offer
    ) {
      toast(
        'تعذر العثور على العرض'
      );


      return;
    }


    applyFormState(
      offer.payload
    );


    activeOfferId =
      id;


    currentOfferTouched =
      false;


    localStorage.setItem(
      ACTIVE_OFFER_KEY,
      id
    );


    $('#savedOffersDialog')
      ?.close();


    updateActiveOfferStatus();


    toast(
      'تم فتح العرض'
    );
  }


  function duplicateOffer(
    id
  ) {
    const offers =
      readSavedOffers();


    const source =
      offers.find(
        offer =>
          offer.id ===
          id
      );


    if (
      !source
    ) {
      return;
    }


    const payload =
      structuredClone(
        source.payload
      );


    if (
      payload.state
    ) {
      delete payload.state.copy;
    }


    if (
      payload.fields
        ?.quoteNumber
    ) {
      payload.fields.quoteNumber =
        `${payload.fields.quoteNumber}-COPY`;
    }


    const newId =
      createOfferId();


    const record =
      createOfferRecord(
        newId,
        payload
      );


    offers.unshift(
      record
    );


    writeSavedOffers(
      offers
    );


    loadOfferById(
      newId
    );


    toast(
      'تم نسخ العرض'
    );
  }


  function deleteOffer(
    id
  ) {
    const offers =
      readSavedOffers();


    const offer =
      offers.find(
        item =>
          item.id ===
          id
      );


    if (
      !offer
    ) {
      return;
    }


    if (
      !window.confirm(
        `هل تريد حذف "${offer.title}"؟`
      )
    ) {
      return;
    }


    writeSavedOffers(
      offers.filter(
        item =>
          item.id !==
          id
      )
    );


    if (
      activeOfferId ===
      id
    ) {
      activeOfferId =
        null;


      localStorage.removeItem(
        ACTIVE_OFFER_KEY
      );


      startNewOffer(
        false
      );
    }


    renderSavedOffers();


    toast(
      'تم حذف العرض'
    );
  }


  function startNewOffer(
    saveCurrent = true
  ) {
    if (
      saveCurrent &&
      (
        activeOfferId ||
        currentOfferTouched
      )
    ) {
      saveDraft(
        true
      );
    }


    state = {
      services:
        [],

      itinerary:
        [],

      childAges:
        [],

      hotelCities:
        [],

      copy: {
        ...structuredClone(
          defaultCopy
        ),

        brandTagline:
          getUserName()
      }
    };


    activeOfferId =
      null;


    currentOfferTouched =
      false;


    localStorage.removeItem(
      ACTIVE_OFFER_KEY
    );


    const values = {
      quoteNumber:
        '',

      clientName:
        '',

      origin:
        '',

      destination:
        '',

      hotelStars:
        '4–5',

      startDate:
        '',

      endDate:
        '',

      adults:
        '2',

      children:
        '0',

      internalNotes:
        '',

      markupType:
        'percent',

      markupValue:
        '18'
    };


    Object.entries(
      values
    ).forEach(
      (
        [
          id,
          value
        ]
      ) => {
        const element =
          $(`#${id}`);


        if (
          element
        ) {
          element.value =
            value;
        }
      }
    );


    if (
      $('#vatEnabled')
    ) {
      $('#vatEnabled').checked =
        false;
    }


    [
      'showFacts',
      'showFlights',
      'showHotels',
      'showTransfers',
      'showPrices',
      'showNotes'
    ]
      .forEach(
        id => {
          if (
            $(`#${id}`)
          ) {
            $(`#${id}`).checked =
              true;
          }
        }
      );


    [
      'showActivities',
      'showItinerary'
    ]
      .forEach(
        id => {
          if (
            $(`#${id}`)
          ) {
            $(`#${id}`).checked =
              false;
          }
        }
      );


    if (
      $('#clientView')
    ) {
      $('#clientView').hidden =
        true;
    }


    if (
      $('#internalView')
    ) {
      $('#internalView').hidden =
        false;
    }


    renderAll();


    updateActiveOfferStatus();


    $('#savedOffersDialog')
      ?.close();


    window.scrollTo({
      top:
        0,

      behavior:
        'auto'
    });


    toast(
      'تم إنشاء عرض جديد'
    );
  }


  /* =========================================================
     GOOGLE DRIVE STATUS
     ========================================================= */

  function googleTokenIsValid() {
    return Boolean(
      googleAccessToken &&
      Date.now() <
        googleTokenExpiresAt -
        30000
    );
  }


  function setDriveStatus(
    status,
    text = ''
  ) {
    const element =
      $('#driveStatus');


    const textElement =
      $('#driveStatusText');


    const connectButton =
      $('#connectGoogleDriveBtn');


    const disconnectButton =
      $('#disconnectGoogleDriveBtn');


    if (
      element
    ) {
      element.classList.remove(
        'is-connected',
        'is-syncing',
        'is-error'
      );


      if (
        status ===
        'connected'
      ) {
        element.classList.add(
          'is-connected'
        );
      }


      if (
        status ===
        'syncing'
      ) {
        element.classList.add(
          'is-syncing'
        );
      }


      if (
        status ===
        'error'
      ) {
        element.classList.add(
          'is-error'
        );
      }
    }


    if (
      textElement
    ) {
      const defaults = {
        connected:
          'Google Drive متصل',

        syncing:
          'جاري المزامنة...',

        error:
          'تعذر الاتصال بـ Drive',

        disconnected:
          'Google Drive غير متصل'
      };


      textElement.textContent =
        text ||
        defaults[
          status
        ] ||
        defaults.disconnected;
    }


    if (
      connectButton
    ) {
      connectButton.hidden =
        status ===
        'connected';
    }


    if (
      disconnectButton
    ) {
      disconnectButton.hidden =
        status !==
        'connected';
    }
  }


  function waitForGoogleIdentity(
    timeout = 12000
  ) {
    return new Promise(
      (
        resolve,
        reject
      ) => {
        const started =
          Date.now();


        function check() {
          if (
            window.google
              ?.accounts
              ?.oauth2
          ) {
            resolve(
              window.google
            );


            return;
          }


          if (
            Date.now() -
            started >=
            timeout
          ) {
            reject(
              new Error(
                'تعذر تحميل Google Identity Services'
              )
            );


            return;
          }


          setTimeout(
            check,
            100
          );
        }


        check();
      }
    );
  }


  function initGoogleDrive() {
    if (
      googleDriveInitPromise
    ) {
      return googleDriveInitPromise;
    }


    googleDriveInitPromise =
      (
        async () => {
          await waitForGoogleIdentity();


          googleTokenClient =
            google.accounts.oauth2
              .initTokenClient({
                client_id:
                  GOOGLE_CLIENT_ID,

                scope:
                  GOOGLE_DRIVE_SCOPE,

                callback:
                  async response => {
                    if (
                      response.error
                    ) {
                      console.error(
                        '[Google OAuth]',
                        response
                      );


                      setDriveStatus(
                        'error',
                        'تعذر تسجيل الدخول'
                      );


                      if (
                        googleAuthRequest
                      ) {
                        googleAuthRequest.reject(
                          new Error(
                            response.error_description ||
                            response.error
                          )
                        );


                        googleAuthRequest =
                          null;
                      }


                      return;
                    }


                    googleAccessToken =
                      response.access_token;


                    const expiresIn =
                      Math.max(
                        60,

                        Number(
                          response.expires_in
                        ) ||
                        3600
                      );


                    googleTokenExpiresAt =
                      Date.now() +
                      expiresIn *
                      1000;


                    localStorage.setItem(
                      GOOGLE_DRIVE_CONSENT_KEY,
                      '1'
                    );


                    setDriveStatus(
                      'connected'
                    );


                    try {
                      await syncOffersFromGoogleDrive();


                      if (
                        googleAuthRequest
                      ) {
                        googleAuthRequest.resolve(
                          true
                        );
                      }
                    } catch (
                      error
                    ) {
                      console.error(
                        '[Drive initial sync]',
                        error
                      );


                      if (
                        googleAuthRequest
                      ) {
                        googleAuthRequest.reject(
                          error
                        );
                      }
                    } finally {
                      googleAuthRequest =
                        null;
                    }
                  },

                error_callback:
                  error => {
                    console.error(
                      '[Google OAuth popup]',
                      error
                    );


                    const message =
                      error.type ===
                      'popup_closed'
                        ? 'تم إغلاق نافذة Google'
                        : 'تعذر فتح تسجيل الدخول';


                    setDriveStatus(
                      'error',
                      message
                    );


                    if (
                      googleAuthRequest
                    ) {
                      googleAuthRequest.reject(
                        new Error(
                          message
                        )
                      );


                      googleAuthRequest =
                        null;
                    }
                  }
              });


          return googleTokenClient;
        }
      )();


    return googleDriveInitPromise;
  }


  async function connectGoogleDrive() {
    if (
      googleTokenIsValid()
    ) {
      setDriveStatus(
        'connected'
      );


      await syncOffersFromGoogleDrive();


      return true;
    }


    await initGoogleDrive();


    if (
      !googleTokenClient
    ) {
      throw new Error(
        'Google OAuth غير جاهز'
      );
    }


    setDriveStatus(
      'syncing',
      'جاري تسجيل الدخول...'
    );


    const consentPreviouslyGranted =
      localStorage.getItem(
        GOOGLE_DRIVE_CONSENT_KEY
      ) ===
      '1';


    return new Promise(
      (
        resolve,
        reject
      ) => {
        googleAuthRequest = {
          resolve,
          reject
        };


        googleTokenClient
          .requestAccessToken({
            prompt:
              consentPreviouslyGranted
                ? ''
                : 'consent'
          });
      }
    );
  }


  function disconnectGoogleDrive() {
    googleAccessToken =
      null;


    googleTokenExpiresAt =
      0;


    driveFolderId =
      null;


    driveOffersFileId =
      null;


    pendingDriveOffers =
      null;


    clearTimeout(
      driveSyncTimer
    );


    setDriveStatus(
      'disconnected'
    );


    toast(
      'تم قطع الاتصال بـ Google Drive'
    );
  }


  /* =========================================================
     DRIVE API
     ========================================================= */

  async function driveFetch(
    url,
    options = {}
  ) {
    if (
      !googleTokenIsValid()
    ) {
      googleAccessToken =
        null;


      googleTokenExpiresAt =
        0;


      setDriveStatus(
        'disconnected'
      );


      throw new Error(
        'انتهت جلسة Google Drive. اضغط ربط Google Drive مرة أخرى.'
      );
    }


    const headers =
      new Headers(
        options.headers ||
        {}
      );


    headers.set(
      'Authorization',
      `Bearer ${googleAccessToken}`
    );


    const response =
      await fetch(
        url,
        {
          ...options,
          headers
        }
      );


    if (
      response.status ===
      401
    ) {
      googleAccessToken =
        null;


      googleTokenExpiresAt =
        0;


      driveFolderId =
        null;


      driveOffersFileId =
        null;


      setDriveStatus(
        'disconnected'
      );


      throw new Error(
        'انتهت جلسة Google Drive. أعد الاتصال.'
      );
    }


    if (
      !response.ok
    ) {
      let details =
        '';


      try {
        const data =
          await response.json();


        details =
          data.error
            ?.message ||
          '';
      } catch {
        try {
          details =
            await response.text();
        } catch {
          details =
            '';
        }
      }


      throw new Error(
        details ||
        `Google Drive Error ${response.status}`
      );
    }


    return response;
  }


  async function driveListFiles(
    query
  ) {
    const params =
      new URLSearchParams({
        q:
          query,

        spaces:
          'drive',

        pageSize:
          '100',

        fields:
          'files(id,name,mimeType,modifiedTime,parents,appProperties)'
      });


    const response =
      await driveFetch(
        `https://www.googleapis.com/drive/v3/files?${params.toString()}`
      );


    const data =
      await response.json();


    return Array.isArray(
      data.files
    )
      ? data.files
      : [];
  }


  async function getDriveFolder() {
    if (
      driveFolderId
    ) {
      return driveFolderId;
    }


    const query = [
      "trashed = false",

      "mimeType = 'application/vnd.google-apps.folder'",

      `appProperties has { key='${DRIVE_APP_KEY}' and value='${DRIVE_APP_VALUE}' }`,

      `appProperties has { key='kind' and value='${DRIVE_FOLDER_KIND}' }`
    ].join(
      ' and '
    );


    const existing =
      await driveListFiles(
        query
      );


    if (
      existing.length
    ) {
      driveFolderId =
        existing[0].id;


      return driveFolderId;
    }


    const response =
      await driveFetch(
        'https://www.googleapis.com/drive/v3/files?fields=id,name',

        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json; charset=UTF-8'
          },

          body:
            JSON.stringify({
              name:
                DRIVE_FOLDER_NAME,

              mimeType:
                'application/vnd.google-apps.folder',

              appProperties: {
                [DRIVE_APP_KEY]:
                  DRIVE_APP_VALUE,

                kind:
                  DRIVE_FOLDER_KIND
              }
            })
        }
      );


    const folder =
      await response.json();


    driveFolderId =
      folder.id;


    return driveFolderId;
  }


  async function findDriveOffersFile() {
    if (
      driveOffersFileId
    ) {
      return driveOffersFileId;
    }


    const folderId =
      await getDriveFolder();


    const query = [
      "trashed = false",

      `'${folderId}' in parents`,

      `appProperties has { key='${DRIVE_APP_KEY}' and value='${DRIVE_APP_VALUE}' }`,

      `appProperties has { key='kind' and value='${DRIVE_OFFERS_KIND}' }`
    ].join(
      ' and '
    );


    const files =
      await driveListFiles(
        query
      );


    if (
      files.length
    ) {
      driveOffersFileId =
        files[0].id;


      return driveOffersFileId;
    }


    return null;
  }


  function sanitizeOffersForCloud(
    offers
  ) {
    return structuredClone(
      offers
    ).map(
      offer => {
        if (
          offer.payload
            ?.state
        ) {
          delete offer.payload.state.copy;
        }


        return offer;
      }
    );
  }


  async function createDriveOffersFile(
    offers
  ) {
    const folderId =
      await getDriveFolder();


    const boundary =
      `konooz_${Date.now()}_${Math.random().toString(36).slice(2)}`;


    const metadata = {
      name:
        DRIVE_OFFERS_FILE_NAME,

      mimeType:
        'application/json',

      parents: [
        folderId
      ],

      appProperties: {
        [DRIVE_APP_KEY]:
          DRIVE_APP_VALUE,

        kind:
          DRIVE_OFFERS_KIND
      }
    };


    const cleanOffers =
      sanitizeOffersForCloud(
        offers
      );


    const content =
      JSON.stringify(
        {
          version:
            2,

          updatedAt:
            new Date()
              .toISOString(),

          offers:
            cleanOffers
        },
        null,
        2
      );


    const body =
      new Blob(
        [
          `--${boundary}\r\n`,

          'Content-Type: application/json; charset=UTF-8\r\n\r\n',

          JSON.stringify(
            metadata
          ),

          `\r\n--${boundary}\r\n`,

          'Content-Type: application/json; charset=UTF-8\r\n\r\n',

          content,

          `\r\n--${boundary}--`
        ],

        {
          type:
            `multipart/related; boundary=${boundary}`
        }
      );


    const response =
      await driveFetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime',

        {
          method:
            'POST',

          headers: {
            'Content-Type':
              `multipart/related; boundary=${boundary}`
          },

          body
        }
      );


    const file =
      await response.json();


    driveOffersFileId =
      file.id;


    return file.id;
  }


  async function readOffersFromDrive() {
    const fileId =
      await findDriveOffersFile();


    if (
      !fileId
    ) {
      return null;
    }


    const response =
      await driveFetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`
      );


    const text =
      await response.text();


    if (
      !text.trim()
    ) {
      return [];
    }


    let parsed;


    try {
      parsed =
        JSON.parse(
          text
        );
    } catch (
      error
    ) {
      console.error(
        '[Drive JSON]',
        error
      );


      throw new Error(
        'ملف العروض في Google Drive غير صالح'
      );
    }


    const offers =
      Array.isArray(
        parsed
      )
        ? parsed
        : (
            Array.isArray(
              parsed.offers
            )
              ? parsed.offers
              : []
          );


    offers.forEach(
      offer => {
        if (
          offer.payload
            ?.state
        ) {
          delete offer.payload.state.copy;
        }
      }
    );


    return offers;
  }


  async function writeOffersToDrive(
    offers
  ) {
    let fileId =
      await findDriveOffersFile();


    if (
      !fileId
    ) {
      return createDriveOffersFile(
        offers
      );
    }


    const cleanOffers =
      sanitizeOffersForCloud(
        offers
      );


    const payload =
      JSON.stringify(
        {
          version:
            2,

          updatedAt:
            new Date()
              .toISOString(),

          offers:
            cleanOffers
        },
        null,
        2
      );


    await driveFetch(
      `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media`,

      {
        method:
          'PATCH',

        headers: {
          'Content-Type':
            'application/json; charset=UTF-8'
        },

        body:
          payload
      }
    );


    return fileId;
  }


  function mergeOfferCollections(
    localOffers,
    remoteOffers
  ) {
    const merged =
      new Map();


    [
      ...remoteOffers,
      ...localOffers
    ]
      .forEach(
        offer => {
          if (
            !offer?.id
          ) {
            return;
          }


          if (
            offer.payload
              ?.state
          ) {
            delete offer.payload.state.copy;
          }


          const existing =
            merged.get(
              offer.id
            );


          if (
            !existing
          ) {
            merged.set(
              offer.id,
              offer
            );


            return;
          }


          const existingTime =
            Date.parse(
              existing.updatedAt ||
              existing.createdAt ||
              ''
            ) ||
            0;


          const incomingTime =
            Date.parse(
              offer.updatedAt ||
              offer.createdAt ||
              ''
            ) ||
            0;


          if (
            incomingTime >=
            existingTime
          ) {
            merged.set(
              offer.id,
              offer
            );
          }
        }
      );


    return [
      ...merged.values()
    ].sort(
      (
        a,
        b
      ) =>
        (
          Date.parse(
            b.updatedAt ||
            b.createdAt ||
            ''
          ) ||
          0
        ) -
        (
          Date.parse(
            a.updatedAt ||
            a.createdAt ||
            ''
          ) ||
          0
        )
    );
  }


  async function syncOffersFromGoogleDrive() {
    if (
      !googleTokenIsValid()
    ) {
      return false;
    }


    setDriveStatus(
      'syncing',
      'جاري تحميل العروض...'
    );


    try {
      const localOffers =
        readSavedOffers();


      const remoteOffers =
        await readOffersFromDrive();


      if (
        remoteOffers ===
        null
      ) {
        await createDriveOffersFile(
          localOffers
        );


        setDriveStatus(
          'connected',
          'Google Drive متصل'
        );


        toast(
          'تم رفع العروض إلى Google Drive'
        );


        return true;
      }


      const merged =
        mergeOfferCollections(
          localOffers,
          remoteOffers
        );


      writeSavedOffers(
        merged,
        {
          syncDrive:
            false
        }
      );


      await writeOffersToDrive(
        merged
      );


      if (
        $('#savedOffersDialog')
          ?.open
      ) {
        renderSavedOffers(
          $('#savedOffersSearch')
            ?.value ||
          ''
        );
      }


      const active =
        merged.find(
          offer =>
            offer.id ===
            activeOfferId
        );


      if (
        active &&
        !currentOfferTouched
      ) {
        applyFormState(
          active.payload
        );
      }


      setDriveStatus(
        'connected',
        'Google Drive متصل'
      );


      return true;
    } catch (
      error
    ) {
      console.error(
        '[Drive sync]',
        error
      );


      setDriveStatus(
        'error',
        'فشلت المزامنة'
      );


      throw error;
    }
  }


  function scheduleDriveSync(
    offers
  ) {
    if (
      !googleTokenIsValid()
    ) {
      return;
    }


    pendingDriveOffers =
      sanitizeOffersForCloud(
        offers
      );


    clearTimeout(
      driveSyncTimer
    );


    driveSyncTimer =
      setTimeout(
        () => {
          flushDriveSync()
            .catch(
              error => {
                console.error(
                  '[Drive autosave]',
                  error
                );
              }
            );
        },
        1500
      );
  }


  async function flushDriveSync() {
    if (
      !googleTokenIsValid()
    ) {
      return false;
    }


    if (
      driveSyncRunning
    ) {
      return false;
    }


    if (
      !pendingDriveOffers
    ) {
      return true;
    }


    driveSyncRunning =
      true;


    clearTimeout(
      driveSyncTimer
    );


    try {
      while (
        pendingDriveOffers
      ) {
        const offers =
          pendingDriveOffers;


        pendingDriveOffers =
          null;


        setDriveStatus(
          'syncing',
          'جاري الحفظ...'
        );


        await writeOffersToDrive(
          offers
        );
      }


      setDriveStatus(
        'connected',
        'تم الحفظ على Google Drive'
      );


      return true;
    } catch (
      error
    ) {
      console.error(
        '[Drive save]',
        error
      );


      setDriveStatus(
        'error',
        'تعذر الحفظ على Drive'
      );


      throw error;
    } finally {
      driveSyncRunning =
        false;
    }
  }


  async function saveCurrentOffersToDriveNow() {
    if (
      !googleTokenIsValid()
    ) {
      return false;
    }


    pendingDriveOffers =
      sanitizeOffersForCloud(
        readSavedOffers()
      );


    return flushDriveSync();
  }


  /* =========================================================
     SAVE BUTTONS
     ========================================================= */

  $('#saveDraftBtn')
    ?.addEventListener(
      'click',

      async event => {
        const button =
          event.currentTarget;


        const oldText =
          button.textContent;


        button.disabled =
          true;


        button.textContent =
          'جاري الحفظ...';


        try {
          saveDraft(
            true
          );


          if (
            googleTokenIsValid()
          ) {
            await saveCurrentOffersToDriveNow();


            toast(
              'تم حفظ العرض على Google Drive'
            );
          } else {
            toast(
              'تم حفظ العرض على الجهاز'
            );
          }
        } catch (
          error
        ) {
          console.error(
            '[Save offer]',
            error
          );


          toast(
            'تم الحفظ محلياً، لكن تعذرت مزامنة Google Drive'
          );
        } finally {
          button.disabled =
            false;


          button.textContent =
            oldText;
        }
      }
    );


  $('#savedOffersBtn')
    ?.addEventListener(
      'click',

      async () => {
        if (
          currentOfferTouched ||
          activeOfferId
        ) {
          saveDraft(
            true
          );
        }


        if (
          googleTokenIsValid()
        ) {
          try {
            await syncOffersFromGoogleDrive();
          } catch (
            error
          ) {
            console.error(
              '[Saved offers sync]',
              error
            );
          }
        }


        if (
          $('#savedOffersSearch')
        ) {
          $('#savedOffersSearch').value =
            '';
        }


        renderSavedOffers();


        $('#savedOffersDialog')
          ?.showModal();
      }
    );


  $('#newOfferBtn')
    ?.addEventListener(
      'click',

      () => {
        startNewOffer();
      }
    );


  $('#newOfferFromDialogBtn')
    ?.addEventListener(
      'click',

      () => {
        startNewOffer();
      }
    );


  $('#closeSavedOffersBtn')
    ?.addEventListener(
      'click',

      () => {
        $('#savedOffersDialog')
          ?.close();
      }
    );


  $('#closeSavedOffersBottomBtn')
    ?.addEventListener(
      'click',

      () => {
        $('#savedOffersDialog')
          ?.close();
      }
    );


  $('#savedOffersSearch')
    ?.addEventListener(
      'input',

      event => {
        renderSavedOffers(
          event.target.value
        );
      }
    );


  $('#savedOffersList')
    ?.addEventListener(
      'click',

      event => {
        const button =
          event.target.closest(
            '[data-offer-action]'
          );


        if (
          !button
        ) {
          return;
        }


        const card =
          button.closest(
            '[data-offer-id]'
          );


        if (
          !card
        ) {
          return;
        }


        const id =
          card.dataset.offerId;


        if (
          button.dataset.offerAction ===
          'open'
        ) {
          loadOfferById(
            id
          );
        }


        if (
          button.dataset.offerAction ===
          'duplicate'
        ) {
          duplicateOffer(
            id
          );
        }


        if (
          button.dataset.offerAction ===
          'delete'
        ) {
          deleteOffer(
            id
          );
        }
      }
    );


  /* =========================================================
     GOOGLE BUTTONS
     ========================================================= */

  $('#connectGoogleDriveBtn')
    ?.addEventListener(
      'click',

      async event => {
        const button =
          event.currentTarget;


        const originalText =
          button.textContent;


        button.disabled =
          true;


        button.textContent =
          'جاري الاتصال...';


        try {
          await connectGoogleDrive();


          toast(
            'تم ربط Google Drive بنجاح'
          );
        } catch (
          error
        ) {
          console.error(
            '[Google Drive connect]',
            error
          );


          toast(
            error.message ||
            'تعذر ربط Google Drive'
          );
        } finally {
          button.disabled =
            false;


          button.textContent =
            originalText;
        }
      }
    );


  $('#disconnectGoogleDriveBtn')
    ?.addEventListener(
      'click',

      () => {
        disconnectGoogleDrive();
      }
    );


  /* =========================================================
     SAMPLE RESET
     ========================================================= */

  $('#resetSampleBtn')
    ?.addEventListener(
      'click',

      () => {
        if (
          activeOfferId ||
          currentOfferTouched
        ) {
          saveDraft(
            true
          );
        }


        activeOfferId =
          null;


        localStorage.removeItem(
          ACTIVE_OFFER_KEY
        );


        state = {
          services:
            structuredClone(
              sample.services
            ),

          itinerary:
            [],

          childAges:
            [],

          hotelCities:
            structuredClone(
              sample.hotelCities
            ),

          copy: {
            ...structuredClone(
              defaultCopy
            ),

            brandTagline:
              getUserName()
          }
        };


        if (
          $('#quoteNumber')
        ) {
          $('#quoteNumber').value =
            'KT-MY-1026';
        }


        if (
          $('#clientName')
        ) {
          $('#clientName').value =
            'ضيفنا الكريم';
        }


        if (
          $('#origin')
        ) {
          $('#origin').value =
            'جدة';
        }


        if (
          $('#destination')
        ) {
          $('#destination').value =
            'ماليزيا';
        }


        if (
          $('#startDate')
        ) {
          $('#startDate').value =
            '2026-10-06';
        }


        if (
          $('#endDate')
        ) {
          $('#endDate').value =
            '2026-10-20';
        }


        if (
          $('#adults')
        ) {
          $('#adults').value =
            2;
        }


        if (
          $('#children')
        ) {
          $('#children').value =
            0;
        }


        renderAll();


        currentOfferTouched =
          true;


        scheduleAutoSave();


        toast(
          'تم تحميل الطلب'
        );
      }
    );


  /* =========================================================
     EXPORT HELPERS
     ========================================================= */

  function exportFileBase() {
    const quote =
      (
        $('#quoteNumber')
          ?.value ||
        ''
      )
        .trim()
        .replace(
          /[^A-Za-z0-9_-]+/g,
          '-'
        )
        .replace(
          /^-+|-+$/g,
          ''
        );


    return quote
      ? `Offer-${quote}`
      : `Offer-${new Date().toISOString().slice(0, 10)}`;
  }


  function downloadBlob(
    blob,
    filename
  ) {
    const url =
      URL.createObjectURL(
        blob
      );


    const link =
      document.createElement(
        'a'
      );


    link.href =
      url;


    link.download =
      filename;


    document.body.appendChild(
      link
    );


    link.click();


    link.remove();


    setTimeout(
      () => {
        URL.revokeObjectURL(
          url
        );
      },
      60000
    );
  }


  function canvasBlob(
    canvas
  ) {
    return new Promise(
      (
        resolve,
        reject
      ) => {
        canvas.toBlob(
          blob => {
            if (
              blob
            ) {
              resolve(
                blob
              );
            } else {
              reject(
                new Error(
                  'تعذر إنشاء الصورة'
                )
              );
            }
          },

          'image/png'
        );
      }
    );
  }


  /* =========================================================
     OFFER CANVAS
     ========================================================= */
/* =========================================================
   INLINE IMAGES FOR PDF CAPTURE
   ========================================================= */

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(
        new Error(
          'تعذر تحويل الصورة إلى Data URL'
        )
      );
    };

    reader.readAsDataURL(blob);
  });
}


async function imageUrlToDataUrl(url) {
  if (!url) {
    return '';
  }

  if (url.startsWith('data:')) {
    return url;
  }

  const absoluteUrl =
    new URL(
      url,
      window.location.href
    ).href;

  const response =
    await fetch(
      absoluteUrl,
      {
        cache: 'force-cache'
      }
    );

  if (!response.ok) {
    throw new Error(
      `تعذر تحميل الصورة: ${absoluteUrl}`
    );
  }

  const blob =
    await response.blob();

  return blobToDataUrl(
    blob
  );
}


async function inlineImagesForCapture(
  source,
  clone
) {
  const sourceImages = [
    ...source.querySelectorAll(
      'img'
    )
  ];

  const cloneImages = [
    ...clone.querySelectorAll(
      'img'
    )
  ];

  await Promise.all(
    sourceImages.map(
      async (
        sourceImage,
        index
      ) => {
        const cloneImage =
          cloneImages[index];

        if (!cloneImage) {
          return;
        }

        const imageUrl =
          sourceImage.currentSrc ||
          sourceImage.src ||
          sourceImage.getAttribute(
            'src'
          );

        if (!imageUrl) {
          return;
        }

        try {
          const dataUrl =
            await imageUrlToDataUrl(
              imageUrl
            );

          cloneImage.setAttribute(
            'src',
            dataUrl
          );
        } catch (error) {
          console.error(
            '[PDF image capture]',
            error
          );

          cloneImage.setAttribute(
            'src',
            imageUrl
          );
        }
      }
    )
  );
}
  async function renderOfferCanvas() {
    if (
      document.fonts
        ?.ready
    ) {
      await document.fonts.ready;
    }


    const source =
      $('#offerSheet');


    if (
      !source
    ) {
      throw new Error(
        'تعذر العثور على عرض العميل'
      );
    }


    await nextFrame();


    const sourceRect =
      source.getBoundingClientRect();


    const width =
      Math.ceil(
        sourceRect.width
      );


    const height =
      Math.ceil(
        source.scrollHeight
      );


    if (
      !width ||
      !height
    ) {
      throw new Error(
        'عرض العميل غير جاهز'
      );
    }


    const protectedRects =
      [];


    function protect(
      element
    ) {
      if (
        !element ||
        element.hidden
      ) {
        return;
      }


      const rect =
        element.getBoundingClientRect();


      if (
        rect.height <=
        2
      ) {
        return;
      }


      protectedRects.push({
        top:
          rect.top -
          sourceRect.top,

        bottom:
          rect.bottom -
          sourceRect.top,

        height:
          rect.height
      });
    }


    source
      .querySelectorAll(
        [
          '.client-flight-leg',
          '.hotel-client-item',
          '#clientTransfers .included-item',
          '#clientActivities .included-item',
          '.client-day',
          '.price-section',
          '.terms-section',
          '.offer-footer'
        ].join(',')
      )
      .forEach(
        protect
      );


    source
      .querySelectorAll(
        '.client-hotel-city'
      )
      .forEach(
        city => {
          const heading =
            city.querySelector(
              ':scope > h3'
            );


          const firstHotel =
            city.querySelector(
              '.hotel-client-item'
            );


          if (
            !heading ||
            !firstHotel
          ) {
            return;
          }


          const headingRect =
            heading
              .getBoundingClientRect();


          const hotelRect =
            firstHotel
              .getBoundingClientRect();


          const top =
            Math.min(
              headingRect.top,
              hotelRect.top
            ) -
            sourceRect.top;


          const bottom =
            Math.max(
              headingRect.bottom,
              hotelRect.bottom
            ) -
            sourceRect.top;


          protectedRects.push({
            top,
            bottom,

            height:
              bottom -
              top
          });
        }
      );


    const finalStart =
      source
        .querySelector(
          '#clientPriceSection:not([hidden])'
        )
        ?.getBoundingClientRect() ||
      source
        .querySelector(
          '#clientNotesSection:not([hidden])'
        )
        ?.getBoundingClientRect() ||
      source
        .querySelector(
          '.offer-footer'
        )
        ?.getBoundingClientRect();


    const footer =
      source
        .querySelector(
          '.offer-footer'
        )
        ?.getBoundingClientRect();


    const clone =
  source.cloneNode(
    true
  );


clone.dir =
  'rtl';


/*
 * نحول جميع الصور إلى Data URL
 * حتى تظهر داخل PDF وSVG بشكل صحيح.
 */
await inlineImagesForCapture(
  source,
  clone
);


const originals = [
      source,
      ...source.querySelectorAll(
        '*'
      )
    ];


    const copies = [
      clone,
      ...clone.querySelectorAll(
        '*'
      )
    ];


    const pseudoRules =
      [];


    for (
      let index =
        0;

      index <
      originals.length;

      index +=
        1
    ) {
      const original =
        originals[
          index
        ];


      const copy =
        copies[
          index
        ];


      const computed =
        getComputedStyle(
          original
        );


      copy.removeAttribute(
        'style'
      );


      for (
        let styleIndex =
          0;

        styleIndex <
        computed.length;

        styleIndex +=
          1
      ) {
        const property =
          computed.item(
            styleIndex
          );


        copy.style.setProperty(
          property,

          computed.getPropertyValue(
            property
          )
        );
      }


      copy.style.setProperty(
        'animation',
        'none'
      );


      copy.style.setProperty(
        'transition',
        'none'
      );


      copy.setAttribute(
        'data-capture-id',
        String(
          index
        )
      );


      for (
        const pseudo of [
          '::before',
          '::after'
        ]
      ) {
        const style =
          getComputedStyle(
            original,
            pseudo
          );


        if (
          !style.content ||
          style.content ===
            'none' ||
          style.content ===
            'normal'
        ) {
          continue;
        }


        const rules =
          [];


        for (
          let styleIndex =
            0;

          styleIndex <
          style.length;

          styleIndex +=
            1
        ) {
          const property =
            style.item(
              styleIndex
            );


          rules.push(
            `${property}:${style.getPropertyValue(property)}`
          );
        }


        pseudoRules.push(
          `[data-capture-id="${index}"]${pseudo}{${rules.join(';')}}`
        );
      }
    }


    clone.style.width =
      `${width}px`;


    clone.style.maxWidth =
      'none';


    clone.style.margin =
      '0';


    clone.style.boxShadow =
      'none';


    const markup =
      new XMLSerializer()
        .serializeToString(
          clone
        );


    const svg = `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="${width}"
        height="${height}"
        viewBox="0 0 ${width} ${height}"
      >

        <foreignObject
          width="100%"
          height="100%"
        >

          <div
            xmlns="http://www.w3.org/1999/xhtml"
            dir="rtl"
            style="
              width:${width}px;
              height:${height}px;
              background:#fff;
            "
          >

            <style>
              ${pseudoRules.join('\n')}
            </style>

            ${markup}

          </div>

        </foreignObject>

      </svg>
    `;


    const image =
      new Image();


    image.src =
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;


    await image.decode();


    const maxPixels =
      64000000;


    const scale =
      Math.max(
        .5,

        Math.min(
          2,

          Math.sqrt(
            maxPixels /
            (
              width *
              height
            )
          ),

          30000 /
          width,

          30000 /
          height
        )
      );


    const canvas =
      document.createElement(
        'canvas'
      );


    canvas.width =
      Math.max(
        1,

        Math.round(
          width *
          scale
        )
      );


    canvas.height =
      Math.max(
        1,

        Math.round(
          height *
          scale
        )
      );


    const context =
      canvas.getContext(
        '2d',
        {
          alpha:
            false
        }
      );


    if (
      !context
    ) {
      throw new Error(
        'تعذر إنشاء صورة العرض'
      );
    }


    context.fillStyle =
      '#fff';


    context.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );


    context.drawImage(
      image,
      0,
      0,
      canvas.width,
      canvas.height
    );


    canvas.offerLayout = {
      scale,

      protectedRanges:
        protectedRects.map(
          rect => ({
            top:
              Math.round(
                rect.top *
                scale
              ),

            bottom:
              Math.round(
                rect.bottom *
                scale
              ),

            height:
              Math.round(
                rect.height *
                scale
              )
          })
        ),

      finalBlockTop:
        finalStart
          ? Math.max(
              0,

              Math.round(
                (
                  finalStart.top -
                  sourceRect.top
                ) *
                scale
              )
            )
          : null,

      finalBlockBottom:
        footer
          ? Math.min(
              canvas.height,

              Math.round(
                (
                  footer.bottom -
                  sourceRect.top
                ) *
                scale
              )
            )
          : null
    };


    return canvas;
  }


  /* =========================================================
     PDF PAGES
     ========================================================= */

  function pageMetrics(
    fullCanvas
  ) {
    const pageHeight =
      Math.round(
        fullCanvas.width *
        297 /
        210
      );


    const layout =
      fullCanvas.offerLayout ||
      {};


    const protectedRanges =
      layout.protectedRanges ||
      [];


    const continuationTopPadding =
      Math.round(
        fullCanvas.width *
        14 /
        210
      );


    const continuationBottomPadding =
      Math.round(
        fullCanvas.width *
        8 /
        210
      );


    const safetyGap =
      Math.max(
        12,

        Math.round(
          fullCanvas.width *
          .008
        )
      );


    const finalGap =
      Math.max(
        14,

        Math.round(
          fullCanvas.width *
          .012
        )
      );


    const finalTop =
      Number.isFinite(
        layout.finalBlockTop
      )
        ? layout.finalBlockTop
        : null;


    const finalBottom =
      Number.isFinite(
        layout.finalBlockBottom
      )
        ? layout.finalBlockBottom
        : null;


    const hasFinal =
      finalTop !==
        null &&
      finalBottom !==
        null &&
      finalBottom >
        finalTop;


    const finalHeight =
      hasFinal
        ? finalBottom -
          finalTop
        : 0;


    const normalEnd =
      hasFinal
        ? finalTop
        : fullCanvas.height;


    const pages =
      [];


    let sourceY =
      0;


    while (
      sourceY <
      normalEnd
    ) {
      const first =
        pages.length ===
        0;


      const topPadding =
        first
          ? 0
          : continuationTopPadding;


      const bottomPadding =
        first
          ? 0
          : continuationBottomPadding;


      const available =
        pageHeight -
        topPadding -
        bottomPadding;


      let cutY =
        Math.min(
          sourceY +
          available,
          normalEnd
        );


      if (
        cutY <
        normalEnd
      ) {
        const crossing =
          protectedRanges.filter(
            range => {
              if (
                range.height >
                available
              ) {
                return false;
              }


              return (
                range.top <
                  cutY &&
                range.bottom >
                  cutY &&
                range.top >=
                  sourceY &&
                (
                  !hasFinal ||
                  range.top <
                    finalTop
                )
              );
            }
          );


        if (
          crossing.length
        ) {
          const earliestTop =
            Math.min(
              ...crossing.map(
                range =>
                  range.top
              )
            );


          const proposed =
            earliestTop -
            safetyGap;


          if (
            proposed >
            sourceY +
            safetyGap
          ) {
            cutY =
              proposed;
          }
        }
      }


      if (
        cutY <=
        sourceY
      ) {
        cutY =
          Math.min(
            sourceY +
            available,
            normalEnd
          );
      }


      pages.push({
        topPadding,
        bottomPadding,

        parts: [
          {
            sourceY,

            sourceHeight:
              cutY -
              sourceY,

            destinationY:
              topPadding
          }
        ]
      });


      sourceY =
        cutY;
    }


    if (
      hasFinal
    ) {
      let placed =
        false;


      const lastPage =
        pages[
          pages.length -
          1
        ];


      if (
        lastPage &&
        finalHeight <=
          pageHeight -
          lastPage.bottomPadding
      ) {
        const lastPart =
          lastPage.parts[
            lastPage.parts.length -
            1
          ];


        const usedBottom =
          lastPart.destinationY +
          lastPart.sourceHeight;


        const destinationY =
          pageHeight -
          lastPage.bottomPadding -
          finalHeight;


        if (
          usedBottom +
          finalGap <=
          destinationY
        ) {
          lastPage.parts.push({
            sourceY:
              finalTop,

            sourceHeight:
              finalHeight,

            destinationY,

            final:
              true
          });


          placed =
            true;
        }
      }


      if (
        !placed
      ) {
        const first =
          pages.length ===
          0;


        const topPadding =
          first
            ? 0
            : continuationTopPadding;


        const bottomPadding =
          first
            ? 0
            : continuationBottomPadding;


        const available =
          pageHeight -
          topPadding -
          bottomPadding;


        if (
          finalHeight <=
          available
        ) {
          pages.push({
            topPadding,
            bottomPadding,

            parts: [
              {
                sourceY:
                  finalTop,

                sourceHeight:
                  finalHeight,

                destinationY:
                  pageHeight -
                  bottomPadding -
                  finalHeight,

                final:
                  true
              }
            ]
          });
        } else {
          let currentY =
            finalTop;


          while (
            currentY <
            finalBottom
          ) {
            const currentAvailable =
              pageHeight -
              continuationTopPadding -
              continuationBottomPadding;


            const currentHeight =
              Math.min(
                currentAvailable,

                finalBottom -
                currentY
              );


            pages.push({
              topPadding:
                continuationTopPadding,

              bottomPadding:
                continuationBottomPadding,

              parts: [
                {
                  sourceY:
                    currentY,

                  sourceHeight:
                    currentHeight,

                  destinationY:
                    continuationTopPadding
                }
              ]
            });


            currentY +=
              currentHeight;
          }
        }
      }
    }


    if (
      !pages.length
    ) {
      pages.push({
        topPadding:
          0,

        bottomPadding:
          0,

        parts: [
          {
            sourceY:
              0,

            sourceHeight:
              Math.min(
                fullCanvas.height,
                pageHeight
              ),

            destinationY:
              0
          }
        ]
      });
    }


    return {
      height:
        pageHeight,

      pages,

      count:
        pages.length
    };
  }


  function renderPageCanvas(
    fullCanvas,
    index,
    metrics
  ) {
    const data =
      metrics.pages[
        index
      ];


    if (
      !data
    ) {
      throw new Error(
        `صفحة غير صالحة: ${index + 1}`
      );
    }


    const page =
      document.createElement(
        'canvas'
      );


    page.width =
      fullCanvas.width;


    page.height =
      metrics.height;


    const context =
      page.getContext(
        '2d',
        {
          alpha:
            false
        }
      );


    context.fillStyle =
      '#fff';


    context.fillRect(
      0,
      0,
      page.width,
      page.height
    );


    data.parts.forEach(
      part => {
        const sourceY =
          Math.max(
            0,
            part.sourceY
          );


        const sourceHeight =
          Math.min(
            part.sourceHeight,

            fullCanvas.height -
            sourceY
          );


        if (
          sourceHeight <=
          0
        ) {
          return;
        }


        context.drawImage(
          fullCanvas,

          0,
          sourceY,
          fullCanvas.width,
          sourceHeight,

          0,
          part.destinationY,
          fullCanvas.width,
          sourceHeight
        );
      }
    );


    return page;
  }


  /* =========================================================
     ZIP
     ========================================================= */

  const crcTable =
    (() => {
      const table =
        new Uint32Array(
          256
        );


      for (
        let n =
          0;

        n <
        256;

        n +=
          1
      ) {
        let value =
          n;


        for (
          let index =
            0;

          index <
          8;

          index +=
            1
        ) {
          value =
            value &
            1
              ? (
                  0xedb88320 ^
                  (
                    value >>>
                    1
                  )
                )
              : (
                  value >>>
                  1
                );
        }


        table[
          n
        ] =
          value >>>
          0;
      }


      return table;
    })();


  function crc32(
    bytes
  ) {
    let value =
      0xffffffff;


    for (
      const byte of
      bytes
    ) {
      value =
        crcTable[
          (
            value ^
            byte
          ) &
          0xff
        ] ^
        (
          value >>>
          8
        );
    }


    return (
      value ^
      0xffffffff
    ) >>>
    0;
  }


  function little16(
    value
  ) {
    const bytes =
      new Uint8Array(
        2
      );


    new DataView(
      bytes.buffer
    ).setUint16(
      0,
      value,
      true
    );


    return bytes;
  }


  function little32(
    value
  ) {
    const bytes =
      new Uint8Array(
        4
      );


    new DataView(
      bytes.buffer
    ).setUint32(
      0,
      value >>>
      0,
      true
    );


    return bytes;
  }


  function joinBytes(
    parts
  ) {
    const result =
      new Uint8Array(
        parts.reduce(
          (
            sum,
            part
          ) =>
            sum +
            part.length,
          0
        )
      );


    let offset =
      0;


    parts.forEach(
      part => {
        result.set(
          part,
          offset
        );


        offset +=
          part.length;
      }
    );


    return result;
  }


  function zipPngFiles(
    files
  ) {
    const encoder =
      new TextEncoder();


    const localParts =
      [];


    const centralParts =
      [];


    let localOffset =
      0;


    files.forEach(
      file => {
        const name =
          encoder.encode(
            file.name
          );


        const checksum =
          crc32(
            file.bytes
          );


        const localHeader =
          joinBytes([
            little32(
              0x04034b50
            ),

            little16(
              20
            ),

            little16(
              0x0800
            ),

            little16(
              0
            ),

            little16(
              0
            ),

            little16(
              0
            ),

            little32(
              checksum
            ),

            little32(
              file.bytes.length
            ),

            little32(
              file.bytes.length
            ),

            little16(
              name.length
            ),

            little16(
              0
            ),

            name
          ]);


        localParts.push(
          localHeader,
          file.bytes
        );


        const centralHeader =
          joinBytes([
            little32(
              0x02014b50
            ),

            little16(
              20
            ),

            little16(
              20
            ),

            little16(
              0x0800
            ),

            little16(
              0
            ),

            little16(
              0
            ),

            little16(
              0
            ),

            little32(
              checksum
            ),

            little32(
              file.bytes.length
            ),

            little32(
              file.bytes.length
            ),

            little16(
              name.length
            ),

            little16(
              0
            ),

            little16(
              0
            ),

            little16(
              0
            ),

            little16(
              0
            ),

            little32(
              0
            ),

            little32(
              localOffset
            ),

            name
          ]);


        centralParts.push(
          centralHeader
        );


        localOffset +=
          localHeader.length +
          file.bytes.length;
      }
    );


    const central =
      joinBytes(
        centralParts
      );


    const end =
      joinBytes([
        little32(
          0x06054b50
        ),

        little16(
          0
        ),

        little16(
          0
        ),

        little16(
          files.length
        ),

        little16(
          files.length
        ),

        little32(
          central.length
        ),

        little32(
          localOffset
        ),

        little16(
          0
        )
      ]);


    return new Blob(
      [
        ...localParts,
        central,
        end
      ],

      {
        type:
          'application/zip'
      }
    );
  }


  /* =========================================================
     PDF
     ========================================================= */

  async function compressedRgb(
    canvas
  ) {
    if (
      typeof CompressionStream ===
      'undefined'
    ) {
      throw new Error(
        'إنشاء PDF يحتاج Chrome أو Edge حديث.'
      );
    }


    const context =
      canvas.getContext(
        '2d'
      );


    const pixels =
      context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      ).data;


    const rgb =
      new Uint8Array(
        canvas.width *
        canvas.height *
        3
      );


    for (
      let source =
        0,
          target =
            0;

      source <
      pixels.length;

      source +=
        4
    ) {
      rgb[
        target++
      ] =
        pixels[
          source
        ];


      rgb[
        target++
      ] =
        pixels[
          source +
          1
        ];


      rgb[
        target++
      ] =
        pixels[
          source +
          2
        ];
    }


    const stream =
      new Blob([
        rgb
      ])
        .stream()
        .pipeThrough(
          new CompressionStream(
            'deflate'
          )
        );


    return new Uint8Array(
      await new Response(
        stream
      ).arrayBuffer()
    );
  }


  async function imagePagesPdf(
    fullCanvas
  ) {
    const metrics =
      pageMetrics(
        fullCanvas
      );


    const encoder =
      new TextEncoder();


    const images =
      [];


    for (
      let index =
        0;

      index <
      metrics.count;

      index +=
        1
    ) {
      const page =
        renderPageCanvas(
          fullCanvas,
          index,
          metrics
        );


      images.push({
        width:
          page.width,

        height:
          page.height,

        bytes:
          await compressedRgb(
            page
          )
      });
    }


    const parts = [
      new Uint8Array([
        37,
        80,
        68,
        70,
        45,
        49,
        46,
        52,
        10
      ])
    ];


    const offsets = [
      0
    ];


    let length =
      parts[0].length;


    function add(
      value
    ) {
      const bytes =
        typeof value ===
        'string'
          ? encoder.encode(
              value
            )
          : value;


      parts.push(
        bytes
      );


      length +=
        bytes.length;
    }


    function beginObject(
      number
    ) {
      offsets[
        number
      ] =
        length;


      add(
        `${number} 0 obj\n`
      );
    }


    beginObject(
      1
    );


    add(
      '<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'
    );


    beginObject(
      2
    );


    add(
      `<< /Type /Pages /Count ${images.length} /Kids [` +
      images
        .map(
          (
            _,
            index
          ) =>
            `${3 + index * 3} 0 R`
        )
        .join(
          ' '
        ) +
      '] >>\nendobj\n'
    );


    images.forEach(
      (
        image,
        index
      ) => {
        const pageObject =
          3 +
          index *
          3;


        const imageObject =
          pageObject +
          1;


        const contentObject =
          pageObject +
          2;


        const imageName =
          `Im${index + 1}`;


        beginObject(
          pageObject
        );


        add(
          `<< /Type /Page /Parent 2 0 R ` +
          `/MediaBox [0 0 595.28 841.89] ` +
          `/Resources << /XObject << /${imageName} ${imageObject} 0 R >> >> ` +
          `/Contents ${contentObject} 0 R >>\nendobj\n`
        );


        beginObject(
          imageObject
        );


        add(
          `<< /Type /XObject /Subtype /Image ` +
          `/Width ${image.width} ` +
          `/Height ${image.height} ` +
          `/ColorSpace /DeviceRGB ` +
          `/BitsPerComponent 8 ` +
          `/Filter /FlateDecode ` +
          `/Length ${image.bytes.length} >>\nstream\n`
        );


        add(
          image.bytes
        );


        add(
          '\nendstream\nendobj\n'
        );


        const commands =
          `q\n` +
          `595.28 0 0 841.89 0 0 cm\n` +
          `/${imageName} Do\n` +
          `Q\n`;


        beginObject(
          contentObject
        );


        add(
          `<< /Length ${encoder.encode(commands).length} >>\n` +
          `stream\n` +
          `${commands}` +
          `endstream\n` +
          `endobj\n`
        );
      }
    );


    const xrefOffset =
      length;


    add(
      `xref\n0 ${offsets.length}\n`
    );


    add(
      '0000000000 65535 f \n'
    );


    for (
      let number =
        1;

      number <
      offsets.length;

      number +=
        1
    ) {
      add(
        `${String(offsets[number]).padStart(10, '0')} 00000 n \n`
      );
    }


    add(
      `trailer\n` +
      `<< /Size ${offsets.length} /Root 1 0 R >>\n` +
      `startxref\n` +
      `${xrefOffset}\n` +
      `%%EOF`
    );


    return new Blob(
      parts,

      {
        type:
          'application/pdf'
      }
    );
  }


  /* =========================================================
     EXPORT WORKFLOW
     ========================================================= */

  async function runImageExport(
    button,
    action
  ) {
    if (
      !button
    ) {
      return;
    }


    const buttons = [
      ...new Set(
        [
          ...$$(
            '#imageExportMenu button'
          ),

          $('#printOfferBtn'),

          button
        ].filter(
          Boolean
        )
      )
    ];


    const originalText =
      button.textContent;


    buttons.forEach(
      current => {
        current.disabled =
          true;
      }
    );


    button.textContent =
      'جاري الإنشاء...';


    try {
      if (
        document.fonts
          ?.ready
      ) {
        await document.fonts.ready;
      }


      await nextFrame();


      const canvas =
        await renderOfferCanvas();


      await action(
        canvas
      );


      if (
        $('#imageExportMenu')
      ) {
        $('#imageExportMenu').open =
          false;
      }
    } catch (
      error
    ) {
      console.error(
        '[Export]',
        error
      );


      toast(
        error?.message ||
        'تعذر إنشاء الملف'
      );
    } finally {
      button.textContent =
        originalText;


      buttons.forEach(
        current => {
          current.disabled =
            false;
        }
      );
    }
  }


  /* =========================================================
     PDF PREVIEW
     ========================================================= */

  let currentPdfPreviewBlob =
    null;


  let currentPdfPreviewUrl =
    null;


  let currentPdfPreviewFilename =
    'Offer.pdf';


  function releasePdfPreview() {
    $('#pdfPreviewFrame')
      ?.removeAttribute(
        'src'
      );


    if (
      currentPdfPreviewUrl
    ) {
      URL.revokeObjectURL(
        currentPdfPreviewUrl
      );
    }


    currentPdfPreviewBlob =
      null;


    currentPdfPreviewUrl =
      null;
  }


  async function openPdfPreview(
    button
  ) {
    await runImageExport(
      button,

      async canvas => {
        const blob =
          await imagePagesPdf(
            canvas
          );


        releasePdfPreview();


        currentPdfPreviewBlob =
          blob;


        currentPdfPreviewFilename =
          `${exportFileBase()}.pdf`;


        currentPdfPreviewUrl =
          URL.createObjectURL(
            blob
          );


        if (
          $('#pdfPreviewFrame')
        ) {
          $('#pdfPreviewFrame').src =
            `${currentPdfPreviewUrl}#toolbar=1&navpanes=0&view=FitH`;
        }


        setText(
          '#pdfPreviewFilename',
          currentPdfPreviewFilename
        );


        $('#pdfPreviewDialog')
          ?.showModal();
      }
    );
  }


  $('#printOfferBtn')
    ?.addEventListener(
      'click',

      event => {
        openPdfPreview(
          event.currentTarget
        );
      }
    );


  $('#exportImagePdfBtn')
    ?.addEventListener(
      'click',

      event => {
        openPdfPreview(
          event.currentTarget
        );
      }
    );


  $('#downloadPreviewPdfBtn')
    ?.addEventListener(
      'click',

      () => {
        if (
          !currentPdfPreviewBlob
        ) {
          toast(
            'لا يوجد ملف جاهز'
          );


          return;
        }


        downloadBlob(
          currentPdfPreviewBlob,
          currentPdfPreviewFilename
        );
      }
    );


  $('#closePdfPreviewBtn')
    ?.addEventListener(
      'click',

      () => {
        $('#pdfPreviewDialog')
          ?.close();
      }
    );


  $('#cancelPdfPreviewBtn')
    ?.addEventListener(
      'click',

      () => {
        $('#pdfPreviewDialog')
          ?.close();
      }
    );


  $('#pdfPreviewDialog')
    ?.addEventListener(
      'close',
      releasePdfPreview
    );


  /* =========================================================
     PNG EXPORT
     ========================================================= */

  $('#exportLongPngBtn')
    ?.addEventListener(
      'click',

      event => {
        runImageExport(
          event.currentTarget,

          async canvas => {
            const blob =
              await canvasBlob(
                canvas
              );


            downloadBlob(
              blob,
              `${exportFileBase()}.png`
            );


            toast(
              'تم تحميل الصورة'
            );
          }
        );
      }
    );


  $('#exportPagedPngBtn')
    ?.addEventListener(
      'click',

      event => {
        runImageExport(
          event.currentTarget,

          async canvas => {
            const metrics =
              pageMetrics(
                canvas
              );


            const files =
              [];


            for (
              let index =
                0;

              index <
              metrics.count;

              index +=
                1
            ) {
              const page =
                renderPageCanvas(
                  canvas,
                  index,
                  metrics
                );


              const blob =
                await canvasBlob(
                  page
                );


              files.push({
                name:
                  `Offer-Page-${index + 1}.png`,

                bytes:
                  new Uint8Array(
                    await blob.arrayBuffer()
                  )
              });
            }


            if (
              files.length ===
              1
            ) {
              downloadBlob(
                new Blob(
                  [
                    files[0].bytes
                  ],

                  {
                    type:
                      'image/png'
                  }
                ),

                files[0].name
              );
            } else {
              downloadBlob(
                zipPngFiles(
                  files
                ),

                `${exportFileBase()}-PNG-Pages.zip`
              );
            }


            toast(
              'تم إنشاء صفحات PNG'
            );
          }
        );
      }
    );


  /* =========================================================
     COPY OFFER
     ========================================================= */

  $('#copyOfferBtn')
    ?.addEventListener(
      'click',

      async () => {
        const result =
          totals();


        const hotelText =
          state.services
            .filter(
              item =>
                item.category ===
                'hotel'
            )
            .map(
              item =>
                `• ${item.city} - ${item.name} - ${item.details} - ` +
                `${formatFlexibleClientDate(item.checkIn)} ${item.checkInTime || ''} ` +
                `إلى ${formatFlexibleClientDate(item.checkOut)} ${item.checkOutTime || ''}`
            )
            .join(
              '\n'
            );


        const text =
          `${defaultCopy.brandName}\n` +
          `${getUserName()}\n` +
          `العميل: ${$('#clientName')?.value || 'ضيفنا الكريم'}\n` +
          `الوجهة: ${$('#destination')?.value || ''}\n` +
          `المدة: ${$('#durationDisplay')?.value || ''}\n\n` +
          `${
            hotelText
              ? `الفنادق:\n${hotelText}\n\n`
              : ''
          }` +
          `إجمالي العرض: ${
            result.total >
            0
              ? money.format(
                  result.total
                )
              : 'بانتظار التسعير'
          }`;


        try {
          await navigator.clipboard.writeText(
            text
          );


          toast(
            'تم نسخ ملخص العرض'
          );
        } catch {
          toast(
            'تعذر النسخ'
          );
        }
      }
    );


  /* =========================================================
     GLOBAL AUTOSAVE
     ========================================================= */

  document.addEventListener(
    'input',

    event => {
      if (
        event.target.closest(
          '#savedOffersDialog, #pdfPreviewDialog'
        )
      ) {
        return;
      }


      /*
       * اسم المستخدم إعداد محلي مستقل.
       * لا نربطه بحفظ العرض.
       */
      if (
        event.target.dataset
          ?.copyKey ===
        'brandTagline'
      ) {
        return;
      }


      if (
        event.target.matches(
          'input, textarea, select'
        )
      ) {
        scheduleAutoSave();
      }
    }
  );


  document.addEventListener(
    'change',

    event => {
      if (
        event.target.closest(
          '#savedOffersDialog, #pdfPreviewDialog'
        )
      ) {
        return;
      }


      if (
        event.target.dataset
          ?.copyKey
      ) {
        return;
      }


      if (
        event.target.matches(
          'input, textarea, select'
        )
      ) {
        scheduleAutoSave();
      }
    }
  );


  /* =========================================================
     WINDOW
     ========================================================= */

  window.addEventListener(
    'scroll',

    () => {
      calculatePreviewButtonVisibility();


      calculateClientBackVisibility();
    },

    {
      passive:
        true
    }
  );


  window.addEventListener(
    'resize',

    () => {
      calculatePreviewButtonVisibility();


      calculateClientBackVisibility();
    }
  );


  window.addEventListener(
    'beforeunload',

    () => {
      clearTimeout(
        autoSaveTimer
      );


      clearTimeout(
        driveSyncTimer
      );


      try {
        if (
          activeOfferId ||
          currentOfferTouched
        ) {
          saveDraft(
            true
          );
        }
      } catch (
        error
      ) {
        console.error(
          '[Before unload]',
          error
        );
      }


      releasePdfPreview();
    }
  );


  /* =========================================================
     RENDER ALL
     ========================================================= */

  function renderAll() {
    ensureStateStructure();


    applyCopy();


    renderChildAges();


    renderServices();


    renderItinerary();


    updateSummary();
  }


  /* =========================================================
     START
     ========================================================= */

  renderAll();


  loadDraft();


  updateActiveOfferStatus();


  updateNewServiceScheduleFields();


  setDriveStatus(
    'disconnected'
  );


  /*
   * تجهيز Google Identity بدون فتح
   * تسجيل الدخول تلقائياً.
   */
  initGoogleDrive()
    .catch(
      error => {
        console.warn(
          '[Google Drive init]',
          error
        );


        setDriveStatus(
          'error',
          'Google Drive غير جاهز'
        );
      }
    );


  requestAnimationFrame(
    () => {
      requestAnimationFrame(
        () => {
          calculatePreviewButtonVisibility();


          calculateClientBackVisibility();
        }
      );
    }
  );

})();